-- Preserva o custo-base observado antes dos novos efeitos para reverter entradas
-- sem deixar o custo médio da variação preso ao recebimento estornado.
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS opening_cost_price numeric;

CREATE OR REPLACE FUNCTION public.recalculate_order_document_unit_cost(
  p_product_id uuid, p_variation_id uuid
)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE
  v_move record;
  v_quantity numeric := 0;
  v_inventory_value numeric := 0;
  v_unit_cost numeric;
  v_stored_cost numeric;
  v_metadata jsonb;
  v_reversed boolean;
BEGIN
  FOR v_move IN
    SELECT type, quantity, unit_cost, status, observation, reason
      FROM public.inventory_moves
     WHERE product_id = p_product_id::text AND variation_id = p_variation_id::text
     ORDER BY date, created_at, id
  LOOP
    v_metadata := '{}'::jsonb;
    IF left(COALESCE(v_move.observation, ''), 1) IN ('{', '[') THEN
      BEGIN v_metadata := v_move.observation::jsonb;
      EXCEPTION WHEN OTHERS THEN v_metadata := '{}'::jsonb; END;
    END IF;
    v_reversed := v_move.status IN ('reversed', 'cancelled')
      OR v_metadata->>'status' IN ('reversed', 'cancelled')
      OR COALESCE(v_move.reason, '') LIKE 'Cancelamento da venda%';
    IF v_reversed THEN CONTINUE; END IF;

    IF v_move.type = 'entry' THEN
      v_stored_cost := v_move.unit_cost;
      IF v_stored_cost IS NOT NULL AND v_stored_cost > 0 THEN
        v_inventory_value := v_inventory_value + v_move.quantity * v_stored_cost;
      END IF;
      v_quantity := v_quantity + v_move.quantity;
    ELSIF v_move.type IN ('exit', 'withdrawal') THEN
      v_unit_cost := CASE WHEN v_quantity > 0 AND v_inventory_value > 0
                          THEN v_inventory_value / v_quantity ELSE NULL END;
      v_stored_cost := COALESCE(v_move.unit_cost, v_unit_cost);
      IF v_stored_cost IS NOT NULL THEN
        v_inventory_value := v_inventory_value - v_move.quantity * v_stored_cost;
      END IF;
      v_quantity := v_quantity - v_move.quantity;
    ELSE
      v_quantity := v_quantity + v_move.quantity;
    END IF;
  END LOOP;

  IF v_quantity > 0 AND v_inventory_value > 0 THEN
    RETURN v_inventory_value / v_quantity;
  END IF;
  RETURN (SELECT NULLIF(variation.opening_cost_price, 0)
            FROM public.product_variations AS variation
           WHERE variation.id = p_variation_id AND variation.product_id = p_product_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_order_document_stock_delta(
  p_product_id uuid, p_variation_id uuid, p_delta numeric, p_entry_unit_cost numeric DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE
  v_previous_stock numeric;
  v_recalculated_cost numeric;
BEGIN
  IF p_delta <> trunc(p_delta) THEN
    RAISE EXCEPTION 'A quantidade de estoque da variação deve ser inteira: %', p_delta;
  END IF;
  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto de estoque não encontrado: %', p_product_id; END IF;

  SELECT COALESCE(variation.stock, 0)
    INTO v_previous_stock
    FROM public.product_variations AS variation
   WHERE variation.id = p_variation_id AND variation.product_id = p_product_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Variação de estoque inválida para o produto: %', p_variation_id; END IF;

  UPDATE public.product_variations AS variation
     SET stock = v_previous_stock + p_delta,
         opening_cost_price = COALESCE(variation.opening_cost_price, product.cost_price)
    FROM public.products AS product
   WHERE variation.id = p_variation_id AND product.id = p_product_id;

  v_recalculated_cost := public.recalculate_order_document_unit_cost(p_product_id, p_variation_id);
  IF v_recalculated_cost IS NOT NULL THEN
    UPDATE public.product_variations SET cost_price = v_recalculated_cost WHERE id = p_variation_id;
  ELSIF p_delta > 0 AND p_entry_unit_cost > 0 THEN
    UPDATE public.product_variations SET cost_price = p_entry_unit_cost WHERE id = p_variation_id;
  END IF;

  UPDATE public.products AS product
     SET stock = COALESCE(product.stock, 0) + p_delta,
         cost_price = (SELECT CASE WHEN sum(GREATEST(COALESCE(variation.stock, 0), 0)) > 0
                           THEN sum(GREATEST(COALESCE(variation.stock, 0), 0)
                                    * COALESCE(NULLIF(variation.cost_price, 0), product.cost_price, 0))
                                / sum(GREATEST(COALESCE(variation.stock, 0), 0))
                           ELSE product.cost_price END
                         FROM public.product_variations AS variation WHERE variation.product_id = product.id)
   WHERE product.id = p_product_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_order_document_stock_delta(uuid, uuid, numeric, numeric)
  FROM PUBLIC, anon, authenticated;
