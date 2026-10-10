-- JSONB null is a scalar, not SQL NULL. Treat JSON null as an empty optional
-- array while preserving errors for malformed non-array values.
BEGIN;

CREATE OR REPLACE FUNCTION public.assert_test_product_components(
  p_identity jsonb,
  p_id text,
  p_seen text[] DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
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

CREATE OR REPLACE FUNCTION public.guard_test_artifact_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb; v_old jsonb; v_data jsonb; v_old_data jsonb;
  v_identity jsonb; v_item jsonb; v_id text;
BEGIN
  v_row:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_data:=public.test_artifact_row_data(TG_TABLE_NAME,v_row);
  IF TG_OP='UPDATE' THEN
    v_old:=to_jsonb(OLD);
    v_old_data:=public.test_artifact_row_data(TG_TABLE_NAME,v_old);
    IF (coalesce(v_old_data->>'is_test','false')='true' OR coalesce(v_data->>'is_test','false')='true')
      AND (public.test_artifact_identity(v_old_data) IS DISTINCT FROM public.test_artifact_identity(v_data)
        OR coalesce(v_old_data->>'is_test','false') IS DISTINCT FROM coalesce(v_data->>'is_test','false')) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IDENTITY_IMMUTABLE';
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
