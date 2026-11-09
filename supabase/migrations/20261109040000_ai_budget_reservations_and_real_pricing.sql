-- ============================================================================
-- Migration: Auditoria Financeira de IA, Reservas Atômicas e Preços Reais
-- Data: 2026-11-09
-- ============================================================================

-- 1. Tabela de Reservas Atômicas de Cota (Garantia contra Concorrência Serverless)
CREATE TABLE IF NOT EXISTS public.api_budget_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    service text NOT NULL,
    estimated_cost_brl numeric NOT NULL,
    estimated_tokens int NOT NULL,
    module_source text,
    status text NOT NULL DEFAULT 'HELD', -- 'HELD', 'COMMITTED', 'RELEASED', 'EXPIRED'
    expires_at timestamp with time zone NOT NULL,
    committed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_reservations_status_expires 
ON public.api_budget_reservations (status, expires_at);

-- 2. Função para liberar reserva não consumida (abort / erro / cancelamento)
CREATE OR REPLACE FUNCTION public.release_ai_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
    IF p_reservation_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE public.api_budget_reservations
    SET status = 'RELEASED'
    WHERE id = p_reservation_id
      AND status = 'HELD';

    RETURN FOUND;
END;
$func$;

-- 3. Atualização da RPC check_and_reserve_ai_quota com Hold Atômico e Métricas
CREATE OR REPLACE FUNCTION public.check_and_reserve_ai_quota(
    p_provider text DEFAULT 'all',
    p_service text DEFAULT 'ai_unified',
    p_estimated_tokens integer DEFAULT 1000,
    p_module_source text DEFAULT 'general'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_limits jsonb;
    v_monthly_budget_brl numeric;
    v_hard_limit_pct numeric;
    v_daily_budget_brl numeric;
    v_daily_max_req int;
    v_hourly_max_req int;
    v_daily_max_tokens int;
    v_hourly_max_tokens int;
    v_circuit_breaker int;

    v_op_enabled boolean;
    v_op_start time;
    v_op_end time;
    v_allow_off boolean;
    v_off_max_req int;

    v_now timestamp with time zone;
    v_now_local timestamp;
    v_now_time time;
    v_start_of_month timestamp with time zone;
    v_start_of_day timestamp with time zone;
    v_one_hour_ago timestamp with time zone;
    v_one_min_ago timestamp with time zone;

    v_reqs_last_min int;
    v_is_operating_hours boolean;
    v_off_reqs int;
    v_reqs_last_hour int;
    v_tokens_last_hour numeric;
    v_today_reqs int;
    v_today_tokens numeric;
    v_today_cost numeric;
    v_month_cost numeric;
    v_active_holds_brl numeric;
    v_estimated_hold_brl numeric;
    v_hard_limit_amount numeric;
    v_remaining_budget numeric;
    v_pct_used numeric;
    v_reservation_id uuid;
BEGIN
    -- Limpar reservas expiradas automaticamente
    UPDATE public.api_budget_reservations
    SET status = 'EXPIRED'
    WHERE status = 'HELD'
      AND expires_at < now();

    -- 1. Obter configurações ativas de settings
    SELECT data->'aiUsageLimits' INTO v_limits
    FROM public.settings
    WHERE id = 'app';

    v_monthly_budget_brl := COALESCE((v_limits->>'monthlyBudgetBRL')::numeric, 30.0);
    v_hard_limit_pct     := COALESCE((v_limits->>'hardLimitPercent')::numeric, 95.0);
    v_daily_budget_brl   := COALESCE((v_limits->>'dailyBudgetBRL')::numeric, 1.5);
    v_daily_max_req      := COALESCE((v_limits->>'dailyMaxRequests')::integer, 250);
    v_hourly_max_req     := COALESCE((v_limits->>'hourlyMaxRequests')::integer, 60);
    v_daily_max_tokens   := COALESCE((v_limits->>'dailyMaxTokens')::integer, 350000);
    v_hourly_max_tokens  := COALESCE((v_limits->>'hourlyMaxTokens')::integer, 90000);
    v_circuit_breaker    := COALESCE((v_limits->>'circuitBreakerPerMinute')::integer, 15);

    v_op_enabled := COALESCE((v_limits->'operatingHours'->>'enabled')::boolean, true);
    v_op_start   := COALESCE((v_limits->'operatingHours'->>'start'), '08:00')::time;
    v_op_end     := COALESCE((v_limits->'operatingHours'->>'end'), '22:00')::time;
    v_allow_off  := COALESCE((v_limits->'operatingHours'->>'allowOffHoursEmergency')::boolean, true);
    v_off_max_req:= COALESCE((v_limits->'operatingHours'->>'offHoursHourlyMaxRequests')::integer, 5);

    -- 2. Janelas temporais em horário de Brasília
    v_now := now();
    v_now_local := (v_now AT TIME ZONE 'America/Sao_Paulo');
    v_now_time := v_now_local::time;
    
    v_start_of_month := (date_trunc('month', v_now_local) AT TIME ZONE 'America/Sao_Paulo');
    v_start_of_day   := (date_trunc('day', v_now_local) AT TIME ZONE 'America/Sao_Paulo');
    v_one_hour_ago   := v_now - INTERVAL '1 hour';
    v_one_min_ago    := v_now - INTERVAL '1 minute';

    -- Calcular consumo consolidado do mês corrente
    SELECT COALESCE(SUM(cost_estimated), 0) INTO v_month_cost
    FROM public.api_usage_logs
    WHERE provider IN ('gemini', 'openai')
      AND created_at >= v_start_of_month
      AND status = 'SUCCESS';

    -- Somar reservas ativas em andamento (concorrência)
    SELECT COALESCE(SUM(estimated_cost_brl), 0) INTO v_active_holds_brl
    FROM public.api_budget_reservations
    WHERE status = 'HELD'
      AND expires_at >= v_now;

    v_hard_limit_amount := v_monthly_budget_brl * (v_hard_limit_pct / 100.0);
    v_remaining_budget := GREATEST(0, v_monthly_budget_brl - (v_month_cost + v_active_holds_brl));
    v_pct_used := ROUND(((v_month_cost + v_active_holds_brl) / NULLIF(v_monthly_budget_brl, 0)) * 100, 1);

    -- Calcular consumo de hoje
    SELECT COUNT(*), COALESCE(SUM(units), 0), COALESCE(SUM(cost_estimated), 0)
    INTO v_today_reqs, v_today_tokens, v_today_cost
    FROM public.api_usage_logs
    WHERE provider IN ('gemini', 'openai')
      AND created_at >= v_start_of_day
      AND status = 'SUCCESS';

    -- Calcular consumo na última hora
    SELECT COUNT(*), COALESCE(SUM(units), 0)
    INTO v_reqs_last_hour, v_tokens_last_hour
    FROM public.api_usage_logs
    WHERE provider IN ('gemini', 'openai')
      AND created_at >= v_one_hour_ago
      AND status = 'SUCCESS';

    -- 3. Verificação de Anti-Loop (Circuit Breaker por minuto)
    SELECT COUNT(*) INTO v_reqs_last_min
    FROM public.api_usage_logs
    WHERE provider IN ('gemini', 'openai')
      AND created_at >= v_one_min_ago;

    IF v_reqs_last_min >= v_circuit_breaker THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'CIRCUIT_BREAKER_TRIPPED',
            'reason', 'Proteção anti-loop de IA ativada: mais de ' || v_circuit_breaker || ' requisições no último minuto. Aguarde 60 segundos.',
            'retry_after_seconds', 60,
            'monthly_budget_brl', v_monthly_budget_brl,
            'month_cost_brl', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used,
            'today_requests', v_today_reqs,
            'hour_requests', v_reqs_last_hour
        );
    END IF;

    -- 4. Verificação de Horário de Atendimento
    v_is_operating_hours := (v_now_time >= v_op_start AND v_now_time <= v_op_end);
    IF NOT v_is_operating_hours AND v_op_enabled THEN
        IF NOT v_allow_off THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'status', 'BLOCKED',
                'code', 'OFF_HOURS_BLOCKED',
                'reason', 'Assistente de IA em modo noturno (atendimento das ' || to_char(v_op_start, 'HH24:MI') || ' às ' || to_char(v_op_end, 'HH24:MI') || ').',
                'is_operating_hours', false,
                'monthly_budget_brl', v_monthly_budget_brl,
                'month_cost_brl', v_month_cost,
                'active_holds_brl', v_active_holds_brl,
                'remaining_month_budget_brl', v_remaining_budget,
                'month_percent', v_pct_used,
                'today_requests', v_today_reqs,
                'hour_requests', v_reqs_last_hour
            );
        ELSE
            SELECT COUNT(*) INTO v_off_reqs
            FROM public.api_usage_logs
            WHERE provider IN ('gemini', 'openai')
              AND created_at >= v_one_hour_ago;

            IF v_off_reqs >= v_off_max_req THEN
                RETURN jsonb_build_object(
                    'allowed', false,
                    'status', 'BLOCKED',
                    'code', 'OFF_HOURS_LIMIT_EXCEEDED',
                    'reason', 'Cota noturna de emergência da IA atingida (' || v_off_max_req || ' req/hora). Retorne no horário comercial.',
                    'is_operating_hours', false,
                    'monthly_budget_brl', v_monthly_budget_brl,
                    'month_cost_brl', v_month_cost,
                    'active_holds_brl', v_active_holds_brl,
                    'remaining_month_budget_brl', v_remaining_budget,
                    'month_percent', v_pct_used,
                    'today_requests', v_today_reqs,
                    'hour_requests', v_reqs_last_hour
                );
            END IF;
        END IF;
    END IF;

    -- 5. Verificação da Cota por Hora (Requisições e Tokens)
    IF v_reqs_last_hour >= v_hourly_max_req THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'HOURLY_LIMIT_EXCEEDED',
            'reason', 'Limite horário de IA atingido (' || v_hourly_max_req || ' req/h). Aguarde a próxima hora para evitar sobrecustos.',
            'hour_requests', v_reqs_last_hour,
            'hourly_max_requests', v_hourly_max_req,
            'monthly_budget_brl', v_monthly_budget_brl,
            'month_cost_brl', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used,
            'today_requests', v_today_reqs
        );
    END IF;

    IF v_tokens_last_hour >= v_hourly_max_tokens THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'HOURLY_TOKEN_LIMIT_EXCEEDED',
            'reason', 'Limite de tokens por hora atingido (' || v_hourly_max_tokens || ' tokens/h).',
            'hour_tokens', v_tokens_last_hour,
            'hourly_max_tokens', v_hourly_max_tokens,
            'monthly_budget_brl', v_monthly_budget_brl,
            'month_cost_brl', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    -- 6. Verificação da Cota Diária (Requisições e Tokens)
    IF v_today_reqs >= v_daily_max_req THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'DAILY_LIMIT_EXCEEDED',
            'reason', 'Limite diário de IA atingido (' || v_today_reqs || '/' || v_daily_max_req || ' req/dia).',
            'today_requests', v_today_reqs,
            'daily_max_requests', v_daily_max_req,
            'monthly_budget_brl', v_monthly_budget_brl,
            'month_cost_brl', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    IF v_today_tokens >= v_daily_max_tokens THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'DAILY_TOKEN_LIMIT_EXCEEDED',
            'reason', 'Limite diário de tokens de IA atingido (' || v_daily_max_tokens || ' tokens/dia).',
            'today_tokens', v_today_tokens,
            'daily_max_tokens', v_daily_max_tokens,
            'monthly_budget_brl', v_monthly_budget_brl,
            'month_cost_brl', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    -- Estimar custo da reserva (com tarifa conservadora para segurar margem)
    IF p_provider = 'openai' THEN
        v_estimated_hold_brl := GREATEST(0.0050, ROUND((COALESCE(p_estimated_tokens, 1000)::numeric / 1000.0) * 0.0038, 4));
    ELSE
        v_estimated_hold_brl := GREATEST(0.0030, ROUND((COALESCE(p_estimated_tokens, 1000)::numeric / 1000.0) * 0.0019, 4));
    END IF;

    -- 7. Verificação do Teto Financeiro Mensal (Consumo Consolidado + Reservas Ativas + Nova Reserva)
    IF (v_month_cost + v_active_holds_brl + v_estimated_hold_brl) >= v_hard_limit_amount THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'MONTHLY_BUDGET_EXCEEDED',
            'reason', 'Teto financeiro mensal de IA atingido (R$ ' || trim(to_char(v_month_cost + v_active_holds_brl, '999D99')) || ' de R$ ' || trim(to_char(v_monthly_budget_brl, '999D99')) || '). Novas chamadas foram bloqueadas preventivamente.',
            'month_cost_brl', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'monthly_budget_brl', v_monthly_budget_brl,
            'hard_limit_amount', v_hard_limit_amount,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    -- 8. Criação atômica da reserva com expiração em 90 segundos
    INSERT INTO public.api_budget_reservations (
        provider,
        service,
        estimated_cost_brl,
        estimated_tokens,
        module_source,
        status,
        expires_at
    ) VALUES (
        p_provider,
        p_service,
        v_estimated_hold_brl,
        COALESCE(p_estimated_tokens, 1000),
        p_module_source,
        'HELD',
        v_now + INTERVAL '90 seconds'
    )
    RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'allowed', true,
        'status', 'ALLOW',
        'reservation_id', v_reservation_id,
        'reserved_amount_brl', v_estimated_hold_brl,
        'reason', 'Cota de IA liberada e reservada com sucesso.',
        'monthly_budget_brl', v_monthly_budget_brl,
        'month_cost_brl', v_month_cost,
        'active_holds_brl', v_active_holds_brl + v_estimated_hold_brl,
        'remaining_month_budget_brl', GREATEST(0, v_remaining_budget - v_estimated_hold_brl),
        'month_percent', ROUND(((v_month_cost + v_active_holds_brl + v_estimated_hold_brl) / NULLIF(v_monthly_budget_brl, 0)) * 100, 1),
        'today_requests', v_today_reqs,
        'today_tokens', v_today_tokens,
        'today_cost_brl', v_today_cost,
        'hour_requests', v_reqs_last_hour,
        'hour_tokens', v_tokens_last_hour,
        'is_operating_hours', v_is_operating_hours
    );
