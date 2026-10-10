CREATE OR REPLACE FUNCTION public.apply_order_document_stock_delta(
  p_product_id uuid,
  p_variation_id uuid,
  p_delta numeric,
  p_entry_unit_cost numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_previous_stock numeric;
  v_recalculated_cost numeric;
  v_target_cost numeric;
  v_variation_count integer;
BEGIN
  IF p_delta <> trunc(p_delta) THEN
    RAISE EXCEPTION 'A quantidade de estoque da variação deve ser inteira: %', p_delta;
  END IF;

  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto de estoque não encontrado: %', p_product_id;
  END IF;

  SELECT COALESCE(variation.stock, 0)
    INTO v_previous_stock
    FROM public.product_variations AS variation
   WHERE variation.id = p_variation_id
     AND variation.product_id = p_product_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variação de estoque inválida para o produto: %', p_variation_id;
  END IF;

  UPDATE public.product_variations AS variation
     SET stock = v_previous_stock + p_delta,
         opening_cost_price = COALESCE(variation.opening_cost_price, product.cost_price)
    FROM public.products AS product
   WHERE variation.id = p_variation_id
     AND product.id = p_product_id;

  v_recalculated_cost := public.recalculate_order_document_unit_cost(p_product_id, p_variation_id);
  v_target_cost := v_recalculated_cost;
  IF v_target_cost IS NULL AND p_delta > 0 AND p_entry_unit_cost > 0 THEN
    v_target_cost := p_entry_unit_cost;
  END IF;

  SELECT count(*)
    INTO v_variation_count
    FROM public.product_variations AS variation
   WHERE variation.product_id = p_product_id;

  IF v_target_cost IS NOT NULL THEN
    IF v_variation_count = 1 THEN
      -- The parent is the authoritative cost cache for its single SKU.
      -- Its AFTER UPDATE trigger propagates this value to the main variation.
      UPDATE public.products
         SET cost_price = v_target_cost
       WHERE id = p_product_id;
    ELSE
      UPDATE public.product_variations
         SET cost_price = v_target_cost
       WHERE id = p_variation_id;
    END IF;
  END IF;

  UPDATE public.products AS product
     SET stock = COALESCE(product.stock, 0) + p_delta,
         cost_price = (
           SELECT CASE
                    WHEN sum(GREATEST(COALESCE(variation.stock, 0), 0)) > 0
                    THEN sum(
                      GREATEST(COALESCE(variation.stock, 0), 0)
                      * COALESCE(NULLIF(variation.cost_price, 0), product.cost_price, 0)
                    ) / sum(GREATEST(COALESCE(variation.stock, 0), 0))
                    ELSE product.cost_price
                  END
             FROM public.product_variations AS variation
            WHERE variation.product_id = product.id
         )
   WHERE product.id = p_product_id;
END;
$function$;
