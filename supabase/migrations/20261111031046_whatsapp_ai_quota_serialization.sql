BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- A reserva do atendimento persiste até o fim do mês, inclusive se a resposta
-- da OpenAI ou a confirmação do registro de consumo se perderem. Uma chamada
-- comprovadamente rejeitada pode liberá-la; uma chamada bem sucedida a comita.
CREATE OR REPLACE FUNCTION public.customer_support_reserve_ai_quota(
  p_provider text, p_service text, p_estimated_tokens integer, p_module_source text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_result jsonb; v_reservation_id uuid;
BEGIN
  IF p_provider IS DISTINCT FROM 'openai'
    OR coalesce(p_module_source, '') NOT IN ('whatsapp_commercial_agent', 'whatsapp_ai_simulator')
    OR p_estimated_tokens IS NULL OR p_estimated_tokens <= 0 THEN
    RAISE EXCEPTION 'Origem de reserva não autorizada.' USING ERRCODE = '22023';
  END IF;
  v_result := public.check_and_reserve_ai_quota(p_provider, p_service, p_estimated_tokens, p_module_source, true);
  IF (v_result->>'allowed')::boolean IS TRUE THEN
    v_reservation_id := (v_result->>'reservation_id')::uuid;
    UPDATE public.api_budget_reservations SET expires_at =
      (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month') AT TIME ZONE 'America/Sao_Paulo'
      WHERE id = v_reservation_id AND status = 'PENDING';
    IF NOT FOUND THEN RAISE EXCEPTION 'Reserva de atendimento não confirmada.'; END IF;
  END IF;
  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_support_reserve_ai_quota(text,text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_reserve_ai_quota(text,text,integer,text) TO service_role;

-- Usos gravados diretamente no log também devem respeitar a trava de leitura
-- da cota. A trava é transacional, sem manter conexões durante I/O externo.
CREATE OR REPLACE FUNCTION public.serialize_ai_usage_log_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  IF NEW.provider IN ('openai', 'gemini') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('public.ai_usage_quota', 0));
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER serialize_ai_usage_log_insert
  BEFORE INSERT ON public.api_usage_logs FOR EACH ROW EXECUTE FUNCTION public.serialize_ai_usage_log_insert();
REVOKE ALL ON FUNCTION public.serialize_ai_usage_log_insert() FROM PUBLIC, anon, authenticated;

-- Preserva o contrato de cálculo e gravação existente. A trava precisa ser
-- adquirida ANTES de trocar a reserva para COMMITTED, evitando que uma leitura
-- veja simultaneamente nem a reserva pendente nem o lançamento do consumo.
CREATE OR REPLACE FUNCTION public.record_ai_token_usage(
  p_provider text, p_service text, p_operation text DEFAULT 'chat',
  p_prompt_tokens integer DEFAULT 0, p_completion_tokens integer DEFAULT 0,
  p_total_tokens integer DEFAULT 0, p_cached_tokens integer DEFAULT 0,
  p_module_source text DEFAULT 'general', p_environment text DEFAULT 'production',
  p_status text DEFAULT 'SUCCESS', p_response_time_ms integer DEFAULT NULL,
  p_request_id text DEFAULT NULL, p_error_message text DEFAULT NULL,
  p_reservation_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_prompt integer; v_completion integer; v_cached integer; v_tokens integer;
  v_prompt_cost numeric := 0; v_completion_cost numeric := 0; v_cached_cost numeric := 0;
  v_cost_brl numeric := 0; v_log_id uuid;
  c_usd_to_brl constant numeric := 6.30;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('public.ai_usage_quota', 0));
  v_prompt := coalesce(p_prompt_tokens, 0);
  v_completion := coalesce(p_completion_tokens, 0);
  v_cached := coalesce(p_cached_tokens, 0);
  IF p_total_tokens > 0 THEN v_tokens := p_total_tokens;
  ELSE v_tokens := v_prompt + v_completion; END IF;

  IF p_status = 'SUCCESS' THEN
    IF p_provider = 'openai' THEN
      v_prompt_cost := (greatest(0, v_prompt - v_cached)::numeric / 1000.0) * (0.000100 * c_usd_to_brl);
      v_cached_cost := (v_cached::numeric / 1000.0) * (0.000010 * c_usd_to_brl);
      v_completion_cost := (v_completion::numeric / 1000.0) * (0.000500 * c_usd_to_brl);
    ELSE
      v_prompt_cost := (greatest(0, v_prompt - v_cached)::numeric / 1000.0) * (0.000075 * c_usd_to_brl);
      v_cached_cost := (v_cached::numeric / 1000.0) * (0.00001875 * c_usd_to_brl);
      v_completion_cost := (v_completion::numeric / 1000.0) * (0.000300 * c_usd_to_brl);
    END IF;
    v_cost_brl := round(v_prompt_cost + v_cached_cost + v_completion_cost, 6);
    IF v_tokens > 0 AND v_cost_brl = 0 THEN
      v_cost_brl := round((v_tokens::numeric / 1000.0) * (0.000200 * c_usd_to_brl), 6);
    ELSIF v_tokens = 0 THEN v_cost_brl := 0.0015; END IF;
  END IF;

  IF p_reservation_id IS NOT NULL THEN
    UPDATE public.api_budget_reservations SET status = 'COMMITTED', committed_at = now() WHERE id = p_reservation_id;
  END IF;
  v_log_id := public.record_api_usage_atomic(
    p_provider := p_provider, p_service := p_service, p_operation := p_operation,
    p_units := CASE WHEN v_tokens > 0 THEN v_tokens ELSE 1 END, p_status := p_status,
    p_http_status := CASE WHEN p_status = 'SUCCESS' THEN 200 ELSE 500 END,
    p_module_source := p_module_source, p_environment := p_environment,
    p_cost_estimated := v_cost_brl, p_cache_hit := (v_cached > 0),
    p_response_time_ms := p_response_time_ms, p_request_id := p_request_id, p_error_message := p_error_message);
  RETURN jsonb_build_object('log_id', v_log_id, 'tokens', v_tokens, 'prompt_tokens', v_prompt,
    'completion_tokens', v_completion, 'cached_tokens', v_cached, 'cost_brl', v_cost_brl,
    'reservation_committed', (p_reservation_id IS NOT NULL), 'status', p_status);
END;
$function$;
COMMIT;
