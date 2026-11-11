BEGIN;

-- Only the server-side webhook/proxy may reserve and commit shared AI quotas.
-- The read-only metrics RPC remains available through its existing contract.
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
SET search_path = ''
AS $func$
DECLARE
  v_limits jsonb;
  v_monthly_budget numeric;
  v_hard_limit_pct numeric;
  v_daily_budget numeric;
  v_daily_max_requests integer;
  v_hourly_max_requests integer;
  v_daily_max_tokens integer;
  v_hourly_max_tokens integer;
  v_circuit_breaker integer;
  v_hours_enabled boolean;
  v_hours_start time;
  v_hours_end time;
  v_allow_off_hours boolean;
  v_off_hours_max_requests integer;
  v_now timestamptz := now();
  v_local_now timestamp;
  v_local_time time;
  v_month_start timestamptz;
  v_day_start timestamptz;
  v_hour_start timestamptz;
  v_minute_start timestamptz;
  v_is_operating_hours boolean;
  v_month_cost numeric := 0;
  v_day_cost numeric := 0;
  v_month_holds numeric := 0;
  v_day_holds numeric := 0;
  v_hour_tokens numeric := 0;
  v_day_tokens numeric := 0;
  v_month_requests integer := 0;
  v_day_requests integer := 0;
  v_hour_requests integer := 0;
  v_minute_requests integer := 0;
  v_off_hours_requests integer := 0;
  v_pending_month_requests integer := 0;
  v_pending_day_requests integer := 0;
  v_pending_hour_requests integer := 0;
  v_pending_minute_requests integer := 0;
  v_pending_day_tokens numeric := 0;
  v_pending_hour_tokens numeric := 0;
  v_active_holds numeric := 0;
  v_estimated_hold numeric := 0;
  v_effective_hold numeric := 0;
  v_effective_tokens numeric := 0;
  v_month_limit numeric := 0;
  v_remaining numeric := 0;
  v_month_percent numeric := 0;
  v_reservation_id uuid := NULL;