END;
$func$;

-- 4. Atualização da RPC record_ai_token_usage com Preços Oficiais Asimétricos e Reconciliação de Reserva
CREATE OR REPLACE FUNCTION public.record_ai_token_usage(
    p_provider text,
    p_service text,
    p_operation text DEFAULT 'chat',
    p_prompt_tokens integer DEFAULT 0,
    p_completion_tokens integer DEFAULT 0,
    p_total_tokens integer DEFAULT 0,
    p_cached_tokens integer DEFAULT 0,
    p_module_source text DEFAULT 'general',
    p_environment text DEFAULT 'production',
    p_status text DEFAULT 'SUCCESS',
    p_response_time_ms integer DEFAULT NULL,
    p_request_id text DEFAULT NULL,
    p_error_message text DEFAULT NULL,
    p_reservation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_prompt int;
    v_completion int;
    v_cached int;
    v_tokens int;
    v_prompt_cost numeric := 0;
    v_completion_cost numeric := 0;
    v_cached_cost numeric := 0;
    v_cost_brl numeric := 0;
    v_log_id uuid;
    -- Câmbio conservador USD -> BRL: R$ 6,00 + IOF (5,38%) = R$ 6,3228 (~R$ 6,30)
    c_usd_to_brl constant numeric := 6.30;
BEGIN
    v_prompt := COALESCE(p_prompt_tokens, 0);
    v_completion := COALESCE(p_completion_tokens, 0);
    v_cached := COALESCE(p_cached_tokens, 0);

    -- Determinar total de tokens
    IF p_total_tokens > 0 THEN
        v_tokens := p_total_tokens;
    ELSE
        v_tokens := v_prompt + v_completion;
    END IF;

    -- Cálculo com Tarifas Oficiais por Provedor e Tipo de Token
    IF p_status IN ('SUCCESS') THEN
        IF p_provider = 'openai' THEN
            -- OpenAI GPT-4o-mini / Luna:
            -- Input: $0.150 / 1M ($0.000150 / 1k) -> R$ 0,000945 / 1k
            -- Cached Input: $0.075 / 1M ($0.000075 / 1k) -> R$ 0,000472 / 1k
            -- Output: $0.600 / 1M ($0.000600 / 1k) -> R$ 0,003780 / 1k
            v_prompt_cost := (GREATEST(0, v_prompt - v_cached)::numeric / 1000.0) * (0.000150 * c_usd_to_brl);
            v_cached_cost := (v_cached::numeric / 1000.0) * (0.000075 * c_usd_to_brl);
            v_completion_cost := (v_completion::numeric / 1000.0) * (0.000600 * c_usd_to_brl);
            v_cost_brl := ROUND(v_prompt_cost + v_cached_cost + v_completion_cost, 6);
        ELSE
            -- Google Gemini Flash (1.5 / 2.0 / 2.5 Flash):
            -- Input: $0.075 / 1M ($0.000075 / 1k) -> R$ 0,000473 / 1k
            -- Cached Input: $0.01875 / 1M ($0.00001875 / 1k) -> R$ 0,000118 / 1k
            -- Output: $0.300 / 1M ($0.000300 / 1k) -> R$ 0,001890 / 1k
            v_prompt_cost := (GREATEST(0, v_prompt - v_cached)::numeric / 1000.0) * (0.000075 * c_usd_to_brl);
            v_cached_cost := (v_cached::numeric / 1000.0) * (0.00001875 * c_usd_to_brl);
            v_completion_cost := (v_completion::numeric / 1000.0) * (0.000300 * c_usd_to_brl);
            v_cost_brl := ROUND(v_prompt_cost + v_cached_cost + v_completion_cost, 6);
        END IF;

        -- Fallback de segurança se não houver detalhamento de tokens
        IF v_tokens > 0 AND v_cost_brl = 0 THEN
            v_cost_brl := ROUND((v_tokens::numeric / 1000.0) * (0.000300 * c_usd_to_brl), 6);
        ELSIF v_tokens = 0 THEN
            v_cost_brl := 0.0020; -- Custo residual por requisição sem telemetria de tokens
        END IF;
    ELSE
        -- Requisições com erro de infra/rede não são tarifadas
        v_cost_brl := 0;
    END IF;

    -- Reconciliar e comitar reserva atômica se fornecida
    IF p_reservation_id IS NOT NULL THEN
        UPDATE public.api_budget_reservations
        SET status = 'COMMITTED',
            committed_at = now()
        WHERE id = p_reservation_id;
    END IF;

    -- Gravação atômica em api_usage_logs e api_usage_daily
    v_log_id := public.record_api_usage_atomic(
        p_provider          := p_provider,
        p_service           := p_service,
        p_operation         := p_operation,
        p_units             := CASE WHEN v_tokens > 0 THEN v_tokens ELSE 1 END,
        p_status            := p_status,
        p_http_status       := CASE WHEN p_status = 'SUCCESS' THEN 200 ELSE 500 END,
        p_module_source     := p_module_source,
        p_environment       := p_environment,
        p_cost_estimated    := v_cost_brl,
        p_cache_hit         := (v_cached > 0),
        p_response_time_ms  := p_response_time_ms,
        p_request_id        := p_request_id,
        p_error_message     := p_error_message
    );

    RETURN jsonb_build_object(
        'log_id', v_log_id,
        'tokens', v_tokens,
        'prompt_tokens', v_prompt,
        'completion_tokens', v_completion,
        'cached_tokens', v_cached,
        'cost_brl', v_cost_brl,
        'reservation_committed', (p_reservation_id IS NOT NULL),
        'status', p_status
    );
END;
$func$;
