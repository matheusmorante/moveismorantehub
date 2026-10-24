-- Serialize automatic recipient-manifestation batches per CNPJ. The five-second
-- cooldown starts only after the previous SOAP response has been persisted.
BEGIN;

CREATE TABLE public.sefaz_manifestation_batch_control (
  cnpj text PRIMARY KEY CHECK (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  claim_token uuid,
  lease_until timestamptz,
  next_allowed_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((claim_token IS NULL) = (lease_until IS NULL))
);

ALTER TABLE public.sefaz_manifestation_batch_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sefaz_manifestation_batch_control FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sefaz_manifestation_batch_control TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_sefaz_manifestation_batch(p_cnpj text)
RETURNS TABLE(allowed boolean, claim_token uuid, next_allowed_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_cnpj text := pg_catalog.regexp_replace(
    pg_catalog.upper(pg_catalog.btrim(COALESCE(p_cnpj, ''))),
    '[^A-Z0-9]', '', 'g'
  );
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_token uuid := pg_catalog.gen_random_uuid();
  v_lease_until timestamptz;
  v_next_allowed_at timestamptz;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'SEFAZ_MANIFESTATION_BATCH_SERVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF v_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$' THEN
    RAISE EXCEPTION 'SEFAZ_MANIFESTATION_BATCH_CNPJ_INVALID' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sefaz_manifestation_batch_control AS control (
    cnpj, claim_token, lease_until, next_allowed_at, updated_at
  )
  VALUES (v_cnpj, v_token, v_now + interval '2 minutes', v_now, v_now)
  ON CONFLICT (cnpj) DO UPDATE
    SET claim_token = EXCLUDED.claim_token,
        lease_until = EXCLUDED.lease_until,
        updated_at = EXCLUDED.updated_at
    WHERE (control.lease_until IS NULL OR control.lease_until <= v_now)
      AND control.next_allowed_at <= v_now
  RETURNING control.lease_until, control.next_allowed_at
    INTO v_lease_until, v_next_allowed_at;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_token, v_next_allowed_at;
    RETURN;
  END IF;

  SELECT GREATEST(
    COALESCE(control.lease_until, v_now),
    control.next_allowed_at
  )
    INTO v_next_allowed_at
    FROM public.sefaz_manifestation_batch_control AS control
   WHERE control.cnpj = v_cnpj;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SEFAZ_MANIFESTATION_BATCH_RESERVATION_MISSING' USING ERRCODE = '40001';
  END IF;

  RETURN QUERY SELECT false, NULL::uuid, v_next_allowed_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_sefaz_manifestation_batch(
  p_cnpj text,
  p_claim_token uuid,
  p_cooldown_seconds integer
)
RETURNS TABLE(released boolean, next_allowed_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_cnpj text := pg_catalog.regexp_replace(
    pg_catalog.upper(pg_catalog.btrim(COALESCE(p_cnpj, ''))),
    '[^A-Z0-9]', '', 'g'
  );
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_next_allowed_at timestamptz;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'SEFAZ_MANIFESTATION_BATCH_SERVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF v_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$'
     OR p_claim_token IS NULL
     OR p_cooldown_seconds IS NULL
     OR p_cooldown_seconds NOT IN (0, 5, 3600) THEN
    RAISE EXCEPTION 'SEFAZ_MANIFESTATION_BATCH_FINISH_INVALID' USING ERRCODE = '22023';
  END IF;

  UPDATE public.sefaz_manifestation_batch_control AS control
     SET claim_token = NULL,
         lease_until = NULL,
         next_allowed_at = v_now + pg_catalog.make_interval(secs => p_cooldown_seconds),
         updated_at = v_now
   WHERE control.cnpj = v_cnpj
     AND control.claim_token = p_claim_token
  RETURNING control.next_allowed_at INTO v_next_allowed_at;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_next_allowed_at;
    RETURN;
  END IF;

  SELECT GREATEST(
    COALESCE(control.lease_until, v_now),
    control.next_allowed_at
  )
    INTO v_next_allowed_at
    FROM public.sefaz_manifestation_batch_control AS control
   WHERE control.cnpj = v_cnpj;
  RETURN QUERY SELECT false, v_next_allowed_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_sefaz_manifestation_batch(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_sefaz_manifestation_batch(text) TO service_role;
REVOKE ALL ON FUNCTION public.finish_sefaz_manifestation_batch(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_sefaz_manifestation_batch(text, uuid, integer) TO service_role;

COMMENT ON TABLE public.sefaz_manifestation_batch_control IS
  'Trava por CNPJ para lotes automáticos 210210: um envio por vez, 5 segundos após resposta e pausa de 1 hora quando cStat 656.';

COMMIT;

-- Rollback (control state only): DROP FUNCTION public.finish_sefaz_manifestation_batch(text, uuid, integer);
-- DROP FUNCTION public.reserve_sefaz_manifestation_batch(text); DROP TABLE public.sefaz_manifestation_batch_control;