BEGIN
  IF p_reserve THEN
    -- Serializes the read/check/insert section, preventing parallel webhook
    -- instances from all passing against the same remaining budget.
    PERFORM pg_advisory_xact_lock(hashtextextended('public.ai_usage_quota', 0));
    UPDATE public.api_budget_reservations
       SET status = 'EXPIRED'
     WHERE status = 'PENDING'
       AND expires_at < v_now;
  END IF;

  SELECT data->'aiUsageLimits'
    INTO v_limits
    FROM public.settings
   WHERE id = 'app';

  v_monthly_budget := COALESCE((v_limits->>'monthlyBudgetBRL')::numeric, 30.00);
  v_hard_limit_pct := COALESCE((v_limits->>'hardLimitPercent')::numeric, 95.00);
  v_daily_budget := COALESCE((v_limits->>'dailyBudgetBRL')::numeric, 1.50);
  v_daily_max_requests := COALESCE((v_limits->>'dailyMaxRequests')::integer, 250);
  v_hourly_max_requests := COALESCE((v_limits->>'hourlyMaxRequests')::integer, 60);
  v_daily_max_tokens := COALESCE((v_limits->>'dailyMaxTokens')::integer, 350000);
  v_hourly_max_tokens := COALESCE((v_limits->>'hourlyMaxTokens')::integer, 90000);
  v_circuit_breaker := COALESCE((v_limits->>'circuitBreakerPerMinute')::integer, 15);
  v_hours_enabled := COALESCE((v_limits->'operatingHours'->>'enabled')::boolean, true);
  v_hours_start := COALESCE((v_limits->'operatingHours'->>'start')::time, time '08:00');
  v_hours_end := COALESCE((v_limits->'operatingHours'->>'end')::time, time '22:00');
  v_allow_off_hours := COALESCE((v_limits->'operatingHours'->>'allowOffHoursEmergency')::boolean, true);
  v_off_hours_max_requests := COALESCE((v_limits->'operatingHours'->>'offHoursHourlyMaxRequests')::integer, 5);

  v_local_now := v_now AT TIME ZONE 'America/Sao_Paulo';
  v_local_time := v_local_now::time;
  v_month_start := date_trunc('month', v_local_now) AT TIME ZONE 'America/Sao_Paulo';
  v_day_start := date_trunc('day', v_local_now) AT TIME ZONE 'America/Sao_Paulo';
  v_hour_start := v_now - interval '1 hour';
  v_minute_start := v_now - interval '1 minute';
  v_is_operating_hours := CASE
    WHEN v_hours_start <= v_hours_end THEN v_local_time >= v_hours_start AND v_local_time <= v_hours_end
    ELSE v_local_time >= v_hours_start OR v_local_time <= v_hours_end
  END;

  SELECT
    COUNT(*) FILTER (WHERE created_at >= v_month_start AND status = 'SUCCESS')::integer,
    COUNT(*) FILTER (WHERE created_at >= v_day_start AND status = 'SUCCESS')::integer,
    COUNT(*) FILTER (WHERE created_at >= v_hour_start AND status = 'SUCCESS')::integer,
    COUNT(*) FILTER (WHERE created_at >= v_minute_start)::integer,
    COUNT(*) FILTER (WHERE created_at >= v_hour_start)::integer,
    COALESCE(SUM(units) FILTER (WHERE created_at >= v_day_start AND status = 'SUCCESS'), 0),
    COALESCE(SUM(units) FILTER (WHERE created_at >= v_hour_start AND status = 'SUCCESS'), 0),
    COALESCE(SUM(cost_estimated) FILTER (WHERE created_at >= v_month_start AND status = 'SUCCESS'), 0),
    COALESCE(SUM(cost_estimated) FILTER (WHERE created_at >= v_day_start AND status = 'SUCCESS'), 0)
    INTO v_month_requests, v_day_requests, v_hour_requests, v_minute_requests,
         v_off_hours_requests, v_day_tokens, v_hour_tokens, v_month_cost, v_day_cost
    FROM public.api_usage_logs
   WHERE provider IN ('openai', 'gemini')
     AND created_at >= v_month_start;

  SELECT
    COALESCE(SUM(estimated_cost_brl), 0),
    COUNT(*) FILTER (WHERE created_at >= v_month_start)::integer,
    COUNT(*) FILTER (WHERE created_at >= v_day_start)::integer,
    COUNT(*) FILTER (WHERE created_at >= v_hour_start)::integer,
    COUNT(*) FILTER (WHERE created_at >= v_minute_start)::integer,
    COALESCE(SUM(estimated_tokens) FILTER (WHERE created_at >= v_day_start), 0),
    COALESCE(SUM(estimated_tokens) FILTER (WHERE created_at >= v_hour_start), 0)
    INTO v_active_holds, v_pending_month_requests, v_pending_day_requests,
         v_pending_hour_requests, v_pending_minute_requests,
         v_pending_day_tokens, v_pending_hour_tokens
    FROM public.api_budget_reservations
   WHERE status = 'PENDING' AND expires_at >= v_now;

  SELECT
    COALESCE(SUM(estimated_cost_brl) FILTER (WHERE created_at >= v_month_start), 0),
    COALESCE(SUM(estimated_cost_brl) FILTER (WHERE created_at >= v_day_start), 0)
    INTO v_month_holds, v_day_holds
    FROM public.api_budget_reservations
   WHERE status = 'PENDING' AND expires_at >= v_now;

  v_month_limit := v_monthly_budget * (v_hard_limit_pct / 100.0);
  v_remaining := GREATEST(0, v_monthly_budget - v_month_cost - v_month_holds);
  v_month_percent := ROUND(((v_month_cost + v_month_holds) / NULLIF(v_monthly_budget, 0)) * 100, 1);

  IF p_provider = 'openai' THEN
    v_estimated_hold := GREATEST(0.0035, ROUND((GREATEST(COALESCE(p_estimated_tokens, 1000), 0)::numeric / 1000.0) * 0.00315, 4));
  ELSE
    v_estimated_hold := GREATEST(0.0030, ROUND((GREATEST(COALESCE(p_estimated_tokens, 1000), 0)::numeric / 1000.0) * 0.0019, 4));
  END IF;
  v_effective_hold := CASE WHEN p_reserve THEN v_estimated_hold ELSE 0 END;
  v_effective_tokens := CASE
    WHEN p_reserve THEN GREATEST(COALESCE(p_estimated_tokens, 1000), 0)::numeric
    ELSE 0
  END;

  IF v_minute_requests + v_pending_minute_requests >= v_circuit_breaker THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'CIRCUIT_BREAKER_TRIPPED',
      'reason', 'Proteção anti-loop de IA ativada. Aguarde 60 segundos.', 'retry_after_seconds', 60,
      'monthly_budget_brl', v_monthly_budget, 'month_cost_brl', v_month_cost + v_month_holds,
      'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent,
      'today_requests', v_day_requests + v_pending_day_requests, 'hour_requests', v_hour_requests + v_pending_hour_requests);
  END IF;

  IF v_hours_enabled AND NOT v_is_operating_hours THEN
    IF NOT v_allow_off_hours THEN
      RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'OFF_HOURS_BLOCKED',
        'reason', 'Assistente de IA fora do horário de atendimento.', 'is_operating_hours', false,
        'monthly_budget_brl', v_monthly_budget, 'month_cost_brl', v_month_cost + v_month_holds,
        'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent,
        'today_requests', v_day_requests + v_pending_day_requests, 'hour_requests', v_hour_requests + v_pending_hour_requests);
    END IF;
    IF v_off_hours_requests + v_pending_hour_requests >= v_off_hours_max_requests THEN
      RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'OFF_HOURS_LIMIT_EXCEEDED',
        'reason', 'Cota noturna de emergência da IA atingida.', 'is_operating_hours', false,
        'monthly_budget_brl', v_monthly_budget, 'month_cost_brl', v_month_cost + v_month_holds,
        'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent,
        'today_requests', v_day_requests + v_pending_day_requests, 'hour_requests', v_hour_requests + v_pending_hour_requests);
    END IF;
  END IF;

  IF v_hour_requests + v_pending_hour_requests >= v_hourly_max_requests THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'HOURLY_LIMIT_EXCEEDED',
      'reason', 'Limite horário de IA atingido.', 'hour_requests', v_hour_requests + v_pending_hour_requests,
      'monthly_budget_brl', v_monthly_budget, 'month_cost_brl', v_month_cost + v_month_holds,
      'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent,
      'today_requests', v_day_requests + v_pending_day_requests);
  END IF;
  IF v_hour_tokens + v_pending_hour_tokens + v_effective_tokens > v_hourly_max_tokens THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'HOURLY_TOKEN_LIMIT_EXCEEDED',
      'reason', 'Limite de tokens por hora atingido.', 'hour_tokens', v_hour_tokens + v_pending_hour_tokens,
      'hourly_max_tokens', v_hourly_max_tokens, 'monthly_budget_brl', v_monthly_budget,
      'month_cost_brl', v_month_cost + v_month_holds, 'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent);
  END IF;
  IF v_day_requests + v_pending_day_requests >= v_daily_max_requests THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'DAILY_LIMIT_EXCEEDED',
      'reason', 'Limite diário de IA atingido.', 'today_requests', v_day_requests + v_pending_day_requests,
      'daily_max_requests', v_daily_max_requests, 'monthly_budget_brl', v_monthly_budget,
      'month_cost_brl', v_month_cost + v_month_holds, 'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent);
  END IF;
  IF v_day_tokens + v_pending_day_tokens + v_effective_tokens > v_daily_max_tokens THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'DAILY_TOKEN_LIMIT_EXCEEDED',
      'reason', 'Limite diário de tokens de IA atingido.', 'today_tokens', v_day_tokens + v_pending_day_tokens,
      'daily_max_tokens', v_daily_max_tokens, 'monthly_budget_brl', v_monthly_budget,
      'month_cost_brl', v_month_cost + v_month_holds, 'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent);
  END IF;
  IF v_day_cost + v_day_holds + v_effective_hold >= v_daily_budget THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'DAILY_BUDGET_EXCEEDED',
      'reason', 'Orçamento diário de IA atingido.', 'today_cost_brl', v_day_cost + v_day_holds,
      'daily_budget_brl', v_daily_budget, 'monthly_budget_brl', v_monthly_budget,
      'month_cost_brl', v_month_cost + v_month_holds, 'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent);
  END IF;
  IF v_month_cost + v_month_holds >= v_month_limit THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'MONTHLY_BUDGET_EXCEEDED',
      'reason', 'Teto financeiro mensal de IA atingido.', 'month_cost_brl', v_month_cost + v_month_holds,
      'monthly_budget_brl', v_monthly_budget, 'hard_limit_amount', v_month_limit,
      'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent);
  END IF;
  IF v_month_cost + v_month_holds + v_effective_hold > v_month_limit THEN
    RETURN jsonb_build_object('allowed', false, 'status', 'BLOCKED', 'code', 'MONTHLY_BUDGET_HOLD_BREACH',
      'reason', 'A reserva estimada excede o teto mensal disponível.', 'month_cost_brl', v_month_cost,
      'active_holds_brl', v_month_holds, 'estimated_hold_brl', v_estimated_hold,
      'monthly_budget_brl', v_monthly_budget, 'hard_limit_amount', v_month_limit,
      'remaining_month_budget_brl', v_remaining, 'month_percent', v_month_percent);
  END IF;

  IF p_reserve THEN
    v_reservation_id := gen_random_uuid();
    INSERT INTO public.api_budget_reservations (
      id, provider, service, estimated_tokens, estimated_cost_brl, module_source, status, expires_at, created_at
    ) VALUES (
      v_reservation_id, p_provider, p_service, GREATEST(COALESCE(p_estimated_tokens, 1000), 0),
      v_estimated_hold, p_module_source, 'PENDING', v_now + interval '3 minutes', v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true, 'status', 'ALLOW', 'reservation_id', v_reservation_id,
    'reserved_amount_brl', v_effective_hold, 'reason', CASE WHEN p_reserve THEN 'Cota reservada.' ELSE 'Métricas de cota consultadas.' END,
    'monthly_budget_brl', v_monthly_budget, 'month_cost_brl', v_month_cost + v_month_holds,
    'active_holds_brl', v_active_holds + v_effective_hold,
    'remaining_month_budget_brl', GREATEST(0, v_remaining - v_effective_hold),
    'month_percent', ROUND(((v_month_cost + v_month_holds + v_effective_hold) / NULLIF(v_monthly_budget, 0)) * 100, 1),
    'today_requests', v_day_requests + v_pending_day_requests,
    'today_tokens', v_day_tokens + v_pending_day_tokens + v_effective_tokens,
    'today_cost_brl', v_day_cost + v_day_holds,
    'hour_requests', v_hour_requests + v_pending_hour_requests,
    'hour_tokens', v_hour_tokens + v_pending_hour_tokens + v_effective_tokens,
    'is_operating_hours', v_is_operating_hours
  );
