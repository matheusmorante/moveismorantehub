-- Run only after the versioned function is installed with explicit approval.
-- test.nfh_preparation_args must contain the actual XSD-validated UI capture.
-- This test never authorizes a document or calls SEFAZ. Every write is rolled back.
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
DO $proof$
DECLARE
  v_args jsonb := pg_catalog.current_setting('test.nfh_preparation_args', true)::jsonb;
  v_draft public.nfe_operation_drafts%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_prepared jsonb;
  v_repeated jsonb;
  v_before_number integer;
  v_after_number integer;
  v_rollback_confirmed boolean := false;
  v_stale_blocked boolean := false;
BEGIN
  IF v_args IS NULL OR v_args->>'p_draft_id' IS DISTINCT FROM '5e49bcee-cce1-4da4-82a6-93362ed5b546' THEN
    RAISE EXCEPTION 'OWNED_UI_CAPTURE_REQUIRED';
  END IF;
  SELECT * INTO STRICT v_draft FROM public.nfe_operation_drafts
    WHERE id=(v_args->>'p_draft_id')::uuid;
  SELECT * INTO STRICT v_order FROM public.orders WHERE id=v_draft.return_order_id;
  IF v_draft.environment IS DISTINCT FROM 2 OR v_draft.status IS DISTINCT FROM 'ready'
     OR v_draft.operation_kind IS DISTINCT FROM 'return' OR v_draft.access_key IS NOT NULL
     OR v_draft.signed_xml IS NOT NULL OR v_draft.document_id IS NOT NULL
     OR v_draft.original_document_id IS DISTINCT FROM '550a9975-5b63-4dd3-bc6c-befd8da32820'::uuid
     OR v_order.id IS DISTINCT FROM 'a23d279e-8554-4aa8-a001-3c7825321fa7'
     OR v_order.status IS DISTINCT FROM 'fulfilled' OR v_order.order_data->>'is_test' IS DISTINCT FROM 'true'
     OR v_order.order_data#>>'{testArtifact,runId}' IS DISTINCT FROM '702b921e-fd31-488d-925e-560602a65510'
     OR v_order.order_data#>>'{testArtifact,ownerId}' IS DISTINCT FROM 'eccde09e-72d8-4efe-a387-eb34114dea39'
     OR v_order.order_data->>'returnStockProcessed' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'OWNED_READY_HML_RETURN_REQUIRED';
  END IF;
  SELECT pg_catalog.jsonb_build_object(
    'draft',pg_catalog.to_jsonb(v_draft),
    'legacySequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.id) FROM public.nfe_sequences s WHERE modelo='55' AND serie='1' AND ambiente=2),
    'establishmentSequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.series) FROM public.nfe_establishment_sequences s WHERE issuer_cnpj='44512248000107' AND model='55' AND environment=2 AND series='1')
  ) INTO v_before;
  BEGIN
    PERFORM public.prepare_nfe_operation_attempt(v_draft.id,
      (v_args->>'p_expected_updated_at')::timestamptz - interval '1 second',
      v_args->'p_expected_review_data',v_args->'p_expected_lines',
      v_args->>'p_signed_xml',v_args->>'p_access_key',(v_args->>'p_minimum_number')::integer);
  EXCEPTION WHEN SQLSTATE '23514' THEN
    v_stale_blocked := SQLERRM='FISCAL_DRAFT_CHANGED';
  END;
  IF NOT v_stale_blocked THEN RAISE EXCEPTION 'STALE_REVIEW_WAS_NOT_BLOCKED'; END IF;

  SELECT ultimo_numero INTO STRICT v_before_number FROM public.nfe_sequences
    WHERE modelo='55' AND serie='1' AND ambiente=2;
  BEGIN
    v_prepared := public.prepare_nfe_operation_attempt(v_draft.id,
      (v_args->>'p_expected_updated_at')::timestamptz,
      v_args->'p_expected_review_data',v_args->'p_expected_lines',
      v_args->>'p_signed_xml',v_args->>'p_access_key',(v_args->>'p_minimum_number')::integer);
    v_repeated := public.prepare_nfe_operation_attempt(v_draft.id,
      (v_args->>'p_expected_updated_at')::timestamptz,
      v_args->'p_expected_review_data',v_args->'p_expected_lines',
      v_args->>'p_signed_xml',v_args->>'p_access_key',(v_args->>'p_minimum_number')::integer);
    SELECT ultimo_numero INTO STRICT v_after_number FROM public.nfe_sequences
      WHERE modelo='55' AND serie='1' AND ambiente=2;
    IF v_prepared->>'created' IS DISTINCT FROM 'true' OR v_repeated->>'created' IS DISTINCT FROM 'false'
       OR v_after_number IS DISTINCT FROM v_before_number+1
       OR NOT EXISTS(SELECT 1 FROM public.nfe_operation_drafts WHERE id=v_draft.id
         AND status='transmitting' AND access_key=v_args->>'p_access_key' AND signed_xml=v_args->>'p_signed_xml'
         AND updated_at=(v_prepared->>'updatedAt')::timestamptz) THEN
      RAISE EXCEPTION 'ATOMIC_PREPARATION_OR_REPLAY_FAILED';
    END IF;
    -- Failure after both essential writes: this subtransaction must undo both.
    RAISE EXCEPTION 'NFH_CONTROLLED_ESSENTIAL_FAILURE';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'NFH_CONTROLLED_ESSENTIAL_FAILURE' THEN RAISE; END IF;
    v_rollback_confirmed := true;
  END;
  SELECT pg_catalog.jsonb_build_object(
    'draft',(SELECT pg_catalog.to_jsonb(d) FROM public.nfe_operation_drafts d WHERE id=v_draft.id),
    'legacySequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.id) FROM public.nfe_sequences s WHERE modelo='55' AND serie='1' AND ambiente=2),
    'establishmentSequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.series) FROM public.nfe_establishment_sequences s WHERE issuer_cnpj='44512248000107' AND model='55' AND environment=2 AND series='1')
  ) INTO v_after;
  IF NOT v_rollback_confirmed OR v_after IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'ESSENTIAL_PREPARATION_ROLLBACK_FAILED';
  END IF;
  PERFORM pg_catalog.set_config('test.nfh_preparation_proof',pg_catalog.jsonb_build_object(
    'draftId',v_draft.id,'environment',2,'staleReviewBlocked',v_stale_blocked,
    'preparedInRolledBackSubtransaction',true,'replayReservedAnotherNumber',false,
    'essentialFailureRolledBack',v_rollback_confirmed,
    'beforeHash',pg_catalog.md5(v_before::text),'afterHash',pg_catalog.md5(v_after::text),
    'stateUnchanged',true,'verified',true)::text,true);
END;
$proof$;
SELECT pg_catalog.current_setting('test.nfh_preparation_proof')::jsonb AS proof;
ROLLBACK;
