-- Migration: 20260904160000_create_api_usage_monitoring.sql
-- Description: Monitoramento de consumo de APIs externas, agregador diário e controle de limites operacionais

-- 1. Tabela de Configurações das APIs (limites, custos, alertas, circuit breaker)
CREATE TABLE IF NOT EXISTS public.api_configurations (
    service_id TEXT PRIMARY KEY,               -- ex: 'google_routes', 'google_places', 'gemini_flash', 'meta_whatsapp', 'sefaz_nfe'
    provider TEXT NOT NULL,                     -- ex: 'google', 'gemini', 'meta', 'sefaz'
    service_name TEXT NOT NULL,                 -- Nome amigável (ex: 'Google Routes API')
    metric TEXT NOT NULL DEFAULT 'requests',    -- 'requests' | 'tokens' | 'messages'
    billing_unit TEXT NOT NULL DEFAULT 'req',
    monthly_limit NUMERIC NOT NULL DEFAULT 10000,
    warning_threshold NUMERIC NOT NULL DEFAULT 70,  -- 70%
    critical_threshold NUMERIC NOT NULL DEFAULT 90, -- 90%
    hard_limit NUMERIC NOT NULL DEFAULT 95,         -- 95%
    block_on_hard_limit BOOLEAN NOT NULL DEFAULT true,
    criticality TEXT NOT NULL DEFAULT 'IMPORTANT',  -- 'OPTIONAL' | 'IMPORTANT' | 'CRITICAL'
    price_per_unit NUMERIC NOT NULL DEFAULT 0.00,
    free_allowance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',           -- 'BRL' | 'USD'
    circuit_breaker_max_per_minute INT NOT NULL DEFAULT 150,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by TEXT
);

-- Habilitar RLS
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para api_configurations
CREATE POLICY "Permitir leitura de api_configurations para autenticados"
    ON public.api_configurations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção e atualização de api_configurations para autenticados"
    ON public.api_configurations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Tabela de Agregação Diária (para consultas ultra rápidas sem COUNT em milhões de linhas)
