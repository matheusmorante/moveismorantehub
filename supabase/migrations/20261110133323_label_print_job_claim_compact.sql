CREATE FUNCTION public.claim_label_print_job_compact(p_agent_id uuid)
RETURNS TABLE (
  id uuid,
  category text,
  html text,
  asset_origin text,
  paper_width_mm numeric,
  paper_height_mm numeric,
  claim_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT agent.owner_id INTO v_owner_id
  FROM public.label_print_agents AS agent
  WHERE agent.id = p_agent_id AND agent.revoked_at IS NULL
  FOR SHARE;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.label_print_agents AS agent
  SET last_seen_at = clock_timestamp()
  WHERE agent.id = p_agent_id
    AND (agent.last_seen_at IS NULL OR agent.last_seen_at < clock_timestamp() - interval '30 seconds');

  RETURN QUERY
  WITH next_job AS (
    SELECT job.id
    FROM public.label_print_jobs AS job
    WHERE job.status = 'pending'
    ORDER BY job.created_at, job.id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.label_print_jobs AS job
  SET status = 'processing',
      agent_id = p_agent_id,
      claim_token = gen_random_uuid(),
      claimed_at = clock_timestamp(),
      attempts = job.attempts + 1
  FROM next_job
  WHERE job.id = next_job.id
  RETURNING job.id, job.category, job.html, job.asset_origin,
            job.paper_width_mm, job.paper_height_mm, job.claim_token;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_label_print_job_compact(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_label_print_job_compact(uuid) TO service_role;
