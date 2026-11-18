ALTER TABLE public.supabase_telemetry
  ADD COLUMN metric_kind text NOT NULL DEFAULT 'supabase_request',
  ADD COLUMN app_version text,
  ADD COLUMN network_class text,
  ADD COLUMN result text,
  ADD COLUMN duration_buckets jsonb;

ALTER TABLE public.supabase_telemetry
  ADD CONSTRAINT supabase_telemetry_metric_kind_check
    CHECK (metric_kind IN ('supabase_request', 'interaction_timing')),
  ADD CONSTRAINT supabase_telemetry_interaction_dimensions_check
    CHECK (
      (metric_kind = 'supabase_request'
        AND app_version IS NULL
        AND network_class IS NULL
        AND result IS NULL
        AND duration_buckets IS NULL)
      OR
      (metric_kind = 'interaction_timing'
        AND module = 'Sales'
        AND screen = 'NewSaleOrder'
        AND table_name = 'client_interaction'
        AND operation_type = 'UNKNOWN'
        AND action IN ('sale_completion_click_to_indicator', 'sale_completion_click_to_result')
        AND app_version ~ '^[A-Za-z0-9._+-]{1,40}$'
        AND network_class IN ('offline', 'slow-2g', '2g', '3g', '4g', 'unknown')
        AND (
          (action = 'sale_completion_click_to_indicator' AND result = 'visible')
          OR (action = 'sale_completion_click_to_result' AND result IN ('success', 'failure'))
        )
        AND total_duration_ms >= 0
        AND execution_count > 0)
    ),
  ADD CONSTRAINT supabase_telemetry_interaction_histogram_check
    CHECK (
      metric_kind <> 'interaction_timing'
      OR (
        pg_catalog.jsonb_typeof(duration_buckets) = 'object'
        AND duration_buckets ?& ARRAY[
          'b_0_50_ms', 'b_51_100_ms', 'b_101_250_ms', 'b_251_500_ms',
          'b_501_1000_ms', 'b_1001_2000_ms', 'b_2001_5000_ms',
          'b_5001_10000_ms', 'b_10001_30000_ms', 'b_gt_30000_ms'
        ]::text[]
        AND duration_buckets - ARRAY[
          'b_0_50_ms', 'b_51_100_ms', 'b_101_250_ms', 'b_251_500_ms',
          'b_501_1000_ms', 'b_1001_2000_ms', 'b_2001_5000_ms',
          'b_5001_10000_ms', 'b_10001_30000_ms', 'b_gt_30000_ms'
        ]::text[] = '{}'::jsonb
        AND (duration_buckets->>'b_0_50_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_51_100_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_101_250_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_251_500_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_501_1000_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_1001_2000_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_2001_5000_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_5001_10000_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_10001_30000_ms') ~ '^[0-9]+$'
        AND (duration_buckets->>'b_gt_30000_ms') ~ '^[0-9]+$'
        AND (
          (duration_buckets->>'b_0_50_ms')::bigint
          + (duration_buckets->>'b_51_100_ms')::bigint
          + (duration_buckets->>'b_101_250_ms')::bigint
          + (duration_buckets->>'b_251_500_ms')::bigint
          + (duration_buckets->>'b_501_1000_ms')::bigint
          + (duration_buckets->>'b_1001_2000_ms')::bigint
          + (duration_buckets->>'b_2001_5000_ms')::bigint
          + (duration_buckets->>'b_5001_10000_ms')::bigint
          + (duration_buckets->>'b_10001_30000_ms')::bigint
          + (duration_buckets->>'b_gt_30000_ms')::bigint
        ) = execution_count::bigint
      )
    );

