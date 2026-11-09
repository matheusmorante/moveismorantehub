-- ============================================================================
-- Migration: 20261109050000_restore_gemini_live_quota_and_readonly_metrics.sql
-- Descrição: Restaura tabela e RPC de cota do Gemini Live (30 min/dia) e
--            adiciona modo somente-leitura (p_reserve := false) para inspeção
--            de métricas sem reter saldo financeiro temporário.
-- ============================================================================

-- 1. Tabela e RPC do Gemini Live
CREATE TABLE IF NOT EXISTS public.gemini_live_daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  used_ms BIGINT NOT NULL DEFAULT 0 CHECK (used_ms >= 0),
  active_since TIMESTAMPTZ,
  session_id UUID,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.gemini_live_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gemini_live_daily_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.gemini_live_quota(p_action TEXT, p_session_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_day DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_used BIGINT;
  v_active_since TIMESTAMPTZ;
  v_active_session UUID;
  v_elapsed BIGINT;
  v_limit CONSTANT BIGINT := 1800000; -- 30 minutos em milissegundos
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF p_action NOT IN ('status', 'start', 'pulse', 'pause') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF p_action IN ('start', 'pulse', 'pause') AND p_session_id IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED'; END IF;
  
  INSERT INTO public.gemini_live_daily_usage(user_id, usage_date)
    VALUES (v_user_id, v_day) ON CONFLICT DO NOTHING;
    
  SELECT used_ms, active_since, session_id INTO v_used, v_active_since, v_active_session
    FROM public.gemini_live_daily_usage
    WHERE user_id = v_user_id AND usage_date = v_day FOR UPDATE;

  IF v_active_since IS NOT NULL AND p_action IN ('pulse', 'pause', 'status', 'start') THEN
    v_elapsed := LEAST(15000, GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_active_since)) * 1000)::BIGINT));
    v_used := LEAST(v_limit, v_used + v_elapsed);
    UPDATE public.gemini_live_daily_usage SET used_ms = v_used, active_since = NULL, session_id = NULL
      WHERE user_id = v_user_id AND usage_date = v_day;
  END IF;

  IF p_action = 'start' THEN
    IF v_active_since IS NOT NULL AND v_active_session IS DISTINCT FROM p_session_id THEN RAISE EXCEPTION 'SESSION_ALREADY_ACTIVE'; END IF;
    IF v_used < v_limit THEN
      UPDATE public.gemini_live_daily_usage SET active_since = now(), session_id = p_session_id
        WHERE user_id = v_user_id AND usage_date = v_day;
    END IF;
  ELSIF p_action IN ('pulse', 'pause') AND v_active_session IS DISTINCT FROM p_session_id AND v_active_session IS NOT NULL THEN
    RAISE EXCEPTION 'SESSION_MISMATCH';
  ELSIF p_action = 'pulse' AND v_used < v_limit THEN
    UPDATE public.gemini_live_daily_usage SET active_since = now()
      WHERE user_id = v_user_id AND usage_date = v_day AND session_id = p_session_id;
  END IF;

  RETURN jsonb_build_object(
    'usedMs', v_used,
    'remainingMs', GREATEST(0, v_limit - v_used),
    'limitMs', v_limit,
    'active', p_action IN ('start', 'pulse') AND v_used < v_limit,
    'usageDate', v_day
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gemini_live_quota(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gemini_live_quota(TEXT, UUID) TO authenticated;

-- 2. Atualização de check_and_reserve_ai_quota com suporte a p_reserve boolean
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
    v_reservation_id uuid := NULL;
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
    IF (v_month_cost + v_active_holds_brl + (CASE WHEN p_reserve THEN v_estimated_hold_brl ELSE 0 END)) >= v_hard_limit_amount THEN
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

    -- 8. Criação atômica da reserva (somente se p_reserve for true)
    IF p_reserve THEN
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
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'status', 'ALLOW',
        'reservation_id', v_reservation_id,
        'reserved_amount_brl', CASE WHEN p_reserve THEN v_estimated_hold_brl ELSE 0 END,
        'reason', CASE WHEN p_reserve THEN 'Cota de IA liberada e reservada com sucesso.' ELSE 'Métricas de cota de IA consultadas.' END,
        'monthly_budget_brl', v_monthly_budget_brl,
        'month_cost_brl', v_month_cost,
        'active_holds_brl', v_active_holds_brl + (CASE WHEN p_reserve THEN v_estimated_hold_brl ELSE 0 END),
        'remaining_month_budget_brl', GREATEST(0, v_remaining_budget - (CASE WHEN p_reserve THEN v_estimated_hold_brl ELSE 0 END)),
        'month_percent', ROUND(((v_month_cost + v_active_holds_brl + (CASE WHEN p_reserve THEN v_estimated_hold_brl ELSE 0 END)) / NULLIF(v_monthly_budget_brl, 0)) * 100, 1),
        'today_requests', v_today_reqs,
        'today_tokens', v_today_tokens,
        'today_cost_brl', v_today_cost,
        'hour_requests', v_reqs_last_hour,
        'hour_tokens', v_tokens_last_hour,
        'is_operating_hours', v_is_operating_hours
    );
END;
$func$;

-- 3. Função dedicada de leitura somente-leitura de métricas
CREATE OR REPLACE FUNCTION public.get_ai_quota_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_and_reserve_ai_quota(
    p_provider := 'all',
    p_service := 'ai_unified',
    p_estimated_tokens := 0,
    p_module_source := 'readonly_metrics',
    p_reserve := false
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_quota_metrics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_reserve_ai_quota(text, text, integer, text, boolean) TO anon, authenticated;
