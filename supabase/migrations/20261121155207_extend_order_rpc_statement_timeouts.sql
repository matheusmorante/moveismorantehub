BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
DECLARE
  v_create_oid oid := 'public.create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean)'::pg_catalog.regprocedure;
  v_page_oid oid := 'public.list_order_page_ids(jsonb,integer,integer,text)'::pg_catalog.regprocedure;
  v_schedule_oid oid := 'public.list_order_schedule_ids(text,jsonb,integer,integer)'::pg_catalog.regprocedure;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20261121135527'
  ) THEN
    RAISE EXCEPTION 'Expected reviewed order performance migration is not installed';
  END IF;

  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = v_create_oid)
      IS DISTINCT FROM 'ff83716f53759010da264c3d22959ee7'
    OR (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = v_page_oid)
      IS DISTINCT FROM '5419e020d4109708ad526d9ca166aef3'
    OR (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = v_schedule_oid)
      IS DISTINCT FROM '087f4b3cbf7552cd8162febea3604cbb'
  THEN
    RAISE EXCEPTION 'Order RPC definitions differ from the reviewed remote versions';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_db_role_setting AS setting
    JOIN pg_catalog.pg_roles AS role ON role.oid = setting.setrole
    WHERE role.rolname = 'authenticated'
      AND setting.setconfig @> ARRAY['statement_timeout=8s']
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_db_role_setting AS setting
    JOIN pg_catalog.pg_roles AS role ON role.oid = setting.setrole
    WHERE role.rolname = 'authenticator'
      AND setting.setconfig @> ARRAY['statement_timeout=8s']
  ) THEN
    RAISE EXCEPTION 'Expected 8-second API role timeout was changed; inspect before applying';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    CROSS JOIN LATERAL pg_catalog.unnest(p.proconfig) AS config(value)
    WHERE p.oid IN (v_create_oid, v_page_oid, v_schedule_oid)
      AND config.value LIKE 'statement_timeout=%'
  ) THEN
    RAISE EXCEPTION 'An order RPC already has a function-level statement timeout';
  END IF;
END;
$preflight$;

-- Keep the global API limit intact. These RPCs alone receive enough time to
-- finish their transaction or server-side page query during normal contention.
ALTER FUNCTION public.create_order_with_inventory_transaction(text, jsonb, jsonb, jsonb, boolean)
  SET statement_timeout = '20s';
ALTER FUNCTION public.list_order_page_ids(jsonb, integer, integer, text)
  SET statement_timeout = '20s';
ALTER FUNCTION public.list_order_schedule_ids(text, jsonb, integer, integer)
  SET statement_timeout = '20s';

COMMIT;
