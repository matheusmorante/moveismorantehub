-- Store product-preview timings separately so the sales-only check constraints
-- already used by supabase_telemetry remain unchanged.
CREATE TABLE public.supabase_product_preview_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  screen text NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL DEFAULT 'client_interaction' CHECK (table_name = 'client_interaction'),
  operation_type text NOT NULL DEFAULT 'UNKNOWN' CHECK (operation_type = 'UNKNOWN'),
  execution_count integer NOT NULL CHECK (execution_count > 0),
  total_duration_ms integer NOT NULL CHECK (total_duration_ms BETWEEN 0 AND 600000),
  user_id uuid NOT NULL,
  app_version text NOT NULL CHECK (app_version ~ '^[A-Za-z0-9._+-]{1,40}$'),
  network_class text NOT NULL CHECK (network_class IN ('offline', 'slow-2g', '2g', '3g', '4g', 'unknown')),
  viewport_class text NOT NULL CHECK (viewport_class IN ('phone', 'tablet', 'desktop', 'unknown')),
  result text NOT NULL,
  duration_buckets jsonb NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT supabase_product_preview_telemetry_scope_check CHECK (
    (module = 'Marketing' AND screen = 'Posts'
      AND action IN ('post_picker_search_to_results', 'post_picker_select_to_preview')
      AND result IN ('success', 'failure'))
    OR
    (module = 'Global' AND screen = 'ERP'
      AND action IN ('erp_page_lcp', 'erp_page_inp')
      AND result = 'observed')
  ),
  CONSTRAINT supabase_product_preview_telemetry_histogram_check CHECK (
    pg_catalog.jsonb_typeof(duration_buckets) = 'object'
    AND duration_buckets ?& ARRAY[
      'b_0_50_ms', 'b_51_100_ms', 'b_101_200_ms', 'b_201_250_ms',
      'b_251_500_ms', 'b_501_1000_ms', 'b_1001_2000_ms', 'b_2001_2500_ms',
      'b_2501_4000_ms', 'b_4001_5000_ms', 'b_5001_10000_ms',
      'b_10001_30000_ms', 'b_gt_30000_ms'
    ]::text[]
    AND duration_buckets - ARRAY[
      'b_0_50_ms', 'b_51_100_ms', 'b_101_200_ms', 'b_201_250_ms',
      'b_251_500_ms', 'b_501_1000_ms', 'b_1001_2000_ms', 'b_2001_2500_ms',
      'b_2501_4000_ms', 'b_4001_5000_ms', 'b_5001_10000_ms',
      'b_10001_30000_ms', 'b_gt_30000_ms'
    ]::text[] = '{}'::jsonb
    AND (duration_buckets->>'b_0_50_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_51_100_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_101_200_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_201_250_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_251_500_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_501_1000_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_1001_2000_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_2001_2500_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_2501_4000_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_4001_5000_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_5001_10000_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_10001_30000_ms') ~ '^[0-9]+$'
    AND (duration_buckets->>'b_gt_30000_ms') ~ '^[0-9]+$'
    AND (
      (duration_buckets->>'b_0_50_ms')::bigint
      + (duration_buckets->>'b_51_100_ms')::bigint
      + (duration_buckets->>'b_101_200_ms')::bigint
      + (duration_buckets->>'b_201_250_ms')::bigint
      + (duration_buckets->>'b_251_500_ms')::bigint
      + (duration_buckets->>'b_501_1000_ms')::bigint
      + (duration_buckets->>'b_1001_2000_ms')::bigint
      + (duration_buckets->>'b_2001_2500_ms')::bigint
      + (duration_buckets->>'b_2501_4000_ms')::bigint
      + (duration_buckets->>'b_4001_5000_ms')::bigint
      + (duration_buckets->>'b_5001_10000_ms')::bigint
      + (duration_buckets->>'b_10001_30000_ms')::bigint
      + (duration_buckets->>'b_gt_30000_ms')::bigint
    ) = execution_count::bigint
  )
);

ALTER TABLE public.supabase_product_preview_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY supabase_product_preview_telemetry_insert_own
  ON public.supabase_product_preview_telemetry
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY supabase_product_preview_telemetry_admin_read
  ON public.supabase_product_preview_telemetry
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_administrator())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role = 'manager' OR 'manager' = ANY(COALESCE(roles, ARRAY[]::text[])))
    )
  );

