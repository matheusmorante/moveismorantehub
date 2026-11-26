BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.dispatch_return_fiscal_emission_worker()'::pg_catalog.regprocedure)
     IS DISTINCT FROM '3bd4372153197fc9540189cc187686b6' THEN
    RAISE EXCEPTION 'dispatch_return_fiscal_emission_worker changed since the reviewed definition';
  END IF;
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.claim_return_fiscal_emission_job()'::pg_catalog.regprocedure)
     IS DISTINCT FROM 'b8957ae682c31d6b9e4fcfbdf5ff9861' THEN
    RAISE EXCEPTION 'claim_return_fiscal_emission_job changed since the reviewed definition';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.dispatch_return_fiscal_emission_worker()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'net', 'vault'
AS $function$
DECLARE
  v_worker_secret text;
  v_api_url text;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  -- Mirror claim_return_fiscal_emission_job, including recovery of expired leases.
  -- The worker still claims atomically and handles concurrent reservations.
  IF NOT EXISTS (
    SELECT 1 FROM public.nfe_return_fiscal_emission_jobs AS j
    WHERE (j.status IN ('pending', 'retryable', 'reconciling') AND j.next_attempt_at <= v_now)
      OR (j.status = 'processing' AND j.lease_expires_at < v_now)
  ) THEN
    RETURN;
  END IF;

  SELECT decrypted_secret
    INTO v_worker_secret
    FROM vault.decrypted_secrets
   WHERE name = 'nfe_return_auto_worker_secret'
   LIMIT 1;
  SELECT decrypted_secret
    INTO v_api_url
    FROM vault.decrypted_secrets
   WHERE name = 'nfe_return_auto_api_url'
   LIMIT 1;

  IF COALESCE(v_worker_secret, '') = ''
     OR COALESCE(v_api_url, '') !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_api_url || '/api/nfe/automatic-return-transmission-worker',
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-nfe-return-worker-secret', v_worker_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
END;
$function$;

COMMIT;
