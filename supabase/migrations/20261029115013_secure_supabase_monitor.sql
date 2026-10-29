-- Keep the existing telemetry and history; only narrow access and extend alerts.
ALTER TABLE public.supabase_mass_load_history
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'WARNING';

ALTER POLICY "Administradores consultam o histórico de cargas massivas"
  ON public.supabase_mass_load_history
  USING (
    (SELECT public.is_administrator())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role = 'manager' OR 'manager' = ANY(COALESCE(roles, ARRAY[]::text[])))
    )
  );

ALTER POLICY "Permitir leitura total para administradores"
  ON public.supabase_telemetry
  USING (
    (SELECT public.is_administrator())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (role = 'manager' OR 'manager' = ANY(COALESCE(roles, ARRAY[]::text[])))
    )
  );

CREATE POLICY "Usuários registram sua própria telemetria"
  ON public.supabase_telemetry FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

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
    execution_count, total_duration_ms, rows_returned, user_id
  )
  SELECT
    x->>'module', x->>'screen', x->>'action', x->>'table_name', x->>'operation_type',
    COALESCE((x->>'execution_count')::integer, 1),
    COALESCE((x->>'total_duration_ms')::integer, 0),
    COALESCE((x->>'rows_returned')::integer, 0),
    (SELECT auth.uid())
  FROM pg_catalog.jsonb_array_elements(payload) AS x;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_aggregated_telemetry(p_start_date timestamp with time zone)
RETURNS TABLE (
  module text, screen text, action text, table_name text, operation_type text,
  execution_count bigint, total_duration_ms bigint, rows_returned bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT COALESCE(st.module, 'Global'), COALESCE(st.screen, 'N/A'),
         COALESCE(st.action, 'N/A'), st.table_name, st.operation_type,
         SUM(st.execution_count)::bigint, SUM(st.total_duration_ms)::bigint,
         SUM(st.rows_returned)::bigint
  FROM public.supabase_telemetry st
  WHERE st.recorded_at >= p_start_date
  GROUP BY st.module, st.screen, st.action, st.table_name, st.operation_type;
$function$;

REVOKE EXECUTE ON FUNCTION public.flush_supabase_telemetry(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_aggregated_telemetry(timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flush_supabase_telemetry(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aggregated_telemetry(timestamp with time zone) TO authenticated;