CREATE OR REPLACE FUNCTION public.flush_supabase_telemetry(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF payload IS NULL OR pg_catalog.jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Telemetry payload must be an array' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.supabase_telemetry (
    module, screen, action, table_name, operation_type,
    execution_count, total_duration_ms, rows_returned, user_id,
    unknown_rows_count, response_bytes, measured_response_count,
    metric_kind, app_version, network_class, result, duration_buckets
  )
  SELECT
    x->>'module', x->>'screen', x->>'action', x->>'table_name', x->>'operation_type',
    COALESCE((x->>'execution_count')::integer, 1),
    COALESCE((x->>'total_duration_ms')::integer, 0),
    COALESCE((x->>'rows_returned')::integer, 0),
    (SELECT auth.uid()),
    (x->>'unknown_rows_count')::integer,
    (x->>'response_bytes')::bigint,
    (x->>'measured_response_count')::integer,
    COALESCE(x->>'metric_kind', 'supabase_request'),
    x->>'app_version',
    x->>'network_class',
    x->>'result',
    x->'duration_buckets'
  FROM pg_catalog.jsonb_array_elements(payload) AS x;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_aggregated_telemetry_v3(p_start_date timestamp with time zone)
RETURNS TABLE (
  metric_kind text,
  module text,
  screen text,
  action text,
  table_name text,
  operation_type text,
  execution_count bigint,
  total_duration_ms bigint,
  rows_returned bigint,
  unknown_rows_count bigint,
  response_bytes numeric,
  measured_response_count bigint,
  app_version text,
  network_class text,
  result text,
  duration_buckets jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH grouped AS (
    SELECT
      st.metric_kind,
      COALESCE(st.module, 'Global') AS module,
      COALESCE(st.screen, 'N/A') AS screen,
      COALESCE(st.action, 'N/A') AS action,
      st.table_name,
      st.operation_type,
      SUM(st.execution_count)::bigint AS execution_count,
      SUM(st.total_duration_ms)::bigint AS total_duration_ms,
      SUM(st.rows_returned)::bigint AS rows_returned,
      SUM(COALESCE(st.unknown_rows_count, st.execution_count))::bigint AS unknown_rows_count,
      SUM(COALESCE(st.response_bytes, 0))::numeric AS response_bytes,
      SUM(COALESCE(st.measured_response_count, 0))::bigint AS measured_response_count,
      st.app_version,
      st.network_class,
      st.result,
      CASE WHEN st.metric_kind = 'interaction_timing' THEN
        pg_catalog.jsonb_build_object(
          'b_0_50_ms', SUM((st.duration_buckets->>'b_0_50_ms')::bigint),
          'b_51_100_ms', SUM((st.duration_buckets->>'b_51_100_ms')::bigint),
          'b_101_250_ms', SUM((st.duration_buckets->>'b_101_250_ms')::bigint),
          'b_251_500_ms', SUM((st.duration_buckets->>'b_251_500_ms')::bigint),
          'b_501_1000_ms', SUM((st.duration_buckets->>'b_501_1000_ms')::bigint),
          'b_1001_2000_ms', SUM((st.duration_buckets->>'b_1001_2000_ms')::bigint),
          'b_2001_5000_ms', SUM((st.duration_buckets->>'b_2001_5000_ms')::bigint),
          'b_5001_10000_ms', SUM((st.duration_buckets->>'b_5001_10000_ms')::bigint),
          'b_10001_30000_ms', SUM((st.duration_buckets->>'b_10001_30000_ms')::bigint),
          'b_gt_30000_ms', SUM((st.duration_buckets->>'b_gt_30000_ms')::bigint)
        )
      ELSE NULL::jsonb END AS duration_buckets
    FROM public.supabase_telemetry AS st
    WHERE st.recorded_at >= p_start_date
    GROUP BY
      st.metric_kind, st.module, st.screen, st.action, st.table_name,
      st.operation_type, st.app_version, st.network_class, st.result
  )
  SELECT
    grouped.metric_kind, grouped.module, grouped.screen, grouped.action,
    grouped.table_name, grouped.operation_type, grouped.execution_count,
    grouped.total_duration_ms, grouped.rows_returned, grouped.unknown_rows_count,
    grouped.response_bytes, grouped.measured_response_count, grouped.app_version,
    grouped.network_class, grouped.result, grouped.duration_buckets
  FROM grouped
  WHERE grouped.metric_kind <> 'interaction_timing'
     OR grouped.execution_count >= 5;
$function$;

REVOKE EXECUTE ON FUNCTION public.flush_supabase_telemetry(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flush_supabase_telemetry(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_aggregated_telemetry_v3(timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aggregated_telemetry_v3(timestamp with time zone) TO authenticated;
