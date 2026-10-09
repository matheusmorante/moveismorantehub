-- Identificação no schema existente. Não cria tabelas, schemas ou colunas de teste.
-- Movimentos e históricos continuam pelos fluxos de negócio; notificações são
-- suprimidas na camada de envio. Guards falham na transação para vínculos
-- que alcancem artefatos de outra execução.
BEGIN;

CREATE FUNCTION public.test_artifact_project(p_data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'is_test',coalesce(p_data->'is_test',p_data->'isTest'),
    'runId',coalesce(p_data->'runId',p_data->'testRunId',p_data->'test_run_id'),
    'ownerId',coalesce(p_data->'ownerId',p_data->'testOwnerId')));
$$;

CREATE FUNCTION public.test_artifact_data(p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE v_data jsonb; v_text text; v_note jsonb;
BEGIN
  v_data:=coalesce(p_row->'order_data',p_row);
  IF jsonb_typeof(v_data->'testArtifact')='object' THEN RETURN public.test_artifact_project(v_data->'testArtifact'); END IF;
  IF jsonb_typeof(v_data#>'{technical_specs,testArtifact}')='object' THEN RETURN public.test_artifact_project(v_data#>'{technical_specs,testArtifact}'); END IF;
  IF jsonb_typeof(v_data#>'{full_address,testArtifact}')='object' THEN RETURN public.test_artifact_project(v_data#>'{full_address,testArtifact}'); END IF;
  IF jsonb_typeof(v_data#>'{address,testArtifact}')='object' THEN RETURN public.test_artifact_project(v_data#>'{address,testArtifact}'); END IF;
  IF jsonb_typeof(v_data#>'{attributes,testArtifact}')='object' THEN RETURN public.test_artifact_project(v_data#>'{attributes,testArtifact}'); END IF;
  FOREACH v_text IN ARRAY ARRAY[v_data->>'notes',v_data->>'observation'] LOOP
    BEGIN
      v_note:=v_text::jsonb;
      IF jsonb_typeof(v_note->'testArtifact')='object' THEN RETURN public.test_artifact_project(v_note->'testArtifact'); END IF;
    EXCEPTION WHEN invalid_text_representation THEN NULL;
    END;
  END LOOP;
  RETURN public.test_artifact_project(v_data);
END; $$;

CREATE FUNCTION public.test_artifact_is_test(p_row jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT coalesce(p_row#>>'{order_data,is_test}',p_row->>'is_test','false')='true'
    OR coalesce(p_row#>>'{order_data,isTest}',p_row->>'isTest','false')='true'
    OR coalesce(public.test_artifact_data(p_row)->>'is_test','false')='true';
$$;

CREATE FUNCTION public.test_artifact_identity(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE v_run text; v_owner text;
BEGIN
  IF p_data->'is_test' IS DISTINCT FROM 'true'::jsonb THEN RETURN NULL; END IF;
  v_run:=lower(regexp_replace(coalesce(p_data->>'runId',p_data->>'testRunId',p_data->>'test_run_id',''),'^TEST_AUT_','','i'));
  v_owner:=lower(coalesce(p_data->>'ownerId',p_data->>'testOwnerId',''));
  IF v_run !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR v_owner !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('runId',v_run,'ownerId',v_owner);
END; $$;

CREATE FUNCTION public.test_artifact_ref(p_table text,p_id text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb;
BEGIN
  IF nullif(p_id,'') IS NULL THEN RETURN '{}'::jsonb; END IF;
  CASE p_table
    WHEN 'orders' THEN SELECT to_jsonb(r) INTO v_row FROM public.orders r WHERE r.id::text=p_id;
    WHEN 'people' THEN SELECT to_jsonb(r) INTO v_row FROM public.people r WHERE r.id::text=p_id;
    WHEN 'products' THEN SELECT to_jsonb(r) INTO v_row FROM public.products r WHERE r.id::text=p_id;
    WHEN 'product_variations' THEN
      SELECT to_jsonb(p) INTO v_row FROM public.product_variations v JOIN public.products p ON p.id=v.product_id WHERE v.id::text=p_id;
    WHEN 'accounts_receivable' THEN SELECT to_jsonb(r) INTO v_row FROM public.accounts_receivable r WHERE r.id::text=p_id;
    WHEN 'accounts_payable' THEN SELECT to_jsonb(r) INTO v_row FROM public.accounts_payable r WHERE r.id::text=p_id;
    WHEN 'goods_receipts' THEN SELECT to_jsonb(r) INTO v_row FROM public.goods_receipts r WHERE r.id::text=p_id;
    ELSE RAISE EXCEPTION 'Unsupported test artifact reference';
  END CASE;
  RETURN coalesce(v_row,'{}'::jsonb);
END; $$;

CREATE FUNCTION public.test_artifact_row_data(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_ref jsonb; v_id text;
BEGIN
  IF public.test_artifact_is_test(p_row) THEN RETURN public.test_artifact_data(p_row); END IF;
  IF p_table='product_variations' THEN
    RETURN public.test_artifact_data(public.test_artifact_ref('products',p_row->>'product_id'));
  ELSIF p_table IN ('inventory_moves','accounts_receivable') THEN
    v_id:=coalesce(nullif(p_row->>'order_id',''),nullif(p_row->>'source_order_id',''),
      CASE WHEN p_row->>'related_entity_type' IN ('order','sale','return') THEN p_row->>'related_entity_id' END);
    v_ref:=public.test_artifact_ref('orders',v_id);
    IF public.test_artifact_is_test(v_ref) THEN RETURN public.test_artifact_data(v_ref); END IF;
    IF p_table='inventory_moves' THEN RETURN public.test_artifact_data(public.test_artifact_ref('products',p_row->>'product_id')); END IF;
  ELSIF p_table='financial_transactions' THEN
    IF nullif(p_row->>'receivable_id','') IS NOT NULL THEN
      v_ref:=public.test_artifact_ref('accounts_receivable',p_row->>'receivable_id');
      RETURN public.test_artifact_row_data('accounts_receivable',v_ref);
    ELSIF nullif(p_row->>'payable_id','') IS NOT NULL THEN
      RETURN public.test_artifact_data(public.test_artifact_ref('accounts_payable',p_row->>'payable_id'));
    ELSIF p_row->>'reference_type' IN ('order','sale','return') THEN
      RETURN public.test_artifact_data(public.test_artifact_ref('orders',p_row->>'reference_id'));
    END IF;
  END IF;
  RETURN public.test_artifact_data(p_row);
END; $$;

CREATE FUNCTION public.assert_test_artifact_identity(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_identity jsonb;
BEGIN
  v_identity:=public.test_artifact_identity(p_data);
  IF v_identity IS NULL OR auth.uid() IS NULL OR NOT coalesce(public.is_administrator(),false)
    OR v_identity->>'ownerId' IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: execução e operador administrador autenticado são obrigatórios';
  END IF;
  RETURN v_identity;
END; $$;

CREATE FUNCTION public.assert_test_artifact_link(p_identity jsonb,p_table text,p_id text) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb; v_data jsonb; v_identity jsonb; v_is_test boolean;
BEGIN
  IF nullif(p_id,'') IS NULL THEN RETURN; END IF;
  v_row:=public.test_artifact_ref(p_table,p_id);
  v_data:=public.test_artifact_row_data(p_table,v_row);
  v_is_test:=coalesce(v_data->>'is_test','false')='true' OR public.test_artifact_is_test(v_row);
  v_identity:=public.test_artifact_identity(v_data);
  IF (p_identity IS NULL AND v_is_test) OR
    (p_identity IS NOT NULL AND (NOT v_is_test OR v_identity IS DISTINCT FROM p_identity)) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: %',p_table;
  END IF;
END; $$;

CREATE FUNCTION public.assert_test_product_components(p_identity jsonb,p_id text,p_seen text[] DEFAULT '{}') RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_product jsonb; v_component jsonb;
BEGIN
  IF p_id=ANY(p_seen) OR cardinality(p_seen)>32 THEN RAISE EXCEPTION 'TEST_ARTIFACT_COMPONENT_CYCLE'; END IF;
  PERFORM public.assert_test_artifact_link(p_identity,'products',p_id);
  v_product:=public.test_artifact_ref('products',p_id);
  FOR v_component IN SELECT value FROM jsonb_array_elements(coalesce(v_product->'combo_items','[]'::jsonb)) LOOP
    PERFORM public.assert_test_artifact_link(p_identity,'product_variations',v_component->>'variationId');
    PERFORM public.assert_test_product_components(p_identity,v_component->>'productId',p_seen||p_id);
  END LOOP;
END; $$;

CREATE FUNCTION public.assert_test_product_variation(p_product_id text,p_variation_id text) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_parent text;
BEGIN
  IF nullif(p_variation_id,'') IS NULL THEN RETURN; END IF;
  SELECT v.product_id::text INTO v_parent
  FROM public.product_variations v WHERE v.id::text=p_variation_id;
  IF NOT FOUND OR v_parent IS DISTINCT FROM p_product_id THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_VARIATION_PRODUCT_MISMATCH';
  END IF;
END; $$;

CREATE FUNCTION public.guard_test_artifact_record() RETURNS trigger
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
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_row->'items',v_row#>'{order_data,items}','[]'::jsonb)) LOOP
      IF nullif(v_item->>'productId','') IS NOT NULL THEN
        PERFORM public.assert_test_product_components(v_identity,v_item->>'productId');
        PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_item->>'variationId');
        PERFORM public.assert_test_product_variation(v_item->>'productId',v_item->>'variationId');
      END IF;
    END LOOP;
  ELSIF TG_TABLE_NAME='products' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'people',v_row->>'supplier_id');
    PERFORM public.assert_test_artifact_link(v_identity,'products',v_row->>'parent_id');
    FOR v_id IN SELECT jsonb_array_elements_text(coalesce(v_row->'supplier_ids','[]'::jsonb)) LOOP
      PERFORM public.assert_test_artifact_link(v_identity,'people',v_id);
    END LOOP;
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_row->'combo_items','[]'::jsonb)) LOOP
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
    FOREACH v_id IN ARRAY ARRAY[v_row->>'order_id',v_row->>'source_order_id'] LOOP
      PERFORM public.assert_test_artifact_link(v_identity,'orders',v_id);
    END LOOP;
    PERFORM public.assert_test_artifact_link(v_identity,'goods_receipts',v_row->>'source_receipt_id');
  ELSIF TG_TABLE_NAME='accounts_receivable' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'orders',v_row->>'order_id');
  ELSIF TG_TABLE_NAME='financial_transactions' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'accounts_receivable',v_row->>'receivable_id');
    PERFORM public.assert_test_artifact_link(v_identity,'accounts_payable',v_row->>'payable_id');
    IF v_row->>'reference_type' IN ('order','sale','return') THEN
      PERFORM public.assert_test_artifact_link(v_identity,'orders',v_row->>'reference_id');
    END IF;
  ELSIF TG_TABLE_NAME='goods_receipts' THEN
    PERFORM public.assert_test_artifact_link(v_identity,'people',v_row->>'supplier_id');
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_row->'items','[]'::jsonb)) LOOP
      PERFORM public.assert_test_product_components(v_identity,v_item->>'productId');
      PERFORM public.assert_test_artifact_link(v_identity,'product_variations',v_item->>'variationId');
      PERFORM public.assert_test_product_variation(v_item->>'productId',v_item->>'variationId');
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DO $$ DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['orders','people','products','product_variations','inventory_moves',
    'accounts_receivable','accounts_payable','financial_transactions','goods_receipts'] LOOP
    EXECUTE format('CREATE TRIGGER test_artifact_record_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_test_artifact_record()',v_table);
  END LOOP;
END; $$;

CREATE FUNCTION public.suppress_test_artifact_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order jsonb;
BEGIN
  IF public.test_artifact_is_test(to_jsonb(NEW)) THEN RETURN NULL; END IF;
  IF nullif(NEW.order_id,'') IS NOT NULL THEN
    SELECT to_jsonb(o) INTO v_order FROM public.orders o WHERE o.id::text=NEW.order_id;
    IF public.test_artifact_is_test(v_order) THEN RETURN NULL; END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER suppress_test_artifact_notification
BEFORE INSERT ON public.app_notifications
FOR EACH ROW EXECUTE FUNCTION public.suppress_test_artifact_notification();

-- Patch only the configured dashboard functions after checking the deployed
-- source snippets. A drifted function aborts the migration instead of silently
-- leaving tests inside SQL aggregates.
DO $$
DECLARE v_oid oid; v_definition text; v_patched text; v_day date;
BEGIN
  v_oid:=to_regprocedure('public.get_dashboard_aggregates(timestamptz,timestamptz,text)');
  IF v_oid IS NULL THEN RAISE EXCEPTION 'Expected get_dashboard_aggregates signature was not found'; END IF;
  v_definition:=pg_get_functiondef(v_oid);
  v_patched:=replace(v_definition,
    'WHERE COALESCE(o.deleted, false) = false',
    'WHERE COALESCE(o.deleted, false) = false AND NOT public.test_artifact_is_test(to_jsonb(o))');
  IF v_patched=v_definition THEN RAISE EXCEPTION 'Dashboard aggregate source has drifted'; END IF;
  EXECUTE v_patched;

  v_oid:=to_regprocedure('public.refresh_dashboard_metric_day(date)');
  IF v_oid IS NULL THEN RAISE EXCEPTION 'Expected refresh_dashboard_metric_day signature was not found'; END IF;
  v_definition:=pg_get_functiondef(v_oid);
  v_patched:=replace(v_definition,
    'AND NOT public.is_nfe_hml_test_order(id, status, deleted, order_data)',
    'AND NOT public.is_nfe_hml_test_order(id, status, deleted, order_data)'||E'\n      AND NOT public.test_artifact_is_test(jsonb_build_object(''order_data'', order_data))');
  IF v_patched=v_definition THEN RAISE EXCEPTION 'Dashboard daily metric source has drifted'; END IF;
  EXECUTE v_patched;

  -- Rebuild only calendar days touched by marked test orders so stored dashboard
  -- metrics no longer retain their prior contribution.
  FOR v_day IN
    SELECT DISTINCT public.parse_order_metric_date(o.order_data->>'date',o.created_at)
    FROM public.orders o
    WHERE NOT coalesce(o.deleted,false)
      AND public.test_artifact_is_test(to_jsonb(o))
      AND public.parse_order_metric_date(o.order_data->>'date',o.created_at) IS NOT NULL
  LOOP
    PERFORM public.refresh_dashboard_metric_day(v_day);
  END LOOP;
END; $$;

-- Relatórios financeiros consultam as tabelas existentes com filtro no servidor,
-- sem alterar a listagem operacional de movimentações.
CREATE FUNCTION public.get_report_financial_transactions(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_end_exclusive boolean DEFAULT false
) RETURNS SETOF public.financial_transactions
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT f.* FROM public.financial_transactions f
  WHERE coalesce(public.test_artifact_row_data('financial_transactions',to_jsonb(f))->>'is_test','false')<>'true'
    AND (p_start_date IS NULL OR f.date>=p_start_date)
    AND (p_end_date IS NULL OR CASE WHEN p_end_exclusive THEN f.date<p_end_date ELSE f.date<=p_end_date END);
$$;
CREATE FUNCTION public.get_report_accounts_payable(p_status text DEFAULT NULL) RETURNS SETOF public.accounts_payable
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT p.* FROM public.accounts_payable p
  WHERE NOT public.test_artifact_is_test(to_jsonb(p)) AND (p_status IS NULL OR p.status=p_status);
$$;
CREATE FUNCTION public.get_report_accounts_receivable(p_status text DEFAULT NULL) RETURNS SETOF public.accounts_receivable
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT r.* FROM public.accounts_receivable r
  WHERE coalesce(public.test_artifact_row_data('accounts_receivable',to_jsonb(r))->>'is_test','false')<>'true'
    AND (p_status IS NULL OR r.status=p_status);
$$;

-- Read-only runtime gate used by the fiscal Playwright runner. It confirms the
-- guards and report filters are installed in the configured Supabase project.
CREATE FUNCTION public.test_artifact_policy_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_record_guards integer; v_notification_guard integer; v_dashboard text; v_metrics text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_STATUS_SERVICE_ROLE_REQUIRED';
  END IF;

  SELECT count(*) INTO v_record_guards
  FROM pg_trigger t
  JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND t.tgname='test_artifact_record_guard'
    AND c.relname=ANY(ARRAY['orders','people','products','product_variations','inventory_moves',
      'accounts_receivable','accounts_payable','financial_transactions','goods_receipts'])
    AND NOT t.tgisinternal AND t.tgenabled<>'D';

  SELECT count(*) INTO v_notification_guard
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='app_notifications'
    AND t.tgname='suppress_test_artifact_notification' AND NOT t.tgisinternal AND t.tgenabled<>'D';

  SELECT pg_get_functiondef(to_regprocedure('public.get_dashboard_aggregates(timestamptz,timestamptz,text)'))
    INTO v_dashboard;
  SELECT pg_get_functiondef(to_regprocedure('public.refresh_dashboard_metric_day(date)'))
    INTO v_metrics;

  RETURN jsonb_build_object(
    'ready', v_record_guards=9 AND v_notification_guard=1
      AND to_regprocedure('public.get_report_financial_transactions(date,date,boolean)') IS NOT NULL
      AND to_regprocedure('public.get_report_accounts_payable(text)') IS NOT NULL
      AND to_regprocedure('public.get_report_accounts_receivable(text)') IS NOT NULL
      AND coalesce(position('test_artifact_is_test' IN v_dashboard),0)>0
      AND coalesce(position('test_artifact_is_test' IN v_metrics),0)>0,
    'policyVersion', 'json-artifacts-v1'
  );
END; $$;

REVOKE ALL ON FUNCTION public.test_artifact_ref(text,text),public.test_artifact_row_data(text,jsonb),
  public.assert_test_artifact_identity(jsonb),public.assert_test_artifact_link(jsonb,text,text),
  public.assert_test_product_components(jsonb,text,text[]),public.assert_test_product_variation(text,text),
  public.guard_test_artifact_record(),public.suppress_test_artifact_notification() FROM PUBLIC,anon,authenticated;
-- Reporting functions retain callers' RLS. The helper exposes only metadata;
-- an authenticated caller needs it for the SECURITY INVOKER report functions.
GRANT EXECUTE ON FUNCTION public.test_artifact_row_data(text,jsonb) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_report_financial_transactions(date,date,boolean),public.get_report_accounts_payable(text),public.get_report_accounts_receivable(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_report_financial_transactions(date,date,boolean),public.get_report_accounts_payable(text),public.get_report_accounts_receivable(text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.test_artifact_policy_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.test_artifact_policy_status() TO service_role;

COMMIT;