GRANT INSERT, SELECT ON public.supabase_product_preview_telemetry TO authenticated;

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

  INSERT INTO public.supabase_product_preview_telemetry (
    module, screen, action, execution_count, total_duration_ms, user_id,
    app_version, network_class, viewport_class, result, duration_buckets
  )
  SELECT
    x->>'module', x->>'screen', x->>'action',
    COALESCE((x->>'execution_count')::integer, 1),
    COALESCE((x->>'total_duration_ms')::integer, 0),
    (SELECT auth.uid()), x->>'app_version', x->>'network_class',
    x->>'viewport_class', x->>'result', x->'duration_buckets'
  FROM pg_catalog.jsonb_array_elements(payload) AS x
  WHERE x->>'metric_kind' = 'product_interaction_timing';

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
    x->>'app_version', x->>'network_class', x->>'result', x->'duration_buckets'
  FROM pg_catalog.jsonb_array_elements(payload) AS x
  WHERE COALESCE(x->>'metric_kind', 'supabase_request') <> 'product_interaction_timing';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_aggregated_telemetry_v4(p_start_date timestamp with time zone)
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
  duration_buckets jsonb,
  viewport_class text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH raw AS (
    SELECT
      st.metric_kind,
      COALESCE(st.module, 'Global') AS module,
      COALESCE(st.screen, 'N/A') AS screen,
      COALESCE(st.action, 'N/A') AS action,
      st.table_name,
      st.operation_type,
      st.execution_count::bigint AS execution_count,
      st.total_duration_ms::bigint AS total_duration_ms,
      st.rows_returned::bigint AS rows_returned,
      COALESCE(st.unknown_rows_count, st.execution_count)::bigint AS unknown_rows_count,
      COALESCE(st.response_bytes, 0)::numeric AS response_bytes,
      COALESCE(st.measured_response_count, 0)::bigint AS measured_response_count,
      st.app_version,
      st.network_class,
      st.result,
      st.duration_buckets,
      NULL::text AS viewport_class
    FROM public.supabase_telemetry AS st
    WHERE st.recorded_at >= p_start_date

    UNION ALL

    SELECT
      'product_interaction_timing'::text,
      pt.module,
      pt.screen,
      pt.action,
      pt.table_name,
      pt.operation_type,
      pt.execution_count::bigint,
      pt.total_duration_ms::bigint,
      0::bigint,
      0::bigint,
      0::numeric,
      0::bigint,
      pt.app_version,
      pt.network_class,
      pt.result,
      pt.duration_buckets,
      pt.viewport_class
    FROM public.supabase_product_preview_telemetry AS pt
    WHERE pt.recorded_at >= p_start_date
  ), grouped AS (
    SELECT
      raw.metric_kind, raw.module, raw.screen, raw.action, raw.table_name,
      raw.operation_type,
      SUM(raw.execution_count)::bigint AS execution_count,
      SUM(raw.total_duration_ms)::bigint AS total_duration_ms,
      SUM(raw.rows_returned)::bigint AS rows_returned,
      SUM(raw.unknown_rows_count)::bigint AS unknown_rows_count,
      SUM(raw.response_bytes)::numeric AS response_bytes,
      SUM(raw.measured_response_count)::bigint AS measured_response_count,
      raw.app_version, raw.network_class, raw.result, raw.viewport_class
    FROM raw
    GROUP BY raw.metric_kind, raw.module, raw.screen, raw.action, raw.table_name,
      raw.operation_type, raw.app_version, raw.network_class, raw.result, raw.viewport_class
  ), bucket_totals AS (
    SELECT
      raw.metric_kind, raw.module, raw.screen, raw.action, raw.table_name,
      raw.operation_type, raw.app_version, raw.network_class, raw.result,
      raw.viewport_class, bucket.key AS bucket_key,
      SUM(bucket.value::bigint)::bigint AS bucket_count
    FROM raw
    CROSS JOIN LATERAL pg_catalog.jsonb_each_text(
      COALESCE(raw.duration_buckets, '{}'::jsonb)
    ) AS bucket(key, value)
    GROUP BY raw.metric_kind, raw.module, raw.screen, raw.action, raw.table_name,
      raw.operation_type, raw.app_version, raw.network_class, raw.result,
      raw.viewport_class, bucket.key
  ), bucket_json AS (
    SELECT
      metric_kind, module, screen, action, table_name, operation_type,
      app_version, network_class, result, viewport_class,
      pg_catalog.jsonb_object_agg(bucket_key, bucket_count) AS duration_buckets
    FROM bucket_totals
    GROUP BY metric_kind, module, screen, action, table_name, operation_type,
      app_version, network_class, result, viewport_class
  )
  SELECT
    grouped.metric_kind, grouped.module, grouped.screen, grouped.action,
    grouped.table_name, grouped.operation_type, grouped.execution_count,
    grouped.total_duration_ms, grouped.rows_returned, grouped.unknown_rows_count,
    grouped.response_bytes, grouped.measured_response_count, grouped.app_version,
    grouped.network_class, grouped.result, bucket_json.duration_buckets,
    grouped.viewport_class
  FROM grouped
  LEFT JOIN bucket_json
    ON bucket_json.metric_kind = grouped.metric_kind
    AND bucket_json.module = grouped.module
    AND bucket_json.screen = grouped.screen
    AND bucket_json.action = grouped.action
    AND bucket_json.table_name IS NOT DISTINCT FROM grouped.table_name
    AND bucket_json.operation_type IS NOT DISTINCT FROM grouped.operation_type
    AND bucket_json.app_version IS NOT DISTINCT FROM grouped.app_version
    AND bucket_json.network_class IS NOT DISTINCT FROM grouped.network_class
    AND bucket_json.result IS NOT DISTINCT FROM grouped.result
    AND bucket_json.viewport_class IS NOT DISTINCT FROM grouped.viewport_class
  WHERE grouped.metric_kind NOT IN ('interaction_timing', 'product_interaction_timing')
     OR grouped.execution_count >= 5;
$function$;

REVOKE EXECUTE ON FUNCTION public.flush_supabase_telemetry(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flush_supabase_telemetry(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_aggregated_telemetry_v4(timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aggregated_telemetry_v4(timestamp with time zone) TO authenticated;
