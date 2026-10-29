-- Nullable columns preserve the fact that older clients did not report coverage.
ALTER TABLE public.supabase_telemetry
  ADD COLUMN IF NOT EXISTS unknown_rows_count integer,
  ADD COLUMN IF NOT EXISTS response_bytes bigint,
  ADD COLUMN IF NOT EXISTS measured_response_count integer;

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
    unknown_rows_count, response_bytes, measured_response_count
  )
  SELECT
    x->>'module', x->>'screen', x->>'action', x->>'table_name', x->>'operation_type',
    COALESCE((x->>'execution_count')::integer, 1),
    COALESCE((x->>'total_duration_ms')::integer, 0),
    COALESCE((x->>'rows_returned')::integer, 0),
    (SELECT auth.uid()),
    (x->>'unknown_rows_count')::integer,
    (x->>'response_bytes')::bigint,
    (x->>'measured_response_count')::integer
  FROM pg_catalog.jsonb_array_elements(payload) AS x;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_aggregated_telemetry_v2(p_start_date timestamp with time zone)
RETURNS TABLE (
  module text, screen text, action text, table_name text, operation_type text,
  execution_count bigint, total_duration_ms bigint, rows_returned bigint,
  unknown_rows_count bigint, response_bytes numeric, measured_response_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT COALESCE(st.module, 'Global'), COALESCE(st.screen, 'N/A'),
         COALESCE(st.action, 'N/A'), st.table_name, st.operation_type,
         SUM(st.execution_count)::bigint, SUM(st.total_duration_ms)::bigint,
         SUM(st.rows_returned)::bigint,
         SUM(COALESCE(st.unknown_rows_count, st.execution_count))::bigint,
         SUM(COALESCE(st.response_bytes, 0))::numeric,
         SUM(COALESCE(st.measured_response_count, 0))::bigint
  FROM public.supabase_telemetry st
  WHERE st.recorded_at >= p_start_date
  GROUP BY st.module, st.screen, st.action, st.table_name, st.operation_type;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_aggregated_telemetry_v2(timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aggregated_telemetry_v2(timestamp with time zone) TO authenticated;
