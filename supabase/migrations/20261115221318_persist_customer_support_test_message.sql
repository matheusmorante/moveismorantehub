BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.persist_customer_support_test_message(
  p_conversation_id uuid,
  p_api_message_id text,
  p_author_id uuid,
  p_author_name text,
  p_message text,
  p_sent_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_conversation_rows integer := 0;
BEGIN
  IF p_conversation_id IS NULL
    OR nullif(btrim(p_api_message_id), '') IS NULL
    OR p_author_id IS NULL
    OR p_message IS NULL
    OR p_sent_at IS NULL THEN
    RAISE EXCEPTION 'INVALID_CUSTOMER_SUPPORT_TEST_MESSAGE'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.whatsapp_messages (
    conversation_id,
    api_message_id,
    direction,
    message_type,
    text_content,
    status,
    raw_payload,
    timestamp
  ) VALUES (
    p_conversation_id,
    p_api_message_id,
    'outbound',
    'text',
    p_message,
    'sent',
    jsonb_build_object(
      'author_id', p_author_id::text,
      'author_name', left(p_author_name, 100),
      'test_sender', true
    ),
    p_sent_at
  );

  BEGIN
    UPDATE public.whatsapp_conversations
    SET last_message_text = p_message,
        last_message_at = p_sent_at,
        updated_at = p_sent_at
    WHERE id = p_conversation_id;

    GET DIAGNOSTICS v_conversation_rows = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'persisted', true,
      'conversation_updated', false
    );
  END;

  RETURN jsonb_build_object(
    'persisted', true,
    'conversation_updated', v_conversation_rows = 1
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_customer_support_test_message(
  uuid, text, uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_customer_support_test_message(
  uuid, text, uuid, text, text, timestamptz
) TO service_role;

COMMIT;
