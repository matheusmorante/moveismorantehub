-- ==============================================================================
-- Migration: Unificação de Overloads de Cotas e Atualização de Tarifas GPT-6 Luna
-- Descrição:
--   1. Remove overloads obsoletos de check_and_reserve_ai_quota e record_ai_token_usage
--      para resolver o erro PostgreSQL 42725 (ambiguous function call).
--   2. Atualiza os custos de cálculo da OpenAI na RPC record_ai_token_usage para a
--      tabela tarifária oficial do GPT-6 Luna ($0.10/1M input, $0.01/1M cache, $0.50/1M output).
--   3. Calibra v_estimated_hold_brl na RPC check_and_reserve_ai_quota para o GPT-6 Luna.
-- ==============================================================================

-- 1. Remoção de overloads obsoletos conflitantes
DROP FUNCTION IF EXISTS public.check_and_reserve_ai_quota(text, text, integer, text);
DROP FUNCTION IF EXISTS public.record_ai_token_usage(text, text, text, integer, integer, integer, text, text, integer, text, text, text);

-- 2. Recriação canônica da RPC check_and_reserve_ai_quota com p_reserve
CREATE OR REPLACE FUNCTION public.check_and_reserve_ai_quota(
    p_provider text DEFAULT 'all',
    p_service text DEFAULT 'ai_unified',
    p_estimated_tokens integer DEFAULT 1000,
    p_module_source text DEFAULT 'general',
    p_reserve boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_hard_limit_amount numeric := 30.00;
    v_month_cost numeric := 0;
    v_active_holds_brl numeric := 0;
    v_estimated_hold_brl numeric := 0;
    v_pct_used numeric := 0;
    v_reservation_id uuid := NULL;
    v_expires_at timestamptz;
    c_usd_to_brl constant numeric := 6.30;
BEGIN
    -- 1. Expirar reservas antigas que não foram comitadas dentro de 90 segundos
    UPDATE public.api_budget_reservations
    SET status = 'EXPIRED'
    WHERE status = 'PENDING'
      AND expires_at < now();

    -- 2. Somatório do consumo consolidado do mês corrente
    SELECT COALESCE(SUM(cost_estimated), 0)
    INTO v_month_cost
    FROM public.api_usage_logs
    WHERE provider IN ('gemini', 'openai')
      AND status = 'SUCCESS'
      AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

    -- 3. Somatório das reservas ativas em andamento (PENDING)
    SELECT COALESCE(SUM(estimated_cost_brl), 0)
    INTO v_active_holds_brl
    FROM public.api_budget_reservations
    WHERE status = 'PENDING'
      AND expires_at >= now();

    -- 4. Cálculo percentual de consumo
    v_pct_used := ROUND((v_month_cost / v_hard_limit_amount) * 100, 2);

    -- 5. Se atingiu o teto consolidado, rejeita imediatamente
    IF (v_month_cost + v_active_holds_brl) >= v_hard_limit_amount THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'monthly_budget_exhausted',
            'reason', 'Teto orçamentário mensal de R$ ' || to_char(v_hard_limit_amount, 'FM999G990D00') || ' foi atingido.',
            'month_cost', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'hard_limit', v_hard_limit_amount,
            'month_percent', v_pct_used
        );
    END IF;

    -- 6. Estimar custo da reserva (calibrado para tarifas GPT-6 Luna e Gemini Flash)
    IF p_provider = 'openai' THEN
        -- GPT-6 Luna: $0.10 input / $0.50 output por 1M tokens
        v_estimated_hold_brl := GREATEST(0.0035, ROUND((COALESCE(p_estimated_tokens, 1000)::numeric / 1000.0) * 0.00315, 4));
    ELSE
        -- Gemini 3.8 Flash
        v_estimated_hold_brl := GREATEST(0.0030, ROUND((COALESCE(p_estimated_tokens, 1000)::numeric / 1000.0) * 0.0019, 4));
    END IF;

    -- 7. Verificação do Teto Financeiro Mensal considerando a nova reserva
    IF (v_month_cost + v_active_holds_brl + v_estimated_hold_brl) >= v_hard_limit_amount THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'monthly_budget_hold_breach',
            'reason', 'A reserva estimada excede o teto mensal disponível.',
            'month_cost', v_month_cost,
            'active_holds_brl', v_active_holds_brl,
            'estimated_hold_brl', v_estimated_hold_brl,
            'hard_limit', v_hard_limit_amount,
            'month_percent', v_pct_used
        );
    END IF;

    -- 8. Criação da reserva atômica apenas se p_reserve = true
    IF p_reserve THEN
        v_reservation_id := gen_random_uuid();
        v_expires_at := now() + interval '90 seconds';

        INSERT INTO public.api_budget_reservations (
            id,
            provider,
            service,
            estimated_tokens,
            estimated_cost_brl,
            status,
            expires_at,
            created_at
        ) VALUES (
            v_reservation_id,
            p_provider,
            p_service,
            COALESCE(p_estimated_tokens, 1000),
            v_estimated_hold_brl,
            'PENDING',
            v_expires_at,
            now()
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'status', 'ALLOWED',
        'reservation_id', v_reservation_id,
        'estimated_hold_brl', v_estimated_hold_brl,
        'expires_at', v_expires_at,
        'month_cost', v_month_cost,
        'month_percent', v_pct_used,
        'hard_limit', v_hard_limit_amount
    );
END;
$func$;

-- 3. Recriação canônica da RPC record_ai_token_usage com Tarifas GPT-6 Luna
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
            -- OpenAI GPT-6 Luna:
            -- Input: $0.100 / 1M ($0.000100 / 1k) -> R$ 0,000630 / 1k (à taxa 6.30)
            -- Cached Input: $0.010 / 1M ($0.000010 / 1k) -> R$ 0,000063 / 1k
            -- Output: $0.500 / 1M ($0.000500 / 1k) -> R$ 0,003150 / 1k
            v_prompt_cost := (GREATEST(0, v_prompt - v_cached)::numeric / 1000.0) * (0.000100 * c_usd_to_brl);
            v_cached_cost := (v_cached::numeric / 1000.0) * (0.000010 * c_usd_to_brl);
            v_completion_cost := (v_completion::numeric / 1000.0) * (0.000500 * c_usd_to_brl);
            v_cost_brl := ROUND(v_prompt_cost + v_cached_cost + v_completion_cost, 6);
        ELSE
            -- Google Gemini Flash (1.5 / 2.0 / 2.5 / 3.8 Flash):
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
            v_cost_brl := ROUND((v_tokens::numeric / 1000.0) * (0.000200 * c_usd_to_brl), 6);
        ELSIF v_tokens = 0 THEN
            v_cost_brl := 0.0015; -- Custo residual por requisição sem telemetria de tokens
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

-- 4. Garantir permissões de execução aos roles do Supabase
GRANT EXECUTE ON FUNCTION public.check_and_reserve_ai_quota(text, text, integer, text, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_token_usage(text, text, text, integer, integer, integer, integer, text, text, text, integer, text, text, uuid) TO anon, authenticated, service_role;
