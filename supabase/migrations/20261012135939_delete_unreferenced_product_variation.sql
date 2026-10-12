CREATE OR REPLACE FUNCTION public.product_variation_has_references(p_variation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET row_security TO 'off'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.inventory_moves WHERE variation_id::text = p_variation_id::text
    UNION ALL
    SELECT 1 FROM public.order_items WHERE variation_id::text = p_variation_id::text
    UNION ALL
    SELECT 1 FROM public.goods_receipt_items WHERE variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.inbound_invoice_items WHERE variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.purchase_items WHERE variation_id::text = p_variation_id::text
    UNION ALL
    SELECT 1 FROM public.composition_variation_items WHERE variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.composition_variation_items WHERE composition_variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.inventory_labels WHERE variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.inventory_move_identity_audit WHERE variation_id::text = p_variation_id::text
    UNION ALL
    SELECT 1 FROM public.product_code_sanitation_log WHERE variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.product_price_history WHERE variation_id::text = p_variation_id::text
    UNION ALL
    SELECT 1 FROM public.product_supplier_codes WHERE product_variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.stock_unavailabilities WHERE variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.product_variations WHERE merged_to_variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.catalog_identity_repair_log
      WHERE old_variation_id = p_variation_id::text OR new_variation_id = p_variation_id::text
    UNION ALL
    SELECT 1 FROM public.catalog_variation_repair_map
      WHERE old_variation_id = p_variation_id::text OR new_variation_id = p_variation_id
    UNION ALL
    SELECT 1 FROM public.post_share_tokens WHERE variation_id = p_variation_id::text
  ) OR EXISTS (
    SELECT 1 FROM public.goods_receipt_items
    WHERE COALESCE(item_snapshot::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.inbound_invoice_items
    WHERE COALESCE(raw_item::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.order_items
    WHERE COALESCE(item_snapshot::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.purchase_items
    WHERE COALESCE(item_snapshot::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.inbound_invoices
    WHERE COALESCE(itens::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.orders
    WHERE COALESCE(items::text, '') LIKE '%' || p_variation_id::text || '%'
       OR COALESCE(order_data::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.purchases
    WHERE COALESCE(items::text, '') LIKE '%' || p_variation_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.goods_receipts
    WHERE COALESCE(items::text, '') LIKE '%' || p_variation_id::text || '%'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_deleting_referenced_product_variation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.product_variation_has_references(OLD.id) THEN
    RAISE EXCEPTION 'Esta variação possui vínculos ou histórico e não pode ser excluída.'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS product_variations_reject_referenced_delete ON public.product_variations;
CREATE TRIGGER product_variations_reject_referenced_delete
  BEFORE DELETE ON public.product_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_deleting_referenced_product_variation();

CREATE OR REPLACE FUNCTION public.delete_unreferenced_product_variation(
  p_product_id uuid,
  p_variation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_variation_count integer;
BEGIN
  PERFORM 1
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'product_not_found',
      'message', 'Produto não encontrado.'
    );
  END IF;

  PERFORM 1
  FROM public.product_variations
  WHERE id = p_variation_id
    AND product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'variation_not_found',
      'message', 'Variação não encontrada para este produto.'
    );
  END IF;

  SELECT count(*)::integer
  INTO v_variation_count
  FROM public.product_variations
  WHERE product_id = p_product_id;

  IF v_variation_count > 1 THEN
    BEGIN
      DELETE FROM public.product_variations
      WHERE id = p_variation_id
        AND product_id = p_product_id;
    EXCEPTION WHEN SQLSTATE '23503' THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'variation_in_use',
        'message', 'Esta variação possui vínculos ou histórico e não pode ser excluída.'
      );
    END;

    RETURN jsonb_build_object(
      'success', true,
      'code', 'variation_deleted',
      'parent_deactivated', false,
      'message', 'Variação excluída com sucesso.'
    );
  END IF;

  IF public.product_variation_has_references(p_variation_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'variation_in_use',
      'message', 'Esta variação possui vínculos ou histórico e não pode ser excluída.'
    );
  END IF;

  UPDATE public.products
  SET active = false, deleted = false
  WHERE id = p_product_id;

  UPDATE public.product_variations
  SET active = false, status = 'hidden'
  WHERE id = p_variation_id
    AND product_id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'parent_deactivated',
    'parent_deactivated', true,
    'message', 'Produto e única variação desativados com sucesso.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_unreferenced_product_variation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_unreferenced_product_variation(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.product_variation_has_references(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_variation_has_references(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_deleting_referenced_product_variation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_deleting_referenced_product_variation() TO authenticated;
