-- Receive Instagram Direct and Messenger messages in the existing support inbox.
-- Rollback: remove the social RPC/index/constraint and the added channel columns
-- only after confirming that no social conversations have been persisted.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS channel_account_id text,
  ADD COLUMN IF NOT EXISTS channel_contact_id text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_conversations'::regclass
      AND conname = 'whatsapp_conversations_channel_check'
  ) THEN
    ALTER TABLE public.whatsapp_conversations
      ADD CONSTRAINT whatsapp_conversations_channel_check
      CHECK (channel IN ('whatsapp', 'instagram', 'messenger')) NOT VALID;
  END IF;
END;
$migration$;

ALTER TABLE public.whatsapp_conversations
  VALIDATE CONSTRAINT whatsapp_conversations_channel_check;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_meta_social_identity_idx
  ON public.whatsapp_conversations (channel, channel_account_id, channel_contact_id)
  WHERE channel IN ('instagram', 'messenger')
    AND channel_account_id IS NOT NULL
    AND channel_contact_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.customer_support_receive_social_message(
  p_channel text,
  p_account_id text,
  p_contact_id text,
  p_contact_name text,
  p_direction text,
  p_message jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '10s'
SET lock_timeout = '5s'
AS $function$
DECLARE
  v_business_key text;
  v_contact_key text;
  v_contact_phone text;
  v_conversation public.whatsapp_conversations%ROWTYPE;
  v_existing_message public.whatsapp_messages%ROWTYPE;
  v_message_id uuid;
  v_message_key text := p_message->>'api_message_id';
  v_timestamp timestamptz;
  v_receipt jsonb;
BEGIN
  IF p_channel IS NULL OR p_channel NOT IN ('instagram', 'messenger')
    OR nullif(btrim(p_account_id), '') IS NULL
    OR nullif(btrim(p_contact_id), '') IS NULL
    OR p_direction IS NULL OR p_direction NOT IN ('inbound', 'outbound')
    OR jsonb_typeof(p_message) IS DISTINCT FROM 'object'
    OR nullif(btrim(v_message_key), '') IS NULL
    OR coalesce(p_message->>'message_type', '') NOT IN
      ('text','image','document','audio','video','interactive','sticker','location','contacts','unsupported')
    OR nullif(p_message->>'timestamp', '') IS NULL THEN
    RAISE EXCEPTION 'Mensagem social recebida inválida.' USING ERRCODE = '22023';
  END IF;

  v_timestamp := (p_message->>'timestamp')::timestamptz;
  IF NOT isfinite(v_timestamp) THEN
    RAISE EXCEPTION 'Data da mensagem social inválida.' USING ERRCODE = '22023';
  END IF;

  v_business_key := 'meta-social:' || p_channel || ':' || btrim(p_account_id);
  v_contact_key := btrim(p_contact_id);
  -- The trailing marker prevents social IDs made only of digits from being
  -- mistaken for a phone number by order/customer phone matching.
  v_contact_phone := 'social:' || p_channel || ':' || v_contact_key || ':no-phone';

  IF p_direction = 'inbound' THEN
    v_receipt := public.customer_support_receive_message(
      v_business_key,
      v_contact_key,
      v_contact_phone,
      p_contact_name,
      NULL,
      'unlinked',
      p_message
    );

    UPDATE public.whatsapp_conversations
    SET channel = p_channel,
        channel_account_id = btrim(p_account_id),
        channel_contact_id = v_contact_key
    WHERE id = (v_receipt->>'conversation_id')::uuid;

    UPDATE public.whatsapp_messages
    SET media_url = nullif(p_message->>'media_url', '')
    WHERE id = (v_receipt->>'message_id')::uuid
      AND media_url IS DISTINCT FROM nullif(p_message->>'media_url', '');

    RETURN v_receipt;
  END IF;

  SELECT * INTO v_existing_message
  FROM public.whatsapp_messages
  WHERE api_message_id = v_message_key;
  IF FOUND THEN
    IF v_existing_message.direction <> 'outbound'
      OR NOT EXISTS (
        SELECT 1 FROM public.whatsapp_conversations
        WHERE id = v_existing_message.conversation_id
          AND business_phone_number_id = v_business_key
          AND contact_wa_id = v_contact_key
      ) THEN
      RAISE EXCEPTION 'Identidade da mensagem social conflitante.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('conversation_id', v_existing_message.conversation_id,
      'message_id', v_existing_message.id, 'inserted', false, 'reopened', false);
  END IF;

  INSERT INTO public.whatsapp_conversations (
    business_phone_number_id, contact_wa_id, contact_phone, contact_name,
    customer_id, customer_link_status, last_message_at, unread_count, is_archived,
    channel, channel_account_id, channel_contact_id
  ) VALUES (
    v_business_key, v_contact_key, v_contact_phone, nullif(btrim(p_contact_name), ''),
    NULL, 'unlinked', v_timestamp, 0, false,
    p_channel, btrim(p_account_id), v_contact_key
  )
  ON CONFLICT (business_phone_number_id, contact_wa_id) DO NOTHING;

  SELECT * INTO STRICT v_conversation
  FROM public.whatsapp_conversations
  WHERE business_phone_number_id = v_business_key
    AND contact_wa_id = v_contact_key
  FOR UPDATE;

  INSERT INTO public.whatsapp_messages (
    conversation_id, api_message_id, direction, message_type, text_content,
    media_id, media_mime_type, media_url, media_filename, media_caption,
    reply_to_wamid, error_code, failure_reason, raw_payload, status, timestamp
  ) VALUES (
    v_conversation.id, v_message_key, 'outbound', p_message->>'message_type',
    p_message->>'text_content', p_message->>'media_id', p_message->>'media_mime_type',
    nullif(p_message->>'media_url', ''), p_message->>'media_filename', p_message->>'media_caption',
    p_message->>'reply_to_wamid', p_message->>'error_code', p_message->>'failure_reason',
    nullif(p_message->'raw_payload', 'null'::jsonb), 'sent', v_timestamp
  ) ON CONFLICT (api_message_id) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT * INTO STRICT v_existing_message
    FROM public.whatsapp_messages WHERE api_message_id = v_message_key;
    IF v_existing_message.direction <> 'outbound'
      OR v_existing_message.conversation_id <> v_conversation.id THEN
      RAISE EXCEPTION 'Identidade da mensagem social conflitante.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('conversation_id', v_conversation.id,
      'message_id', v_existing_message.id, 'inserted', false, 'reopened', false);
  END IF;

  UPDATE public.whatsapp_conversations
  SET contact_name = coalesce(nullif(btrim(p_contact_name), ''), contact_name),
      last_message_text = CASE WHEN v_timestamp >= last_message_at
        THEN p_message->>'text_content' ELSE last_message_text END,
      last_message_at = greatest(last_message_at, v_timestamp),
      is_archived = false,
      updated_at = now()
  WHERE id = v_conversation.id;

  RETURN jsonb_build_object('conversation_id', v_conversation.id,
    'message_id', v_message_id, 'inserted', true, 'reopened', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_receive_social_message(text,text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_receive_social_message(text,text,text,text,text,jsonb)
  TO service_role;

COMMIT;
