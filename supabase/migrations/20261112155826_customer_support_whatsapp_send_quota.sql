BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE TABLE public.customer_support_whatsapp_send_quota_events (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  business_phone_number_id text NOT NULL CHECK (business_phone_number_id ~ '^[0-9]{1,32}$'),
  source text NOT NULL CHECK (source IN ('central', 'ai_auto')),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'sent', 'failed', 'uncertain', 'released')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX customer_support_whatsapp_send_quota_window_idx
  ON public.customer_support_whatsapp_send_quota_events (business_phone_number_id, created_at DESC);

ALTER TABLE public.customer_support_whatsapp_send_quota_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_support_whatsapp_send_quota_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_support_whatsapp_send_quota_events TO service_role;

CREATE OR REPLACE FUNCTION public.customer_support_reserve_whatsapp_send_quota(
  p_business_phone_number_id text,
  p_source text DEFAULT 'central',
  p_reserve boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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
    DELETE FROM public.customer_support_whatsapp_send_quota_events
      WHERE business_phone_number_id = p_business_phone_number_id
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
    'allowed', v_allowed,
    'reservation_id', v_reservation_id,
    'minute_limit', 10,
    'minute_used', v_minute_used,
    'minute_remaining', greatest(0, 10 - v_minute_used),
    'hour_limit', 50,
    'hour_used', v_hour_used,
    'hour_remaining', greatest(0, 50 - v_hour_used),
    'remaining_percent', floor(100 * least(
      greatest(0, 10 - v_minute_used)::numeric / 10,
      greatest(0, 50 - v_hour_used)::numeric / 50
    ))::integer,
    'retry_after_seconds', v_retry_after
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_finish_whatsapp_send_quota(
  p_reservation_id uuid,
  p_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('sent', 'failed', 'uncertain', 'released') THEN
    RAISE EXCEPTION 'Estado de envio inválido.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.customer_support_whatsapp_send_quota_events
    SET status = p_status, updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_reservation_id AND status = 'reserved';
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_reserve_whatsapp_send_quota(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_reserve_whatsapp_send_quota(text, text, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.customer_support_finish_whatsapp_send_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_finish_whatsapp_send_quota(uuid, text) TO service_role;

COMMIT;
