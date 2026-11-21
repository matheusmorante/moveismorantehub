BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
DECLARE
  v_function oid := to_regprocedure('public.dashboard_order_effective_at(jsonb,timestamptz)');
BEGIN
  IF to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'Expected public.orders table is missing';
  END IF;

  IF v_function IS NULL THEN
    RAISE EXCEPTION 'Expected dashboard_order_effective_at(jsonb,timestamptz) function is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid = v_function AND provolatile = 'i'
  ) THEN
    RAISE EXCEPTION 'dashboard_order_effective_at must remain immutable for an expression index';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.orders'::regclass
      AND attname IN ('id', 'order_data', 'created_at')
      AND attnum > 0
      AND NOT attisdropped
  ) <> 3 THEN
    RAISE EXCEPTION 'Expected index columns on public.orders are missing';
  END IF;

  IF to_regclass('public.idx_orders_dashboard_effective_at') IS NOT NULL THEN
    RAISE EXCEPTION 'idx_orders_dashboard_effective_at already exists; inspect before applying';
  END IF;
END;
$preflight$;

CREATE INDEX idx_orders_dashboard_effective_at
  ON public.orders (
    public.dashboard_order_effective_at(order_data, created_at) DESC,
    id
  );

COMMENT ON INDEX public.idx_orders_dashboard_effective_at IS
  'Supports the date-range filter and ordering in get_dashboard_orders_by_effective_date.';

COMMIT;
