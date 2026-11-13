BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF (
    SELECT md5(prosrc)
    FROM pg_catalog.pg_proc
    WHERE oid = to_regprocedure('public.refresh_dashboard_metrics_trigger()')
  ) IS DISTINCT FROM '020bf8349ac06568d9856f076e1b2ed8' THEN
    RAISE EXCEPTION 'LEGACY_DASHBOARD_REFRESH_SOURCE_CHANGED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.orders'::pg_catalog.regclass
      AND tgname = 'orders_dashboard_metrics_refresh'
      AND tgfoid = to_regprocedure('public.refresh_dashboard_metrics_trigger()')
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'LEGACY_DASHBOARD_REFRESH_TRIGGER_CHANGED';
  END IF;
END;
$preflight$;

-- AFTER UPDATE ja enxerga NEW: recalcular duas vezes o mesmo dia nao muda
-- o resultado, mas duplica o custo em cada gravacao do pedido.
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_test boolean := true;
  v_new_test boolean := true;
  v_old_day date;
  v_new_day date;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_test := public.is_nfe_hml_test_order(OLD.id, OLD.status, OLD.deleted, OLD.order_data)
      OR public.test_artifact_is_test(to_jsonb(OLD));
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_test := public.is_nfe_hml_test_order(NEW.id, NEW.status, NEW.deleted, NEW.order_data)
      OR public.test_artifact_is_test(to_jsonb(NEW));
  END IF;
  IF v_old_test AND v_new_test THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'INSERT' AND NOT v_old_test THEN
    v_old_day := public.parse_order_metric_date(OLD.order_data->>'date', OLD.created_at);
    PERFORM public.refresh_dashboard_metric_day(v_old_day);
  END IF;
  IF TG_OP <> 'DELETE' AND NOT v_new_test THEN
    v_new_day := public.parse_order_metric_date(NEW.order_data->>'date', NEW.created_at);
    IF v_old_test OR v_new_day IS DISTINCT FROM v_old_day THEN
      PERFORM public.refresh_dashboard_metric_day(v_new_day);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMIT;
