BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20261120131539'
  ) THEN
    RAISE EXCEPTION 'Expected draft-safe dashboard trigger migration is not installed';
  END IF;

  IF to_regclass('public.idx_orders_dashboard_metric_date') IS NOT NULL THEN
    RAISE EXCEPTION 'Dashboard metric date index already exists; inspect before applying';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc
    WHERE oid = 'public.parse_order_metric_date(text,timestamptz)'::pg_catalog.regprocedure
      AND provolatile = 'i'
  ) THEN
    RAISE EXCEPTION 'Order metric date parser is not immutable; expression index is unsafe';
  END IF;
END;
$preflight$;

CREATE INDEX idx_orders_dashboard_metric_date
  ON public.orders ((public.parse_order_metric_date(order_data->>'date', created_at)));

COMMENT ON INDEX public.idx_orders_dashboard_metric_date IS
  'Supports date equality filtering in refresh_dashboard_metric_day(date).';

COMMIT;
