-- Capture the read watermark together with the first page, including empty conversations.
CREATE OR REPLACE FUNCTION public.customer_support_message_page(p_conversation_id uuid,p_limit integer DEFAULT 80)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  WITH selected AS (SELECT * FROM public.whatsapp_messages WHERE conversation_id=p_conversation_id
    ORDER BY timestamp DESC,id DESC LIMIT LEAST(80,GREATEST(1,COALESCE(p_limit,80))))
  SELECT pg_catalog.jsonb_build_object('messages',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.timestamp,m.id) FROM selected m),'[]'::jsonb),
    'watermark',pg_catalog.statement_timestamp());
$fn$;
REVOKE ALL ON FUNCTION public.customer_support_message_page(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_support_message_page(uuid,integer) TO authenticated,service_role;
