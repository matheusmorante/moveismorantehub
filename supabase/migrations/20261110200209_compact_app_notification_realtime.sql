-- Send only the notification summary over a private Realtime channel.
-- The full order snapshot remains available through the existing authorized reads.
CREATE OR REPLACE FUNCTION private.broadcast_app_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id,
      'order_id', NEW.order_id,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.type,
      'schedule_text', NEW.schedule_text,
      'read', NEW.read,
      'created_at', NEW.created_at,
      'status', NEW.order_data->>'status'
    ),
    'notification',
    'app:notifications',
    true
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_app_notification()
  FROM PUBLIC, anon, authenticated;

CREATE POLICY "Authenticated users can receive app notification summaries"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (realtime.topic() = 'app:notifications');

CREATE TRIGGER app_notifications_compact_broadcast_after_insert
  AFTER INSERT ON public.app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION private.broadcast_app_notification();
