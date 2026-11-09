-- Combine a leitura do cursor e a reserva do distNSU numa transação curta.
-- A função termina antes de qualquer chamada à ponte fiscal/SEFAZ.
BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_sefaz_nsu_sync_interval(
  p_cnpj text,
  p_environment text
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  last_nsu text,
  max_nsu text,
  next_allowed_sync_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_control public.sefaz_nsu_control%ROWTYPE;
  v_now timestamptz;
  v_next_allowed timestamptz;
  v_retry_at timestamptz;
  v_reserved_last_nsu text;
  v_reserved_max_nsu text;
  v_reserved_next_allowed timestamptz;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'SEFAZ_NSU_RESERVATION_SERVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_cnpj IS NULL OR pg_catalog.btrim(p_cnpj) = ''
     OR p_environment IS NULL
     OR p_environment NOT IN ('production', 'homologation') THEN
    RAISE EXCEPTION 'SEFAZ_NSU_RESERVATION_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;

  -- O bloqueio de linha serializa tentativas concorrentes. A transação é curta
  -- e encerrada ao responder esta chamada, antes de qualquer I/O externo.
  SELECT control.*
    INTO v_control
    FROM public.sefaz_nsu_control AS control
   WHERE control.id = 'default'
   FOR UPDATE;

  IF NOT FOUND THEN
    allowed := false;
    reason := 'not_found';
    last_nsu := '0';
    max_nsu := '0';
    next_allowed_sync_at := pg_catalog.clock_timestamp() + interval '1 hour';
    RETURN NEXT;
    RETURN;
  END IF;

  v_now := pg_catalog.clock_timestamp();

  IF v_control.status = 'syncing'
     AND v_control.last_sync_at IS NOT NULL
     AND v_now - v_control.last_sync_at < interval '3 minutes' THEN
    allowed := false;
    reason := 'syncing';
    last_nsu := COALESCE(v_control.last_nsu, '0');
    max_nsu := COALESCE(v_control.max_nsu, '0');
    next_allowed_sync_at := v_control.next_allowed_sync_at;
    RETURN NEXT;
    RETURN;
  END IF;

  v_next_allowed := GREATEST(
    COALESCE(v_control.next_allowed_sync_at, '-infinity'::timestamptz),
    COALESCE(v_control.last_sync_at + interval '1 hour', '-infinity'::timestamptz)
  );
  IF v_now < v_next_allowed THEN
    allowed := false;
    reason := 'cooldown';
    last_nsu := COALESCE(v_control.last_nsu, '0');
    max_nsu := COALESCE(v_control.max_nsu, '0');
    next_allowed_sync_at := v_next_allowed;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_control.status = 'rate_limited' THEN
    v_retry_at := COALESCE(v_control.last_sync_at, v_now) + interval '1 hour';
    IF v_retry_at > v_now THEN
      allowed := false;
      reason := 'rate_limited';
      last_nsu := COALESCE(v_control.last_nsu, '0');
      max_nsu := COALESCE(v_control.max_nsu, '0');
      next_allowed_sync_at := v_retry_at;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  UPDATE public.sefaz_nsu_control AS control
     SET cnpj = p_cnpj,
         status = 'syncing',
         last_sync_at = v_now,
         next_allowed_sync_at = v_now + interval '1 hour',
         environment = p_environment
   WHERE control.id = 'default'
     AND (
       control.status <> 'syncing'
       OR control.last_sync_at IS NULL
       OR control.last_sync_at < v_now - interval '3 minutes'
     )
     AND (
       control.next_allowed_sync_at IS NULL
       OR control.next_allowed_sync_at <= v_now
     )
  RETURNING control.last_nsu, control.max_nsu, control.next_allowed_sync_at
       INTO v_reserved_last_nsu, v_reserved_max_nsu, v_reserved_next_allowed;

  IF NOT FOUND THEN
    allowed := false;
    reason := 'reservation_conflict';
    last_nsu := COALESCE(v_control.last_nsu, '0');
    max_nsu := COALESCE(v_control.max_nsu, '0');
    next_allowed_sync_at := COALESCE(
      v_control.next_allowed_sync_at,
      v_now + interval '1 hour'
    );
    RETURN NEXT;
    RETURN;
  END IF;

  allowed := true;
  reason := 'reserved';
  last_nsu := COALESCE(v_reserved_last_nsu, '0');
  max_nsu := COALESCE(v_reserved_max_nsu, '0');
  next_allowed_sync_at := v_reserved_next_allowed;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_sefaz_nsu_sync_interval(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_sefaz_nsu_sync_interval(text, text)
  TO service_role;

COMMIT;
