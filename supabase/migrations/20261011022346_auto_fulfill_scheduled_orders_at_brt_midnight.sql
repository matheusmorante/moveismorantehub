BEGIN;

CREATE OR REPLACE FUNCTION public.auto_fulfill_scheduled_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, extensions
AS $function$
DECLARE
  v_business_date date := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_candidate record;
  v_order public.orders%ROWTYPE;
  v_due_date date;
  v_payload jsonb;
  v_processed integer := 0;
  v_version_conflicts integer := 0;
BEGIN
  -- Keep the existing delivery-summary trigger batching behavior.
  PERFORM pg_catalog.set_config('morante.auto_fulfill_scheduled_sales', 'true', true);
  PERFORM pg_catalog.set_config('morante.delivery_summary_refresh_enqueued', 'false', true);

  FOR v_candidate IN
    SELECT o.id, o.updated_at, due_date.iso_date AS due_date
      FROM public.orders AS o
      CROSS JOIN LATERAL (
        SELECT COALESCE(
          o.order_data #> '{shipping,scheduling}',
          o.order_data -> 'schedule',
          '{}'::jsonb
        ) AS data
      ) AS schedule
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN pg_catalog.lower(COALESCE(schedule.data ->> 'dateType', schedule.data ->> 'type', '')) = 'range'
            THEN NULLIF(pg_catalog.btrim(schedule.data ->> 'endDate'), '')
          ELSE COALESCE(
            NULLIF(pg_catalog.btrim(schedule.data ->> 'date'), ''),
            o.scheduled_date::text
          )
        END AS raw_date
      ) AS raw_schedule_date
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN raw_schedule_date.raw_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            THEN pg_catalog.left(raw_schedule_date.raw_date, 10)
          WHEN raw_schedule_date.raw_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            THEN pg_catalog.substr(raw_schedule_date.raw_date, 7, 4) || '-' ||
                 pg_catalog.substr(raw_schedule_date.raw_date, 4, 2) || '-' ||
                 pg_catalog.substr(raw_schedule_date.raw_date, 1, 2)
          ELSE NULL
        END AS iso_date
      ) AS due_date
     WHERE o.order_type IN ('sale', 'return')
       AND o.status = 'scheduled'
       AND COALESCE(o.deleted, false) = false
       AND NOT public.is_nfe_hml_test_order(o.id, o.status, o.deleted, o.order_data)
       AND pg_catalog.lower(COALESCE(NULLIF(pg_catalog.btrim(schedule.data ->> 'pendingScheduling'), ''), 'false')) <> 'true'
       AND (
         (
           o.order_type = 'sale'
           AND pg_catalog.lower(pg_catalog.btrim(COALESCE(
             NULLIF(o.delivery_method, ''),
             o.order_data #>> '{shipping,deliveryMethod}',
             o.order_data ->> 'deliveryMethod',
             ''
           ))) IN ('delivery', 'entrega', 'deliver', 'pickup', 'retirada', 'retirar', 'pick-up')
         )
         OR (
           o.order_type = 'return'
           AND pg_catalog.lower(pg_catalog.btrim(COALESCE(
             o.order_data ->> 'returnMethod',
             o.order_data ->> 'return_method',
             ''
           ))) = 'store_collection'
         )
       )
       AND due_date.iso_date < v_business_date::text
     ORDER BY due_date.iso_date, o.id
  LOOP
    BEGIN
      v_due_date := v_candidate.due_date::date;
    EXCEPTION WHEN data_exception THEN
      -- Ignore malformed legacy dates without blocking other scheduled orders.
      CONTINUE;
    END;
    IF v_due_date >= v_business_date THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = v_candidate.id;
    IF NOT FOUND
       OR v_order.updated_at IS DISTINCT FROM v_candidate.updated_at
       OR v_order.status IS DISTINCT FROM 'scheduled'
       OR v_order.order_type NOT IN ('sale', 'return')
       OR COALESCE(v_order.deleted, false) THEN
      CONTINUE;
    END IF;

    v_payload := pg_catalog.to_jsonb(v_order) || pg_catalog.jsonb_build_object('status', 'fulfilled');
    BEGIN
      PERFORM public.update_order_with_inventory_transaction_if_version(
        v_order.id,
        v_candidate.updated_at,
        v_payload,
        COALESCE(v_order.items, '[]'::jsonb),
        COALESCE(v_order.order_data -> 'payments', '[]'::jsonb)
      );
      v_processed := v_processed + 1;
    EXCEPTION WHEN SQLSTATE '40001' THEN
      -- A user or another Cron run won the version check; the next Cron retries it.
      v_version_conflicts := v_version_conflicts + 1;
    END;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object(
    'processed', v_processed,
    'version_conflicts', v_version_conflicts,
    'brazil_date', v_business_date
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.auto_fulfill_scheduled_orders()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.auto_fulfill_scheduled_orders() IS
  'At midnight in America/Sao_Paulo, marks expired scheduled deliveries, pickups and return collections as fulfilled through the version-guarded inventory transaction. Return orders are displayed as Devolvido.';

DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid
      FROM cron.job
     WHERE jobname IN ('auto-fulfill-scheduled-sales', 'auto-fulfill-scheduled-orders')
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  -- Supabase Cron uses UTC; 03:00 UTC is midnight in America/Sao_Paulo.
  PERFORM cron.schedule(
    'auto-fulfill-scheduled-orders',
    '0 3 * * *',
    'SELECT public.auto_fulfill_scheduled_orders();'
  );
END;
$schedule$;

COMMIT;
