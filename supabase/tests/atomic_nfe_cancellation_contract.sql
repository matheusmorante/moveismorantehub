-- Catalog/ACL checks only, after applying 20261013115005 to the authorized target.
-- Uses the existing pgTAP extension. No fixtures, DDL, SEFAZ calls or business writes.
-- This does NOT prove transactional rollback or concurrent behavior.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT plan(12);

WITH expected(signature) AS (VALUES
  ('public.reserve_nfe_cancellation_event(uuid,integer,text,text,uuid,uuid)'),
  ('public.persist_nfe_cancellation_result(uuid,uuid,integer,text,text,text,text,text,timestamptz,timestamptz)'),
  ('public.persist_nfe_legacy_consultation(uuid,integer,text,text,text,timestamptz,uuid)')
)
SELECT
  ok(to_regprocedure(signature) IS NOT NULL, signature || ': exists') AS existence,
  ok(coalesce((SELECT NOT p.prosecdef AND 'search_path=""'=ANY(p.proconfig)
    FROM pg_proc p WHERE p.oid=to_regprocedure(signature)),false),
    signature || ': invoker with empty search_path') AS security,
  ok(coalesce(has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE'),false),
    signature || ': service_role can execute') AS server_acl,
  ok(coalesce(NOT has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') AND
    NOT has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE'),false),
    signature || ': client roles cannot execute') AS client_acl
FROM expected;

SELECT * FROM finish();
ROLLBACK;
