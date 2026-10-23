-- Protect only direct consChNFe lookups. distNSU keeps its own SEFAZ cooldown.
BEGIN;

CREATE TABLE public.sefaz_direct_consult_control (
  cnpj text PRIMARY KEY CHECK (cnpj ~ '^[0-9]{14}$'),
  next_allowed_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.sefaz_direct_consult_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sefaz_direct_consult_control FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sefaz_direct_consult_control TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_sefaz_direct_consult(p_cnpj text)
RETURNS TABLE(allowed boolean, next_allowed_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_cnpj text := pg_catalog.regexp_replace(pg_catalog.btrim(p_cnpj), '[^0-9]', '', 'g');
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_reserved_until timestamptz;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'SEFAZ_DIRECT_CONSULT_SERVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF v_cnpj IS NULL OR v_cnpj !~ '^[0-9]{14}$' THEN
    RAISE EXCEPTION 'SEFAZ_DIRECT_CONSULT_CNPJ_INVALID' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sefaz_direct_consult_control AS existing_row(cnpj, next_allowed_at, updated_at)
  VALUES (v_cnpj, v_now + interval '5 minutes', v_now)
  ON CONFLICT (cnpj) DO UPDATE
    SET next_allowed_at = EXCLUDED.next_allowed_at,
        updated_at = EXCLUDED.updated_at
    WHERE existing_row.next_allowed_at <= v_now
  RETURNING existing_row.next_allowed_at INTO v_reserved_until;

  IF FOUND THEN
    allowed := true;
    next_allowed_at := v_reserved_until;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT control.next_allowed_at
    INTO v_reserved_until
    FROM public.sefaz_direct_consult_control AS control
    WHERE control.cnpj = v_cnpj;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SEFAZ_DIRECT_CONSULT_RESERVATION_MISSING' USING ERRCODE = '40001';
  END IF;

  allowed := false;
  next_allowed_at := v_reserved_until;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_sefaz_direct_consult(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_sefaz_direct_consult(text) TO service_role;

COMMIT;
