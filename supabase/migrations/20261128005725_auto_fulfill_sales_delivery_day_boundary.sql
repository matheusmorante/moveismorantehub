BEGIN;

CREATE OR REPLACE FUNCTION public.auto_fulfill_scheduled_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, extensions
AS $function$
DECLARE
  v_now_sp timestamp := (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Sao_Paulo');
  v_business_date date := v_now_sp::date;
  v_sales_only boolean := COALESCE(
    pg_catalog.current_setting('morante.auto_fulfill_sales_only', true) = 'true',
    false
  );
  v_candidate record;
  v_order public.orders%ROWTYPE;
  v_due_timestamp timestamp;
  v_payload jsonb;
  v_processed integer := 0;
  v_version_conflicts integer := 0;
  v_failed integer := 0;
BEGIN
  PERFORM pg_catalog.set_config('morante.auto_fulfill_scheduled_sales', 'true', true);
  PERFORM pg_catalog.set_config('morante.delivery_summary_refresh_enqueued', 'false', true);

  FOR v_candidate IN
    SELECT o.id,
           o.updated_at,
           due_date.iso_date AS due_date,
           due_time.iso_time AS due_time,
           due_at.deadline AS due_timestamp
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
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN o.order_type = 'assistance' THEN '00:00:00'
          WHEN NULLIF(pg_catalog.btrim(schedule.data ->> 'endTime'), '') ~ '^[0-9]{1,2}:[0-9]{2}'
            THEN pg_catalog.to_char((pg_catalog.btrim(schedule.data ->> 'endTime'))::time, 'HH24:MI:SS')
          WHEN NULLIF(pg_catalog.btrim(o.scheduled_end_time::text), '') ~ '^[0-9]{1,2}:[0-9]{2}'
            THEN pg_catalog.to_char((pg_catalog.btrim(o.scheduled_end_time::text))::time, 'HH24:MI:SS')
          WHEN (schedule.data ->> 'time') ~ '[0-9]{1,2}:[0-9]{2}.*([0-9]{1,2}:[0-9]{2})'
            THEN pg_catalog.to_char((regexp_replace(schedule.data ->> 'time', '^.*([0-9]{2}:[0-9]{2}).*$', '\1'))::time, 'HH24:MI:SS')
          WHEN (schedule.data ->> 'time') ~ '^[0-9]{1,2}:[0-9]{2}'
            THEN pg_catalog.to_char((regexp_replace(schedule.data ->> 'time', '^([0-9]{2}:[0-9]{2}).*$', '\1'))::time, 'HH24:MI:SS')
          WHEN NULLIF(pg_catalog.btrim(schedule.data ->> 'startTime'), '') ~ '^[0-9]{1,2}:[0-9]{2}'
            THEN pg_catalog.to_char((pg_catalog.btrim(schedule.data ->> 'startTime'))::time, 'HH24:MI:SS')
          WHEN NULLIF(pg_catalog.btrim(o.scheduled_start_time::text), '') ~ '^[0-9]{1,2}:[0-9]{2}'
            THEN pg_catalog.to_char((pg_catalog.btrim(o.scheduled_start_time::text))::time, 'HH24:MI:SS')
          ELSE '23:59:59'
        END AS iso_time
      ) AS due_time
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN o.order_type = 'sale'
            AND pg_catalog.jsonb_typeof(schedule.data -> 'appointments') = 'array'
            AND pg_catalog.jsonb_array_length(schedule.data -> 'appointments') > 0
            THEN schedule.data -> 'appointments'
          WHEN o.order_type = 'sale'
            THEN pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
              'deliveryMethod', COALESCE(
                NULLIF(o.delivery_method, ''),
                o.order_data #>> '{shipping,deliveryMethod}',
                o.order_data ->> 'deliveryMethod',
                'delivery'
              ),
              'scheduling', schedule.data
            ))
          ELSE '[]'::jsonb
        END AS operations
      ) AS sale_operations
      CROSS JOIN LATERAL (
        SELECT pg_catalog.count(*) AS operation_count,
               pg_catalog.count(operation_due.deadline) AS valid_operation_count,
               pg_catalog.bool_or(operation_due.pending) AS has_pending,
               pg_catalog.max(operation_due.deadline) AS deadline
          FROM (
            SELECT operation_state.pending,
                   CASE
                     WHEN operation_date.iso_date IS NULL OR operation_state.pending THEN NULL
                     WHEN operation_method.delivery_method IN ('pickup', 'retirada', 'retirar', 'pick-up')
                       AND pg_catalog.lower(COALESCE(operation_schedule.data ->> 'immediatePickup', 'false')) = 'true'
                       THEN (operation_date.iso_date || ' ' || operation_time.iso_time)::timestamp
                     ELSE (operation_date.iso_date::date + 1)::timestamp
                   END AS deadline
              FROM pg_catalog.jsonb_array_elements(sale_operations.operations) AS appointment(value)
              CROSS JOIN LATERAL (
                SELECT CASE
                  WHEN pg_catalog.jsonb_typeof(appointment.value -> 'scheduling') = 'object'
                    THEN appointment.value -> 'scheduling'
                  ELSE schedule.data
                END AS data
              ) AS operation_schedule
              CROSS JOIN LATERAL (
                SELECT CASE
                  WHEN (
                    pg_catalog.lower(COALESCE(operation_schedule.data ->> 'dateType', '')) = 'range'
                    OR pg_catalog.lower(COALESCE(operation_schedule.data ->> 'type', '')) = 'range'
                  ) AND NULLIF(pg_catalog.btrim(operation_schedule.data ->> 'endDate'), '') IS NOT NULL
                    THEN NULLIF(pg_catalog.btrim(operation_schedule.data ->> 'endDate'), '')
                  ELSE COALESCE(
                    NULLIF(pg_catalog.btrim(operation_schedule.data ->> 'date'), ''),
                    o.scheduled_date::text,
                    NULLIF(pg_catalog.btrim(o.order_data ->> 'scheduledDate'), '')
                  )
                END AS raw_date
              ) AS operation_raw_date
              CROSS JOIN LATERAL (
                SELECT CASE
                  WHEN operation_raw_date.raw_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                    THEN pg_catalog.left(operation_raw_date.raw_date, 10)
                  WHEN operation_raw_date.raw_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
                    THEN pg_catalog.substr(operation_raw_date.raw_date, 7, 4) || '-' ||
                         pg_catalog.substr(operation_raw_date.raw_date, 4, 2) || '-' ||
                         pg_catalog.substr(operation_raw_date.raw_date, 1, 2)
                  ELSE NULL
                END AS iso_date
              ) AS operation_date
              CROSS JOIN LATERAL (
                SELECT CASE
                  WHEN NULLIF(pg_catalog.btrim(operation_schedule.data ->> 'startTime'), '') ~ '^[0-9]{1,2}:[0-9]{2}'
                    THEN pg_catalog.to_char((pg_catalog.btrim(operation_schedule.data ->> 'startTime'))::time, 'HH24:MI:SS')
                  WHEN (operation_schedule.data ->> 'time') ~ '^[0-9]{1,2}:[0-9]{2}'
                    THEN pg_catalog.to_char((regexp_replace(operation_schedule.data ->> 'time', '^([0-9]{1,2}:[0-9]{2}).*$', '\1'))::time, 'HH24:MI:SS')
                  WHEN NULLIF(pg_catalog.btrim(o.scheduled_start_time::text), '') ~ '^[0-9]{1,2}:[0-9]{2}'
                    THEN pg_catalog.to_char((pg_catalog.btrim(o.scheduled_start_time::text))::time, 'HH24:MI:SS')
                  ELSE '00:00:00'
                END AS iso_time
              ) AS operation_time
              CROSS JOIN LATERAL (
                SELECT pg_catalog.lower(COALESCE(NULLIF(pg_catalog.btrim(operation_schedule.data ->> 'pendingScheduling'), ''), 'false')) = 'true' AS pending
              ) AS operation_state
              CROSS JOIN LATERAL (
                SELECT pg_catalog.lower(pg_catalog.btrim(COALESCE(
                  NULLIF(appointment.value ->> 'deliveryMethod', ''),
                  NULLIF(o.delivery_method, ''),
                  o.order_data #>> '{shipping,deliveryMethod}',
                  o.order_data ->> 'deliveryMethod',
                  'delivery'
                ))) AS delivery_method
              ) AS operation_method
          ) AS operation_due
      ) AS sale_due
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN o.order_type = 'sale' AND sale_due.operation_count > 0
            THEN sale_due.deadline
          WHEN o.order_type IN ('sale', 'assistance')
            THEN (due_date.iso_date::date + 1)::timestamp
          ELSE (due_date.iso_date || ' ' || due_time.iso_time)::timestamp
        END AS deadline
      ) AS due_at
     WHERE o.order_type IN ('sale', 'return', 'assistance')
       AND (NOT v_sales_only OR o.order_type = 'sale')
       AND o.status = 'scheduled'
       AND COALESCE(o.deleted, false) = false
       AND NOT public.is_nfe_hml_test_order(o.id, o.status, o.deleted, o.order_data)
       AND pg_catalog.lower(COALESCE(NULLIF(pg_catalog.btrim(schedule.data ->> 'pendingScheduling'), ''), 'false')) <> 'true'
       AND (o.order_type <> 'sale' OR NOT COALESCE(sale_due.has_pending, false))
       AND (o.order_type <> 'sale' OR sale_due.operation_count = sale_due.valid_operation_count)
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
         OR o.order_type = 'assistance'
       )
       AND due_at.deadline IS NOT NULL
       AND due_at.deadline <= v_now_sp
     ORDER BY due_at.deadline, o.id
  LOOP
    v_due_timestamp := v_candidate.due_timestamp;
    IF v_due_timestamp > (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Sao_Paulo') THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = v_candidate.id;
    IF NOT FOUND
       OR v_order.updated_at IS DISTINCT FROM v_candidate.updated_at
       OR v_order.status IS DISTINCT FROM 'scheduled'
       OR v_order.order_type NOT IN ('sale', 'return', 'assistance')
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
    WHEN SQLSTATE 'P0001' THEN
      PERFORM pg_catalog.set_config('morante.auto_fulfill_order_id', '', true);
      IF SQLERRM = 'ORDER_VERSION_CONFLICT' THEN
        v_version_conflicts := v_version_conflicts + 1;
      ELSE
        RAISE WARNING 'Automatic order fulfillment skipped order_id=% SQLSTATE=%', v_order.id, SQLSTATE;
        v_failed := v_failed + 1;
      END IF;
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

REVOKE ALL ON FUNCTION public.auto_fulfill_scheduled_orders()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.auto_fulfill_scheduled_orders() IS
  'Automatically completes immediate sale pickups at their scheduled current time, all other sales after the last scheduled operation date ends, assistance orders after their scheduled date ends, and return collections after their scheduled date/time in America/Sao_Paulo. Updates use the versioned inventory transaction and preserve fiscal snapshots.';

COMMIT;
