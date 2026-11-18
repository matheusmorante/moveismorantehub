BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_mark_prior_inbound_messages_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '10s'
SET lock_timeout = '5s'
AS $function$
DECLARE
  v_channel text;
  v_marked_count integer := 0;
BEGIN
  IF NEW.direction <> 'outbound'
    OR NEW.message_type = 'system_event'
    OR NEW.status NOT IN ('sent', 'delivered', 'read')
    OR NEW.raw_payload->>'test_sender' = 'true' THEN
    RETURN NEW;
  END IF;

  -- Delivery/read status callbacks must not repeat the read-through action.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.direction = 'outbound'
      AND OLD.status IN ('sent', 'delivered', 'read') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Serialize against inbound persistence, which locks this same conversation.
  SELECT conversation.channel INTO v_channel
  FROM public.whatsapp_conversations AS conversation
  WHERE conversation.id = NEW.conversation_id
  FOR UPDATE;

  IF NOT FOUND OR v_channel <> 'whatsapp' THEN
    RETURN NEW;
  END IF;

  UPDATE public.whatsapp_messages AS inbound
  SET status = 'read'
  WHERE inbound.conversation_id = NEW.conversation_id
    AND inbound.direction = 'inbound'
    AND inbound.status = 'received'
    AND inbound.timestamp <= NEW.timestamp;

  GET DIAGNOSTICS v_marked_count = ROW_COUNT;

  IF v_marked_count > 0 THEN
    UPDATE public.whatsapp_conversations
    SET unread_count = greatest(unread_count - v_marked_count, 0),
        updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_mark_prior_inbound_messages_read()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER customer_support_mark_prior_inbound_messages_read
  AFTER INSERT OR UPDATE OF status ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.customer_support_mark_prior_inbound_messages_read();

