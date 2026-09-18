-- Migration: Create RPC to reconcile suppliers in batch

CREATE OR REPLACE FUNCTION public.reconcile_products_suppliers(
  p_product_ids uuid[],
  p_target_supplier_id uuid,
  p_replace_existing boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed int := 0;
  v_updated int := 0;
  v_ignored int := 0;
  v_product record;
  v_new_supplier_ids text[];
BEGIN
  -- Validate
  IF p_product_ids IS NULL OR array_length(p_product_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum produto informado.');
  END IF;

  IF p_target_supplier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fornecedor alvo não informado.');
  END IF;

  FOR v_product IN
    SELECT id, supplier_id, main_supplier_id, supplier_ids
    FROM public.products
    WHERE id = ANY(p_product_ids)
  LOOP
    v_processed := v_processed + 1;

    IF p_replace_existing THEN
      -- Replace everything
      UPDATE public.products
      SET 
        supplier_id = p_target_supplier_id,
        main_supplier_id = p_target_supplier_id,
        supplier_ids = ARRAY[p_target_supplier_id::text]
      WHERE id = v_product.id;
      
      v_updated := v_updated + 1;
    ELSE
      -- Add without replacing existing ones
      -- Check if it already has this supplier
      IF v_product.main_supplier_id = p_target_supplier_id OR v_product.supplier_id = p_target_supplier_id OR (v_product.supplier_ids IS NOT NULL AND p_target_supplier_id::text = ANY(v_product.supplier_ids)) THEN
        v_ignored := v_ignored + 1;
        CONTINUE;
      END IF;

      -- Determine new supplier_ids array
      IF v_product.supplier_ids IS NULL THEN
        -- Check if it had a main_supplier_id to append
        IF v_product.main_supplier_id IS NOT NULL THEN
          v_new_supplier_ids := ARRAY[v_product.main_supplier_id::text, p_target_supplier_id::text];
        ELSIF v_product.supplier_id IS NOT NULL THEN
          v_new_supplier_ids := ARRAY[v_product.supplier_id::text, p_target_supplier_id::text];
        ELSE
          v_new_supplier_ids := ARRAY[p_target_supplier_id::text];
        END IF;
      ELSE
        v_new_supplier_ids := array_append(v_product.supplier_ids, p_target_supplier_id::text);
      END IF;

      -- Deduplicate array to ensure no duplicates just in case
      v_new_supplier_ids := ARRAY(SELECT DISTINCT unnest(v_new_supplier_ids));

      -- We don't overwrite main_supplier_id if it already has one, just add to the list and supplier_id
      UPDATE public.products
      SET 
        main_supplier_id = COALESCE(v_product.main_supplier_id, v_product.supplier_id, p_target_supplier_id),
        supplier_id = COALESCE(v_product.supplier_id, v_product.main_supplier_id, p_target_supplier_id),
        supplier_ids = v_new_supplier_ids
      WHERE id = v_product.id;
      
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'updated', v_updated,
    'ignored', v_ignored
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_products_suppliers(uuid[], uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_products_suppliers(uuid[], uuid, boolean) TO service_role;
