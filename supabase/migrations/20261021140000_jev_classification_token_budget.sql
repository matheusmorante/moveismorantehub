-- Global MoranteHub Jev input-token budget and short-lived duplicate-result cache.
-- The row stores only a SHA-256 fingerprint and the validated classification result.
CREATE TABLE public.jev_classification_usage (
  request_id UUID PRIMARY KEY,
  request_fingerprint TEXT NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL,
  reserved_input_tokens INTEGER NOT NULL
    CHECK (reserved_input_tokens BETWEEN 1 AND 2000),
  actual_input_tokens INTEGER
    CHECK (actual_input_tokens IS NULL OR actual_input_tokens >= 0),
  response JSONB
);

CREATE INDEX jev_classification_usage_created_at_idx
  ON public.jev_classification_usage (created_at);

CREATE INDEX jev_classification_usage_fingerprint_created_at_idx
  ON public.jev_classification_usage (request_fingerprint, created_at DESC);

ALTER TABLE public.jev_classification_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.jev_classification_usage FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reserve_jev_classification_tokens(
  p_request_id UUID,
  p_request_fingerprint TEXT,
  p_reserved_input_tokens INTEGER,
  p_ignore_cache BOOLEAN
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  used_input_tokens INTEGER,
  retry_after_seconds INTEGER,
  cached_response JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
  v_recent_created_at TIMESTAMPTZ;
  v_recent_response JSONB;
  v_used_tokens INTEGER := 0;
  v_retry_at TIMESTAMPTZ;
  v_limit_tokens CONSTANT INTEGER := 2000;
BEGIN
  IF p_request_id IS NULL
     OR p_request_fingerprint IS NULL
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_reserved_input_tokens IS NULL
     OR p_reserved_input_tokens < 1 THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT, 0, 60, NULL::JSONB;
    RETURN;
  END IF;

  IF p_reserved_input_tokens > v_limit_tokens THEN
    RETURN QUERY SELECT FALSE, 'request_too_large'::TEXT, 0, 60, NULL::JSONB;
    RETURN;
  END IF;

  -- Serializes reservations across Vercel instances; this transaction ends before Jev I/O.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('morantehub:jev-classification-input-token-budget', 0)
  );

  DELETE FROM public.jev_classification_usage
  WHERE created_at < v_now - INTERVAL '1 day';

  SELECT usage.created_at, usage.response
    INTO v_recent_created_at, v_recent_response
  FROM public.jev_classification_usage AS usage
  WHERE usage.request_fingerprint = p_request_fingerprint
    AND usage.created_at > v_now - INTERVAL '60 seconds'
  ORDER BY usage.created_at DESC
  LIMIT 1;

  IF FOUND AND v_recent_response IS NOT NULL AND NOT p_ignore_cache THEN
    SELECT COALESCE(SUM(COALESCE(usage.actual_input_tokens, usage.reserved_input_tokens)), 0)::INTEGER
      INTO v_used_tokens
    FROM public.jev_classification_usage AS usage
    WHERE usage.created_at > v_now - INTERVAL '60 seconds';

    RETURN QUERY SELECT TRUE, 'cached'::TEXT, v_used_tokens, 0, v_recent_response;
    RETURN;
  END IF;

  IF FOUND AND v_recent_response IS NULL THEN
    SELECT COALESCE(SUM(COALESCE(usage.actual_input_tokens, usage.reserved_input_tokens)), 0)::INTEGER
      INTO v_used_tokens
    FROM public.jev_classification_usage AS usage
    WHERE usage.created_at > v_now - INTERVAL '60 seconds';

    RETURN QUERY SELECT
      FALSE,
      'in_progress'::TEXT,
      v_used_tokens,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_recent_created_at + INTERVAL '60 seconds' - v_now)))::INTEGER),
      NULL::JSONB;
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(COALESCE(usage.actual_input_tokens, usage.reserved_input_tokens)), 0)::INTEGER,
    MIN(usage.created_at)
  INTO v_used_tokens, v_recent_created_at
  FROM public.jev_classification_usage AS usage
  WHERE usage.created_at > v_now - INTERVAL '60 seconds';

  IF v_used_tokens + p_reserved_input_tokens > v_limit_tokens THEN
    SELECT MIN(recent.expires_at)
      INTO v_retry_at
    FROM (
      SELECT
        usage.created_at + INTERVAL '60 seconds' AS expires_at,
        SUM(COALESCE(usage.actual_input_tokens, usage.reserved_input_tokens))
          OVER (ORDER BY usage.created_at, usage.request_id) AS expired_tokens
      FROM public.jev_classification_usage AS usage
      WHERE usage.created_at > v_now - INTERVAL '60 seconds'
    ) AS recent
    WHERE v_used_tokens - recent.expired_tokens + p_reserved_input_tokens <= v_limit_tokens;

    RETURN QUERY SELECT
      FALSE,
      'token_limit'::TEXT,
      v_used_tokens,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (COALESCE(v_retry_at, v_now + INTERVAL '60 seconds') - v_now)))::INTEGER
      ),
      NULL::JSONB;
    RETURN;
  END IF;

  INSERT INTO public.jev_classification_usage (
    request_id,
    request_fingerprint,
    created_at,
    reserved_input_tokens
  ) VALUES (
    p_request_id,
    p_request_fingerprint,
    v_now,
    p_reserved_input_tokens
  );

  RETURN QUERY SELECT TRUE, 'reserved'::TEXT, v_used_tokens + p_reserved_input_tokens, 0, NULL::JSONB;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_jev_classification_tokens(
  p_request_id UUID,
  p_actual_input_tokens INTEGER,
  p_response JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_request_id IS NULL
     OR p_actual_input_tokens IS NULL
     OR p_actual_input_tokens < 0
     OR p_actual_input_tokens > 1000000
     OR p_response IS NULL
     OR jsonb_typeof(p_response) <> 'object' THEN
    RETURN FALSE;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('morantehub:jev-classification-input-token-budget', 0)
  );

  UPDATE public.jev_classification_usage AS usage
  SET actual_input_tokens = p_actual_input_tokens,
      response = p_response
  WHERE usage.request_id = p_request_id
    AND usage.actual_input_tokens IS NULL
    AND usage.response IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_jev_classification_tokens(UUID, TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_jev_classification_tokens(UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_jev_classification_tokens(UUID, TEXT, INTEGER, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_jev_classification_tokens(UUID, INTEGER, JSONB) TO service_role;
