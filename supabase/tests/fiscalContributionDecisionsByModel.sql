-- Replace the five UUID placeholders with fresh values before execution.
-- Reservation-only pgTAP integration on the configured remote project.
-- The synthetic orders, snapshots and counters roll back; no XML or SEFAZ call occurs.
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
  v_decision55 jsonb; v_decision65 jsonb;
  v_call text; v_prod_call text; v_snapshot55 jsonb; v_snapshot65 jsonb; v_repeat jsonb;
  v_tap text[] := '{}'; v_finish text;
BEGIN
  IF EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie='887' AND ambiente=2) OR
     EXISTS(SELECT 1 FROM public.nfe_documents WHERE serie='887' AND ambiente=2) OR
     EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE series='887' AND environment=2) THEN
    RAISE EXCEPTION 'Test requires an unused HML series.';
  END IF;
  PERFORM extensions.plan(12);

  v_decision55 := public.simples_normal_sale_contribution_decision('55');
  v_decision65 := public.simples_normal_sale_contribution_decision('65');
  v_tap := array_append(v_tap,extensions.ok(
    v_decision55#>'{scope,model}' IS NULL AND
    v_decision55#>'{scope,models}' IS NOT DISTINCT FROM '["55", "65"]'::jsonb AND
    v_decision55#>>'{scope,operation}'='normal_sale' AND v_decision55#>>'{scope,issuerCrt}'='1' AND
    v_decision55#>>'{pis,cst}'='99' AND v_decision55#>>'{cofins,cst}'='99' AND
    (v_decision55#>>'{pis,base}')::numeric=0 AND (v_decision55#>>'{pis,rate}')::numeric=0 AND (v_decision55#>>'{pis,value}')::numeric=0 AND
    (v_decision55#>>'{cofins,base}')::numeric=0 AND (v_decision55#>>'{cofins,rate}')::numeric=0 AND (v_decision55#>>'{cofins,value}')::numeric=0,
    'shared decision keeps the explicit CRT 1 normal-sale scope and CST 99 zero amounts'));
  v_tap := array_append(v_tap,extensions.ok(v_decision55=v_decision65,
    'NF-e 55 and NFC-e 65 resolve the same contribution decision'));
  v_tap := array_append(v_tap,extensions.throws_ok(
    'SELECT public.simples_normal_sale_contribution_decision(''56'')',
    '23514','CONTRIBUTION_MODEL_SCOPE_REQUIRED','models outside the explicit scope remain rejected'));
  v_tap := array_append(v_tap,extensions.ok(
    NOT EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie='887' AND ambiente=2),
    'unsupported model validation does not reserve a number'));

  INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at)
    SELECT fixture,'sale','draft',true,'[]'::jsonb,jsonb_build_object('testRunId',fixture,
      'fiscalScenario','HML_TECHNICAL_V1','deleted',true,'orderType','sale','items','[]'::jsonb,'payments','[]'::jsonb),now()
    FROM unnest(ARRAY[v_order55,v_order65]) fixture;
  v_tap := array_append(v_tap,extensions.ok(
    (SELECT bool_and(public.is_nfe_hml_test_order(id,status,deleted,order_data)) FROM public.orders WHERE id IN(v_order55,v_order65)),
    'fixtures are excluded from operational indicators'));

  v_call := format('SELECT public.prepare_nfe_fiscal_snapshot_with_context(%L,%L::uuid,''65'',2,''887'',1,''{}'',''{}'',NULL,true,false,false,%L::jsonb,NULL)',v_order65,v_request65,v_context65);
  v_prod_call := format('SELECT public.prepare_nfe_fiscal_snapshot_with_context(%L,%L::uuid,''65'',1,''887'',1,''{}'',''{}'',NULL,true,false,false,%L::jsonb,NULL)',v_order65,v_request65,v_context65);
  v_snapshot55 := public.prepare_nfe_fiscal_snapshot_with_context(v_order55,v_request55,'55',2,'887',1,'{}','{}',NULL,false,false,false,v_context55,NULL);
  v_snapshot65 := public.prepare_nfe_fiscal_snapshot_with_context(v_order65,v_request65,'65',2,'887',1,'{}','{}',NULL,true,false,false,v_context65,NULL);
  v_tap := array_append(v_tap,extensions.ok(EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request55 AND
    snapshot_data#>'{fiscalInputs,contributionDecision,scope,models}'='["55", "65"]'::jsonb AND
    snapshot_data#>>'{fiscalInputs,contributionDecision,pis,cst}'='99'),'model 55 snapshot freezes the common contribution decision'));
  v_tap := array_append(v_tap,extensions.ok(EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request65 AND
    snapshot_data#>'{fiscalInputs,contributionDecision,scope,models}'='["55", "65"]'::jsonb AND
    snapshot_data#>>'{fiscalInputs,contributionDecision,cofins,cst}'='99'),'model 65 snapshot freezes the same common contribution decision'));
  v_tap := array_append(v_tap,extensions.ok((SELECT bool_and(snapshot_sha256=encode(extensions.digest(convert_to(snapshot_data::text,'UTF8'),'sha256'),'hex'))
    FROM public.nfe_fiscal_snapshots WHERE emission_request_id IN(v_request55,v_request65)),'snapshot hashes include the shared decision'));
  v_repeat := public.prepare_nfe_fiscal_snapshot_with_context(v_order65,v_request65,'65',2,'887',1,'{}','{}',NULL,true,false,false,v_context65,NULL);
  v_tap := array_append(v_tap,extensions.ok(v_repeat=v_snapshot65 AND
    (SELECT ultimo_numero=1 FROM public.nfe_sequences WHERE modelo='65' AND serie='887' AND ambiente=2),'retry is idempotent and consumes no extra number'));
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
  (SELECT count(*) FROM public.nfe_fiscal_snapshots WHERE emission_request_id IN('__REQUEST55_UUID__'::uuid,'__REQUEST65_UUID__'::uuid)) AS retained_snapshots;
