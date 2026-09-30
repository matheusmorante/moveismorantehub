-- Authorized remote check. Every fixture and fiscal reservation is rolled back.
-- No SOAP, operational order, inventory or financial write. Do not use for a real emission.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $test$
DECLARE
  v_order text := 'TEST_AUT_' || gen_random_uuid()::text;
  v_request uuid := gen_random_uuid(); v_token uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid(); v_doc uuid; v_snapshot jsonb; v_repeat jsonb;
  v_key text; v_metrics text; v_queue bigint; v_count integer;
  v_line jsonb := '{"item_number":1,"product_code":"TEST_AUT","description":"TEST_AUT","billed_quantity":1,"unit_value":1,"gross_value":1,"discount_value":0,"product_xml":"<prod/>","taxes_xml":"<imposto/>"}';
BEGIN
  PERFORM set_config('morante.remote_test_run', v_order, false);
  SELECT md5(COALESCE(jsonb_agg(to_jsonb(m) ORDER BY metric_date)::text,'')) INTO v_metrics FROM public.dashboard_daily_metrics m;
  SELECT count(*) INTO v_queue FROM net.http_request_queue;
  INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at)
    VALUES(v_order,'sale','draft',true,'[]',jsonb_build_object('testRunId',v_order,
      'fiscalScenario','HML_TECHNICAL_V1','deleted',true,'items','[]'::jsonb,'payments','[]'::jsonb),now());
  IF NOT public.is_nfe_hml_technical_order(v_order,'draft',true,
      (SELECT order_data FROM orders WHERE id=v_order)) THEN RAISE EXCEPTION 'isolation predicate failed'; END IF;
  IF public.is_nfe_hml_technical_order('operational','draft',true,'{}') THEN RAISE EXCEPTION 'operational predicate failed'; END IF;
  IF v_queue <> (SELECT count(*) FROM net.http_request_queue) THEN RAISE EXCEPTION 'delivery queue changed'; END IF;
  IF v_metrics <> (SELECT md5(COALESCE(jsonb_agg(to_jsonb(m) ORDER BY metric_date)::text,'')) FROM public.dashboard_daily_metrics m) THEN RAISE EXCEPTION 'metrics changed'; END IF;
  -- A synthetic row outside the HML predicate still exercises the original path.
  -- The subtransaction rolls back its queue entry before pg_net can send it.
  BEGIN
    INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at)
      VALUES('TEST_AUT_'||gen_random_uuid()::text,'sale','pending',true,'[]',
        '{"date":"2030-01-01","payments":[],"items":[],"deleted":true}',now());
    IF NOT EXISTS(SELECT 1 FROM public.dashboard_daily_metrics WHERE metric_date='2030-01-01')
      THEN RAISE EXCEPTION 'ordinary metrics path was suppressed'; END IF;
    IF EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='delivery_summary_job_secret'
        AND COALESCE(decrypted_secret,'') <> '') AND
        (SELECT count(*) FROM net.http_request_queue) <> v_queue+1
      THEN RAISE EXCEPTION 'ordinary delivery path was suppressed'; END IF;
    RAISE EXCEPTION 'TEST_AUT_ROLLBACK_BASELINE';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'TEST_AUT_ROLLBACK_BASELINE' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM order_items WHERE order_id=v_order) OR EXISTS(SELECT 1 FROM order_payments WHERE order_id=v_order)
    OR EXISTS(SELECT 1 FROM inventory_moves WHERE order_id=v_order OR source_order_id=v_order)
    OR EXISTS(SELECT 1 FROM accounts_receivable WHERE order_id=v_order)
    OR EXISTS(SELECT 1 FROM financial_transactions WHERE reference_id=v_order) THEN RAISE EXCEPTION 'operational effect created'; END IF;
  v_snapshot := public.prepare_nfe_fiscal_snapshot(v_order,v_request,'55',2,'998',1,'{"1":"103"}');
  v_repeat := public.prepare_nfe_fiscal_snapshot(v_order,v_request,'55',2,'998',1,'{"1":"103"}');
  IF v_repeat <> v_snapshot THEN RAISE EXCEPTION 'snapshot retry changed'; END IF;
  IF (SELECT snapshot_data #>> '{fiscalConfiguration,csosn}' FROM nfe_fiscal_snapshots WHERE emission_request_id=v_request) <> '103'
    OR (SELECT snapshot_data #>> '{emissionRequest,itemCsosnOverrides,1}' FROM nfe_fiscal_snapshots WHERE emission_request_id=v_request) <> '103'
    THEN RAISE EXCEPTION 'configuration/choice not captured'; END IF;
  BEGIN
    PERFORM public.prepare_nfe_fiscal_snapshot(v_order,v_request,'55',2,'998',1,'{"1":"102"}');
    RAISE EXCEPTION 'choice replacement accepted';
  EXCEPTION WHEN unique_violation THEN
    IF SQLERRM <> 'IDEMPOTENCY_KEY_REUSED' THEN RAISE; END IF;
  END;
  v_key := '4126091234567800019555998' || lpad(v_snapshot->>'number',9,'0') || '1123456780';
  v_doc := public.reserve_hml_nfe_outbound(v_order,v_request,v_key,'<NFe><infNFe Id="NFe'||v_key||'"/></NFe>',
    (v_snapshot->>'number')::integer,'998','[{}]',v_token);
  IF public.claim_hml_nfe_attempt(v_doc,v_other) THEN RAISE EXCEPTION 'active lease stolen'; END IF;
  PERFORM public.release_hml_nfe_attempt(v_doc,v_other);
  IF (SELECT hml_attempt_token FROM nfe_documents WHERE id=v_doc) <> v_token THEN RAISE EXCEPTION 'wrong owner released'; END IF;
  BEGIN
    PERFORM public.persist_hml_nfe_result(v_doc,'pendente','timeout','',NULL,'[]',v_other);
    RAISE EXCEPTION 'stale write accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'HML_ATTEMPT_LEASE_LOST' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.persist_hml_nfe_result(v_doc,'homologada','100: fixture','<fixture/>','TEST_AUT_PROTOCOL',
      jsonb_build_array(v_line,v_line || '{"item_number":2,"billed_quantity":0}'::jsonb),v_token);
    RAISE EXCEPTION 'invalid second line accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM nfe_document_items WHERE document_id=v_doc)
    OR (SELECT status FROM nfe_documents WHERE id=v_doc) <> 'processando'
    OR (SELECT jsonb_array_length(hml_response_history) FROM nfe_documents WHERE id=v_doc) <> 0
    THEN RAISE EXCEPTION 'partial authorization survived'; END IF;
  PERFORM public.persist_hml_nfe_result(v_doc,'erro','217: fixture','<fixture/>',NULL,'[]',v_token);
  PERFORM public.reactivate_hml_nfe_retry(v_doc,v_token);
  PERFORM public.persist_hml_nfe_result(v_doc,'homologada','100: fixture','<fixture/>','TEST_AUT_PROTOCOL',jsonb_build_array(v_line),v_token);
  PERFORM public.persist_hml_nfe_result(v_doc,'homologada','100: fixture','<fixture/>','TEST_AUT_PROTOCOL',jsonb_build_array(v_line),v_token);
  IF (SELECT count(*) FROM nfe_document_items WHERE document_id=v_doc) <> 1
    OR (SELECT jsonb_array_length(hml_response_history) FROM nfe_documents WHERE id=v_doc) <> 2 THEN RAISE EXCEPTION 'duplicate confirmation'; END IF;
  BEGIN
    PERFORM public.persist_hml_nfe_result(v_doc,'pendente','timeout','',NULL,'[]',v_token);
    RAISE EXCEPTION 'confirmed fact reversed';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'AUTHORIZED_HML_IMMUTABLE' THEN RAISE; END IF;
  END;
  IF has_function_privilege('authenticated','public.claim_hml_nfe_attempt(uuid,uuid)','EXECUTE')
    OR has_table_privilege('anon','public.nfe_fiscal_snapshots','SELECT') THEN RAISE EXCEPTION 'browser privileges exposed'; END IF;
END;
$test$;
ROLLBACK;
-- No business data or mocked protocol is committed.
SELECT 'remote controlled checks passed; fixtures rolled back' AS result;
