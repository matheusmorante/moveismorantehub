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
  v_limit CONSTANT BIGINT := 1800000;
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

  RETURN jsonb_build_object('usedMs', v_used, 'remainingMs', GREATEST(0, v_limit - v_used),
    'limitMs', v_limit, 'active', p_action IN ('start', 'pulse') AND v_used < v_limit, 'usageDate', v_day);
END;
$$;

REVOKE ALL ON FUNCTION public.gemini_live_quota(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gemini_live_quota(TEXT, UUID) TO authenticated;

COMMENT ON TABLE public.gemini_live_daily_usage IS
  'Gemini Live quota ledger: 30 minutes per authenticated user per America/Sao_Paulo day. Actual usage accounting requires server-observed audio stream intervals.';
