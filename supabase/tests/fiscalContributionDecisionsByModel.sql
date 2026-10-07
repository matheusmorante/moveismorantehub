-- Replace the five UUID placeholders with fresh values before execution.
-- Reservation-only pgTAP integration on the configured remote project.
-- The temporary model-65 setting, orders, snapshots and counters all roll back.
-- No XML, invoice authorization, SOAP, stock or financial operation is performed.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
SET LOCAL search_path=pg_catalog,public,extensions;
DO $test$
DECLARE
  v_run text := 'TEST_AUT___RUN_UUID__';
  v_order55 text := 'TEST_AUT___ORDER55_UUID__';
  v_order65 text := 'TEST_AUT___ORDER65_UUID__';
  v_request55 uuid := '__REQUEST55_UUID__';
  v_request65 uuid := '__REQUEST65_UUID__';
  v_context55 jsonb := '{"status":"ready","model":"55","finalConsumer":false,"policyVersion":"PR_RETAIL_2026_10"}';
  v_context65 jsonb := '{"status":"ready","model":"65","finalConsumer":true,"policyVersion":"PR_RETAIL_2026_10"}';
  v_call text; v_prod_call text; v_snapshot55 jsonb; v_snapshot65 jsonb; v_repeat jsonb;
  v_tap text[] := '{}'; v_finish text;
