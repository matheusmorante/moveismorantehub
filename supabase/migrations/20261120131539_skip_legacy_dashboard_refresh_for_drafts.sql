BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
DECLARE
  v_function_hash text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20261113185904'
  ) THEN
    RAISE EXCEPTION 'Expected dashboard refresh deduplication migration is not installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.orders'::pg_catalog.regclass
      AND tgname = 'orders_dashboard_metrics_refresh'
      AND tgenabled IN ('O', 'A')
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Expected active legacy dashboard trigger was not found';
  END IF;

  SELECT pg_catalog.md5(p.prosrc)
    INTO v_function_hash
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.refresh_dashboard_metrics_trigger()'::pg_catalog.regprocedure;

  IF v_function_hash IS DISTINCT FROM 'cbbb3931c377fbf35dd7040801261c23' THEN
    RAISE EXCEPTION 'Legacy dashboard trigger function differs from the reviewed version';
  END IF;
END;
$preflight$;

-- Rascunhos nao entram nos agregados legados. Evite recalcular o dia inteiro
-- e consultar marcadores de teste em cada autosave de uma venda ainda aberta.
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_test boolean := true;
  v_new_test boolean := true;
  v_old_affects_metrics boolean := false;
  v_new_affects_metrics boolean := false;
  v_old_day date;
  v_new_day date;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_affects_metrics := NOT COALESCE(OLD.deleted, false)
      AND (
        (
          lower(COALESCE(OLD.status, OLD.order_data->>'status', '')) IN ('scheduled', 'fulfilled')
          AND lower(COALESCE(OLD.order_data->>'orderType', OLD.order_type, 'sale')) IN ('sale', 'showroom')
        )
        OR (
          lower(COALESCE(OLD.status, OLD.order_data->>'status', '')) = 'fulfilled'
          AND lower(COALESCE(OLD.order_data->>'orderType', OLD.order_type, 'sale')) = 'return'
        )
      );

    IF v_old_affects_metrics THEN
      v_old_test := public.is_nfe_hml_test_order(OLD.id, OLD.status, OLD.deleted, OLD.order_data)
        OR public.test_artifact_is_test(to_jsonb(OLD));
      IF NOT v_old_test THEN
        v_old_day := public.parse_order_metric_date(OLD.order_data->>'date', OLD.created_at);
      END IF;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_new_affects_metrics := NOT COALESCE(NEW.deleted, false)
      AND (
        (
          lower(COALESCE(NEW.status, NEW.order_data->>'status', '')) IN ('scheduled', 'fulfilled')
          AND lower(COALESCE(NEW.order_data->>'orderType', NEW.order_type, 'sale')) IN ('sale', 'showroom')
        )
        OR (
          lower(COALESCE(NEW.status, NEW.order_data->>'status', '')) = 'fulfilled'
          AND lower(COALESCE(NEW.order_data->>'orderType', NEW.order_type, 'sale')) = 'return'
        )
      );

    IF v_new_affects_metrics THEN
      v_new_test := public.is_nfe_hml_test_order(NEW.id, NEW.status, NEW.deleted, NEW.order_data)
        OR public.test_artifact_is_test(to_jsonb(NEW));
      IF NOT v_new_test THEN
        v_new_day := public.parse_order_metric_date(NEW.order_data->>'date', NEW.created_at);
      END IF;
    END IF;
  END IF;

  IF TG_OP <> 'INSERT' AND v_old_affects_metrics AND NOT v_old_test AND v_old_day IS NOT NULL THEN
    PERFORM public.refresh_dashboard_metric_day(v_old_day);
  END IF;

  IF TG_OP <> 'DELETE' AND v_new_affects_metrics AND NOT v_new_test AND v_new_day IS NOT NULL THEN
    IF NOT v_old_affects_metrics OR v_old_test OR v_new_day IS DISTINCT FROM v_old_day THEN
      PERFORM public.refresh_dashboard_metric_day(v_new_day);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMIT;
