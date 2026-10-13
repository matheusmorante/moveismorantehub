CREATE OR REPLACE FUNCTION app_private.product_has_references(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_reference record;
  v_is_referenced boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_delete_products_permission() THEN
    RETURN true;
  END IF;

  IF p_product_id IS NULL OR EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = p_product_id
      AND COALESCE(product.stock::numeric, 0) <> 0
  ) OR EXISTS (
    SELECT 1
    FROM public.product_variations AS variation
    WHERE variation.product_id = p_product_id
      AND COALESCE(variation.stock::numeric, 0) <> 0
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_variations AS variation
    WHERE variation.product_id = p_product_id
      AND public.product_variation_has_references(variation.id)
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_moves AS move
    WHERE move.product_id = p_product_id::text
  ) OR EXISTS (
    SELECT 1
    FROM public.order_items AS item
    WHERE item.product_id = p_product_id::text
  ) OR EXISTS (
    SELECT 1
    FROM public.goods_receipt_items AS item
    WHERE item.product_id = p_product_id
  ) OR EXISTS (
    SELECT 1
    FROM public.inbound_invoice_items AS item
    WHERE item.product_id = p_product_id
  ) OR EXISTS (
    SELECT 1
    FROM public.purchase_items AS item
    WHERE item.product_id = p_product_id::text
  ) OR EXISTS (
    SELECT 1
    FROM public.inventory_labels AS label
    WHERE label.product_id = p_product_id
  ) OR EXISTS (
    SELECT 1
    FROM public.product_code_sanitation_log AS sanitation
    WHERE sanitation.product_id = p_product_id
  ) OR EXISTS (
    SELECT 1
    FROM public.product_price_history AS price_history
    WHERE price_history.product_id = p_product_id
  ) OR EXISTS (
    SELECT 1
    FROM public.product_supplier_codes AS supplier_code
    WHERE supplier_code.product_id = p_product_id
  ) OR EXISTS (
    SELECT 1
    FROM public.stock_unavailabilities AS unavailability
    WHERE unavailability.product_id = p_product_id
  ) THEN
    RETURN true;
  END IF;

  FOR v_reference IN
    SELECT
      source_namespace.nspname AS schema_name,
      source_table.relname AS table_name,
      source_column.attname AS column_name,
      pg_catalog.format_type(source_column.atttypid, source_column.atttypmod) AS column_type
    FROM pg_catalog.pg_constraint AS foreign_key
    JOIN pg_catalog.pg_class AS source_table
      ON source_table.oid = foreign_key.conrelid
    JOIN pg_catalog.pg_namespace AS source_namespace
      ON source_namespace.oid = source_table.relnamespace
    CROSS JOIN LATERAL ROWS FROM (
      pg_catalog.unnest(foreign_key.conkey),
      pg_catalog.unnest(foreign_key.confkey)
    ) AS foreign_key_column(source_attnum, target_attnum)
    JOIN pg_catalog.pg_attribute AS source_column
      ON source_column.attrelid = foreign_key.conrelid
      AND source_column.attnum = foreign_key_column.source_attnum
    WHERE foreign_key.contype = 'f'
      AND foreign_key.confrelid = 'public.products'::regclass
      AND foreign_key.conrelid NOT IN (
        'public.product_variations'::regclass,
        'public.product_categories'::regclass,
        'public.product_images'::regclass
      )
      AND source_namespace.nspname = 'public'
      AND foreign_key_column.target_attnum = (
        SELECT id_column.attnum
        FROM pg_catalog.pg_attribute AS id_column
        WHERE id_column.attrelid = 'public.products'::regclass
          AND id_column.attname = 'id'
          AND NOT id_column.attisdropped
      )
  LOOP
    EXECUTE pg_catalog.format(
      'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I = $1::%s)',
      v_reference.schema_name,
      v_reference.table_name,
      v_reference.column_name,
      v_reference.column_type
    )
    INTO v_is_referenced
    USING p_product_id;

    IF v_is_referenced THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN EXISTS (
    SELECT 1
    FROM public.goods_receipt_items AS item
    WHERE COALESCE(item.item_snapshot::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.inbound_invoice_items AS item
    WHERE COALESCE(item.raw_item::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.order_items AS item
    WHERE COALESCE(item.item_snapshot::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.purchase_items AS item
    WHERE COALESCE(item.item_snapshot::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.inbound_invoices AS invoice
    WHERE COALESCE(invoice.itens::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.orders AS order_record
    WHERE COALESCE(order_record.items::text, '') LIKE '%' || p_product_id::text || '%'
       OR COALESCE(order_record.order_data::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.purchases AS purchase
    WHERE COALESCE(purchase.items::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.goods_receipts AS receipt
    WHERE COALESCE(receipt.items::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.catalog_identity_repair_log AS repair
    WHERE COALESCE(pg_catalog.to_jsonb(repair)::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.inventory_move_identity_audit AS audit
    WHERE COALESCE(pg_catalog.to_jsonb(audit)::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.catalog_variation_repair_map AS repair
    WHERE COALESCE(pg_catalog.to_jsonb(repair)::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.post_share_tokens AS share
    WHERE COALESCE(pg_catalog.to_jsonb(share)::text, '') LIKE '%' || p_product_id::text || '%'
  );
END;
$function$;

REVOKE ALL ON FUNCTION app_private.product_has_references(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.product_has_references(uuid) TO authenticated;

ALTER TABLE public.products
  ALTER COLUMN status SET DEFAULT 'hidden';

UPDATE public.products AS product
SET status = 'hidden'
WHERE COALESCE(product.is_draft, false) = false
  AND product.status = 'draft'
  AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(product));

UPDATE public.product_variations AS variation
SET status = 'hidden'
FROM public.products AS product
WHERE product.id = variation.product_id
  AND COALESCE(product.is_draft, false) = false
  AND variation.status = 'draft'
  AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(product));

DELETE FROM public.product_variations AS variation
USING public.products AS product
WHERE product.id = variation.product_id
  AND COALESCE(product.is_draft, false) = true
  AND variation.sku LIKE 'DEFAULT-%'
  AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(product))
  AND NOT public.product_variation_has_references(variation.id);
