-- Adapt canonical testArtifact identities to the existing HML return contract.
-- Only local function variables and the NEW return payload receive legacy aliases.
-- The original sale, fiscal XML, snapshots, ACLs and transaction body are preserved.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $migration$
DECLARE
  v_definition text := pg_catalog.pg_get_functiondef(
    'public.create_return_order_with_fiscal_capacity(text,jsonb,jsonb,jsonb,jsonb)'::regprocedure);
  v_anchor text := '  SELECT * INTO v_existing_order FROM public.orders WHERE id::text = p_order_id FOR UPDATE;';
  v_bridge text := $bridge$
  -- CANONICAL_HML_RETURN_IDENTITY_V1: keep authorization at the database boundary.
  IF v_source.order_data ? 'testArtifact' THEN
    v_source_test_run_id := public.assert_test_artifact_identity(
      public.test_artifact_data(pg_catalog.to_jsonb(v_source)))->>'runId';
    IF public.assert_test_artifact_identity(public.test_artifact_data(p_order_payload))
       IS DISTINCT FROM public.test_artifact_identity(public.test_artifact_data(pg_catalog.to_jsonb(v_source))) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: devolução e venda exigem a mesma execução e operador';
    END IF;
    IF (v_source.order_data->>'test_environment' IS NOT NULL AND v_source.order_data->>'test_environment' <> 'homologation')
       OR (p_order_payload#>>'{order_data,test_environment}' IS NOT NULL AND p_order_payload#>>'{order_data,test_environment}' <> 'homologation')
       OR (v_source.order_data->>'testRunId' IS NOT NULL AND v_source.order_data->>'testRunId' <> v_source_test_run_id)
       OR (p_order_payload#>>'{order_data,testRunId}' IS NOT NULL AND p_order_payload#>>'{order_data,testRunId}' <> v_source_test_run_id) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: marcadores fiscais legados divergem da identidade canônica';
    END IF;
    -- v_source is a local row variable: this does not rewrite the source order.
    v_source.order_data := v_source.order_data || pg_catalog.jsonb_build_object(
      'testRunId', v_source_test_run_id, 'test_environment', 'homologation');
    p_order_payload := pg_catalog.jsonb_set(p_order_payload, '{order_data}',
      COALESCE(p_order_payload->'order_data', '{}'::jsonb) || pg_catalog.jsonb_build_object(
        'testRunId', v_source_test_run_id, 'test_run_id', v_source_test_run_id,
        'is_test', true, 'test_environment', 'homologation'), true);
    v_return_payload := p_order_payload;
  END IF;
$bridge$;
BEGIN
  IF pg_catalog.md5(v_definition) <> 'a630ccfd4306d32117f3a6175f480f41' THEN
    RAISE EXCEPTION 'CANONICAL_HML_RETURN_SCHEMA_DRIFT';
  END IF;
  IF pg_catalog.strpos(v_definition, v_anchor) = 0 THEN
    RAISE EXCEPTION 'CANONICAL_HML_RETURN_ANCHOR_MISSING';
  END IF;
  EXECUTE pg_catalog.replace(v_definition, v_anchor, v_bridge || E'\n' || v_anchor);
END;
$migration$;
COMMIT;
