BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Domain conflicts must reach the caller. SQLSTATE 40001 makes PostgREST 14
-- retry the entire transaction indefinitely, even after the HTTP client leaves.
-- Patch the existing definition to preserve snapshot, numbering and ACL rules.
DO $migration$
DECLARE
  v_signature regprocedure := 'public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)'::regprocedure;
  v_definition text;
  v_source_error text := $old$RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';$old$;
  v_snapshot_lock text := $old$PERFORM pg_advisory_xact_lock(hashtextextended('nfe_snapshot:'||v_request_id::text,0));$old$;
  v_order_lock text := $old$PERFORM pg_advisory_xact_lock(hashtextextended('nfe_emit:'||v_order_id||':retail:'||v_env::text,0));$old$;
  v_customer_guard text := $old$IF v_customer IS NULL OR v_inputs IS DISTINCT FROM jsonb_build_object('products',v_products,'customer',v_customer,$old$;
BEGIN
  v_definition := pg_catalog.replace(pg_catalog.pg_get_functiondef(v_signature), E'\r\n', E'\n');
  IF pg_catalog.strpos(v_definition, '-- OUTBOUND_PREPARATION_FAIL_FAST_V1') = 0 THEN
    IF (pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_source_error,''))) <> 3*pg_catalog.length(v_source_error) OR
       (pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_snapshot_lock,''))) <> pg_catalog.length(v_snapshot_lock) OR
       (pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_order_lock,''))) <> pg_catalog.length(v_order_lock) OR
       (pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_customer_guard,''))) <> pg_catalog.length(v_customer_guard) THEN
      RAISE EXCEPTION 'OUTBOUND_PREPARATION_SCHEMA_DRIFT: review live definition before applying';
    END IF;

    v_definition := pg_catalog.replace(v_definition,v_source_error,
      $new$RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='PT409';$new$);
    v_definition := pg_catalog.replace(v_definition,v_snapshot_lock,
      $new$IF NOT pg_catalog.pg_try_advisory_xact_lock(hashtextextended('nfe_snapshot:'||v_request_id::text,0)) THEN
  RAISE EXCEPTION 'FISCAL_PREPARATION_BUSY' USING ERRCODE='55P03';
 END IF;$new$);
    v_definition := pg_catalog.replace(v_definition,v_order_lock,
      $new$IF NOT pg_catalog.pg_try_advisory_xact_lock(hashtextextended('nfe_emit:'||v_order_id||':retail:'||v_env::text,0)) THEN
  RAISE EXCEPTION 'FISCAL_PREPARATION_BUSY' USING ERRCODE='55P03';
 END IF;$new$);

    -- No linked person is a real input state for model 65. Match the backend's
    -- empty customer witness only when the commercial order has no customer ID.
    -- Existing/deleted IDs and model 55 keep the original strict validation.
    v_definition := pg_catalog.replace(v_definition,v_customer_guard,
      $new$-- OUTBOUND_PREPARATION_FAIL_FAST_V1
 IF v_customer IS NULL AND v_model='65' AND
    nullif(btrim(v_order.order_data#>>'{customerData,id}'),'') IS NULL THEN
  v_customer := '{}'::jsonb;
 END IF;
 IF v_customer IS NULL OR v_inputs IS DISTINCT FROM jsonb_build_object('products',v_products,'customer',v_customer,$new$);
    EXECUTE v_definition;
  END IF;
END;
$migration$;

ALTER FUNCTION public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)
  SET lock_timeout = '5s';

COMMIT;
