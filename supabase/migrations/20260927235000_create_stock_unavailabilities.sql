-- Migration: Create stock_unavailabilities and RPCs

CREATE TABLE IF NOT EXISTS public.stock_unavailabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_id uuid NOT NULL REFERENCES public.product_variations(id) ON DELETE CASCADE,
  supplier_id text REFERENCES public.people(id) ON DELETE SET NULL,
  quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  treatment text,
  physical_location text,
  status text NOT NULL DEFAULT 'active', -- 'active' or 'cancelled'
  observation text,
  photos text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  inventory_move_id uuid REFERENCES public.inventory_moves(id)
);

ALTER TABLE public.stock_unavailabilities ENABLE ROW LEVEL SECURITY;

-- Policies for unavailabilities
DROP POLICY IF EXISTS "Allow authenticated full access to stock_unavailabilities" ON public.stock_unavailabilities;
CREATE POLICY "Allow authenticated SELECT to stock_unavailabilities" ON public.stock_unavailabilities FOR SELECT USING (auth.role() = 'authenticated');


-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('unavailabilities', 'unavailabilities', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies: limit to 'unavailabilities' bucket and 'authenticated'
DROP POLICY IF EXISTS "Allow authenticated full access to unavailabilities" ON storage.objects;
CREATE POLICY "Allow authenticated SELECT on unavailabilities" ON storage.objects 
FOR SELECT USING (bucket_id = 'unavailabilities' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated INSERT on unavailabilities" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'unavailabilities' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated DELETE on unavailabilities" ON storage.objects 
FOR DELETE USING (bucket_id = 'unavailabilities' AND auth.role() = 'authenticated');

-- RPCs
CREATE OR REPLACE FUNCTION public.create_stock_unavailability(
  p_product_id uuid,
  p_variation_id uuid,
  p_quantity numeric,
  p_reason text,
  p_treatment text,
  p_physical_location text,
  p_observation text,
  p_supplier_id text DEFAULT NULL,
  p_photos text[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_current_stock numeric;
  v_move_id uuid;
  v_unavailability_id uuid := gen_random_uuid();
  v_user_id uuid;
BEGIN
  -- We get auth.uid() using the auth schema directly
  v_user_id := (SELECT auth.uid());

  -- Lock product variation or product for update
  IF p_variation_id IS NOT NULL THEN
    SELECT stock INTO v_current_stock FROM public.product_variations WHERE id = p_variation_id FOR UPDATE;
  ELSE
    SELECT stock INTO v_current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
  END IF;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Produto ou variação não encontrado';
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente para registrar indisponibilidade';
  END IF;

  -- Create inventory move linked to this unavailability
  INSERT INTO public.inventory_moves (
    product_id, variation_id, type, quantity, label, observation, status, date,
    related_entity_id, related_entity_type
  ) VALUES (
    p_product_id, p_variation_id, 'exit', p_quantity, 'Indisponibilidade: ' || p_reason, p_observation, 'effective', now(),
    v_unavailability_id::text, 'stock_unavailability'
  ) RETURNING id INTO v_move_id;

  -- Create unavailability record
  INSERT INTO public.stock_unavailabilities (
    id, product_id, variation_id, supplier_id, quantity, reason, treatment, physical_location, observation, photos, created_by, inventory_move_id
  ) VALUES (
    v_unavailability_id, p_product_id, p_variation_id, p_supplier_id, p_quantity, p_reason, p_treatment, p_physical_location, p_observation, p_photos, v_user_id, v_move_id
  );

  -- Update stock
  IF p_variation_id IS NOT NULL THEN
    UPDATE public.product_variations SET stock = stock - p_quantity WHERE id = p_variation_id;
    UPDATE public.products SET stock = (
      SELECT COALESCE(sum(stock), 0) FROM public.product_variations WHERE product_id = p_product_id
    ) WHERE id = p_product_id;
  ELSE
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object('id', v_unavailability_id, 'status', 'created');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_stock_unavailability FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stock_unavailability TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_stock_unavailability(
  p_unavailability_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_unavail record;
  v_move_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  -- Lock the record to prevent concurrent reversals
  SELECT * INTO v_unavail FROM public.stock_unavailabilities WHERE id = p_unavailability_id FOR UPDATE;

  IF v_unavail IS NULL THEN
    RAISE EXCEPTION 'Indisponibilidade não encontrada';
  END IF;

  IF v_unavail.status = 'cancelled' THEN
    RAISE EXCEPTION 'Indisponibilidade já foi cancelada';
  END IF;

  -- Lock product variation or product
  IF v_unavail.variation_id IS NOT NULL THEN
    PERFORM id FROM public.product_variations WHERE id = v_unavail.variation_id FOR UPDATE;
  ELSE
    PERFORM id FROM public.products WHERE id = v_unavail.product_id FOR UPDATE;
  END IF;

  -- Create inbound inventory move
  INSERT INTO public.inventory_moves (
    product_id, variation_id, type, quantity, label, observation, status, date,
    related_entity_id, related_entity_type
  ) VALUES (
    v_unavail.product_id, v_unavail.variation_id, 'entry', v_unavail.quantity, 'Cancelamento de Indisponibilidade: ' || v_unavail.reason, 'Retorno ao estoque', 'effective', now(),
    p_unavailability_id::text, 'stock_unavailability_cancellation'
  ) RETURNING id INTO v_move_id;

  -- Update record
  UPDATE public.stock_unavailabilities 
  SET status = 'cancelled', 
      updated_at = now(),
      cancelled_at = now(),
      cancelled_by = v_user_id 
  WHERE id = p_unavailability_id;

  -- Update stock
  IF v_unavail.variation_id IS NOT NULL THEN
    UPDATE public.product_variations SET stock = stock + v_unavail.quantity WHERE id = v_unavail.variation_id;
    UPDATE public.products SET stock = (
      SELECT COALESCE(sum(stock), 0) FROM public.product_variations WHERE product_id = v_unavail.product_id
    ) WHERE id = v_unavail.product_id;
  ELSE
    UPDATE public.products SET stock = stock + v_unavail.quantity WHERE id = v_unavail.product_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object('id', p_unavailability_id, 'status', 'cancelled');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.undo_stock_unavailability FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_stock_unavailability TO authenticated;
