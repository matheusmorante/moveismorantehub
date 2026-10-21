-- Domain conflicts must not request transient transaction retries.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

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
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_NOTES_CONFLICT: As notas foram alteradas por outro atendimento. Atualize antes de salvar.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.whatsapp_conversations SET internal_notes = p_notes, updated_at = now() WHERE id = p_conversation_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_provision_test_conversations(
  p_run_id uuid, p_scenario_key text, p_contact_names text[], p_history text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '20s'
AS $function$
DECLARE
  v_meta jsonb;
  v_manifest jsonb;
  v_hash text;
  v_conversation_id uuid;
  v_contact_name text;
  v_text text;
  v_index integer := 0;
  v_history_index integer;
  v_actor text;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_administrator(), false) OR NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: operador administrador autenticado obrigatório' USING ERRCODE = '42501';
  END IF;
  IF p_run_id IS NULL OR coalesce(p_scenario_key, '') !~ '^[a-z][a-z0-9_-]{2,63}$'
    OR coalesce(cardinality(p_contact_names), 0) NOT BETWEEN 1 AND 51
    OR coalesce(cardinality(p_history), 0) NOT BETWEEN 1 AND 81
    OR array_ndims(p_contact_names) IS DISTINCT FROM 1 OR array_lower(p_contact_names, 1) IS DISTINCT FROM 1
    OR array_ndims(p_history) IS DISTINCT FROM 1 OR array_lower(p_history, 1) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: execução, cenário ou quantidades inválidos' USING ERRCODE = '22023';
  END IF;
  FOREACH v_contact_name IN ARRAY p_contact_names LOOP
    IF v_contact_name IS NULL OR char_length(btrim(v_contact_name)) NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: nome obrigatório, até 100 caracteres' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  FOREACH v_text IN ARRAY p_history LOOP
    IF v_text IS NULL OR char_length(btrim(v_text)) NOT BETWEEN 1 AND 2000 THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: comentário deve ter entre 1 e 2000 caracteres' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  v_meta := jsonb_build_object('is_test', true, 'runId', p_run_id, 'ownerId', auth.uid(), 'scenarioKey', p_scenario_key);
  PERFORM public.assert_test_artifact_identity(v_meta);
  v_hash := md5(jsonb_build_object('contacts', p_contact_names, 'history', p_history, 'scenario', p_scenario_key)::text);
  PERFORM pg_advisory_xact_lock(hashtextextended('support-fixture:' || p_run_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.whatsapp_conversations WHERE business_phone_number_id = 'test-artifact:' || p_run_id::text) THEN
    v_manifest := public.customer_support_test_fixture_manifest(p_run_id);
    IF jsonb_array_length(v_manifest->'conversationIds') <> cardinality(p_contact_names)
      OR v_manifest->>'inputHash' IS DISTINCT FROM v_hash OR v_manifest->>'scenarioKey' IS DISTINCT FROM p_scenario_key THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_CONFLICT: execução existente não corresponde à solicitação' USING ERRCODE = 'P0001';
    END IF;
    RETURN v_manifest;
  END IF;
  SELECT coalesce(nullif(btrim(full_name), ''), 'Atendente') INTO v_actor FROM public.profiles WHERE id=auth.uid();
  FOREACH v_contact_name IN ARRAY p_contact_names LOOP
    v_index := v_index + 1;
    v_conversation_id := gen_random_uuid();
    INSERT INTO public.whatsapp_conversations(id, business_phone_number_id, contact_phone, contact_wa_id,
      contact_name, customer_link_status, last_message_text, last_message_at, unread_count, is_archived)
    VALUES (v_conversation_id, 'test-artifact:' || p_run_id::text, 'fixture:' || v_conversation_id::text,
      v_conversation_id::text, btrim(v_contact_name), 'unlinked', btrim(p_history[1]), now(), 0, false);
    INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
    VALUES (v_conversation_id, 'outbound', 'internal_note', btrim(p_history[1]), 'sent',
      jsonb_build_object('author_id', auth.uid(), 'author_name', v_actor, 'supportFixtureAnchor', true,
        'supportFixtureIndex', v_index, 'supportFixtureInputHash', v_hash, 'testArtifact', v_meta), now());
    IF v_index = 1 AND cardinality(p_history) > 1 THEN
      FOR v_history_index IN 2..cardinality(p_history) LOOP
        PERFORM public.customer_support_add_internal_note(v_conversation_id, p_history[v_history_index]);
      END LOOP;
    END IF;
  END LOOP;
  RETURN public.customer_support_test_fixture_manifest(p_run_id);
END;
$function$;
COMMIT;
