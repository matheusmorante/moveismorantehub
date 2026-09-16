-- Migration para a tabela de telemetria agregada do Supabase
-- Usada exclusivamente pelo SupabaseMonitorService (ERP e Mobile) para observabilidade de Egress

CREATE TABLE IF NOT EXISTS public.supabase_telemetry (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    module TEXT,
    screen TEXT,
    action TEXT,
    table_name TEXT,
    operation_type TEXT, -- SELECT, INSERT, UPDATE, DELETE, RPC, REALTIME, STORAGE
    execution_count INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    rows_returned INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.supabase_telemetry ENABLE ROW LEVEL SECURITY;

-- Policy de Inserção (Qualquer usuário autenticado pode gravar as métricas locais dele)
CREATE POLICY "Permitir inserção de métricas por usuários autenticados" 
ON public.supabase_telemetry FOR INSERT TO authenticated 
WITH CHECK (true);

-- Policy de Leitura (Somente Administradores podem ler as métricas da empresa)
-- Baseado no cargo admin na tabela profiles
CREATE POLICY "Permitir leitura de métricas por administradores" 
ON public.supabase_telemetry FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Índices para otimizar as consultas do Dashboard Administrativo
CREATE INDEX idx_supabase_telemetry_recorded_at ON public.supabase_telemetry (recorded_at DESC);
CREATE INDEX idx_supabase_telemetry_operation ON public.supabase_telemetry (operation_type);
CREATE INDEX idx_supabase_telemetry_table ON public.supabase_telemetry (table_name);

-- RPC para inserção de lote com limpeza automática (Retenção 7 dias)
CREATE OR REPLACE FUNCTION public.flush_supabase_telemetry(payload JSON)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios para garantir a limpeza
AS $$
BEGIN
    -- Inserir os registros
    INSERT INTO public.supabase_telemetry (
        module, screen, action, table_name, operation_type,
        execution_count, total_duration_ms, rows_returned, user_id
    )
    SELECT
        p->>'module',
        p->>'screen',
        p->>'action',
        p->>'table_name',
        p->>'operation_type',
        COALESCE((p->>'execution_count')::integer, 1),
        COALESCE((p->>'total_duration_ms')::integer, 0),
        COALESCE((p->>'rows_returned')::integer, 0),
        (p->>'user_id')::uuid
    FROM json_array_elements(payload) as p;

    -- Limpeza de registros antigos (Retenção de 7 dias)
    DELETE FROM public.supabase_telemetry
    WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$;

-- RPC para busca agregada (Egress Zero para o Dashboard)
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
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        COALESCE(t.module, 'Global') as module,
        COALESCE(t.screen, 'N/A') as screen,
        COALESCE(t.action, 'N/A') as action,
        t.table_name,
        t.operation_type,
        SUM(t.execution_count) as execution_count,
        SUM(t.total_duration_ms) as total_duration_ms,
        SUM(t.rows_returned) as rows_returned
    FROM public.supabase_telemetry t
    WHERE t.recorded_at >= p_start_date
    GROUP BY t.module, t.screen, t.action, t.table_name, t.operation_type;
$$;
