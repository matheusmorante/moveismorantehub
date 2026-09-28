-- Preserve legacy photo object keys before switching the bucket to private.
UPDATE public.stock_unavailabilities AS item
SET photos = ARRAY(
  SELECT CASE
    WHEN photo ~ '^https?://[^/]+/storage/v1/object/public/unavailabilities/'
      THEN regexp_replace(photo, '^https?://[^/]+/storage/v1/object/public/unavailabilities/', '')
    ELSE photo
  END
  FROM unnest(item.photos) AS photo
)
WHERE item.photos IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.stock_unavailabilities WHERE variation_id IS NULL) THEN
    RAISE EXCEPTION 'stock_unavailabilities contains records without variation_id; reconcile them before applying this migration';
  END IF;
END;
$$;

ALTER TABLE public.stock_unavailabilities
  ALTER COLUMN variation_id SET NOT NULL;

-- Mirror the ERP's manualStockMovement permission: custom settings override
-- defaults; otherwise manager and stockist roles are allowed.
CREATE OR REPLACE FUNCTION public.has_manual_stock_movement_permission()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_roles text[];
  v_role_permissions jsonb;
  v_allowed_roles text[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(
    NULLIF(array_remove(profile.roles, 'pending'), ARRAY[]::text[]),
    CASE WHEN profile.role <> 'pending' THEN ARRAY[profile.role] ELSE ARRAY[]::text[] END
  )
  INTO v_roles
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

  IF NOT FOUND OR cardinality(v_roles) = 0 THEN
    RETURN false;
  END IF;

  IF 'administrator' = ANY(v_roles) THEN
    RETURN true;
  END IF;

  SELECT settings.data -> 'rolePermissions' -> 'manualStockMovement'
  INTO v_role_permissions
  FROM public.settings
  WHERE settings.id = 'app';

  IF v_role_permissions IS NULL THEN
    v_allowed_roles := ARRAY['manager', 'stockist'];
  ELSIF jsonb_typeof(v_role_permissions) = 'array' THEN
    SELECT COALESCE(array_agg(role_name), ARRAY[]::text[])
    INTO v_allowed_roles
    FROM jsonb_array_elements_text(v_role_permissions) AS permissions(role_name);
  ELSE
    RETURN false;
  END IF;

  RETURN v_roles && v_allowed_roles;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_manual_stock_movement_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_manual_stock_movement_permission() TO authenticated;

-- The role array is authorization data too. Protect it using the existing
-- administrator-only profile-role rule before relying on it in the RPC.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NOT public.is_administrator()
     AND lower(coalesce(auth.jwt() ->> 'email', '')) <> 'matheusmorante002@gmail.com'
     AND (NEW.role <> 'pending' OR cardinality(array_remove(NEW.roles, 'pending')) > 0) THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NOT public.is_administrator()
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.roles IS DISTINCT FROM OLD.roles) THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

-- Keep reads available to authenticated ERP users, but force all writes through
-- the validated RPCs. No DELETE policy exists: history is reversed, never erased.
DROP POLICY IF EXISTS "Allow authenticated full access to stock_unavailabilities" ON public.stock_unavailabilities;
DROP POLICY IF EXISTS "Allow authenticated INSERT to stock_unavailabilities" ON public.stock_unavailabilities;
DROP POLICY IF EXISTS "Allow authenticated UPDATE to stock_unavailabilities" ON public.stock_unavailabilities;
DROP POLICY IF EXISTS "Allow authenticated DELETE to stock_unavailabilities" ON public.stock_unavailabilities;
DROP POLICY IF EXISTS "Allow authenticated SELECT to stock_unavailabilities" ON public.stock_unavailabilities;
CREATE POLICY "Authenticated users can read stock unavailabilities"
  ON public.stock_unavailabilities FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.stock_unavailabilities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_unavailabilities TO authenticated;

-- Restrict storage to private, owner-scoped uploads. Attached evidence cannot
-- be deleted; cleanup may remove only the caller's unreferenced upload.
UPDATE storage.buckets SET public = false WHERE id = 'unavailabilities';

DROP POLICY IF EXISTS "Allow authenticated full access to unavailabilities" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated SELECT on unavailabilities" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated INSERT on unavailabilities" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated DELETE on unavailabilities" ON storage.objects;
DROP POLICY IF EXISTS "Stock users read unavailability evidence" ON storage.objects;
DROP POLICY IF EXISTS "Stock users upload own unavailability evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users clean up unlinked unavailability evidence" ON storage.objects;

CREATE POLICY "Stock users read unavailability evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'unavailabilities'
    AND public.has_manual_stock_movement_permission()
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR EXISTS (
        SELECT 1 FROM public.stock_unavailabilities AS item
        WHERE item.photos @> ARRAY[storage.objects.name]
      )
    )
  );

