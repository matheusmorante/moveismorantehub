-- Internal comments are timeline entries; the editable summary remains independent.
CREATE OR REPLACE FUNCTION public.customer_support_add_internal_note(p_conversation_id uuid, p_text text)
RETURNS SETOF public.whatsapp_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_actor text;
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'Sem acesso à Central.' USING ERRCODE = '42501';
  END IF;
  IF p_text IS NULL OR char_length(btrim(p_text)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Comentário deve ter entre 1 e 2000 caracteres.' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.whatsapp_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Atendente'), COALESCE(role, 'Colaborador')
    INTO v_actor, v_role FROM public.profiles WHERE id = auth.uid();
  UPDATE public.whatsapp_conversations SET updated_at = now() WHERE id = p_conversation_id;
  RETURN QUERY
    INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
    VALUES (
      p_conversation_id,
      'outbound',
      'internal_note',
      btrim(p_text),
      'sent',
      jsonb_build_object('author_id', auth.uid(), 'author_name', v_actor, 'author_role', v_role),
      now()
    )
    RETURNING *;
END;
$function$;
