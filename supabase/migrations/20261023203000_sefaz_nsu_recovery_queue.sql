BEGIN;

CREATE TABLE IF NOT EXISTS public.sefaz_nsu_recovery_queue (
  cnpj text NOT NULL CHECK (cnpj ~ '^[0-9]{14}$'),
  range_start_nsu numeric(15, 0) NOT NULL CHECK (range_start_nsu > 0),
  range_end_nsu numeric(15, 0) NOT NULL,
  next_nsu numeric(15, 0) NOT NULL,
  environment text NOT NULL CHECK (environment IN ('production', 'homologation')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved')),
  result_status text CHECK (result_status IN ('found', 'not_found', 'non_nfe_document')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  claim_token uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cnpj, range_start_nsu),
  CHECK (range_end_nsu >= range_start_nsu),
  CHECK (next_nsu >= range_start_nsu AND next_nsu <= range_end_nsu)
);

CREATE INDEX IF NOT EXISTS sefaz_nsu_recovery_queue_pending_idx
  ON public.sefaz_nsu_recovery_queue (cnpj, next_attempt_at, range_start_nsu)
  WHERE status <> 'resolved';

ALTER TABLE public.sefaz_nsu_recovery_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sefaz_nsu_recovery_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sefaz_nsu_recovery_queue TO service_role;

CREATE OR REPLACE FUNCTION public.claim_sefaz_nsu_recovery(p_cnpj text)
RETURNS TABLE (
  range_start_nsu text,
  range_end_nsu text,
  requested_nsu text,
  environment text,
  claim_token uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g');
  v_now timestamptz := now();
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'SEFAZ_NSU_RECOVERY_SERVER_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF v_cnpj !~ '^[0-9]{14}$' THEN
    RAISE EXCEPTION 'SEFAZ_NSU_RECOVERY_CNPJ_INVALID' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT queue.cnpj, queue.range_start_nsu
    FROM public.sefaz_nsu_recovery_queue AS queue
    WHERE queue.cnpj = v_cnpj
      AND (
        (queue.status = 'pending' AND queue.next_attempt_at <= v_now)
        OR (queue.status = 'processing' AND queue.lease_until <= v_now)
      )
    ORDER BY queue.created_at, queue.range_start_nsu
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.sefaz_nsu_recovery_queue AS queue
  SET status = 'processing',
      attempt_count = queue.attempt_count + 1,
      claim_token = gen_random_uuid(),
      lease_until = v_now + interval '10 minutes',
      updated_at = v_now
  FROM candidate
  WHERE queue.cnpj = candidate.cnpj
    AND queue.range_start_nsu = candidate.range_start_nsu
  RETURNING
    lpad(queue.range_start_nsu::text, 15, '0'),
    lpad(queue.range_end_nsu::text, 15, '0'),
    lpad(queue.next_nsu::text, 15, '0'),
    queue.environment,
    queue.claim_token;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_sefaz_nsu_recovery(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sefaz_nsu_recovery(text) TO service_role;

COMMENT ON FUNCTION public.reserve_sefaz_direct_consult(text) IS
  'Reserva atomicamente uma consulta pontual da NFeDistribuicaoDFe por CNPJ a cada cinco minutos; usado pela recuperação consNSU e mantido para compatibilidade durante a retirada do consChNFe na interface.';

COMMIT;
