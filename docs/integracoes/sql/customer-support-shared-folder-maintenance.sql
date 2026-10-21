-- ATD-006-R1: owner selected maintenance by any authorized Central agent.
-- Preserve original author/identity; no row changes, fixtures or outbound calls.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

ALTER POLICY customer_support_inboxes_update ON public.customer_support_inboxes
  TO authenticated
  USING ((SELECT public.customer_support_can_view()))
  WITH CHECK ((SELECT public.customer_support_can_view()));
ALTER POLICY customer_support_inboxes_delete ON public.customer_support_inboxes
  TO authenticated
  USING ((SELECT public.customer_support_can_view()));

-- A table-wide UPDATE would override a column restriction. Rebuild the exact
-- browser privileges, without changing service_role or the existing RLS gate.
REVOKE ALL ON public.customer_support_inboxes FROM PUBLIC, anon, authenticated;
REVOKE ALL (id, name, criteria, created_by, created_at, updated_at)
  ON public.customer_support_inboxes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.customer_support_inboxes TO authenticated;
GRANT UPDATE (name, criteria, updated_at) ON public.customer_support_inboxes TO authenticated;

COMMIT;
