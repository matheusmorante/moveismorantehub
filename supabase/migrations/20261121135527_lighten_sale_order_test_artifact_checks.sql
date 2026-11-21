BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261010012313'
  ) OR (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.test_artifact_data(jsonb)'::pg_catalog.regprocedure)
      IS DISTINCT FROM '42c00328f1439c562812557fb936742a' THEN
    RAISE EXCEPTION 'Expected test artifact metadata decoder was not found';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.test_artifact_data(p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
DECLARE
  v_data jsonb := COALESCE(p_row->'order_data', p_row);
  v_text text;
  v_note jsonb;
BEGIN
  IF pg_catalog.jsonb_typeof(v_data->'testArtifact') = 'object' THEN
    RETURN public.test_artifact_project(v_data->'testArtifact');
  END IF;
  IF pg_catalog.jsonb_typeof(v_data#>'{technical_specs,testArtifact}') = 'object' THEN
    RETURN public.test_artifact_project(v_data#>'{technical_specs,testArtifact}');
  END IF;
  IF pg_catalog.jsonb_typeof(v_data#>'{full_address,testArtifact}') = 'object' THEN
    RETURN public.test_artifact_project(v_data#>'{full_address,testArtifact}');
  END IF;
  IF pg_catalog.jsonb_typeof(v_data#>'{address,testArtifact}') = 'object' THEN
    RETURN public.test_artifact_project(v_data#>'{address,testArtifact}');
  END IF;
  IF pg_catalog.jsonb_typeof(v_data#>'{attributes,testArtifact}') = 'object' THEN
    RETURN public.test_artifact_project(v_data#>'{attributes,testArtifact}');
  END IF;

  FOREACH v_text IN ARRAY ARRAY[v_data->>'notes', v_data->>'observation'] LOOP
    -- Somente um objeto JSON pode conter o marcador legado. Observações comuns
    -- não precisam entrar no bloco de exceção nem tentar um cast para jsonb.
    IF v_text IS NULL OR pg_catalog.left(pg_catalog.ltrim(v_text, E' \t\n\r'), 1) <> '{' THEN
      CONTINUE;
    END IF;
    BEGIN
      v_note := v_text::jsonb;
      IF pg_catalog.jsonb_typeof(v_note->'testArtifact') = 'object' THEN
        RETURN public.test_artifact_project(v_note->'testArtifact');
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN NULL;
    END;
  END LOOP;
  RETURN public.test_artifact_project(v_data);
END;
$function$;

DO $narrow_order_projection$
DECLARE
  v_list_oid oid := 'public.list_order_page_ids(jsonb,integer,integer,text)'::pg_catalog.regprocedure;
  v_dashboard_oid oid := 'public.dashboard_sales_contribution(public.orders)'::pg_catalog.regprocedure;
  v_list_source text := 'public.order_list_is_test(pg_catalog.to_jsonb(n))';
  v_dashboard_source text := 'public.test_artifact_is_test(pg_catalog.to_jsonb(p_order))';
  v_list_definition text := pg_catalog.pg_get_functiondef(v_list_oid);
  v_dashboard_definition text := pg_catalog.pg_get_functiondef(v_dashboard_oid);
BEGIN
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = v_list_oid)
      IS DISTINCT FROM '5713282b0aac06b0b6de717f1aa2dd50'
    OR (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = v_dashboard_oid)
      IS DISTINCT FROM '77ab1df9f100299ec16e186a48d79baf'
    OR (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.order_list_is_test(jsonb)'::pg_catalog.regprocedure)
      IS DISTINCT FROM '8b22d8e9d2832681ca268f1b8e9e29c6'
    OR (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.test_artifact_is_test(jsonb)'::pg_catalog.regprocedure)
      IS DISTINCT FROM 'c740954521912d40c939bfb8036edc42'
    OR pg_catalog.strpos(v_list_definition, v_list_source) = 0
    OR pg_catalog.strpos(v_dashboard_definition, v_dashboard_source) = 0
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = 'public.orders'::pg_catalog.regclass AND attnum > 0 AND NOT attisdropped
        AND attname IN ('is_test', 'isTest')
    ) THEN
    RAISE EXCEPTION 'Order test artifact projections differ from the reviewed contracts';
  END IF;

  EXECUTE pg_catalog.replace(v_list_definition, v_list_source,
    'public.order_list_is_test(pg_catalog.jsonb_build_object(
          ''id'', n.id, ''order_number'', n.order_number, ''customer_name'', n.customer_name,
          ''notes'', n.notes, ''order_data'', n.order_data))');
  EXECUTE pg_catalog.replace(v_dashboard_definition, v_dashboard_source,
    'public.test_artifact_is_test(pg_catalog.jsonb_build_object(''order_data'', (p_order).order_data))');
END;
$narrow_order_projection$;

COMMIT;
