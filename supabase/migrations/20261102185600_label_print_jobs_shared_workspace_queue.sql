CREATE INDEX label_print_jobs_pending_claim_idx
  ON public.label_print_jobs(created_at, id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.claim_label_print_job(p_agent_id uuid)
RETURNS SETOF public.label_print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.label_print_agents
  WHERE id = p_agent_id AND revoked_at IS NULL
  FOR SHARE;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.label_print_agents
  SET last_seen_at = clock_timestamp()
  WHERE id = p_agent_id
    AND (last_seen_at IS NULL OR last_seen_at < clock_timestamp() - interval '30 seconds');

  RETURN QUERY
  WITH next_job AS (
    SELECT id
    FROM public.label_print_jobs
    WHERE status = 'pending'
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.label_print_jobs AS job
  SET status = 'processing',
      agent_id = p_agent_id,
      claim_token = gen_random_uuid(),
      claimed_at = clock_timestamp(),
      attempts = attempts + 1
  FROM next_job
  WHERE job.id = next_job.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_label_print_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_label_print_job(uuid) TO service_role;