CREATE TABLE IF NOT EXISTS public.api_usage_daily (
    usage_date DATE NOT NULL,
    provider TEXT NOT NULL,
    service TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production', -- 'production' | 'development' | 'test'
    total_requests INT NOT NULL DEFAULT 0,
    success_requests INT NOT NULL DEFAULT 0,
    error_requests INT NOT NULL DEFAULT 0,
    blocked_requests INT NOT NULL DEFAULT 0,
    cache_hits INT NOT NULL DEFAULT 0,
    total_units NUMERIC NOT NULL DEFAULT 0,
    estimated_cost NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (usage_date, provider, service, environment)
);

ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso a api_usage_daily para autenticados"
    ON public.api_usage_daily FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Tabela de Logs Analíticos de Uso de API
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    service TEXT NOT NULL,
    operation TEXT NOT NULL,
    units NUMERIC NOT NULL DEFAULT 1,
    status TEXT NOT NULL, -- 'SUCCESS' | 'ERROR' | 'RATE_LIMITED' | 'BLOCKED_BY_INTERNAL_LIMIT' | 'CIRCUIT_BROKEN'
    http_status INT,
    module_source TEXT,
    environment TEXT NOT NULL DEFAULT 'production',
    cost_estimated NUMERIC DEFAULT 0,
    cache_hit BOOLEAN NOT NULL DEFAULT false,
    response_time_ms INT,
    request_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices otimizados para relatórios
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service_env ON public.api_usage_logs (service, environment, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_req_id ON public.api_usage_logs (request_id);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso a api_usage_logs para autenticados"
    ON public.api_usage_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Função Atômica para Registro de Uso e Atualização da Agregação Diária
CREATE OR REPLACE FUNCTION public.record_api_usage_atomic(
    p_provider TEXT,
    p_service TEXT,
    p_operation TEXT,
    p_units NUMERIC,
    p_status TEXT,
    p_http_status INT,
    p_module_source TEXT,
    p_environment TEXT,
    p_cost_estimated NUMERIC,
    p_cache_hit BOOLEAN,
    p_response_time_ms INT,
    p_request_id TEXT,
    p_error_message TEXT
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_date DATE := CURRENT_DATE;
    v_is_success INT := CASE WHEN p_status = 'SUCCESS' THEN 1 ELSE 0 END;
    v_is_error INT := CASE WHEN p_status IN ('ERROR', 'RATE_LIMITED') THEN 1 ELSE 0 END;
    v_is_blocked INT := CASE WHEN p_status IN ('BLOCKED_BY_INTERNAL_LIMIT', 'CIRCUIT_BROKEN') THEN 1 ELSE 0 END;
    v_is_cache_hit INT := CASE WHEN p_cache_hit THEN 1 ELSE 0 END;
BEGIN
    -- 1. Inserir log detalhado
    INSERT INTO public.api_usage_logs (
        provider, service, operation, units, status, http_status,
        module_source, environment, cost_estimated, cache_hit,
        response_time_ms, request_id, error_message, created_at
    ) VALUES (
        p_provider, p_service, p_operation, p_units, p_status, p_http_status,
        p_module_source, p_environment, p_cost_estimated, p_cache_hit,
        p_response_time_ms, p_request_id, p_error_message, now()
    ) RETURNING id INTO v_log_id;

    -- 2. Upsert atômico na tabela de agregação diária
    INSERT INTO public.api_usage_daily (
        usage_date, provider, service, environment,
        total_requests, success_requests, error_requests, blocked_requests,
        cache_hits, total_units, estimated_cost, updated_at
    ) VALUES (
        v_date, p_provider, p_service, p_environment,
        1, v_is_success, v_is_error, v_is_blocked,
        v_is_cache_hit, p_units, p_cost_estimated, now()
    )
    ON CONFLICT (usage_date, provider, service, environment) DO UPDATE SET
        total_requests = public.api_usage_daily.total_requests + 1,
        success_requests = public.api_usage_daily.success_requests + v_is_success,
        error_requests = public.api_usage_daily.error_requests + v_is_error,
        blocked_requests = public.api_usage_daily.blocked_requests + v_is_blocked,
        cache_hits = public.api_usage_daily.cache_hits + v_is_cache_hit,
        total_units = public.api_usage_daily.total_units + p_units,
        estimated_cost = public.api_usage_daily.estimated_cost + p_cost_estimated,
        updated_at = now();

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Seed inicial padrão de configurações das APIs conhecidas
INSERT INTO public.api_configurations (
    service_id, provider, service_name, metric, billing_unit,
    monthly_limit, warning_threshold, critical_threshold, hard_limit,
    block_on_hard_limit, criticality, price_per_unit, free_allowance, currency
) VALUES 
    ('google_routes', 'google', 'Google Routes API', 'requests', 'req', 10000, 70, 90, 95, true, 'IMPORTANT', 0.025, 1000, 'BRL'),
    ('google_places', 'google', 'Google Places (Autocomplete & Details)', 'requests', 'req', 10000, 70, 90, 95, true, 'IMPORTANT', 0.017, 1000, 'BRL'),
    ('google_geocoding', 'google', 'Google Geocoding API', 'requests', 'req', 5000, 70, 90, 95, true, 'IMPORTANT', 0.025, 500, 'BRL'),
    ('google_route_optimization', 'google', 'Google Route Optimization', 'requests', 'req', 1000, 70, 90, 95, true, 'OPTIONAL', 0.15, 100, 'BRL'),
    ('gemini_flash', 'gemini', 'Google Gemini 1.5 Flash', 'requests', 'req', 5000, 70, 90, 95, true, 'OPTIONAL', 0.005, 500, 'BRL'),
    ('meta_whatsapp', 'meta', 'WhatsApp Graph API', 'messages', 'msg', 2000, 70, 90, 95, false, 'IMPORTANT', 0.35, 250, 'BRL'),
    ('sefaz_nfe', 'sefaz', 'SEFAZ-PR (NF-e & NFC-e)', 'requests', 'doc', 10000, 80, 95, 100, false, 'CRITICAL', 0.00, 0, 'BRL')
ON CONFLICT (service_id) DO NOTHING;
