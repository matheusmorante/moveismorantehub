-- Read-only catalog and pure-function checks; no Auth claims, commercial rows,
-- fixtures or command execution. These do not prove transaction/RLS behavior.
WITH commands AS (
  SELECT procedure.* FROM pg_catalog.pg_proc AS procedure
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public' AND procedure.proname IN (
    'inventory_batch_metadata', 'inventory_batch_metadata_number', 'inventory_batch_is_effective',
    'inventory_batch_can_configure', 'update_inventory_batch'
  )
), checks AS (
  SELECT '01_exact_command_signature' AS test, EXISTS (
    SELECT 1 FROM commands WHERE oid = pg_catalog.to_regprocedure('public.update_inventory_batch(uuid,uuid,numeric,numeric,numeric,numeric)')
      AND prorettype = 'jsonb'::regtype
  ) AS passed
  UNION ALL SELECT '02_five_security_invoker_functions', (SELECT count(*) = 5 AND bool_and(NOT prosecdef) FROM commands)
  UNION ALL SELECT '03_empty_search_paths', (SELECT bool_and(proconfig @> ARRAY['search_path=""']) FROM commands)
  UNION ALL SELECT '04_command_bounded_waits', (SELECT proconfig @> ARRAY[
    'lock_timeout=5s', 'statement_timeout=30s', 'idle_in_transaction_session_timeout=60s'
  ] FROM commands WHERE proname = 'update_inventory_batch')
  UNION ALL SELECT '05_no_public_or_anon_execute', (SELECT bool_and(
    NOT pg_catalog.has_function_privilege('anon', oid, 'EXECUTE')
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(proacl, pg_catalog.acldefault('f', proowner))) AS acl
      WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE')
  ) FROM commands)
  UNION ALL SELECT '06_authenticated_execute', (SELECT bool_and(pg_catalog.has_function_privilege('authenticated', oid, 'EXECUTE')) FROM commands)
  UNION ALL SELECT '07_only_helpers_immutable', (SELECT count(*) = 4 AND bool_and(provolatile = 'i') FROM commands WHERE proname <> 'update_inventory_batch')
  UNION ALL SELECT '08_metadata_safe_parse', public.inventory_batch_metadata(NULL) = '{}'::jsonb
    AND public.inventory_batch_metadata('legado') = '{}'::jsonb AND public.inventory_batch_metadata('[1]') = '{}'::jsonb
    AND public.inventory_batch_metadata('{"testArtifact":{"runId":"owned"}}') -> 'testArtifact' = '{"runId":"owned"}'::jsonb
  UNION ALL SELECT '09_finite_numeric_anchors', public.inventory_batch_metadata_number('{"targetStock":0}', 'targetStock') = 0
    AND public.inventory_batch_metadata_number('{"targetStock":"-2.5"}', 'targetStock') = -2.5
    AND public.inventory_batch_metadata_number('{"targetStock":"NaN"}', 'targetStock') IS NULL
    AND public.inventory_batch_metadata_number('{"targetStock":"Infinity"}', 'targetStock') IS NULL
    AND public.inventory_batch_metadata_number('{"targetStock":false}', 'targetStock') IS NULL
    AND public.inventory_batch_metadata_number('{"targetStock":""}', 'targetStock') IS NULL
  UNION ALL SELECT '10_explicit_status_and_legacy_reversal', public.inventory_batch_is_effective('effective', NULL, 'Estorno - Pedido #1')
    AND public.inventory_batch_is_effective(NULL, '{"status":"active"}', 'Estorno - Pedido #1')
    AND NOT public.inventory_batch_is_effective('cancelled', '{}', NULL)
    AND NOT public.inventory_batch_is_effective('effective', '{"status":"reversed"}', NULL)
    AND NOT public.inventory_batch_is_effective(NULL, 'legado', 'Estorno legado')
    AND NOT public.inventory_batch_is_effective(NULL, NULL, 'Cancelamento da venda #1')
  UNION ALL SELECT '11_administrator_override_and_role_precedence', public.inventory_batch_can_configure(ARRAY['administrator'], 'pending', 'null'::jsonb)
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], 'administrator', '{"rolePermissions":{"productConfig":[]}}')
  UNION ALL SELECT '12_pending_and_legacy_roles', NOT public.inventory_batch_can_configure(ARRAY['pending'], 'pending', '{}')
    AND public.inventory_batch_can_configure(ARRAY['pending'], 'stockist', '{}')
    AND public.inventory_batch_can_configure(NULL, 'manager', '{}')
  UNION ALL SELECT '13_permission_explicit_array', public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":{"productConfig":["seller"]}}')
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":{"productConfig":[]}}')
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":{"productConfig":["manager"]}}')
  UNION ALL SELECT '14_permission_fallback_only_absent_key', public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{}')
    AND public.inventory_batch_can_configure(ARRAY['stockist'], NULL, '{"rolePermissions":{}}')
    AND NOT public.inventory_batch_can_configure(ARRAY['pending'], NULL, '{}')
    AND NOT public.inventory_batch_can_configure(ARRAY['driver'], NULL, '{}')
  UNION ALL SELECT '15_malformed_permissions_deny', NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, 'null')
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":null}')
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":{"productConfig":null}}')
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":{"productConfig":"seller"}}')
    AND NOT public.inventory_batch_can_configure(ARRAY['seller'], NULL, '{"rolePermissions":{"productConfig":["seller",1]}}')
)
SELECT test, COALESCE(passed, false) AS passed FROM checks ORDER BY test;
