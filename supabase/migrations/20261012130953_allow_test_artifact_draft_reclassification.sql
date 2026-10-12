-- Permit ON/OFF for unused drafts, without reopening confirmed effects or changing run ownership.
BEGIN;
CREATE OR REPLACE FUNCTION public.test_artifact_draft_reclassification_allowed(
  p_table text,p_old jsonb,p_new jsonb,p_old_data jsonb,p_new_data jsonb
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_id text:=coalesce(p_old->>'id',p_new->>'id');
  v_parent regclass;
  v_fk record;
  v_valid_draft_history integer;
  v_total_history integer;
  v_referenced boolean;
BEGIN
  IF p_table='products' THEN
    IF NOT (coalesce((p_old->>'is_draft')::boolean,false) OR p_old->>'status'='draft')
      OR p_old->>'active'='true' OR coalesce((p_old->>'stock')::numeric,0)<>0 THEN
      RETURN false;
    END IF;
    v_parent:='public.products'::regclass;
  ELSIF p_table='orders' THEN
    IF p_old->>'status'<>'draft' OR coalesce((p_old->>'stock_processed')::boolean,false)
      OR coalesce((p_old->>'deleted')::boolean,false) THEN
      RETURN false;
    END IF;
    v_parent:='public.orders'::regclass;
  ELSE
    RETURN false;
  END IF;

  -- Coordinate with normal artifact-link checks for this exact parent row.
  IF p_table='products' THEN
    PERFORM 1 FROM public.products WHERE id::text=v_id FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.orders WHERE id::text=v_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RETURN false; END IF;

  -- The order's items/payments and one initial draft status are editable draft data.
  -- Any other referencing FK indicates a persisted relationship or external history.
  FOR v_fk IN
    SELECT child_ns.nspname AS child_schema,child.relname AS child_table,
      child_col.attname AS child_column,cardinality(con.conkey) AS source_column_count
    FROM pg_constraint con
    JOIN pg_class child ON child.oid=con.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid=child.relnamespace
    JOIN LATERAL unnest(con.conkey) fk(attnum) ON true
    JOIN pg_attribute child_col ON child_col.attrelid=child.oid AND child_col.attnum=fk.attnum
    WHERE con.contype='f' AND con.confrelid=v_parent
  LOOP
    IF p_table='orders' AND v_fk.child_schema='public'
      AND v_fk.child_table IN ('order_items','order_payments') THEN
      CONTINUE;
    END IF;
    IF p_table='orders' AND v_fk.child_schema='public'
      AND v_fk.child_table='order_status_history' THEN
      IF v_fk.source_column_count<>1 THEN RETURN false; END IF;
      EXECUTE format(
        'SELECT count(*) FILTER (WHERE old_status IS NULL AND new_status=''draft''),count(*) FROM %I.%I WHERE %I::text=$1',
        v_fk.child_schema,v_fk.child_table,v_fk.child_column
      ) INTO v_valid_draft_history,v_total_history USING v_id;
      IF v_total_history>1 OR v_total_history<>v_valid_draft_history THEN RETURN false; END IF;
      CONTINUE;
    END IF;
    IF v_fk.source_column_count<>1 THEN RETURN false; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text=$1)',
      v_fk.child_schema,v_fk.child_table,v_fk.child_column)
      INTO v_referenced USING v_id;
    IF v_referenced THEN RETURN false; END IF;
  END LOOP;

  IF p_table='products' THEN
    IF EXISTS (SELECT 1 FROM public.inventory_moves WHERE product_id=v_id)
      OR EXISTS (SELECT 1 FROM public.order_items WHERE product_id=v_id)
      OR EXISTS (
        SELECT 1 FROM public.orders o
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(o.items)='array' THEN o.items ELSE '[]'::jsonb END
        ) AS entries(item)
        WHERE entries.item->>'productId'=v_id
      )
      OR EXISTS (
        SELECT 1 FROM public.orders o
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(o.order_data->'items')='array'
            THEN o.order_data->'items' ELSE '[]'::jsonb END
        ) AS entries(item)
        WHERE entries.item->>'productId'=v_id
      )
      OR EXISTS (
        SELECT 1 FROM public.products p
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.combo_items)='array' THEN p.combo_items ELSE '[]'::jsonb END
        ) AS entries(item)
        WHERE p.id::text<>v_id AND entries.item->>'productId'=v_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchases p
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.items)='array' THEN p.items ELSE '[]'::jsonb END
        ) AS entries(item)
        WHERE entries.item->>'productId'=v_id
      )
      OR EXISTS (
        SELECT 1 FROM public.goods_receipts g
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(g.items)='array' THEN g.items ELSE '[]'::jsonb END
        ) AS entries(item)
        WHERE entries.item->>'productId'=v_id
      ) THEN
      RETURN false;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.inventory_moves
      WHERE order_id=v_id OR source_order_id=v_id
        OR (related_entity_type IN ('order','sale','return') AND related_entity_id=v_id)
    ) OR EXISTS (SELECT 1 FROM public.accounts_receivable WHERE order_id=v_id)
      OR EXISTS (SELECT 1 FROM public.financial_transactions
        WHERE reference_id=v_id AND reference_type IN ('order','sale','return'))
      OR EXISTS (SELECT 1 FROM public.nfe_documents WHERE order_id=v_id OR related_return_order_id=v_id)
      OR EXISTS (SELECT 1 FROM public.nfe_fiscal_snapshots WHERE order_id=v_id)
      OR EXISTS (SELECT 1 FROM public.nfe_outbound_attempts WHERE order_id=v_id)
      OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id<>v_id
        AND (o.linked_order_id=v_id OR o.return_order_id=v_id
          OR o.order_data->>'linkedOrderId'=v_id OR o.order_data->>'returnRequestId'=v_id)) THEN
      RETURN false;
    END IF;
  END IF;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.test_artifact_draft_reclassification_allowed(text,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.assert_test_product_components(
  p_identity jsonb,
  p_id text,
  p_seen text[] DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_product jsonb; v_component jsonb;
BEGIN
  IF p_id=ANY(p_seen) OR cardinality(p_seen)>32 THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_COMPONENT_CYCLE';
  END IF;
  PERFORM public.assert_test_artifact_link(p_identity,'products',p_id);
  v_product:=public.test_artifact_ref('products',p_id);
  FOR v_component IN
    SELECT value
    FROM jsonb_array_elements(
      coalesce(nullif(v_product->'combo_items','null'::jsonb),'[]'::jsonb)
    )
  LOOP
    PERFORM public.assert_test_artifact_link(p_identity,'product_variations',v_component->>'variationId');
    PERFORM public.assert_test_product_components(
      p_identity,v_component->>'productId',p_seen||p_id
    );
  END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION public.assert_test_artifact_link(p_identity jsonb,p_table text,p_id text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb; v_data jsonb; v_identity jsonb; v_is_test boolean;
BEGIN
  IF nullif(p_id,'') IS NULL THEN RETURN; END IF;
  IF p_table='products' THEN
    SELECT to_jsonb(p) INTO v_row FROM public.products p WHERE p.id::text=p_id FOR KEY SHARE;
  ELSIF p_table='orders' THEN
    SELECT to_jsonb(o) INTO v_row FROM public.orders o WHERE o.id::text=p_id FOR KEY SHARE;
  ELSIF p_table='product_variations' THEN
    SELECT to_jsonb(v) INTO v_row FROM public.product_variations v
      JOIN public.products p ON p.id=v.product_id WHERE v.id::text=p_id FOR KEY SHARE OF p,v;
  ELSE
    v_row:=public.test_artifact_ref(p_table,p_id);
  END IF;
  v_data:=public.test_artifact_row_data(p_table,v_row);
  v_is_test:=coalesce(v_data->>'is_test','false')='true' OR public.test_artifact_is_test(v_row);
  v_identity:=public.test_artifact_identity(v_data);
  IF (p_identity IS NULL AND v_is_test) OR
    (p_identity IS NOT NULL AND (NOT v_is_test OR v_identity IS DISTINCT FROM p_identity)) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: %',p_table;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_test_artifact_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb; v_old jsonb; v_data jsonb; v_old_data jsonb;
  v_identity jsonb; v_item jsonb; v_id text; v_old_is_test boolean; v_new_is_test boolean;
BEGIN
  v_row:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_data:=public.test_artifact_row_data(TG_TABLE_NAME,v_row);
  IF TG_OP='UPDATE' THEN
    v_old:=to_jsonb(OLD);
    v_old_data:=public.test_artifact_row_data(TG_TABLE_NAME,v_old);
    v_old_is_test:=coalesce(v_old_data->>'is_test','false')='true' OR public.test_artifact_is_test(v_old);
    v_new_is_test:=coalesce(v_data->>'is_test','false')='true' OR public.test_artifact_is_test(v_row);
    IF public.test_artifact_identity(v_old_data) IS DISTINCT FROM public.test_artifact_identity(v_data)
      OR v_old_is_test IS DISTINCT FROM v_new_is_test THEN
      IF v_old_is_test AND public.test_artifact_identity(v_old_data) IS NOT NULL THEN
        PERFORM public.assert_test_artifact_identity(v_old_data);
      END IF;
      IF NOT public.test_artifact_draft_reclassification_allowed(TG_TABLE_NAME,v_old,v_row,v_old_data,v_data) THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_IDENTITY_IMMUTABLE';
      END IF;
    END IF;
  END IF;
  IF coalesce(v_data->>'is_test','false')='true' OR public.test_artifact_is_test(v_row) THEN
    v_identity:=public.assert_test_artifact_identity(v_data);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;

  IF TG_TABLE_NAME='orders' THEN
    IF v_identity IS NOT NULL AND nullif(coalesce(v_row->>'customer_id',v_row#>>'{order_data,customerData,id}'),'') IS NULL THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_CUSTOMER_REQUIRED';
    END IF;
    PERFORM public.assert_test_artifact_link(v_identity,'people',coalesce(v_row->>'customer_id',v_row#>>'{order_data,customerData,id}'));
    PERFORM public.assert_test_artifact_link(v_identity,'orders',coalesce(v_row->>'linked_order_id',v_row#>>'{order_data,linkedOrderId}'));
    FOR v_item IN SELECT value FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(v_row->'items')='array' AND jsonb_array_length(v_row->'items')>0 THEN v_row->'items'
        WHEN jsonb_typeof(v_row#>'{order_data,items}')='array' THEN v_row#>'{order_data,items}'
        ELSE '[]'::jsonb
      END
    ) LOOP
      IF nullif(v_item->>'productId','') IS NOT NULL THEN
        PERFORM public.assert_test_product_components(v_identity,v_item->>'productId');
        PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_item->>'variationId');
        PERFORM public.assert_test_product_variation(v_item->>'productId',v_item->>'variationId');
      END IF;
    END LOOP;
  ELSIF TG_TABLE_NAME='products' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'people',v_row->>'supplier_id');
    PERFORM public.assert_test_artifact_link(v_identity,'products',v_row->>'parent_id');
    FOR v_id IN
      SELECT jsonb_array_elements_text(
        coalesce(nullif(v_row->'supplier_ids','null'::jsonb),'[]'::jsonb)
      )
    LOOP
      PERFORM public.assert_test_artifact_link(v_identity,'people',v_id);
    END LOOP;
    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(
        coalesce(nullif(v_row->'combo_items','null'::jsonb),'[]'::jsonb)
      )
    LOOP
      PERFORM public.assert_test_product_components(v_identity,v_item->>'productId',ARRAY[v_row->>'id']);
      PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_item->>'variationId');
      PERFORM public.assert_test_product_variation(v_item->>'productId',v_item->>'variationId');
    END LOOP;
  ELSIF TG_TABLE_NAME='product_variations' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'products',v_row->>'product_id');
  ELSIF TG_TABLE_NAME='inventory_moves' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'products',v_row->>'product_id');
    PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_row->>'variation_id');
    PERFORM public.assert_test_product_variation(v_row->>'product_id',v_row->>'variation_id');
    PERFORM public.assert_test_artifact_link(v_identity,'orders',v_row->>'source_order_id');
    IF v_row->>'related_entity_type' IS DISTINCT FROM 'goods_receipt' THEN
      PERFORM public.assert_test_artifact_link(v_identity,'orders',v_row->>'order_id');
    END IF;
    PERFORM public.assert_test_artifact_link(v_identity,'goods_receipts',v_row->>'source_receipt_id');
  ELSIF TG_TABLE_NAME='accounts_receivable' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'orders',v_row->>'order_id');
  ELSIF TG_TABLE_NAME='purchases' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'people',v_row->>'supplier_id');
    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(
        coalesce(nullif(v_row->'items','null'::jsonb),'[]'::jsonb)
      )
    LOOP
      PERFORM public.assert_test_product_components(v_identity,v_item->>'productId');
      PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_item->>'variationId');
      PERFORM public.assert_test_product_variation(v_item->>'productId',v_item->>'variationId');
    END LOOP;
  ELSIF TG_TABLE_NAME='financial_transactions' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'accounts_receivable',v_row->>'receivable_id');
    PERFORM public.assert_test_artifact_link(v_identity,'accounts_payable',v_row->>'payable_id');
    IF v_row->>'reference_type' IN ('order','sale','return') THEN
      PERFORM public.assert_test_artifact_link(v_identity,'orders',v_row->>'reference_id');
    END IF;
  ELSIF TG_TABLE_NAME='goods_receipts' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'purchases',v_row->>'purchase_id');
    PERFORM public.assert_test_artifact_link(v_identity,'people',v_row->>'supplier_id');
    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(
        coalesce(nullif(v_row->'items','null'::jsonb),'[]'::jsonb)
      )
    LOOP
      PERFORM public.assert_test_product_components(v_identity,v_item->>'productId');
      PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_item->>'variationId');
      PERFORM public.assert_test_product_variation(v_item->>'productId',v_item->>'variationId');
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;
COMMIT;
