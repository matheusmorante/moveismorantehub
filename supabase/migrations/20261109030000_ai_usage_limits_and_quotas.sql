-- Melhoria do payload de retorno de check_and_reserve_ai_quota para sempre incluir métricas completas
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
    v_hard_limit_amount numeric;
    v_remaining_budget numeric;
    v_pct_used numeric;
BEGIN
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

    -- Calcular consumo acumulado do mês corrente
    SELECT COALESCE(SUM(cost_estimated), 0) INTO v_month_cost
    FROM public.api_usage_logs
    WHERE provider IN ('gemini', 'openai')
      AND created_at >= v_start_of_month
      AND status = 'SUCCESS';

    v_hard_limit_amount := v_monthly_budget_brl * (v_hard_limit_pct / 100.0);
    v_remaining_budget := GREATEST(0, v_monthly_budget_brl - v_month_cost);
    v_pct_used := ROUND((v_month_cost / NULLIF(v_monthly_budget_brl, 0)) * 100, 1);

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
                'remaining_month_budget_brl', v_remaining_budget,
                'month_percent', v_pct_used,
                'today_requests', v_today_reqs,
                'hour_requests', v_reqs_last_hour
            );
        ELSE
            -- Cota noturna de emergência reduzida por hora
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
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    -- 6. Verificação da Cota Diária (Requisições, Tokens e Custo Hoje)
    IF v_today_reqs >= v_daily_max_req THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'DAILY_LIMIT_EXCEEDED',
            'reason', 'Limite diário de IA atingido (' || v_today_reqs || '/' || v_daily_max_req || ' req/dia). A cota diária renova à meia-noite.',
            'today_requests', v_today_reqs,
            'daily_max_requests', v_daily_max_req,
            'monthly_budget_brl', v_monthly_budget_brl,
            'month_cost_brl', v_month_cost,
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
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    -- 7. Verificação do Teto Financeiro Mensal (R$ 30,00)
    IF v_month_cost >= v_hard_limit_amount THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'status', 'BLOCKED',
            'code', 'MONTHLY_BUDGET_EXCEEDED',
            'reason', 'Teto financeiro mensal de IA atingido (R$ ' || trim(to_char(v_month_cost, '999D99')) || ' de R$ ' || trim(to_char(v_monthly_budget_brl, '999D99')) || '). Novas chamadas foram bloqueadas preventivamente para evitar custos adicionais.',
            'month_cost_brl', v_month_cost,
            'monthly_budget_brl', v_monthly_budget_brl,
            'hard_limit_amount', v_hard_limit_amount,
            'remaining_month_budget_brl', v_remaining_budget,
            'month_percent', v_pct_used
        );
    END IF;

    -- 8. Tudo liberado
    RETURN jsonb_build_object(
        'allowed', true,
        'status', 'ALLOW',
        'reason', 'Cota de IA liberada.',
        'monthly_budget_brl', v_monthly_budget_brl,
        'month_cost_brl', v_month_cost,
        'remaining_month_budget_brl', v_remaining_budget,
        'month_percent', v_pct_used,
        'today_requests', v_today_reqs,
        'today_tokens', v_today_tokens,
        'today_cost_brl', v_today_cost,
        'hour_requests', v_reqs_last_hour,
        'hour_tokens', v_tokens_last_hour,
        'is_operating_hours', v_is_operating_hours
    );
END;
$func$;
