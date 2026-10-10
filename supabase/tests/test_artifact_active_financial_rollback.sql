-- Controlled predicate/report proof against the authorized fixture from run 610eef79-9cc7-4b44-a8d3-2c5d7aeb9c24.
-- No DDL. Only this owned, empty, non-fiscal order and new synthetic financial rows can change.
-- The expected TEST_ARTIFACT_ROLLBACK_PROOF exception rolls back the whole statement.
-- This is not a sale/return lifecycle test or a real operator login proof.
DO $proof$
DECLARE
  v_order_id text := '386ef984-ee54-4d69-bef9-00041fbc5810';
  v_run_id text := '610eef79-9cc7-4b44-a8d3-2c5d7aeb9c24';
  v_owner_id text := '13eab361-be48-4e49-be4b-4ad79813b812';
  v_order jsonb;
  v_status text;
  v_raw integer;
  v_filtered integer;
  v_states jsonb := '[]'::jsonb;
  v_transaction_id text := gen_random_uuid()::text;
  v_rejected_id text := gen_random_uuid()::text;
  v_report_inclusive integer;
  v_report_exclusive integer;
  v_identity jsonb;
  v_cross_run_rejected boolean := false;
BEGIN
  SELECT to_jsonb(o) INTO v_order FROM public.orders o
  WHERE o.id=v_order_id AND o.order_data#>>'{testArtifact,runId}'=v_run_id
    AND o.order_data#>>'{testArtifact,ownerId}'=v_owner_id
    AND o.order_data#>>'{testArtifact,is_test}'='true'
  FOR UPDATE;
  IF v_order IS NULL OR v_order->>'status'<>'cancelled'
    OR coalesce(jsonb_array_length(v_order->'items'),0)<>0
    OR EXISTS(SELECT 1 FROM public.nfe_documents WHERE order_id=v_order_id)
    OR EXISTS(SELECT 1 FROM public.inventory_moves WHERE order_id=v_order_id) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_PROOF_UNSAFE_FIXTURE';
  END IF;

  PERFORM set_config('request.jwt.claim.sub',v_owner_id,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_owner_id,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT public.is_administrator() OR auth.uid()::text IS DISTINCT FROM v_owner_id THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_PROOF_UNAUTHORIZED_CONTEXT';
  END IF;

  FOREACH v_status IN ARRAY ARRAY['scheduled','fulfilled'] LOOP
    UPDATE public.orders SET status=v_status,
      order_data=jsonb_set(order_data,'{status}',to_jsonb(v_status))
    WHERE id=v_order_id AND order_data#>>'{testArtifact,runId}'=v_run_id
      AND order_data#>>'{testArtifact,ownerId}'=v_owner_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'TEST_ARTIFACT_PROOF_UPDATE_DENIED'; END IF;

    SELECT count(*) INTO v_raw FROM public.orders o
    WHERE id=v_order_id AND status=v_status AND NOT coalesce(deleted,false);
    SELECT count(*) INTO v_filtered FROM public.orders o
    WHERE id=v_order_id AND status=v_status AND NOT coalesce(deleted,false)
      AND NOT public.test_artifact_is_test(to_jsonb(o));
    IF v_raw<>1 OR v_filtered<>0 THEN RAISE EXCEPTION 'TEST_ARTIFACT_ACTIVE_FILTER_LEAK'; END IF;
    v_states:=v_states||jsonb_build_array(jsonb_build_object('status',v_status,
      'ownedCandidateCount',v_raw,'filteredCount',v_filtered));
  END LOOP;

  INSERT INTO public.financial_transactions(id,description,amount,type,date,reference_type,reference_id,idempotency_key)
  VALUES(v_transaction_id,'Fixture transacional de filtro financeiro',1.23,'income',DATE '2026-10-10',
    'order',v_order_id,'artifact-report-proof:'||v_transaction_id);

  SELECT count(*) INTO v_raw FROM public.financial_transactions WHERE id=v_transaction_id;
  SELECT public.test_artifact_identity(public.test_artifact_row_data('financial_transactions',to_jsonb(f)))
    INTO v_identity FROM public.financial_transactions f WHERE id=v_transaction_id;
  IF v_raw IS DISTINCT FROM 1 OR v_identity->>'runId' IS DISTINCT FROM v_run_id
    OR v_identity->>'ownerId' IS DISTINCT FROM v_owner_id THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_FINANCIAL_IDENTITY_MISSING';
  END IF;
  SELECT count(*) INTO v_report_inclusive
  FROM public.get_report_financial_transactions(DATE '2026-10-10',DATE '2026-10-10',false)
  WHERE id=v_transaction_id;
  SELECT count(*) INTO v_report_exclusive
  FROM public.get_report_financial_transactions(DATE '2026-10-10',DATE '2026-10-11',true)
  WHERE id=v_transaction_id;
  IF v_report_inclusive<>0 OR v_report_exclusive<>0 THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_FINANCIAL_REPORT_LEAK';
  END IF;

  BEGIN
    INSERT INTO public.financial_transactions(id,description,amount,type,reference_type,reference_id,notes)
    VALUES(v_rejected_id,'Fixture rejeitada de outra execução',1.23,'income','order',v_order_id,
      jsonb_build_object('testArtifact',jsonb_build_object('is_test',true,
        'runId',gen_random_uuid()::text,'ownerId',v_owner_id))::text);
    RAISE EXCEPTION 'TEST_ARTIFACT_CROSS_RUN_LINK_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'TEST_ARTIFACT_LINK_MISMATCH%' THEN RAISE; END IF;
    v_cross_run_rejected:=true;
  END;
  IF EXISTS(SELECT 1 FROM public.financial_transactions WHERE id=v_rejected_id) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_REJECTED_ROW_PERSISTED';
  END IF;

  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='TEST_ARTIFACT_ROLLBACK_PROOF:'||
    jsonb_build_object('projectRef','hkoxhourxwlddgsfdgws','orderId',v_order_id,'runId',v_run_id,
      'ownerId',v_owner_id,'sqlRole',current_user,'activeStates',v_states,
      'financialProbeId',v_transaction_id,'rejectedFinancialProbeId',v_rejected_id,
      'rawFinancialRows',v_raw,'reportInclusiveRows',v_report_inclusive,
      'reportExclusiveRows',v_report_exclusive,'crossRunLinkRejected',v_cross_run_rejected,
      'expectedWholeStatementRollback',true)::text;
END;
$proof$;
