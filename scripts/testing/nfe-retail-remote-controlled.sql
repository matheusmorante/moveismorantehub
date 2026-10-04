-- Versioned RPC integration; no SOAP. Every fixture and number is rolled back.
-- testRunId=TEST_AUT_c2e5184a-d689-4010-916a-46a4eb6561bc; owned order IDs: 64097924-8f87-4446-8241-5f7ae4df454e, c7522feb-0a5a-4be0-b5f0-ba3435f446f3, 4faf5563-d1c6-4267-b591-0d61cb8ffa25
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $test$
DECLARE
 v_run text:='c2e5184a-d689-4010-916a-46a4eb6561bc'; v_customer text:='TEST_AUT_c2e5184a-d689-4010-916a-46a4eb6561bc';
 v_orders text[]:=ARRAY['64097924-8f87-4446-8241-5f7ae4df454e','c7522feb-0a5a-4be0-b5f0-ba3435f446f3','4faf5563-d1c6-4267-b591-0d61cb8ffa25'];
 v_product uuid:=gen_random_uuid(); v_model text; v_final boolean; v_order text;
 v_series text; v_request uuid; v_token uuid; v_other uuid; v_doc uuid;
 v_snapshot jsonb; v_repeat jsonb; v_decision jsonb; v_trace jsonb; v_key text;
 v_metrics text; v_queue bigint; v_seq integer; v_i integer; v_count integer;
 v_selection jsonb:='{"1":{"ncm":"94036000","cfop":"5102","origem":"0","cest":"","csosn":"103"}}';
 v_line jsonb:='{"item_number":1,"product_code":"TEST_AUT","description":"TEST_AUT","billed_quantity":1,"unit_value":1,"gross_value":1,"discount_value":0,"product_xml":"<prod/>","taxes_xml":"<imposto/>"}';
