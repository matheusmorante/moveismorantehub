CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.has_delete_products_permission()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_roles text[];
  v_allowed_roles text[];
  v_allowed_roles_json jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT CASE
    WHEN pg_catalog.cardinality(
      pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    ) > 0 THEN pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    WHEN profile.role IS NOT NULL AND profile.role <> 'pending' THEN ARRAY[profile.role]
    ELSE ARRAY[]::text[]
  END
  INTO v_user_roles
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

  IF NOT FOUND OR pg_catalog.cardinality(v_user_roles) = 0 THEN
    RETURN false;
  END IF;

  IF 'administrator' = ANY(v_user_roles) THEN
    RETURN true;
  END IF;

  SELECT settings.data -> 'rolePermissions' -> 'deleteProducts'
  INTO v_allowed_roles_json
  FROM public.settings AS settings
  WHERE settings.id = 'app';

  IF NOT FOUND OR v_allowed_roles_json IS NULL THEN
    v_allowed_roles := ARRAY['manager', 'seller'];
  ELSIF pg_catalog.jsonb_typeof(v_allowed_roles_json) = 'array' THEN
    SELECT COALESCE(pg_catalog.array_agg(permission_role.role_name), ARRAY[]::text[])
    INTO v_allowed_roles
    FROM pg_catalog.jsonb_array_elements_text(v_allowed_roles_json) AS permission_role(role_name);
  ELSE
    RETURN false;
  END IF;

  RETURN v_user_roles && v_allowed_roles;
END;
$function$;

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
    CROSS JOIN LATERAL pg_catalog.unnest(foreign_key.conkey, foreign_key.confkey)
      AS foreign_key_column(source_attnum, target_attnum)
    JOIN pg_catalog.pg_attribute AS source_column
      ON source_column.attrelid = foreign_key.conrelid
      AND source_column.attnum = foreign_key_column.source_attnum
    WHERE foreign_key.contype = 'f'
      AND foreign_key.confrelid = 'public.products'::regclass
      AND foreign_key.conrelid <> 'public.product_variations'::regclass
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
    WHERE COALESCE(invoice.items::text, '') LIKE '%' || p_product_id::text || '%'
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

CREATE OR REPLACE FUNCTION public.product_is_unreferenced(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT app_private.has_delete_products_permission() THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = p_product_id
  ) THEN
    RETURN false;
  END IF;

  RETURN NOT app_private.product_has_references(p_product_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_unreferenced_product(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT app_private.has_delete_products_permission() THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'permission_denied',
      'message', 'Seu perfil não permite excluir produtos.'
    );
  END IF;

  PERFORM 1
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_not_found',
      'message', 'Produto não encontrado.'
    );
  END IF;

  IF app_private.product_has_references(p_product_id) THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_in_use',
      'message', 'Produto possui vínculos, estoque ou histórico e não pode ser excluído.'
    );
  END IF;

  PERFORM pg_catalog.set_config('morantehub.allow_unreferenced_product_delete', 'on', true);

  BEGIN
    DELETE FROM public.products
    WHERE id = p_product_id;
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_in_use',
      'message', 'O produto recebeu um vínculo durante a exclusão e foi preservado.'
    );
  END;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_not_deleted',
      'message', 'O produto não foi excluído e foi preservado.'
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'code', 'product_deleted',
    'message', 'Produto excluído com sucesso.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_product_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF pg_catalog.current_setting('morantehub.allow_unreferenced_product_delete', true) = 'on'
     AND app_private.has_delete_products_permission()
     AND NOT app_private.product_has_references(OLD.id) THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Não é permitido excluir produtos com vínculos. Utilize o campo active como false para desativar o produto.';
END;
$function$;

REVOKE ALL ON FUNCTION app_private.has_delete_products_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_delete_products_permission() TO authenticated;
REVOKE ALL ON FUNCTION app_private.product_has_references(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.product_has_references(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.product_is_unreferenced(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_is_unreferenced(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_unreferenced_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_unreferenced_product(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.block_product_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_product_delete() TO authenticated;
