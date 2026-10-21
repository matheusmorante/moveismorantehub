-- Internal support commands derive identity/time on the server and keep history
-- in the same transaction as the conversation change. No outbound API is used.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_assign_conversation(p_conversation_id uuid, p_assignee_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'
AS $function$
DECLARE
  v_current uuid;
  v_actor text;
  v_assignee text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN RAISE EXCEPTION 'Sem acesso à Central.' USING ERRCODE = '42501'; END IF;
  IF p_assignee_id IS NOT NULL AND NOT private.customer_support_profile_has_permission(
    p_assignee_id, 'viewCustomerSupport', ARRAY['manager','seller','deliverer']::text[]
  ) THEN RAISE EXCEPTION 'Atendente sem acesso à Central.' USING ERRCODE = '22023'; END IF;
  SELECT assigned_to INTO v_current FROM public.whatsapp_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF v_current IS NOT DISTINCT FROM p_assignee_id THEN RETURN true; END IF;
  SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Atendente') INTO v_actor FROM public.profiles WHERE id = auth.uid();
  SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Atendente') INTO v_assignee FROM public.profiles WHERE id = p_assignee_id;
  UPDATE public.whatsapp_conversations SET assigned_to = p_assignee_id, updated_at = now() WHERE id = p_conversation_id;
  INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
  VALUES (p_conversation_id, 'outbound', 'system_event',
    CASE WHEN p_assignee_id IS NULL THEN 'Atendimento retornado para a fila geral por ' || v_actor
      ELSE 'Atendimento atribuído a ' || v_assignee || ' por ' || v_actor END,
    'received', jsonb_build_object('author_id', auth.uid(), 'author_name', v_actor, 'event', 'assignment', 'assignee_id', p_assignee_id), now());
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_set_conversation_status(p_conversation_id uuid, p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'
AS $function$
DECLARE
  v_conversation public.whatsapp_conversations%ROWTYPE;
  v_current text;
  v_tags text[];
  v_actor text;
  v_label text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN RAISE EXCEPTION 'Sem acesso à Central.' USING ERRCODE = '42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('open','closed','snoozed') THEN RAISE EXCEPTION 'Status inválido.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_conversation FROM public.whatsapp_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'P0002'; END IF;
  v_current := CASE WHEN v_conversation.is_archived OR 'status:closed' = ANY(COALESCE(v_conversation.tags, ARRAY[]::text[])) THEN 'closed'
    WHEN 'status:snoozed' = ANY(COALESCE(v_conversation.tags, ARRAY[]::text[])) THEN 'snoozed' ELSE 'open' END;
  IF v_current = p_status THEN RETURN true; END IF;
  SELECT COALESCE(array_agg(tag), ARRAY[]::text[]) INTO v_tags
    FROM unnest(COALESCE(v_conversation.tags, ARRAY[]::text[])) AS tags(tag) WHERE tag NOT LIKE 'status:%';
  IF p_status <> 'open' THEN v_tags := array_append(v_tags, 'status:' || p_status); END IF;
  SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Atendente') INTO v_actor FROM public.profiles WHERE id = auth.uid();
  v_label := CASE p_status WHEN 'closed' THEN 'Fechado / Resolvido' WHEN 'snoozed' THEN 'Adiado' ELSE 'Reaberto' END;
  UPDATE public.whatsapp_conversations SET is_archived = (p_status = 'closed'), tags = v_tags, updated_at = now() WHERE id = p_conversation_id;
  INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
  VALUES (p_conversation_id, 'outbound', 'system_event', 'Status do atendimento alterado para "' || v_label || '" por ' || v_actor,
    'received', jsonb_build_object('author_id', auth.uid(), 'author_name', v_actor, 'event', 'status', 'status', p_status), now());
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_add_internal_note(p_conversation_id uuid, p_text text)
RETURNS SETOF public.whatsapp_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'
AS $function$
DECLARE
  v_actor text;
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN RAISE EXCEPTION 'Sem acesso à Central.' USING ERRCODE = '42501'; END IF;
  IF p_text IS NULL OR char_length(btrim(p_text)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Comentário deve ter entre 1 e 2000 caracteres.' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM public.whatsapp_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'P0002'; END IF;
  SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Atendente'), COALESCE(role, 'Colaborador') INTO v_actor, v_role FROM public.profiles WHERE id = auth.uid();
  -- Preserve the existing latest-note summary contract, in the same transaction.
  UPDATE public.whatsapp_conversations SET internal_notes = btrim(p_text), updated_at = now() WHERE id = p_conversation_id;
  RETURN QUERY INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
    VALUES (p_conversation_id, 'outbound', 'internal_note', btrim(p_text), 'sent',
      jsonb_build_object('author_id', auth.uid(), 'author_name', v_actor, 'author_role', v_role), now()) RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_set_internal_notes(p_conversation_id uuid, p_notes text, p_expected_notes text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'
AS $function$
DECLARE v_notes text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN RAISE EXCEPTION 'Sem acesso à Central.' USING ERRCODE = '42501'; END IF;
  IF p_notes IS NULL OR char_length(p_notes) > 2000 THEN RAISE EXCEPTION 'Notas devem ter no máximo 2000 caracteres.' USING ERRCODE = '22023'; END IF;
  SELECT internal_notes INTO v_notes FROM public.whatsapp_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF COALESCE(v_notes, '') IS DISTINCT FROM COALESCE(p_expected_notes, '') THEN
    RAISE EXCEPTION 'As notas foram alteradas por outro atendimento. Atualize antes de salvar.' USING ERRCODE = '40001';
  END IF;
  UPDATE public.whatsapp_conversations SET internal_notes = p_notes, updated_at = now() WHERE id = p_conversation_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_update_tag(p_conversation_id uuid, p_tag text, p_remove boolean)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'
AS $function$
DECLARE
  v_tags text[];
  v_tag text := btrim(p_tag);
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN RAISE EXCEPTION 'Sem acesso à Central.' USING ERRCODE = '42501'; END IF;
  IF v_tag IS NULL OR char_length(v_tag) NOT BETWEEN 1 AND 40 OR lower(v_tag) LIKE 'status:%' OR p_remove IS NULL THEN
    RAISE EXCEPTION 'Marcador inválido ou reservado ao status do atendimento.' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(tags, ARRAY[]::text[]) INTO v_tags FROM public.whatsapp_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF p_remove THEN
    SELECT COALESCE(array_agg(tag), ARRAY[]::text[]) INTO v_tags FROM unnest(v_tags) AS tags(tag) WHERE lower(tag) <> lower(v_tag);
  ELSIF NOT EXISTS (SELECT 1 FROM unnest(v_tags) AS tags(tag) WHERE lower(tag) = lower(v_tag)) THEN
    v_tags := array_append(v_tags, v_tag);
  END IF;
  UPDATE public.whatsapp_conversations SET tags = v_tags, updated_at = now() WHERE id = p_conversation_id;
  RETURN v_tags;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_assign_conversation(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_set_conversation_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_add_internal_note(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_set_internal_notes(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_update_tag(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_assign_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_set_conversation_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_add_internal_note(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_set_internal_notes(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_update_tag(uuid, text, boolean) TO authenticated;

-- Expand first. Revoke legacy browser commands only after every active frontend
-- uses these RPCs; see the deployment-gated contract SQL in docs/integracoes/sql/.
COMMIT;
