SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $$
DECLARE
  v_refresh_owner oid;
  v_trigger_owner oid;
BEGIN
  SELECT p.proowner INTO v_refresh_owner
  FROM pg_catalog.pg_proc p
  WHERE p.oid = to_regprocedure('public.refresh_dashboard_metric_day(date)');
  IF v_refresh_owner IS NULL THEN
    RAISE EXCEPTION 'Expected legacy dashboard refresh function was not found';
  END IF;

  SELECT p.proowner INTO v_trigger_owner
  FROM pg_catalog.pg_proc p
  WHERE p.oid = to_regprocedure('public.refresh_dashboard_metrics_trigger()');
  IF v_trigger_owner IS NULL OR v_trigger_owner IS DISTINCT FROM v_refresh_owner THEN
    RAISE EXCEPTION 'Legacy dashboard trigger and refresh function owners differ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid = 'public.orders'::pg_catalog.regclass
      AND t.tgname = 'orders_dashboard_metrics_refresh'
      AND t.tgfoid = to_regprocedure('public.refresh_dashboard_metrics_trigger()')
      AND NOT t.tgisinternal AND t.tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Expected legacy dashboard orders trigger was not found or is disabled';
  END IF;
END;
$$;

-- These SECURITY DEFINER functions remain available to their trigger owner only.
REVOKE ALL ON FUNCTION public.refresh_dashboard_metric_day(date)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_dashboard_metrics_trigger()
  FROM PUBLIC, anon, authenticated, service_role;
