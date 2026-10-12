CREATE TABLE IF NOT EXISTS public.nfe_return_fiscal_emission_jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_order_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'retryable', 'reconciling', 'authorized', 'not_required', 'blocked')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text CHECK (error_code IS NULL OR length(error_code) <= 80),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_nfe_return_fiscal_emission_jobs_claim
  ON public.nfe_return_fiscal_emission_jobs (next_attempt_at, created_at)
  WHERE status IN ('pending', 'retryable', 'reconciling', 'processing');

ALTER TABLE public.nfe_return_fiscal_emission_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfe_return_fiscal_emission_jobs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_return_fiscal_emission_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  IF NEW.order_type <> 'return'
     OR NEW.status <> 'fulfilled'
     OR COALESCE(NEW.deleted, false)
     OR public.is_nfe_hml_test_order(NEW.id, NEW.status, NEW.deleted, NEW.order_data)
     OR public.test_artifact_is_test(pg_catalog.to_jsonb(NEW)) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.order_type = 'return'
     AND OLD.status = 'fulfilled' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.nfe_return_fiscal_emission_jobs (return_order_id)
  VALUES (NEW.id)
  ON CONFLICT (return_order_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enqueue_return_fiscal_emission_job ON public.orders;
CREATE TRIGGER enqueue_return_fiscal_emission_job
AFTER INSERT OR UPDATE OF status, order_type, deleted, order_data
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_return_fiscal_emission_job();

REVOKE ALL ON FUNCTION public.enqueue_return_fiscal_emission_job() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_return_fiscal_emission_job()
RETURNS TABLE (
  job_id uuid,
  return_order_id text,
  lease_token uuid,
  attempt_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
  WITH candidate AS (
    SELECT j.job_id
      FROM public.nfe_return_fiscal_emission_jobs AS j
     WHERE (
       j.status IN ('pending', 'retryable', 'reconciling')
       AND j.next_attempt_at <= pg_catalog.clock_timestamp()
     ) OR (
       j.status = 'processing'
       AND j.lease_expires_at < pg_catalog.clock_timestamp()
     )
     ORDER BY j.next_attempt_at, j.created_at
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.nfe_return_fiscal_emission_jobs AS j
       SET status = 'processing',
           attempt_count = j.attempt_count + 1,
           lease_token = gen_random_uuid(),
           lease_expires_at = pg_catalog.clock_timestamp() + interval '15 minutes',
           error_code = NULL,
           updated_at = pg_catalog.clock_timestamp()
      FROM candidate AS c
     WHERE j.job_id = c.job_id
     RETURNING j.job_id, j.return_order_id, j.lease_token, j.attempt_count
  )
  SELECT claimed.job_id, claimed.return_order_id, claimed.lease_token, claimed.attempt_count
    FROM claimed;
$function$;

CREATE OR REPLACE FUNCTION public.complete_return_fiscal_emission_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_status text,
  p_error_code text DEFAULT NULL,
  p_next_attempt_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_updated boolean;
BEGIN
  IF p_status IS NULL
     OR p_status NOT IN ('authorized', 'not_required', 'blocked', 'reconciling', 'retryable') THEN
    RAISE EXCEPTION 'Invalid return fiscal job status';
  END IF;
  IF p_error_code IS NOT NULL AND length(p_error_code) > 80 THEN
    RAISE EXCEPTION 'Return fiscal job error code is too long';
  END IF;

  UPDATE public.nfe_return_fiscal_emission_jobs
     SET status = p_status,
         error_code = p_error_code,
         next_attempt_at = CASE
           WHEN p_status IN ('retryable', 'reconciling')
             THEN COALESCE(p_next_attempt_at, pg_catalog.clock_timestamp() + interval '1 minute')
           ELSE pg_catalog.clock_timestamp()
         END,
         lease_token = NULL,
         lease_expires_at = NULL,
         updated_at = pg_catalog.clock_timestamp(),
         finished_at = CASE
           WHEN p_status IN ('authorized', 'not_required', 'blocked')
             THEN pg_catalog.clock_timestamp()
           ELSE NULL
         END
   WHERE job_id = p_job_id
     AND status = 'processing'
     AND lease_token = p_lease_token
     AND lease_expires_at > pg_catalog.clock_timestamp();

  v_updated := FOUND;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_return_fiscal_emission_job() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_return_fiscal_emission_job(uuid, uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_return_fiscal_emission_job() TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_return_fiscal_emission_job(uuid, uuid, text, text, timestamptz)
  TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_return_fiscal_emission_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, net, vault
AS $function$
DECLARE
  v_worker_secret text;
  v_api_url text;
BEGIN
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

REVOKE ALL ON FUNCTION public.dispatch_return_fiscal_emission_worker() FROM PUBLIC, anon, authenticated;

DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'dispatch-return-fiscal-emission-worker'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule(
    'dispatch-return-fiscal-emission-worker',
    '*/2 * * * *',
    'SELECT public.dispatch_return_fiscal_emission_worker();'
  );
END;
$schedule$;
