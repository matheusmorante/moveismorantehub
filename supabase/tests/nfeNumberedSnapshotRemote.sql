-- Run only on the configured MoranteHub project after checking project/ref.
-- Reservation-only integration: no SOAP, no operational fixtures, no commit.
-- Series 888 must be unused; all fixtures and reservations are rolled back.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $test$
DECLARE
  v_run text := 'TEST_AUT_' || gen_random_uuid()::text;
  v_other text := 'TEST_AUT_' || gen_random_uuid()::text;
  v_request uuid := gen_random_uuid();
  v_other_request uuid := gen_random_uuid();
  v_failed_request uuid := gen_random_uuid();
  v_reservation jsonb;
  v_repeat jsonb;
  v_auto jsonb;
  v_number integer;
  v_data jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public.nfe_sequences WHERE serie='888' AND ambiente=2)
    OR EXISTS (SELECT 1 FROM public.nfe_documents WHERE serie='888' AND ambiente=2)
    OR EXISTS (SELECT 1 FROM public.nfe_fiscal_snapshots WHERE series='888' AND environment=2) THEN
    RAISE EXCEPTION 'Integration test requires an unused HML series';
  END IF;
  v_data := jsonb_build_object('testRunId',v_run,'fiscalScenario','HML_TECHNICAL_V1',
    'deleted',true,'orderType','sale','payments','[]'::jsonb,'items','[]'::jsonb);
  IF NOT public.is_nfe_hml_test_order(v_run,'draft',true,v_data) THEN
    RAISE EXCEPTION 'Fixture not excluded from operational metrics';
  END IF;
  INSERT INTO public.orders(id,order_type,status,deleted,order_data)
    VALUES(v_run,'sale','draft',true,v_data),
      (v_other,'sale','draft',true,jsonb_set(v_data,'{testRunId}',to_jsonb(v_other)));

  -- Failure after sequence positioning and snapshot insertion must undo both.
  BEGIN
    PERFORM public.prepare_numbered_nfe_fiscal_snapshot(v_run,v_failed_request,
      '55',2,'888',1,'{}','{}',40,'');
    RAISE EXCEPTION 'Expected invalid recipient to fail';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM <> 'NFE_RECIPIENT_TAX_ID_REQUIRED' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie='888' AND ambiente=2)
    OR EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_failed_request) THEN
    RAISE EXCEPTION 'Recipient validation left a partial reservation';
  END IF;

  v_reservation := public.prepare_numbered_nfe_fiscal_snapshot(v_run,v_request,
    '55',2,'888',1,'{}','{}',40,'12345678909');
  IF (v_reservation->>'number')::integer <> 40 THEN
    RAISE EXCEPTION 'Manual number not preserved';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots
    WHERE emission_request_id=v_request AND reserved_number=40 AND environment=2
      AND snapshot_data#>>'{emissionRequest,recipientTaxId}'='12345678909'
      AND snapshot_sha256=v_reservation->>'snapshotHash'
      AND snapshot_sha256=encode(extensions.digest(convert_to(snapshot_data::text,'UTF8'),'sha256'),'hex')) THEN
    RAISE EXCEPTION 'Snapshot number, recipient or hash inconsistent';
  END IF;
  v_repeat := public.prepare_numbered_nfe_fiscal_snapshot(v_run,v_request,
    '55',2,'888',1,'{}','{}',40,'12345678909');
  IF v_repeat IS DISTINCT FROM v_reservation THEN RAISE EXCEPTION 'Retry not idempotent'; END IF;

  BEGIN
    PERFORM public.prepare_numbered_nfe_fiscal_snapshot(v_other,v_other_request,
      '55',2,'888',1,'{}','{}',40,'12345678909');
    RAISE EXCEPTION 'Expected number conflict';
  EXCEPTION WHEN unique_violation THEN
    IF SQLERRM <> 'NFE_NUMBER_ALREADY_USED' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.prepare_numbered_nfe_fiscal_snapshot(v_run,v_request,
      '55',2,'888',1,'{}','{}',40,'98765432100');
    RAISE EXCEPTION 'Expected idempotency conflict';
  EXCEPTION WHEN unique_violation THEN
    IF SQLERRM <> 'IDEMPOTENCY_KEY_REUSED' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.prepare_numbered_nfe_fiscal_snapshot(v_other,v_other_request,
      '55',2,'888',50,'{}','{}',49,'12345678909');
    RAISE EXCEPTION 'Expected below-minimum number rejection';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  -- Essential source read fails after the sequence is positioned: it must roll back.
  BEGIN
    PERFORM public.prepare_numbered_nfe_fiscal_snapshot('TEST_AUT_'||gen_random_uuid()::text,
      v_failed_request,'55',2,'888',1,'{}','{}',60,'12345678909');
    RAISE EXCEPTION 'Expected missing source failure';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    IF SQLERRM <> 'ORDER_NOT_FOUND' THEN RAISE; END IF;
  END;
  SELECT ultimo_numero INTO v_number FROM public.nfe_sequences
    WHERE modelo='55' AND serie='888' AND ambiente=2;
  IF v_number <> 40 OR EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots
    WHERE emission_request_id IN (v_other_request,v_failed_request)) THEN
    RAISE EXCEPTION 'Failure consumed a number or persisted a snapshot';
  END IF;
  v_auto := public.prepare_nfe_fiscal_snapshot(v_other,v_other_request,
    '55',2,'888',1,'{}','{}','12345678909');
  IF (v_auto->>'number')::integer <> 41 THEN RAISE EXCEPTION 'Automatic sequence regressed'; END IF;
  IF has_function_privilege('anon',
    'public.prepare_numbered_nfe_fiscal_snapshot(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer)',
    'EXECUTE') OR has_function_privilege('authenticated',
    'public.prepare_numbered_nfe_fiscal_snapshot(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer)',
    'EXECUTE') THEN RAISE EXCEPTION 'Allocator exposed to browser roles'; END IF;
  IF EXISTS(SELECT 1 FROM public.order_payments WHERE order_id IN (v_run,v_other))
    OR EXISTS(SELECT 1 FROM public.order_items WHERE order_id IN (v_run,v_other))
    OR EXISTS(SELECT 1 FROM public.orders WHERE id IN (v_run,v_other) AND stock_processed=true) THEN
    RAISE EXCEPTION 'Reservation test created commercial effects';
  END IF;
  RAISE NOTICE 'PASS: manual+automatic reservation, recipient/hash, retry, conflicts, rollback and role grants; run=%',v_run;
END;
$test$;
ROLLBACK;
