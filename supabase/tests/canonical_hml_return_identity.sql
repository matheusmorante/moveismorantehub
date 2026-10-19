-- Replace __RETURN_ORDER_ID__ with an existing, owned canonical HML return.
-- No fixture is created: all RPC calls replay that return or fail before writes.
BEGIN;
SET LOCAL statement_timeout = '20s';
DO $proof$
DECLARE
  v_return public.orders%ROWTYPE;
  v_payload jsonb;
  v_allocations jsonb;
  v_replay jsonb;
  v_sql text;
  v_tap text[] := ARRAY[]::text[];
  v_moves_before bigint;
  v_xml_before text;
BEGIN
  SELECT * INTO STRICT v_return FROM public.orders WHERE id='__RETURN_ORDER_ID__';
  IF v_return.order_type <> 'return' OR v_return.order_data->>'is_test' <> 'true'
     OR public.test_artifact_identity(public.test_artifact_data(pg_catalog.to_jsonb(v_return))) IS NULL THEN
    RAISE EXCEPTION 'OWNED_CANONICAL_RETURN_REQUIRED';
  END IF;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub', v_return.order_data#>>'{testArtifact,ownerId}', true);
  PERFORM pg_catalog.set_config('request.jwt.claims', pg_catalog.jsonb_build_object(
    'sub', v_return.order_data#>>'{testArtifact,ownerId}', 'role', 'authenticated')::text, true);
  v_payload := pg_catalog.to_jsonb(v_return);
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'returnItemIndex',a.return_item_index,'originalOrderItemIndex',v_return.items->a.return_item_index->>'originalOrderItemIndex',
    'originalDocumentId',a.original_document_id,'originalItemNumber',a.original_item_number,'quantity',a.quantity))
    INTO v_allocations FROM public.nfe_return_item_allocations a WHERE a.return_order_id=v_return.id;
  SELECT count(*) INTO v_moves_before FROM public.inventory_moves WHERE order_id=v_return.id;
  SELECT pg_catalog.md5(pg_catalog.string_agg(coalesce(d.xml_nfe,'')||coalesce(d.xml_protocolo,''),'' ORDER BY d.id))
    INTO v_xml_before FROM public.nfe_documents d WHERE d.order_id=v_return.linked_order_id;
  PERFORM extensions.plan(7);
  v_tap := pg_catalog.array_append(v_tap, extensions.ok(
    pg_catalog.strpos(pg_catalog.pg_get_functiondef('public.create_return_order_with_fiscal_capacity(text,jsonb,jsonb,jsonb,jsonb)'::regprocedure),
      'CANONICAL_HML_RETURN_IDENTITY_V1')>0, 'ponte canônica instalada'));
  v_replay := public.create_return_order_with_fiscal_capacity(v_return.id,v_payload,v_return.items,
    coalesce(v_return.order_data->'payments','[]'::jsonb),v_allocations);
  v_tap := pg_catalog.array_append(v_tap, extensions.is(v_replay->>'idempotent_replay','true','replay da devolução canônica é idempotente'));
  v_sql := pg_catalog.format('select public.create_return_order_with_fiscal_capacity(%L,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb)',
    v_return.id,pg_catalog.jsonb_set(v_payload,'{order_data,testArtifact,runId}',pg_catalog.to_jsonb(gen_random_uuid()::text)),
    v_return.items,'[]',v_allocations);
  v_tap := pg_catalog.array_append(v_tap,extensions.throws_ok(v_sql,'P0001',
    'TEST_ARTIFACT_LINK_MISMATCH: devolução e venda exigem a mesma execução e operador','replay de outra execução é recusado'));
  v_sql := pg_catalog.format('select public.create_return_order_with_fiscal_capacity(%L,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb)',
    v_return.id,pg_catalog.jsonb_set(v_payload,'{order_data,testArtifact,ownerId}',pg_catalog.to_jsonb(gen_random_uuid()::text)),
    v_return.items,'[]',v_allocations);
  v_tap := pg_catalog.array_append(v_tap,extensions.throws_ok(v_sql,'P0001',
    'TEST_ARTIFACT_UNAUTHORIZED: execução e operador administrador autenticado são obrigatórios','replay de outro owner é recusado'));
  v_sql := pg_catalog.format('select public.create_return_order_with_fiscal_capacity(%L,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb)',
    v_return.id,pg_catalog.jsonb_set(v_payload,'{order_data,test_environment}','"production"'::jsonb),v_return.items,'[]',v_allocations);
  v_tap := pg_catalog.array_append(v_tap,extensions.throws_ok(v_sql,'P0001',
    'TEST_ARTIFACT_LINK_MISMATCH: marcadores fiscais legados divergem da identidade canônica','ambiente legado divergente é recusado'));
  v_tap := pg_catalog.array_append(v_tap,extensions.is((SELECT count(*) FROM public.inventory_moves WHERE order_id=v_return.id),
    v_moves_before,'replay não duplica movimentos de estoque'));
  v_tap := pg_catalog.array_append(v_tap,extensions.is((SELECT pg_catalog.md5(pg_catalog.string_agg(
    coalesce(d.xml_nfe,'')||coalesce(d.xml_protocolo,''),'' ORDER BY d.id)) FROM public.nfe_documents d WHERE d.order_id=v_return.linked_order_id),
    v_xml_before,'XML e protocolo da origem preservados'));
  PERFORM pg_catalog.set_config('test.nfh_tap',pg_catalog.to_jsonb(v_tap)::text,true);
END;
$proof$;
SELECT pg_catalog.current_setting('test.nfh_tap')::jsonb AS checks;
ROLLBACK;