CREATE OR REPLACE FUNCTION public.customer_support_receive_message(
  p_business_phone_number_id text,
  p_contact_wa_id text,
  p_contact_phone text,
  p_contact_name text,
  p_customer_id text,
  p_customer_link_status text,
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
  v_conversation public.whatsapp_conversations%ROWTYPE;
  v_existing_message public.whatsapp_messages%ROWTYPE;
  v_message_id uuid;
  v_wamid text := p_message->>'api_message_id';
  v_timestamp timestamptz;
  v_last_outbound_at timestamptz;
  v_message_was_already_read boolean := false;
  v_previous_status text;
  v_tags text[];
  v_reopened boolean;
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
    RAISE EXCEPTION 'Mensagem recebida inválida.' USING ERRCODE = '22023';
  END IF;
  v_timestamp := (p_message->>'timestamp')::timestamptz;
  IF NOT isfinite(v_timestamp) THEN
    RAISE EXCEPTION 'Data da mensagem inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing_message FROM public.whatsapp_messages WHERE api_message_id = v_wamid;
  IF FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_conversations
      WHERE id = v_existing_message.conversation_id
        AND business_phone_number_id = p_business_phone_number_id AND contact_wa_id = p_contact_wa_id)
      OR v_existing_message.direction <> 'inbound' THEN
      RAISE EXCEPTION 'Identidade da mensagem recebida conflitante.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('conversation_id', v_existing_message.conversation_id,
      'message_id', v_existing_message.id, 'inserted', false, 'reopened', false);
  END IF;

  -- A concurrent first message may create this conversation while we wait.
  -- The unique channel/contact constraint resolves that race without a new ID.
  INSERT INTO public.whatsapp_conversations(business_phone_number_id, contact_wa_id,
    contact_phone, contact_name, customer_id, customer_link_status,
    last_message_at, last_customer_message_at, unread_count, is_archived)
  VALUES (p_business_phone_number_id, p_contact_wa_id, p_contact_phone, p_contact_name,
    p_customer_id, p_customer_link_status, v_timestamp, v_timestamp, 0, false)
  ON CONFLICT (business_phone_number_id, contact_wa_id) DO NOTHING;

  -- Same row lock as manual status/assignment and outbound read receipts.
  SELECT * INTO STRICT v_conversation FROM public.whatsapp_conversations
    WHERE business_phone_number_id = p_business_phone_number_id AND contact_wa_id = p_contact_wa_id
    FOR UPDATE;

  -- A delayed webhook for an older message must respect a reply sent from any device.
  IF v_conversation.channel = 'whatsapp' THEN
    SELECT max(outbound.timestamp) INTO v_last_outbound_at
    FROM public.whatsapp_messages AS outbound
    WHERE outbound.conversation_id = v_conversation.id
      AND outbound.direction = 'outbound'
      AND outbound.message_type <> 'system_event'
      AND outbound.status IN ('sent', 'delivered', 'read')
      AND outbound.raw_payload->>'test_sender' IS DISTINCT FROM 'true';

    v_message_was_already_read := v_last_outbound_at IS NOT NULL
      AND v_timestamp <= v_last_outbound_at;
  END IF;

  INSERT INTO public.whatsapp_messages(conversation_id, api_message_id, direction,
    message_type, text_content, media_id, media_mime_type, media_filename,
    media_caption, reply_to_wamid, error_code, failure_reason, raw_payload, status, timestamp)
  VALUES (v_conversation.id, v_wamid, 'inbound', p_message->>'message_type',
    p_message->>'text_content', p_message->>'media_id', p_message->>'media_mime_type',
    p_message->>'media_filename', p_message->>'media_caption', p_message->>'reply_to_wamid',
    p_message->>'error_code', p_message->>'failure_reason',
    nullif(p_message->'raw_payload', 'null'::jsonb),
    CASE WHEN v_message_was_already_read THEN 'read' ELSE 'received' END,
    v_timestamp)
  ON CONFLICT (api_message_id) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT * INTO STRICT v_existing_message FROM public.whatsapp_messages WHERE api_message_id = v_wamid;
    IF v_existing_message.conversation_id <> v_conversation.id OR v_existing_message.direction <> 'inbound' THEN
      -- Roll back a newly created conversation too if another contact/channel
      -- tried to reuse the same provider ID.
      RAISE EXCEPTION 'Identidade da mensagem recebida conflitante.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('conversation_id', v_conversation.id,
      'message_id', v_existing_message.id, 'inserted', false, 'reopened', false);
  END IF;

  v_previous_status := CASE
    WHEN v_conversation.is_archived OR 'status:closed' = ANY(coalesce(v_conversation.tags, ARRAY[]::text[])) THEN 'closed'
    WHEN 'status:snoozed' = ANY(coalesce(v_conversation.tags, ARRAY[]::text[])) THEN 'snoozed'
    ELSE 'open' END;
  v_reopened := NOT v_message_was_already_read AND v_previous_status <> 'open';
  v_tags := array_remove(array_remove(coalesce(v_conversation.tags, ARRAY[]::text[]), 'status:closed'), 'status:snoozed');

  UPDATE public.whatsapp_conversations SET
    contact_name = coalesce(nullif(btrim(p_contact_name), ''), contact_name),
    customer_id = CASE WHEN customer_id IS NULL AND customer_link_status <> 'manually_linked'
      THEN p_customer_id ELSE customer_id END,
    customer_link_status = CASE WHEN customer_id IS NULL AND customer_link_status <> 'manually_linked'
      THEN p_customer_link_status ELSE customer_link_status END,
    last_message_text = CASE WHEN v_timestamp >= last_message_at THEN p_message->>'text_content' ELSE last_message_text END,
    last_message_at = greatest(last_message_at, v_timestamp),
    last_customer_message_at = greatest(last_customer_message_at, v_timestamp),
    unread_count = unread_count + CASE WHEN v_message_was_already_read THEN 0 ELSE 1 END,
    is_archived = CASE WHEN v_message_was_already_read THEN is_archived ELSE false END,
    tags = CASE WHEN v_message_was_already_read THEN tags ELSE v_tags END,
    updated_at = now()
  WHERE id = v_conversation.id;

  IF v_reopened THEN
    INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
    VALUES (v_conversation.id, 'outbound', 'system_event',
      'Atendimento reaberto após nova mensagem do cliente.', 'received',
      jsonb_build_object('event', 'status', 'status', 'open', 'author_name', 'Sistema',
        'reason', 'inbound_message', 'previous_status', v_previous_status,
        'source_message_id', v_message_id, 'source_api_message_id', v_wamid), now());
  END IF;
  RETURN jsonb_build_object('conversation_id', v_conversation.id,
    'message_id', v_message_id, 'inserted', true, 'reopened', v_reopened);
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_receive_message(text,text,text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_receive_message(text,text,text,text,text,text,jsonb)
  TO service_role;

COMMIT;
