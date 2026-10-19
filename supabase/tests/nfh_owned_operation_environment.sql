-- Existing UI-created HML artifacts only. No fixture, authorization or XML is fabricated.
-- Run on the linked operational project. Every statement is rolled back.
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
DO $proof$
DECLARE
  v_source public.nfe_documents%ROWTYPE;
  v_return public.orders%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_wrong_environment_blocked boolean := false;
  v_message text;
  v_existing uuid;
BEGIN
  SELECT * INTO STRICT v_source FROM public.nfe_documents WHERE id='7474e330-5292-40ed-92e0-8e4a40ab8b8e';
  SELECT * INTO STRICT v_return FROM public.orders WHERE id='424fcb65-1649-491c-80eb-54006b9da50b';
  IF v_source.ambiente IS DISTINCT FROM 2 OR v_source.status IS DISTINCT FROM 'homologada' OR v_source.document_type IS DISTINCT FROM 'outbound'
     OR v_return.order_type IS DISTINCT FROM 'return' OR v_return.status IS DISTINCT FROM 'fulfilled'
     OR v_return.linked_order_id IS DISTINCT FROM v_source.order_id
     OR v_return.order_data->>'is_test' IS DISTINCT FROM 'true'
     OR v_return.order_data#>>'{testArtifact,runId}' IS DISTINCT FROM '702b921e-fd31-488d-925e-560602a65510'
     OR v_return.order_data#>>'{testArtifact,ownerId}' IS DISTINCT FROM 'eccde09e-72d8-4efe-a387-eb34114dea39'
     OR NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id=v_source.order_id
       AND o.order_data#>>'{testArtifact,runId}'='702b921e-fd31-488d-925e-560602a65510'
       AND o.order_data#>>'{testArtifact,ownerId}'='eccde09e-72d8-4efe-a387-eb34114dea39') THEN
    RAISE EXCEPTION 'OWNED_EXISTING_HML_FIXTURE_REQUIRED';
  END IF;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','eccde09e-72d8-4efe-a387-eb34114dea39',true);
  PERFORM pg_catalog.set_config('request.jwt.claims','{"sub":"eccde09e-72d8-4efe-a387-eb34114dea39","role":"authenticated"}',true);
  SELECT pg_catalog.jsonb_build_object(
    'documents',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id)::text) FROM public.nfe_documents d WHERE d.order_id=v_source.order_id),
    'drafts',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id)::text) FROM public.nfe_operation_drafts d WHERE d.return_order_id=v_return.id),
    'orders',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) ORDER BY o.id)::text) FROM public.orders o WHERE o.id IN (v_source.order_id,v_return.id)),
    'moves',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.id)::text) FROM public.inventory_moves m WHERE m.order_id IN (v_source.order_id,v_return.id)),
    'allocations',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.id)::text) FROM public.nfe_return_item_allocations a WHERE a.return_order_id=v_return.id)
  ) INTO v_before;
  BEGIN
    PERFORM public.prepare_nfe_operation_draft('return',v_source.id,v_return.id,1::smallint,NULL,'eccde09e-72d8-4efe-a387-eb34114dea39'::uuid);
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS v_message=MESSAGE_TEXT;
    v_wrong_environment_blocked := v_message='Documento fiscal original não autorizado no ambiente selecionado';
  END;
  IF NOT v_wrong_environment_blocked THEN RAISE EXCEPTION 'CROSS_ENVIRONMENT_NOT_BLOCKED'; END IF;
  v_existing := public.prepare_nfe_operation_draft('return',v_source.id,v_return.id,2::smallint,NULL,'eccde09e-72d8-4efe-a387-eb34114dea39'::uuid);
  IF v_existing IS DISTINCT FROM '53e85235-dced-4503-9421-0a95612ee8ce'::uuid THEN
    RAISE EXCEPTION 'SAME_ENVIRONMENT_DRAFT_IDENTITY_CHANGED';
  END IF;
  SELECT pg_catalog.jsonb_build_object(
    'documents',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id)::text) FROM public.nfe_documents d WHERE d.order_id=v_source.order_id),
    'drafts',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id)::text) FROM public.nfe_operation_drafts d WHERE d.return_order_id=v_return.id),
    'orders',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) ORDER BY o.id)::text) FROM public.orders o WHERE o.id IN (v_source.order_id,v_return.id)),
    'moves',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.id)::text) FROM public.inventory_moves m WHERE m.order_id IN (v_source.order_id,v_return.id)),
    'allocations',(SELECT pg_catalog.md5(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.id)::text) FROM public.nfe_return_item_allocations a WHERE a.return_order_id=v_return.id)
  ) INTO v_after;
  IF v_after IS DISTINCT FROM v_before THEN RAISE EXCEPTION 'OWNED_FISCAL_STATE_CHANGED'; END IF;
  PERFORM pg_catalog.set_config('test.nfh_environment_proof',pg_catalog.jsonb_build_object(
    'environment2To1Blocked',v_wrong_environment_blocked,'sameEnvironmentDraft',v_existing,
    'stateBefore',v_before,'stateAfter',v_after,'stateUnchanged',true,'verified',true)::text,true);
END;
$proof$;
SELECT pg_catalog.current_setting('test.nfh_environment_proof')::jsonb AS proof;
ROLLBACK;
