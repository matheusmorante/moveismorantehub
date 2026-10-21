-- DEPLOYMENT GATE: run only after the frontend containing the five internal
-- command RPCs is deployed and authenticated owned-fixture checks have passed.
-- Do not enqueue this as an automatic migration before that deployment.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
REVOKE INSERT ON TABLE public.whatsapp_messages FROM authenticated;
ALTER POLICY whatsapp_messages_insert ON public.whatsapp_messages TO authenticated WITH CHECK (false);
REVOKE UPDATE ON TABLE public.whatsapp_conversations FROM authenticated;
REVOKE UPDATE (assigned_to, unread_count, is_archived, internal_notes, tags, updated_at) ON public.whatsapp_conversations FROM authenticated;
GRANT UPDATE (unread_count) ON public.whatsapp_conversations TO authenticated;
COMMIT;