END;
$func$;

-- Private execution for quota mutation and the billing ledger.
CREATE OR REPLACE FUNCTION public.release_ai_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  IF p_reservation_id IS NULL THEN RETURN false; END IF;
  UPDATE public.api_budget_reservations
     SET status = 'RELEASED', expires_at = now()
   WHERE id = p_reservation_id AND status = 'PENDING';
  RETURN FOUND;
END;
$func$;

REVOKE ALL ON FUNCTION public.check_and_reserve_ai_quota(text, text, integer, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_reserve_ai_quota(text, text, integer, text, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_token_usage(text, text, text, integer, integer, integer, integer, text, text, text, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_token_usage(text, text, text, integer, integer, integer, integer, text, text, text, integer, text, text, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.release_ai_reservation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_reservation(uuid) TO service_role;
ALTER TABLE public.api_budget_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_budget_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_budget_reservations TO service_role;

-- These records contain planned customer replies and internal request metadata.
ALTER TABLE public.whatsapp_ai_agent_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_ai_agent_turns_authenticated_read" ON public.whatsapp_ai_agent_turns;
DROP POLICY IF EXISTS "whatsapp_ai_dispatches_authenticated_read" ON public.whatsapp_ai_dispatches;
REVOKE ALL ON TABLE public.whatsapp_ai_agent_turns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_ai_dispatches FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.whatsapp_ai_agent_turns TO service_role;
GRANT ALL ON TABLE public.whatsapp_ai_dispatches TO service_role;

-- The concurrency and dispatch RPCs are internal webhook operations.
REVOKE ALL ON FUNCTION public.customer_support_acquire_ai_turn(uuid, text, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_complete_ai_turn(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_prepare_ai_dispatch(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_record_ai_dispatch_outcome(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_acquire_ai_turn(uuid, text, uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_complete_ai_turn(uuid, uuid, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_prepare_ai_dispatch(text, uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_record_ai_dispatch_outcome(uuid, text, text, text) TO service_role;

COMMIT;
