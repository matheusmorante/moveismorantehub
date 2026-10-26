-- Central: registra mensagens enviadas pelo WhatsApp Business app em números com Coexistence.
-- Expand-only. Rollback antes de remover: publique primeiro o webhook anterior; os registros ficam preservados.
-- Rollback: DROP FUNCTION public.customer_support_receive_message_echo(text,text,text,text,text,text,jsonb);
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_receive_message_echo(
  p_business_phone_number_id text,
  p_contact_wa_id text,
  p_contact_phone text,
  p_contact_name text,
  p_customer_id text,
  p_customer_link_status text,
  p_message jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
SET statement_timeout = '10s' SET lock_timeout = '5s'
AS $function$
DECLARE
  v_conversation public.whatsapp_conversations%ROWTYPE;
  v_existing_message public.whatsapp_messages%ROWTYPE;
  v_message_id uuid;
  v_wamid text := p_message->>'api_message_id';
  v_timestamp timestamptz;
BEGIN
  IF nullif(btrim(p_business_phone_number_id), '') IS NULL
    OR nullif(btrim(p_contact_wa_id), '') IS NULL
    OR nullif(btrim(p_contact_phone), '') IS NULL
    OR jsonb_typeof(p_message) IS DISTINCT FROM 'object'
    OR nullif(btrim(v_wamid), '') IS NULL
    OR coalesce(p_message->>'message_type', '') NOT IN
      ('text','image','document','audio','video','interactive','sticker','location','contacts','unsupported')
    OR nullif(p_message->>'timestamp', '') IS NULL
    OR coalesce(p_customer_link_status, '') NOT IN ('unlinked','ambiguous','auto_matched')
    OR (p_customer_id IS NOT NULL AND p_customer_link_status <> 'auto_matched')
    OR (p_customer_link_status = 'auto_matched' AND p_customer_id IS NULL) THEN
    RAISE EXCEPTION 'Mensagem enviada pelo app inválida.' USING ERRCODE = '22023';
  END IF;
  v_timestamp := (p_message->>'timestamp')::timestamptz;
  IF NOT isfinite(v_timestamp) THEN
    RAISE EXCEPTION 'Data da mensagem enviada pelo app inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing_message
  FROM public.whatsapp_messages
  WHERE api_message_id = v_wamid;
  IF FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.whatsapp_conversations
      WHERE id = v_existing_message.conversation_id
        AND business_phone_number_id = p_business_phone_number_id
        AND contact_wa_id = p_contact_wa_id
    ) OR v_existing_message.direction <> 'outbound'
      OR v_existing_message.raw_payload->>'source' IS DISTINCT FROM 'whatsapp_business_app' THEN
      RAISE EXCEPTION 'Identidade da mensagem enviada pelo app conflitante.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('conversation_id', v_existing_message.conversation_id,
      'message_id', v_existing_message.id, 'inserted', false);
  END IF;

  INSERT INTO public.whatsapp_conversations(
    business_phone_number_id, contact_wa_id, contact_phone, contact_name,
    customer_id, customer_link_status, last_message_at, last_message_text,
    unread_count, is_archived
  )
  VALUES (
    p_business_phone_number_id, p_contact_wa_id, p_contact_phone, p_contact_name,
    p_customer_id, p_customer_link_status, v_timestamp, p_message->>'text_content',
    0, false
  )
  ON CONFLICT (business_phone_number_id, contact_wa_id) DO NOTHING;

  SELECT * INTO STRICT v_conversation
  FROM public.whatsapp_conversations
  WHERE business_phone_number_id = p_business_phone_number_id
    AND contact_wa_id = p_contact_wa_id
  FOR UPDATE;

  INSERT INTO public.whatsapp_messages(
    conversation_id, api_message_id, direction, message_type, text_content,
    media_id, media_mime_type, media_filename, media_caption, reply_to_wamid,
    status, raw_payload, timestamp
  )
  VALUES (
    v_conversation.id, v_wamid, 'outbound', p_message->>'message_type', p_message->>'text_content',
    p_message->>'media_id', p_message->>'media_mime_type', p_message->>'media_filename',
    p_message->>'media_caption', p_message->>'reply_to_wamid', 'sent',
    jsonb_build_object('source', 'whatsapp_business_app', 'author_name', 'WhatsApp Business (celular)'),
    v_timestamp
  )
  ON CONFLICT (api_message_id) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT * INTO STRICT v_existing_message
    FROM public.whatsapp_messages
    WHERE api_message_id = v_wamid;
    IF v_existing_message.conversation_id <> v_conversation.id
      OR v_existing_message.direction <> 'outbound'
      OR v_existing_message.raw_payload->>'source' IS DISTINCT FROM 'whatsapp_business_app' THEN
      RAISE EXCEPTION 'Identidade da mensagem enviada pelo app conflitante.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('conversation_id', v_conversation.id,
      'message_id', v_existing_message.id, 'inserted', false);
  END IF;

  UPDATE public.whatsapp_conversations SET
    contact_name = coalesce(nullif(btrim(p_contact_name), ''), contact_name),
    customer_id = CASE WHEN customer_id IS NULL AND customer_link_status <> 'manually_linked'
      THEN p_customer_id ELSE customer_id END,
    customer_link_status = CASE WHEN customer_id IS NULL AND customer_link_status <> 'manually_linked'
      THEN p_customer_link_status ELSE customer_link_status END,
    last_message_text = CASE WHEN v_timestamp >= last_message_at
      THEN p_message->>'text_content' ELSE last_message_text END,
    last_message_at = greatest(last_message_at, v_timestamp),
    updated_at = now()
  WHERE id = v_conversation.id;

  RETURN jsonb_build_object('conversation_id', v_conversation.id,
    'message_id', v_message_id, 'inserted', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_receive_message_echo(text,text,text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_receive_message_echo(text,text,text,text,text,text,jsonb)
  TO service_role;
COMMIT;

