BEGIN;

CREATE OR REPLACE FUNCTION public.auto_fulfill_scheduled_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, extensions
AS $function$
DECLARE
  v_business_date date := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_sales_only boolean := COALESCE(
    pg_catalog.current_setting('morante.auto_fulfill_sales_only', true) = 'true',
    false
  );
  v_candidate record;
  v_order public.orders%ROWTYPE;
  v_due_date date;
  v_payload jsonb;
  v_processed integer := 0;
  v_version_conflicts integer := 0;
  v_failed integer := 0;
BEGIN
  PERFORM pg_catalog.set_config('morante.auto_fulfill_scheduled_sales', 'true', true);
  PERFORM pg_catalog.set_config('morante.delivery_summary_refresh_enqueued', 'false', true);

  FOR v_candidate IN
    SELECT o.id, o.updated_at, due_date.iso_date AS due_date
      FROM public.orders AS o
      CROSS JOIN LATERAL (
        SELECT COALESCE(
          o.order_data #> '{shipping,scheduling}',
          '{}'::jsonb
        ) AS data
      ) AS schedule
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN (
            pg_catalog.lower(COALESCE(schedule.data ->> 'dateType', '')) = 'range'
            OR pg_catalog.lower(COALESCE(schedule.data ->> 'type', '')) = 'range'
          ) AND NULLIF(pg_catalog.btrim(schedule.data ->> 'endDate'), '') IS NOT NULL
            THEN NULLIF(pg_catalog.btrim(schedule.data ->> 'endDate'), '')
          ELSE COALESCE(
            o.scheduled_date::text,
            NULLIF(pg_catalog.btrim(schedule.data ->> 'date'), ''),
            NULLIF(pg_catalog.btrim(o.order_data ->> 'scheduledDate'), '')
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
       AND (NOT v_sales_only OR o.order_type = 'sale')
       AND o.status = 'scheduled'
       AND COALESCE(o.deleted, false) = false
       AND NOT public.is_nfe_hml_test_order(o.id, o.status, o.deleted, o.order_data)
       AND pg_catalog.lower(COALESCE(NULLIF(pg_catalog.btrim(schedule.data ->> 'pendingScheduling'), ''), 'false')) <> 'true'
       AND pg_catalog.lower(COALESCE(NULLIF(pg_catalog.btrim(o.order_data ->> 'autoFulfillExempt'), ''), 'false')) <> 'true'
       AND (
         (
           o.order_type = 'sale'
           AND pg_catalog.lower(pg_catalog.btrim(COALESCE(
             NULLIF(o.delivery_method, ''),
             o.order_data #>> '{shipping,deliveryMethod}',
             o.order_data ->> 'deliveryMethod',
             'delivery'
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
       OR (v_sales_only AND v_order.order_type <> 'sale')
       OR COALESCE(v_order.deleted, false) THEN
      CONTINUE;
    END IF;

    v_payload := pg_catalog.to_jsonb(v_order) || pg_catalog.jsonb_build_object('status', 'fulfilled');
    BEGIN
      PERFORM pg_catalog.set_config('morante.auto_fulfill_order_id', v_order.id, true);
      PERFORM public.update_order_with_inventory_transaction_if_version(
        v_order.id,
        v_candidate.updated_at,
        v_payload,
        COALESCE(v_order.items, '[]'::jsonb),
        COALESCE(v_order.order_data -> 'payments', '[]'::jsonb)
      );
      PERFORM pg_catalog.set_config('morante.auto_fulfill_order_id', '', true);
      v_processed := v_processed + 1;
    EXCEPTION WHEN SQLSTATE '40001' THEN
      PERFORM pg_catalog.set_config('morante.auto_fulfill_order_id', '', true);
      v_version_conflicts := v_version_conflicts + 1;
    WHEN OTHERS THEN
      PERFORM pg_catalog.set_config('morante.auto_fulfill_order_id', '', true);
      RAISE WARNING 'Automatic order fulfillment skipped order_id=% SQLSTATE=%', v_order.id, SQLSTATE;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object(
    'processed', v_processed,
    'version_conflicts', v_version_conflicts,
    'failed', v_failed,
    'brazil_date', v_business_date
  );
END;
$function$;

COMMENT ON FUNCTION public.auto_fulfill_scheduled_orders() IS
  'Automatically completes expired sales and return collections using the UI due-date rules, preserving fiscal snapshots and isolating per-order failures.';

COMMIT;
