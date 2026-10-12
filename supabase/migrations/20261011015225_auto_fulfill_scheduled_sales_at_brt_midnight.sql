BEGIN;

-- Consolidate the existing delivery-summary webhook to at most one request for
-- the nightly fulfillment batch. Normal order writes keep their current behavior.
CREATE OR REPLACE FUNCTION public.enqueue_delivery_summary_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  job_secret text;
  v_operational boolean := false;
BEGIN
  IF current_setting('morante.auto_fulfill_scheduled_sales', true) = 'true'
     AND current_setting('morante.delivery_summary_refresh_enqueued', true) = 'true' THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT EXISTS (
        SELECT 1 FROM hml_new_rows AS r
        WHERE NOT public.is_nfe_hml_test_order(r.id, r.status, r.deleted, r.order_data)
          AND NOT public.test_artifact_is_test(to_jsonb(r))
      ) INTO v_operational;
    END IF;
    IF TG_OP <> 'INSERT' AND NOT v_operational THEN
      SELECT EXISTS (
        SELECT 1 FROM hml_old_rows AS r
        WHERE NOT public.is_nfe_hml_test_order(r.id, r.status, r.deleted, r.order_data)
          AND NOT public.test_artifact_is_test(to_jsonb(r))
      ) INTO v_operational;
    END IF;
    IF NOT v_operational THEN RETURN NULL; END IF;
  END IF;

  SELECT decrypted_secret INTO job_secret FROM vault.decrypted_secrets
    WHERE name = 'delivery_summary_job_secret' LIMIT 1;
  IF COALESCE(job_secret, '') = '' THEN RETURN NULL; END IF;
  PERFORM net.http_post(
    url := 'https://hkoxhourxwlddgsfdgws.supabase.co/functions/v1/refresh-delivery-summaries',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-delivery-summary-job-secret', job_secret),
    body := jsonb_build_object('source', TG_TABLE_NAME));

  IF current_setting('morante.auto_fulfill_scheduled_sales', true) = 'true' THEN
    PERFORM set_config('morante.delivery_summary_refresh_enqueued', 'true', true);
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_fulfill_scheduled_sales()
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
  -- Transaction-local flags deduplicate the existing async summary refresh.
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
     WHERE o.order_type = 'sale'
       AND o.status = 'scheduled'
       AND COALESCE(o.deleted, false) = false
       AND NOT public.is_nfe_hml_test_order(o.id, o.status, o.deleted, o.order_data)
       AND pg_catalog.lower(COALESCE(NULLIF(pg_catalog.btrim(schedule.data ->> 'pendingScheduling'), ''), 'false')) <> 'true'
       AND pg_catalog.lower(pg_catalog.btrim(COALESCE(
         NULLIF(o.delivery_method, ''),
         o.order_data #>> '{shipping,deliveryMethod}',
         o.order_data ->> 'deliveryMethod',
         ''
       ))) IN ('delivery', 'entrega', 'deliver', 'pickup', 'retirada', 'retirar', 'pick-up')
       AND due_date.iso_date < v_business_date::text
     ORDER BY due_date.iso_date, o.id
  LOOP
    BEGIN
      v_due_date := v_candidate.due_date::date;
    EXCEPTION WHEN data_exception THEN
      -- A malformed legacy date must not prevent other due orders from updating.
      CONTINUE;
    END;
    IF v_due_date >= v_business_date THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = v_candidate.id;
    IF NOT FOUND
       OR v_order.updated_at IS DISTINCT FROM v_candidate.updated_at
       OR v_order.status IS DISTINCT FROM 'scheduled'
       OR v_order.order_type IS DISTINCT FROM 'sale'
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
      -- A user or another Cron run won the version check; retry on a later run.
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

REVOKE ALL ON FUNCTION public.auto_fulfill_scheduled_sales()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.auto_fulfill_scheduled_sales() IS
  'At the start of each Brazil day, marks scheduled sale deliveries and pickups whose scheduled date has ended as fulfilled through the version-guarded stock transaction.';

DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'auto-fulfill-scheduled-sales'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  -- Supabase Cron uses UTC; 03:00 UTC is midnight in America/Sao_Paulo.
  PERFORM cron.schedule(
    'auto-fulfill-scheduled-sales',
    '0 3 * * *',
    'SELECT public.auto_fulfill_scheduled_sales();'
  );
END;
$schedule$;

COMMIT;
