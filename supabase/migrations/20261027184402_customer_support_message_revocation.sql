BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_revoke_message(
  p_business_phone_number_id text,
  p_contact_wa_id text,
  p_original_message_id text,
  p_direction text,
  p_timestamp timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '10s'
SET lock_timeout = '5s'
AS $function$
DECLARE
  v_conversation public.whatsapp_conversations%ROWTYPE;
  v_message public.whatsapp_messages%ROWTYPE;
  v_message_id uuid;
  v_changed boolean := false;
  v_wamid text := nullif(btrim(p_original_message_id), '');
BEGIN
  IF nullif(btrim(p_business_phone_number_id), '') IS NULL
    OR nullif(btrim(p_contact_wa_id), '') IS NULL
    OR v_wamid IS NULL
    OR coalesce(p_direction, '') NOT IN ('inbound', 'outbound')
    OR p_timestamp IS NULL
    OR NOT isfinite(p_timestamp) THEN
    RAISE EXCEPTION 'Revogação de mensagem inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_conversation
  FROM public.whatsapp_conversations
  WHERE business_phone_number_id = p_business_phone_number_id
    AND contact_wa_id = p_contact_wa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('handled', true, 'found', false, 'changed', false);
  END IF;

  SELECT * INTO v_message
  FROM public.whatsapp_messages
  WHERE api_message_id = v_wamid
  FOR UPDATE;

  IF FOUND THEN
    IF v_message.conversation_id <> v_conversation.id
      OR v_message.direction <> p_direction
      OR (p_direction = 'outbound'
        AND v_message.raw_payload->>'source' IS DISTINCT FROM 'whatsapp_business_app') THEN
      RAISE EXCEPTION 'Identidade da mensagem revogada conflitante.' USING ERRCODE = '23505';
    END IF;

    v_message_id := v_message.id;
  ELSE
    INSERT INTO public.whatsapp_messages(
      conversation_id, api_message_id, direction, message_type, text_content,
      status, raw_payload, timestamp
    )
    VALUES (
      v_conversation.id, v_wamid, p_direction, 'deleted', 'Esta mensagem foi apagada',
      CASE WHEN p_direction = 'outbound' THEN 'sent' ELSE 'received' END,
      CASE WHEN p_direction = 'outbound'
        THEN jsonb_build_object('source', 'whatsapp_business_app', 'author_name', 'WhatsApp Business (celular)')
        ELSE NULL END,
      p_timestamp
    )
    ON CONFLICT (api_message_id) DO NOTHING
    RETURNING id INTO v_message_id;

    IF v_message_id IS NOT NULL THEN
      v_changed := true;
    ELSE
      SELECT * INTO STRICT v_message
      FROM public.whatsapp_messages
      WHERE api_message_id = v_wamid
      FOR UPDATE;

      IF v_message.conversation_id <> v_conversation.id
        OR v_message.direction <> p_direction
        OR (p_direction = 'outbound'
          AND v_message.raw_payload->>'source' IS DISTINCT FROM 'whatsapp_business_app') THEN
        RAISE EXCEPTION 'Identidade da mensagem revogada conflitante.' USING ERRCODE = '23505';
      END IF;

      v_message_id := v_message.id;
    END IF;
  END IF;

  IF NOT v_changed AND (
    v_message.message_type IS DISTINCT FROM 'deleted'
    OR v_message.text_content IS DISTINCT FROM 'Esta mensagem foi apagada'
    OR v_message.media_id IS NOT NULL
    OR v_message.media_mime_type IS NOT NULL
    OR v_message.media_url IS NOT NULL
    OR v_message.media_filename IS NOT NULL
    OR v_message.media_caption IS NOT NULL
    OR v_message.reply_to_message_id IS NOT NULL
    OR v_message.reply_to_wamid IS NOT NULL
  ) THEN
    UPDATE public.whatsapp_messages SET
      message_type = 'deleted',
      text_content = 'Esta mensagem foi apagada',
      media_id = NULL,
      media_mime_type = NULL,
      media_url = NULL,
      media_filename = NULL,
      media_caption = NULL,
      reply_to_message_id = NULL,
      reply_to_wamid = NULL
    WHERE id = v_message_id;
    v_changed := true;
  END IF;

  SELECT * INTO STRICT v_message
  FROM public.whatsapp_messages
  WHERE id = v_message_id;

  IF v_changed THEN
    UPDATE public.whatsapp_conversations SET
      last_message_text = 'Esta mensagem foi apagada',
      last_message_at = greatest(last_message_at, v_message.timestamp),
      updated_at = now()
    WHERE id = v_conversation.id
      AND v_message.timestamp >= last_message_at;
  END IF;

  RETURN jsonb_build_object(
    'handled', true,
    'found', true,
    'changed', v_changed,
    'conversation_id', v_conversation.id,
    'message_id', v_message_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_revoke_message(text, text, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_revoke_message(text, text, text, text, timestamptz)
  TO service_role;
COMMIT;
