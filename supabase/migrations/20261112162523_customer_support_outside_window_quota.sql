BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Existing events did not record the service window; preserve them as unknown.
ALTER TABLE public.customer_support_whatsapp_send_quota_events
  ADD COLUMN outside_service_window boolean;

-- Older application versions may still call this function during deployment.
-- Their hourly cleanup must not erase classified events needed by the daily view.
CREATE OR REPLACE FUNCTION public.customer_support_reserve_whatsapp_send_quota(
  p_business_phone_number_id text,
  p_source text DEFAULT 'central',
  p_reserve boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_minute_used integer := 0;
  v_hour_used integer := 0;
  v_minute_oldest timestamptz;
  v_hour_oldest timestamptz;
  v_minute_retry integer := 0;
  v_hour_retry integer := 0;
  v_retry_after integer := 0;
  v_allowed boolean;
  v_reservation_id uuid;
BEGIN
  IF p_business_phone_number_id IS NULL OR p_business_phone_number_id !~ '^[0-9]{1,32}$'
    OR p_source IS NULL OR p_source NOT IN ('central', 'ai_auto') THEN
    RAISE EXCEPTION 'Parâmetros inválidos para a cota de envio.' USING ERRCODE = '22023';
  END IF;

  IF p_reserve THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('customer_support_whatsapp_send:' || p_business_phone_number_id, 0)
    );
    v_now := pg_catalog.clock_timestamp();
    DELETE FROM public.customer_support_whatsapp_send_quota_events
      WHERE business_phone_number_id = p_business_phone_number_id
        AND outside_service_window IS NULL
        AND created_at <= v_now - interval '1 hour';
  END IF;

  SELECT
    (count(*) FILTER (WHERE created_at > v_now - interval '1 minute'))::integer,
    count(*)::integer,
    min(created_at) FILTER (WHERE created_at > v_now - interval '1 minute'),
    min(created_at)
  INTO v_minute_used, v_hour_used, v_minute_oldest, v_hour_oldest
  FROM public.customer_support_whatsapp_send_quota_events
  WHERE business_phone_number_id = p_business_phone_number_id
    AND status <> 'released'
    AND created_at > v_now - interval '1 hour';

  v_allowed := v_minute_used < 10 AND v_hour_used < 50;
  IF NOT v_allowed THEN
    IF v_minute_used >= 10 AND v_minute_oldest IS NOT NULL THEN
      v_minute_retry := greatest(1, ceil(extract(epoch FROM (v_minute_oldest + interval '1 minute' - v_now))::numeric)::integer);
    END IF;
    IF v_hour_used >= 50 AND v_hour_oldest IS NOT NULL THEN
      v_hour_retry := greatest(1, ceil(extract(epoch FROM (v_hour_oldest + interval '1 hour' - v_now))::numeric)::integer);
    END IF;
    v_retry_after := greatest(v_minute_retry, v_hour_retry);
  ELSIF p_reserve THEN
    INSERT INTO public.customer_support_whatsapp_send_quota_events (business_phone_number_id, source)
      VALUES (p_business_phone_number_id, p_source)
      RETURNING id INTO v_reservation_id;
    v_minute_used := v_minute_used + 1;
    v_hour_used := v_hour_used + 1;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'allowed', v_allowed, 'reservation_id', v_reservation_id,
    'minute_limit', 10, 'minute_used', v_minute_used, 'minute_remaining', greatest(0, 10 - v_minute_used),
    'hour_limit', 50, 'hour_used', v_hour_used, 'hour_remaining', greatest(0, 50 - v_hour_used),
    'remaining_percent', floor(100 * least(greatest(0, 10 - v_minute_used)::numeric / 10,
      greatest(0, 50 - v_hour_used)::numeric / 50))::integer,
    'retry_after_seconds', v_retry_after
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_outside_window_quota(
  p_business_phone_number_id text,
  p_conversation_id uuid DEFAULT NULL,
  p_source text DEFAULT 'central',
  p_reserve boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_day_start timestamptz;
  v_last_customer_message timestamptz;
  v_minute_used integer := 0;
  v_hour_used integer := 0;
  v_day_attempts integer := 0;
  v_day_sent integer := 0;
  v_day_failed integer := 0;
  v_day_uncertain integer := 0;
  v_minute_oldest timestamptz;
  v_hour_oldest timestamptz;
  v_minute_retry integer := 0;
  v_hour_retry integer := 0;
  v_allowed boolean;
  v_reservation_id uuid;
BEGIN
  IF p_business_phone_number_id IS NULL OR p_business_phone_number_id !~ '^[0-9]{1,32}$'
    OR p_source IS NULL OR p_source NOT IN ('central', 'ai_auto') OR p_reserve IS NULL THEN
    RAISE EXCEPTION 'Parâmetros inválidos para a cota de envio.' USING ERRCODE = '22023';
  END IF;

  IF p_reserve THEN
    IF p_conversation_id IS NULL THEN
      RAISE EXCEPTION 'Conversa necessária para reservar a cota.' USING ERRCODE = '22023';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('customer_support_whatsapp_send:' || p_business_phone_number_id, 0)
    );
    v_now := pg_catalog.clock_timestamp();
    SELECT c.last_customer_message_at INTO v_last_customer_message
      FROM public.whatsapp_conversations c
      WHERE c.id = p_conversation_id AND c.business_phone_number_id = p_business_phone_number_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conversa não pertence ao canal informado.' USING ERRCODE = '22023';
    END IF;
    IF v_last_customer_message > v_now - interval '24 hours' AND v_last_customer_message <= v_now THEN
      RETURN pg_catalog.jsonb_build_object('allowed', true, 'exempt', true, 'reservation_id', NULL);
    END IF;
  END IF;

  v_day_start := pg_catalog.date_trunc('day', v_now AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  IF p_reserve THEN
    DELETE FROM public.customer_support_whatsapp_send_quota_events
      WHERE business_phone_number_id = p_business_phone_number_id
        AND outside_service_window IS TRUE
        AND created_at < least(v_day_start, v_now - interval '1 hour');
  END IF;

  SELECT
    (count(*) FILTER (WHERE created_at > v_now - interval '1 minute'))::integer,
    (count(*) FILTER (WHERE created_at > v_now - interval '1 hour'))::integer,
    (count(*) FILTER (WHERE created_at >= v_day_start))::integer,
    (count(*) FILTER (WHERE created_at >= v_day_start AND status = 'sent'))::integer,
    (count(*) FILTER (WHERE created_at >= v_day_start AND status = 'failed'))::integer,
    (count(*) FILTER (WHERE created_at >= v_day_start AND status = 'uncertain'))::integer,
    min(created_at) FILTER (WHERE created_at > v_now - interval '1 minute'),
    min(created_at) FILTER (WHERE created_at > v_now - interval '1 hour')
  INTO v_minute_used, v_hour_used, v_day_attempts, v_day_sent, v_day_failed, v_day_uncertain,
    v_minute_oldest, v_hour_oldest
  FROM public.customer_support_whatsapp_send_quota_events
  WHERE business_phone_number_id = p_business_phone_number_id
    AND outside_service_window IS TRUE
    AND status <> 'released'
    AND created_at >= least(v_day_start, v_now - interval '1 hour');

  v_allowed := v_minute_used < 10 AND v_hour_used < 50;
  IF NOT v_allowed THEN
    IF v_minute_used >= 10 AND v_minute_oldest IS NOT NULL THEN
      v_minute_retry := greatest(1, ceil(extract(epoch FROM (v_minute_oldest + interval '1 minute' - v_now))::numeric)::integer);
    END IF;
    IF v_hour_used >= 50 AND v_hour_oldest IS NOT NULL THEN
      v_hour_retry := greatest(1, ceil(extract(epoch FROM (v_hour_oldest + interval '1 hour' - v_now))::numeric)::integer);
    END IF;
  ELSIF p_reserve THEN
    INSERT INTO public.customer_support_whatsapp_send_quota_events (business_phone_number_id, source, outside_service_window)
      VALUES (p_business_phone_number_id, p_source, true)
      RETURNING id INTO v_reservation_id;
    v_minute_used := v_minute_used + 1;
    v_hour_used := v_hour_used + 1;
    v_day_attempts := v_day_attempts + 1;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'allowed', v_allowed, 'exempt', false, 'reservation_id', v_reservation_id,
    'minute_limit', 10, 'minute_used', v_minute_used, 'minute_remaining', greatest(0, 10 - v_minute_used),
    'hour_limit', 50, 'hour_used', v_hour_used, 'hour_remaining', greatest(0, 50 - v_hour_used),
    'day_attempts', v_day_attempts, 'day_sent', v_day_sent,
    'day_failed', v_day_failed, 'day_uncertain', v_day_uncertain,
    'day_start', v_day_start,
    'remaining_percent', floor(100 * least(greatest(0, 10 - v_minute_used)::numeric / 10,
      greatest(0, 50 - v_hour_used)::numeric / 50))::integer,
    'retry_after_seconds', greatest(v_minute_retry, v_hour_retry)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_outside_window_quota(text, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_outside_window_quota(text, uuid, text, boolean) TO service_role;
COMMIT;
