-- The active Dashboard no longer calls this legacy SECURITY DEFINER RPC.
-- It exposed full sales aggregates to PUBLIC through PostgreSQL's default
-- function EXECUTE grant. Keep the function for historical compatibility,
-- but prevent API roles from invoking it.
REVOKE ALL ON FUNCTION public.get_dashboard_aggregates(timestamptz, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;
