BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.app_notifications FROM anon;

ALTER POLICY "Allow anon read/write app_notifications"
  ON public.app_notifications
  RENAME TO "Allow authenticated read/write app_notifications";

ALTER POLICY "Allow authenticated read/write app_notifications"
  ON public.app_notifications
  TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE public.push_tokens FROM anon;

ALTER POLICY "Allow anon read/write push_tokens"
  ON public.push_tokens
  RENAME TO "Allow authenticated read/write push_tokens";

ALTER POLICY "Allow authenticated read/write push_tokens"
  ON public.push_tokens
  TO authenticated, service_role;

DROP POLICY IF EXISTS "mobile_can_manage_push_tokens"
  ON public.push_tokens;

COMMIT;
