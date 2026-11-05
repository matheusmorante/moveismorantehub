-- Existing rows start at epoch; only new/changed rows enter the incremental feed.
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS changed_at timestamptz NOT NULL DEFAULT '1970-01-01 00:00:00+00';
ALTER TABLE public.whatsapp_messages ALTER COLUMN changed_at SET DEFAULT clock_timestamp();
CREATE OR REPLACE FUNCTION public.stamp_support_message_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN NEW.changed_at := pg_catalog.clock_timestamp(); RETURN NEW; END;
$fn$;
CREATE OR REPLACE TRIGGER stamp_support_message_change BEFORE INSERT OR UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.stamp_support_message_change();
CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_changed_idx ON public.whatsapp_messages(conversation_id,changed_at,id);

CREATE OR REPLACE FUNCTION public.customer_support_message_changes(
  p_conversation_id uuid, p_since timestamptz DEFAULT NULL, p_known jsonb DEFAULT '{}'::jsonb,
  p_after_changed_at timestamptz DEFAULT NULL, p_after_id uuid DEFAULT NULL, p_until timestamptz DEFAULT NULL
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  WITH fence AS (SELECT COALESCE(p_until, pg_catalog.statement_timestamp()) AS watermark), candidates AS MATERIALIZED (
    SELECT m.* FROM public.whatsapp_messages m CROSS JOIN fence f
    WHERE m.conversation_id=p_conversation_id AND m.changed_at<=f.watermark
      AND (m.changed_at>=COALESCE(p_since-interval '2 minutes',f.watermark-interval '2 minutes') OR COALESCE(p_known,'{}'::jsonb) ? m.id::text)
      AND (p_known->>m.id::text)::timestamptz IS DISTINCT FROM m.changed_at
      AND (p_after_changed_at IS NULL OR (m.changed_at,m.id)>(p_after_changed_at,p_after_id))
    ORDER BY m.changed_at,m.id LIMIT 201
  ), selected AS (SELECT * FROM candidates ORDER BY changed_at,id LIMIT 200)
  SELECT pg_catalog.jsonb_build_object('messages',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.changed_at,s.id) FROM selected s),'[]'::jsonb),
    'watermark',(SELECT watermark FROM fence),'hasMore',(SELECT pg_catalog.count(*)>200 FROM candidates),
    'nextCursor',(SELECT pg_catalog.jsonb_build_object('changedAt',changed_at,'id',id) FROM selected ORDER BY changed_at DESC,id DESC LIMIT 1));
$fn$;

CREATE OR REPLACE FUNCTION public.list_app_notification_summaries(p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(n) ORDER BY n.created_at DESC,n.id),'[]'::jsonb) FROM (
    SELECT id,order_id,title,message,type,schedule_text,read,created_at FROM public.app_notifications a
    WHERE NOT public.test_artifact_is_test(pg_catalog.to_jsonb(a))
    ORDER BY created_at DESC,id LIMIT LEAST(50,GREATEST(1,COALESCE(p_limit,50)))
  ) n;
$fn$;
REVOKE ALL ON FUNCTION public.stamp_support_message_change(),
  public.customer_support_message_changes(uuid,timestamptz,jsonb,timestamptz,uuid,timestamptz),
  public.list_app_notification_summaries(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_support_message_changes(uuid,timestamptz,jsonb,timestamptz,uuid,timestamptz),
  public.list_app_notification_summaries(integer) TO authenticated,service_role;
