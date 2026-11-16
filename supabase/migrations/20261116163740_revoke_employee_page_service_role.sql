BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- This project has a direct default EXECUTE grant for service_role on newly
-- created functions. The employee directory is called with the signed-in
-- user's session and must remain limited to authenticated callers.
REVOKE ALL ON FUNCTION public.list_admin_employee_page(integer, integer, text, text)
  FROM service_role;

COMMIT;