BEGIN
 SELECT s::text INTO v_series FROM generate_series(880,889) s WHERE NOT EXISTS
  (SELECT 1 FROM public.nfe_sequences n WHERE n.serie=s::text AND n.ambiente=2) LIMIT 1;
 IF v_series IS NULL THEN RAISE EXCEPTION 'No isolated HML series available'; END IF;
 SELECT md5(COALESCE(jsonb_agg(to_jsonb(m) ORDER BY metric_date)::text,'')) INTO v_metrics FROM public.dashboard_daily_metrics m;
 SELECT count(*) INTO v_queue FROM net.http_request_queue;
 INSERT INTO public.people(id,full_name,person_type,person_type_pf_pj,cpf_cnpj,deleted,address)
 VALUES(v_customer,v_customer,'customers','PF','',false,'{"street":"Rua TEST_AUT","number":"1","district":"Teste","city":"Curitiba","state":"PR","ibgeCode":"4106902"}');
 INSERT INTO public.products(id,name,slug,price,fiscal) VALUES
 (v_product,v_customer,lower(v_customer),1,'{"ncm":"94036000","cfop":"5102","origem":"0","cst":"103"}');
 FOR v_i IN 1..2 LOOP
  v_model:=CASE WHEN v_i=1 THEN '65' ELSE '55' END; v_final:=v_i=1; v_order:=v_orders[v_i];
  v_request:=gen_random_uuid(); v_token:=gen_random_uuid(); v_other:=gen_random_uuid();
  INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at) VALUES
  (v_order,'sale','scheduled',false,'[]',jsonb_build_object('orderType','sale','date',now()::text,
   'testRunId',v_run,'test_run_id','TEST_AUT_'||v_run,'is_test',true,'test_environment','homologation',
   'customerData',jsonb_build_object('id',v_customer),'shipping',jsonb_build_object('deliveryMethod','pickup'),
   'items',jsonb_build_array(jsonb_build_object('itemType','product','productId',v_product,'quantity',1,'unitPrice',1)),
   'payments','[]'::jsonb,'paymentsSummary',jsonb_build_object('totalOrderValue',1)),now());
  IF NOT public.is_nfe_hml_test_order(v_order,'scheduled',false,(SELECT order_data FROM public.orders WHERE id=v_order)) THEN
   RAISE EXCEPTION 'Synthetic isolation predicate failed'; END IF;
  v_decision:=jsonb_build_object('status','ready','model',v_model,'finalConsumer',v_final,
   'policyVersion','PR_RETAIL_2026_10','reasonCode',CASE WHEN v_final THEN 'RETAIL_FINAL_CONSUMER_IN_STATE' ELSE 'RESALE' END);
  v_snapshot:=public.prepare_nfe_fiscal_snapshot_with_context(v_order,v_request,v_model,2,v_series,1,'{"1":"103"}',v_selection,'12345678909',v_final,false,false,v_decision);
  v_repeat:=public.prepare_nfe_fiscal_snapshot_with_context(v_order,v_request,v_model,2,v_series,1,'{"1":"103"}',v_selection,'12345678909',v_final,false,false,v_decision);
  IF v_repeat<>v_snapshot OR (SELECT snapshot_data#>'{emissionRequest,modelDecision}' FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request)<>v_decision THEN
   RAISE EXCEPTION 'Context or retry identity changed'; END IF;
  SELECT ultimo_numero INTO v_seq FROM public.nfe_sequences WHERE modelo=v_model AND serie=v_series AND ambiente=2;
  BEGIN
   PERFORM public.prepare_nfe_fiscal_snapshot_with_context(v_order,v_request,v_model,2,v_series,1,'{"1":"103"}',v_selection,'12345678909',v_final,true,false,v_decision);
   RAISE EXCEPTION 'Context replacement accepted';
  EXCEPTION WHEN unique_violation THEN IF SQLERRM<>'IDEMPOTENCY_KEY_REUSED' THEN RAISE; END IF; END;
  IF v_seq<>(SELECT ultimo_numero FROM public.nfe_sequences WHERE modelo=v_model AND serie=v_series AND ambiente=2) THEN RAISE EXCEPTION 'Failed context consumed a number'; END IF;
  v_key:='41261012345678000195'||v_model||lpad(v_series,3,'0')||lpad(v_snapshot->>'number',9,'0')||'1123456780';
  v_trace:=jsonb_build_array(jsonb_build_object('ruleSetVersion','HML_NORMAL_SALE_V2','result',jsonb_build_object('modelDecision',v_decision)));
  BEGIN
   PERFORM public.reserve_hml_nfe_outbound(v_order,v_request,v_key,
    '<NFe><infNFe Id="NFe'||v_key||'"><tpAmb>2</tpAmb><mod>'||v_model||'</mod><indFinal>'||CASE WHEN v_final THEN '0' ELSE '1' END||'</indFinal><vNF>1.00</vNF></infNFe></NFe>',
    (v_snapshot->>'number')::integer,v_series,v_trace,v_token);
   RAISE EXCEPTION 'XML consumer mismatch accepted';
  EXCEPTION WHEN check_violation THEN IF SQLERRM<>'RETAIL_MODEL_SNAPSHOT_MISMATCH' THEN RAISE; END IF; END;
  v_doc:=public.reserve_hml_nfe_outbound(v_order,v_request,v_key,
    '<NFe><infNFe Id="NFe'||v_key||'"><tpAmb>2</tpAmb><mod>'||v_model||'</mod><indFinal>'||CASE WHEN v_final THEN '1' ELSE '0' END||'</indFinal><vNF>1.00</vNF></infNFe></NFe>',
    (v_snapshot->>'number')::integer,v_series,v_trace,v_token);
  IF (SELECT modelo FROM public.nfe_documents WHERE id=v_doc)<>v_model THEN RAISE EXCEPTION 'Wrong persisted model'; END IF;
  BEGIN
   PERFORM public.prepare_nfe_fiscal_snapshot_with_context(v_order,gen_random_uuid(),CASE WHEN v_model='65' THEN '55' ELSE '65' END,2,v_series,1,'{}','{}','',NOT v_final,false,false,
    v_decision||jsonb_build_object('model',CASE WHEN v_model='65' THEN '55' ELSE '65' END,'finalConsumer',NOT v_final));
   RAISE EXCEPTION 'Second model accepted for active order';
  EXCEPTION WHEN unique_violation THEN IF SQLERRM<>'ALREADY_ACTIVE_HML_ATTEMPT' THEN RAISE; END IF; END;
  IF public.claim_hml_nfe_attempt(v_doc,v_other) THEN RAISE EXCEPTION 'Lease stolen'; END IF;
  PERFORM public.release_hml_nfe_attempt(v_doc,v_other);
  BEGIN
   PERFORM public.persist_hml_nfe_result(v_doc,'pendente','fixture','',NULL,'[]',v_other);
   RAISE EXCEPTION 'Stale owner persisted';
  EXCEPTION WHEN check_violation THEN IF SQLERRM<>'HML_ATTEMPT_LEASE_LOST' THEN RAISE; END IF; END;
  BEGIN
   PERFORM public.persist_hml_nfe_result(v_doc,'homologada','100: fixture','<fixture/>','TEST_AUT_PROTOCOL',
    jsonb_build_array(v_line,v_line||'{"item_number":2,"billed_quantity":0}'),v_token);
   RAISE EXCEPTION 'Invalid second item accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.nfe_document_items WHERE document_id=v_doc) OR
   (SELECT status FROM public.nfe_documents WHERE id=v_doc)<>'processando' THEN RAISE EXCEPTION 'Partial authorization survived'; END IF;
  PERFORM public.persist_hml_nfe_result(v_doc,'erro','217: fixture','<fixture/>',NULL,'[]',v_token);
  PERFORM public.reactivate_hml_nfe_retry(v_doc,v_token);
  PERFORM public.persist_hml_nfe_result(v_doc,'homologada','100: fixture','<fixture/>','TEST_AUT_PROTOCOL',jsonb_build_array(v_line),v_token);
  PERFORM public.persist_hml_nfe_result(v_doc,'homologada','100: fixture','<fixture/>','TEST_AUT_PROTOCOL',jsonb_build_array(v_line),v_token);
  IF (SELECT count(*) FROM public.nfe_document_items WHERE document_id=v_doc)<>1 OR (SELECT valor_total FROM public.nfe_documents WHERE id=v_doc)<>1 THEN RAISE EXCEPTION 'Confirmation duplicate or total mismatch'; END IF;
  BEGIN
   UPDATE public.nfe_documents SET modelo=CASE WHEN v_model='65' THEN '55' ELSE '65' END WHERE id=v_doc;
   RAISE EXCEPTION 'Immutable model replaced';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   PERFORM public.persist_hml_nfe_result(v_doc,'pendente','fixture','',NULL,'[]',v_token);
   RAISE EXCEPTION 'Authorized status reversed';
  EXCEPTION WHEN check_violation THEN IF SQLERRM<>'AUTHORIZED_HML_IMMUTABLE' THEN RAISE; END IF; END;
 END LOOP;

 -- Prove number + snapshot rollback when recipient/context capture fails after allocation.
 v_order:=v_orders[3]; v_request:=gen_random_uuid();
 INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at) VALUES
 (v_order,'sale','scheduled',false,'[]',jsonb_build_object('orderType','sale','date',now()::text,
 'testRunId',v_run,'is_test',true,'test_environment','homologation','test_run_id','TEST_AUT_'||v_run,
 'customerData',jsonb_build_object('id',v_customer),'items','[]'::jsonb,'payments','[]'::jsonb),now());
 SELECT ultimo_numero INTO v_seq FROM public.nfe_sequences WHERE modelo='55' AND serie=v_series AND ambiente=2;
 BEGIN
  PERFORM public.prepare_nfe_fiscal_snapshot_with_context(v_order,v_request,'55',2,v_series,1,'{}','{}','invalid',false,false,false,v_decision);
  RAISE EXCEPTION 'Invalid recipient context accepted';
 EXCEPTION WHEN invalid_parameter_value THEN IF SQLERRM<>'NFE_RECIPIENT_TAX_ID_REQUIRED' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request) OR
  v_seq<>(SELECT ultimo_numero FROM public.nfe_sequences WHERE modelo='55' AND serie=v_series AND ambiente=2) THEN RAISE EXCEPTION 'Partial number/snapshot survived'; END IF;
 BEGIN
  PERFORM public.prepare_nfe_fiscal_snapshot_with_context(v_order,v_request,'55',1,v_series,1,'{}','{}','',false,false,false,v_decision);
  RAISE EXCEPTION 'Retail HML RPC accepted production';
 EXCEPTION WHEN invalid_parameter_value THEN IF SQLERRM<>'INVALID_RETAIL_FISCAL_CONTEXT' THEN RAISE; END IF; END;
 v_snapshot:=public.prepare_numbered_nfe_fiscal_snapshot_with_context(v_order,v_request,'55',2,v_series,1,'{}','{}',v_seq+10,'12345678909',false,false,false,v_decision);
 IF (v_snapshot->>'number')::integer<>v_seq+10 OR
  (SELECT snapshot_data#>>'{emissionRequest,finalConsumer}' FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request)<>'false' THEN RAISE EXCEPTION 'Manual allocation/context mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.inventory_moves WHERE order_id=ANY(v_orders) OR source_order_id=ANY(v_orders)) OR
  EXISTS(SELECT 1 FROM public.accounts_receivable WHERE order_id=ANY(v_orders)) OR
  EXISTS(SELECT 1 FROM public.financial_transactions WHERE reference_id=ANY(v_orders)) OR
  EXISTS(SELECT 1 FROM public.order_payments WHERE order_id=ANY(v_orders)) THEN RAISE EXCEPTION 'Commercial effect created'; END IF;
 IF v_queue<>(SELECT count(*) FROM net.http_request_queue) OR
  v_metrics<>(SELECT md5(COALESCE(jsonb_agg(to_jsonb(m) ORDER BY metric_date)::text,'')) FROM public.dashboard_daily_metrics m) THEN RAISE EXCEPTION 'Metrics or queue changed'; END IF;
 IF has_function_privilege('authenticated','public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer)','EXECUTE') OR
  has_function_privilege('anon','public.reserve_hml_nfe_outbound(text,uuid,varchar,text,integer,varchar,jsonb,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Browser access expanded'; END IF;
END; $test$;
ROLLBACK;
SELECT 'TEST_AUT_c2e5184a-d689-4010-916a-46a4eb6561bc' AS test_run_id,'APROVADO: 55/65, contexto, idempotencia, lease, rollback, imutabilidade' AS resultado,
 (SELECT count(*) FROM public.orders WHERE id=ANY(ARRAY['64097924-8f87-4446-8241-5f7ae4df454e','c7522feb-0a5a-4be0-b5f0-ba3435f446f3','4faf5563-d1c6-4267-b591-0d61cb8ffa25'])) AS fixtures_retidas,
 (SELECT count(*) FROM public.people WHERE id='TEST_AUT_c2e5184a-d689-4010-916a-46a4eb6561bc') AS clientes_retidos,
 (SELECT count(*) FROM public.products WHERE slug=lower('TEST_AUT_c2e5184a-d689-4010-916a-46a4eb6561bc')) AS produtos_retidos;
