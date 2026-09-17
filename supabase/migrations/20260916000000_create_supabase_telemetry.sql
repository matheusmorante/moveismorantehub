-- Migration: 20260916000000_create_supabase_telemetry.sql
-- Description: Tabelas de telemetria para o Supabase Monitor (Query Guard)

CREATE TABLE IF NOT EXISTS public.supabase_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT,
    screen TEXT,
    action TEXT,
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    execution_count INT DEFAULT 1,
    total_duration_ms INT DEFAULT 0,
    rows_returned INT DEFAULT 0,
    user_id UUID,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.supabase_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura total para administradores"
    ON public.supabase_telemetry FOR SELECT
    TO authenticated
    USING (true);

CREATE OR REPLACE FUNCTION public.flush_supabase_telemetry(payload JSONB)
RETURNS void AS $$
BEGIN
    INSERT INTO public.supabase_telemetry (
        module, screen, action, table_name, operation_type,
        execution_count, total_duration_ms, rows_returned, user_id
    )
    SELECT
        x->>'module',
        x->>'screen',
        x->>'action',
        x->>'table_name',
        x->>'operation_type',
        COALESCE((x->>'execution_count')::int, 1),
        COALESCE((x->>'total_duration_ms')::int, 0),
        COALESCE((x->>'rows_returned')::int, 0),
        NULLIF(x->>'user_id', '')::uuid
    FROM jsonb_array_elements(payload) AS x;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_aggregated_telemetry(p_start_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
    module TEXT,
    screen TEXT,
    action TEXT,
    table_name TEXT,
    operation_type TEXT,
    execution_count BIGINT,
    total_duration_ms BIGINT,
    rows_returned BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(st.module, 'Global'), 
        COALESCE(st.screen, 'N/A'), 
        COALESCE(st.action, 'N/A'), 
        st.table_name, 
        st.operation_type, 
        SUM(st.execution_count)::bigint, 
        SUM(st.total_duration_ms)::bigint, 
        SUM(st.rows_returned)::bigint
    FROM public.supabase_telemetry st
    WHERE st.recorded_at >= p_start_date
    GROUP BY st.module, st.screen, st.action, st.table_name, st.operation_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