BEGIN
  IF EXISTS(SELECT 1 FROM public.settings WHERE id='fiscal_decision_simples_nfce65_normal_sale_v1') THEN
    RAISE EXCEPTION 'Test requires the model-65 setting to be absent; never overwrite a real decision.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie='887' AND ambiente=2) OR
     EXISTS(SELECT 1 FROM public.nfe_documents WHERE serie='887' AND ambiente=2) OR
     EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE series='887' AND environment=2) THEN
    RAISE EXCEPTION 'Test requires an unused HML series.';
  END IF;
  PERFORM extensions.plan(12);
  v_call := format('SELECT public.prepare_nfe_fiscal_snapshot_with_context(%L,%L::uuid,''65'',2,''887'',1,''{}'',''{}'',NULL,true,false,false,%L::jsonb,NULL)',v_order65,v_request65,v_context65);
  v_prod_call := format('SELECT public.prepare_nfe_fiscal_snapshot_with_context(%L,%L::uuid,''65'',1,''887'',1,''{}'',''{}'',NULL,true,false,false,%L::jsonb,NULL)',v_order65,v_request65,v_context65);
  v_tap := array_append(v_tap,extensions.throws_ok(v_call,'23514','CONTRIBUTION_MODEL_SCOPE_REQUIRED','missing 65 decision fails before reservation'));
  v_tap := array_append(v_tap,extensions.ok(NOT EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie='887' AND ambiente=2),'missing decision consumes no number'));

  INSERT INTO public.settings(id,data) VALUES('fiscal_decision_simples_nfce65_normal_sale_v1',
    jsonb_build_object('testRunId',v_run,'scope',jsonb_build_object('model','55','operation','normal_sale','issuerCrt','1'),
      'pis','{"cst":"99","base":0,"rate":0,"value":0}'::jsonb,'cofins','{"cst":"99","base":0,"rate":0,"value":0}'::jsonb,
      'confirmedBy',v_run,'confirmedAt',now()::text));
  v_tap := array_append(v_tap,extensions.throws_ok(v_call,'23514','CONTRIBUTION_MODEL_SCOPE_REQUIRED','65 key containing a 55 scope fails'));
  UPDATE public.settings SET data=jsonb_set(data,'{scope,model}','"65"')
    WHERE id='fiscal_decision_simples_nfce65_normal_sale_v1' AND data->>'testRunId'=v_run;
  INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at)
    SELECT fixture,'sale','draft',true,'[]'::jsonb,jsonb_build_object('testRunId',fixture,
      'fiscalScenario','HML_TECHNICAL_V1','deleted',true,'orderType','sale','items','[]'::jsonb,'payments','[]'::jsonb),now()
    FROM unnest(ARRAY[v_order55,v_order65]) fixture;
  v_tap := array_append(v_tap,extensions.ok(
    (SELECT bool_and(public.is_nfe_hml_test_order(id,status,deleted,order_data)) FROM public.orders WHERE id IN(v_order55,v_order65)),
    'fixtures are excluded from operational indicators'));
  v_snapshot55 := public.prepare_nfe_fiscal_snapshot_with_context(v_order55,v_request55,'55',2,'887',1,'{}','{}',NULL,false,false,false,v_context55,NULL);
  v_snapshot65 := public.prepare_nfe_fiscal_snapshot_with_context(v_order65,v_request65,'65',2,'887',1,'{}','{}',NULL,true,false,false,v_context65,NULL);
  v_tap := array_append(v_tap,extensions.ok(EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request55 AND
    snapshot_data#>>'{fiscalInputs,contributionDecision,scope,model}'='55'),'55 captures its own decision'));
  v_tap := array_append(v_tap,extensions.ok(EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request65 AND
    snapshot_data#>>'{fiscalInputs,contributionDecision,scope,model}'='65' AND
    snapshot_data#>>'{fiscalInputs,contributionDecision,confirmedBy}'=v_run),'65 captures the separate temporary decision'));
  v_tap := array_append(v_tap,extensions.ok((SELECT bool_and(snapshot_sha256=encode(extensions.digest(convert_to(snapshot_data::text,'UTF8'),'sha256'),'hex'))
    FROM public.nfe_fiscal_snapshots WHERE emission_request_id IN(v_request55,v_request65)),'snapshot hashes include the selected decisions'));
  v_repeat := public.prepare_nfe_fiscal_snapshot_with_context(v_order65,v_request65,'65',2,'887',1,'{}','{}',NULL,true,false,false,v_context65,NULL);
  v_tap := array_append(v_tap,extensions.ok(v_repeat=v_snapshot65 AND
    (SELECT ultimo_numero=1 FROM public.nfe_sequences WHERE modelo='65' AND serie='887' AND ambiente=2),'retry is idempotent and consumes no extra number'));
  UPDATE public.settings SET data=jsonb_set(data,'{scope,model}','"55"')
    WHERE id='fiscal_decision_simples_nfce65_normal_sale_v1' AND data->>'testRunId'=v_run;
  v_tap := array_append(v_tap,extensions.throws_ok(v_call,'23514','CONTRIBUTION_MODEL_SCOPE_REQUIRED','invalid current scope does not rewrite the existing snapshot'));
  v_tap := array_append(v_tap,extensions.throws_ok(v_prod_call,'22023','INVALID_RETAIL_FISCAL_CONTEXT','the HML reservation policy still rejects production'));
  v_tap := array_append(v_tap,extensions.ok(NOT has_function_privilege('authenticated',
    'public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer)','EXECUTE') AND
    NOT has_function_privilege('anon','public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer)','EXECUTE'),
    'browser roles still cannot reserve fiscal facts'));
  v_tap := array_append(v_tap,extensions.ok(
    NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id IN(v_order55,v_order65)) AND
    NOT EXISTS(SELECT 1 FROM public.order_payments WHERE order_id IN(v_order55,v_order65)) AND
    NOT EXISTS(SELECT 1 FROM public.inventory_moves WHERE order_id IN(v_order55,v_order65) OR source_order_id IN(v_order55,v_order65)) AND
    NOT EXISTS(SELECT 1 FROM public.accounts_receivable WHERE order_id IN(v_order55,v_order65)) AND
    NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE reference_id IN(v_order55,v_order65)) AND
    NOT EXISTS(SELECT 1 FROM public.nfe_documents WHERE order_id IN(v_order55,v_order65)),
    'snapshot reservation creates no commercial effects or invoices'));
  IF EXISTS(SELECT 1 FROM unnest(v_tap) line WHERE line LIKE 'not ok%') THEN
    RAISE EXCEPTION 'pgTAP failed: %',array_to_string(v_tap,E'\n');
  END IF;
  FOR v_finish IN SELECT * FROM extensions.finish() LOOP
    IF v_finish LIKE '%failed%' OR v_finish LIKE '%planned%' THEN RAISE EXCEPTION '%',v_finish; END IF;
  END LOOP;
END;
$test$;
ROLLBACK;
SELECT '12 pgTAP assertions passed; all fixtures rolled back' AS result,
  (SELECT count(*) FROM public.orders WHERE id IN('TEST_AUT___ORDER55_UUID__','TEST_AUT___ORDER65_UUID__')) AS retained_orders,
  (SELECT count(*) FROM public.nfe_fiscal_snapshots WHERE emission_request_id IN('__REQUEST55_UUID__'::uuid,'__REQUEST65_UUID__'::uuid)) AS retained_snapshots,
  (SELECT count(*) FROM public.settings WHERE id='fiscal_decision_simples_nfce65_normal_sale_v1' AND data->>'testRunId'='TEST_AUT___RUN_UUID__') AS retained_test_decisions;