CREATE POLICY "Stock users upload own unavailability evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'unavailabilities'
    AND public.has_manual_stock_movement_permission()
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "Users clean up unlinked unavailability evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'unavailabilities'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND NOT EXISTS (
      SELECT 1 FROM public.stock_unavailabilities AS item
      WHERE item.photos @> ARRAY[storage.objects.name]
    )
  );

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
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_stock numeric;
  v_move_id uuid;
  v_unavailability_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF NOT public.has_manual_stock_movement_permission() THEN
    RAISE EXCEPTION 'Sem permissão para movimentar estoque';
  END IF;
  IF p_product_id IS NULL OR p_variation_id IS NULL THEN
    RAISE EXCEPTION 'Selecione uma variação válida';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade válida maior que zero';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;
  IF p_treatment = 'Devolução ao fornecedor' AND p_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Fornecedor é obrigatório para devolução';
  END IF;

  SELECT variation.stock INTO v_current_stock
  FROM public.product_variations AS variation
  WHERE variation.id = p_variation_id AND variation.product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND OR v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Variação não encontrada para o produto informado';
  END IF;
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente para registrar indisponibilidade';
  END IF;

  INSERT INTO public.inventory_moves (
    product_id, variation_id, type, quantity, label, observation, status, date,
    related_entity_id, related_entity_type
  ) VALUES (
    p_product_id, p_variation_id, 'exit', p_quantity,
    'Indisponibilidade: ' || p_reason, p_observation, 'effective', now(),
    v_unavailability_id::text, 'stock_unavailability'
  ) RETURNING id INTO v_move_id;

  INSERT INTO public.stock_unavailabilities (
    id, product_id, variation_id, supplier_id, quantity, reason, treatment,
    physical_location, observation, photos, created_by, inventory_move_id
  ) VALUES (
    v_unavailability_id, p_product_id, p_variation_id, p_supplier_id, p_quantity,
    p_reason, p_treatment, p_physical_location, p_observation, p_photos,
    v_user_id, v_move_id
  );

  UPDATE public.product_variations
  SET stock = stock - p_quantity
  WHERE id = p_variation_id AND product_id = p_product_id;

  UPDATE public.products AS product
  SET stock = (
    SELECT COALESCE(sum(variation.stock), 0)
    FROM public.product_variations AS variation
    WHERE variation.product_id = p_product_id
  )
  WHERE product.id = p_product_id;

  RETURN pg_catalog.jsonb_build_object('id', v_unavailability_id, 'status', 'created');
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_stock_unavailability(p_unavailability_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unavailability public.stock_unavailabilities%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF NOT public.has_manual_stock_movement_permission() THEN
    RAISE EXCEPTION 'Sem permissão para movimentar estoque';
  END IF;

  SELECT * INTO v_unavailability
  FROM public.stock_unavailabilities AS item
  WHERE item.id = p_unavailability_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Indisponibilidade não encontrada';
  END IF;
  IF v_unavailability.status = 'cancelled' THEN
    RAISE EXCEPTION 'Indisponibilidade já foi cancelada';
  END IF;

  PERFORM 1 FROM public.product_variations AS variation
  WHERE variation.id = v_unavailability.variation_id
    AND variation.product_id = v_unavailability.product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variação da indisponibilidade não encontrada';
  END IF;

  INSERT INTO public.inventory_moves (
    product_id, variation_id, type, quantity, label, observation, status, date,
    related_entity_id, related_entity_type
  ) VALUES (
    v_unavailability.product_id, v_unavailability.variation_id, 'entry',
    v_unavailability.quantity,
    'Cancelamento de Indisponibilidade: ' || v_unavailability.reason,
    'Retorno ao estoque', 'effective', now(), p_unavailability_id::text,
    'stock_unavailability_cancellation'
  );

  UPDATE public.stock_unavailabilities
  SET status = 'cancelled', updated_at = now(), cancelled_at = now(), cancelled_by = v_user_id
  WHERE id = p_unavailability_id;

  UPDATE public.product_variations
  SET stock = stock + v_unavailability.quantity
  WHERE id = v_unavailability.variation_id
    AND product_id = v_unavailability.product_id;

  UPDATE public.products AS product
  SET stock = (
    SELECT COALESCE(sum(variation.stock), 0)
    FROM public.product_variations AS variation
    WHERE variation.product_id = v_unavailability.product_id
  )
  WHERE product.id = v_unavailability.product_id;

  RETURN pg_catalog.jsonb_build_object('id', p_unavailability_id, 'status', 'cancelled');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_stock_unavailability(uuid, uuid, numeric, text, text, text, text, text, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.undo_stock_unavailability(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_unavailability(uuid, uuid, numeric, text, text, text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_stock_unavailability(uuid) TO authenticated;
