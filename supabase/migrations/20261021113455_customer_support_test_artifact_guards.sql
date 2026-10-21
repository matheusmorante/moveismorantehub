-- Authorized bounded fixture preparation; preserve operational rows and privileges.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_test_artifact_data(p_conversation_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT m.raw_payload->'testArtifact' FROM public.whatsapp_messages m
  WHERE m.conversation_id = p_conversation_id AND m.raw_payload->'supportFixtureAnchor' = 'true'::jsonb
  LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.customer_support_test_artifact_data(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_support_guard_test_artifact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_meta jsonb;
  v_old_meta jsonb;
  v_identity jsonb;
  v_business text;
  v_conversation_id uuid;
  v_anchor boolean;
  v_actor text;
  v_role text;
BEGIN
  IF TG_TABLE_NAME = 'customer_support_inboxes' THEN
    IF TG_OP <> 'INSERT' THEN v_old_meta := OLD.criteria->'testArtifact'; END IF;
    IF TG_OP <> 'DELETE' THEN v_meta := NEW.criteria->'testArtifact'; ELSE v_meta := v_old_meta; END IF;
    IF v_old_meta IS NOT NULL AND TG_OP = 'UPDATE' THEN
      IF v_meta IS NOT NULL AND v_meta IS DISTINCT FROM v_old_meta THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: identidade da pasta não pode mudar' USING ERRCODE = '42501';
      END IF;
      v_meta := v_old_meta;
      NEW.criteria := jsonb_set(NEW.criteria, '{testArtifact}', v_meta);
    ELSIF TG_OP = 'UPDATE' AND v_meta IS NOT NULL THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: pasta operacional não pode virar fixture' USING ERRCODE = '42501';
    END IF;
    IF v_meta IS NOT NULL THEN
      v_identity := public.assert_test_artifact_identity(v_meta);
      IF v_meta->'is_test' IS DISTINCT FROM 'true'::jsonb
        OR coalesce(v_meta->>'scenarioKey', '') !~ '^[a-z][a-z0-9_-]{2,63}$'
        OR (TG_OP <> 'DELETE' AND NEW.created_by IS DISTINCT FROM auth.uid())
        OR (TG_OP <> 'INSERT' AND OLD.created_by IS DISTINCT FROM auth.uid()) THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: pasta exige autor e execução válidos' USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'whatsapp_conversations' THEN
    v_business := OLD.business_phone_number_id;
    IF v_business NOT LIKE 'test-artifact:%' THEN
      IF TG_OP = 'UPDATE' AND NEW.business_phone_number_id LIKE 'test-artifact:%' THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: conversa operacional não pode virar fixture' USING ERRCODE = '42501';
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END IF;
    v_meta := public.customer_support_test_artifact_data(OLD.id);
    v_identity := public.assert_test_artifact_identity(v_meta);
    IF v_business IS DISTINCT FROM 'test-artifact:' || (v_identity->>'runId') THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: vínculo da conversa inválido' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_RETAINED: arquive a conversa para preservar o histórico' USING ERRCODE = '42501';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.business_phone_number_id IS DISTINCT FROM OLD.business_phone_number_id
      OR NEW.contact_wa_id IS DISTINCT FROM OLD.contact_wa_id OR NEW.contact_phone IS DISTINCT FROM OLD.contact_phone
      OR NEW.customer_id IS NOT NULL THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: identidade e vínculos operacionais protegidos' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN v_conversation_id := NEW.conversation_id;
    ELSE v_conversation_id := OLD.conversation_id; END IF;
    SELECT business_phone_number_id INTO v_business FROM public.whatsapp_conversations WHERE id = v_conversation_id;
    IF TG_OP = 'UPDATE' AND NEW.conversation_id IS DISTINCT FROM OLD.conversation_id AND
      (v_business LIKE 'test-artifact:%' OR EXISTS (SELECT 1 FROM public.whatsapp_conversations
        WHERE id=NEW.conversation_id AND business_phone_number_id LIKE 'test-artifact:%')) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: mensagem não pode trocar de conversa' USING ERRCODE = '42501';
    END IF;
    IF coalesce(v_business, '') NOT LIKE 'test-artifact:%' THEN
      IF (TG_OP <> 'DELETE' AND NEW.raw_payload->'testArtifact' IS NOT NULL)
        OR (TG_OP <> 'INSERT' AND OLD.raw_payload->'testArtifact' IS NOT NULL) THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: mensagem não pertence a uma conversa sintética' USING ERRCODE = '42501';
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END IF;
    IF TG_OP <> 'INSERT' THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_RETAINED: mensagens e identificação são imutáveis' USING ERRCODE = '42501';
    END IF;
    PERFORM 1 FROM public.whatsapp_conversations WHERE id = v_conversation_id FOR UPDATE;
    v_meta := public.customer_support_test_artifact_data(v_conversation_id);
    v_anchor := NEW.raw_payload->'supportFixtureAnchor' = 'true'::jsonb;
    IF v_meta IS NULL THEN
      IF v_anchor IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: identificação persistida ausente' USING ERRCODE = '42501';
      END IF;
      v_meta := NEW.raw_payload->'testArtifact';
    ELSIF v_anchor THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: identificação já existe' USING ERRCODE = '42501';
    END IF;
    v_identity := public.assert_test_artifact_identity(v_meta);
    IF v_business IS DISTINCT FROM 'test-artifact:' || (v_identity->>'runId')
      OR coalesce(v_meta->>'scenarioKey', '') !~ '^[a-z][a-z0-9_-]{2,63}$'
      OR (NEW.raw_payload->'testArtifact' IS NOT NULL AND NEW.raw_payload->'testArtifact' IS DISTINCT FROM v_meta)
      OR NEW.raw_payload->>'author_id' IS DISTINCT FROM auth.uid()::text
      OR NEW.direction <> 'outbound' OR NEW.message_type NOT IN ('internal_note', 'system_event')
      OR NEW.api_message_id IS NOT NULL OR NEW.media_id IS NOT NULL OR NEW.media_url IS NOT NULL THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: conteúdo ou vínculo da mensagem inválido' USING ERRCODE = '42501';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('support-fixture:' || (v_identity->>'runId'), 0));
    IF (SELECT count(*) FROM public.whatsapp_messages m JOIN public.whatsapp_conversations c ON c.id=m.conversation_id
      WHERE c.business_phone_number_id = v_business) >= 151 THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_LIMIT: limite autorizado de mensagens/eventos atingido' USING ERRCODE = '22023';
    END IF;
    SELECT coalesce(nullif(btrim(full_name), ''), 'Atendente'), role INTO v_actor, v_role
      FROM public.profiles WHERE id=auth.uid();
    NEW.raw_payload := coalesce(NEW.raw_payload, '{}'::jsonb) || jsonb_build_object('testArtifact', v_meta,
      'author_id', auth.uid(), 'author_name', v_actor, 'author_role', v_role);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_support_guard_test_artifact() FROM PUBLIC, anon, authenticated;

CREATE UNIQUE INDEX customer_support_test_anchor_unique ON public.whatsapp_messages(conversation_id)
  WHERE raw_payload->'supportFixtureAnchor' = 'true'::jsonb;
CREATE UNIQUE INDEX customer_support_test_folder_run_unique ON public.customer_support_inboxes
  ((criteria#>>'{testArtifact,runId}'), (criteria#>>'{testArtifact,ownerId}'))
  WHERE criteria#>'{testArtifact,is_test}' = 'true'::jsonb;
CREATE TRIGGER customer_support_test_conversation_guard BEFORE UPDATE OR DELETE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.customer_support_guard_test_artifact();
CREATE TRIGGER customer_support_test_message_guard BEFORE INSERT OR UPDATE OR DELETE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.customer_support_guard_test_artifact();
CREATE TRIGGER customer_support_test_folder_guard BEFORE INSERT OR UPDATE OR DELETE ON public.customer_support_inboxes
  FOR EACH ROW EXECUTE FUNCTION public.customer_support_guard_test_artifact();

CREATE OR REPLACE FUNCTION public.customer_support_test_fixture_manifest(p_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_administrator(), false) OR NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: operador administrador autenticado obrigatório' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object('runId', p_run_id, 'ownerId', auth.uid(),
    'conversationIds', coalesce(jsonb_agg(c.id ORDER BY (m.raw_payload->>'supportFixtureIndex')::integer), '[]'::jsonb),
    'principalConversationId', (jsonb_agg(c.id ORDER BY (m.raw_payload->>'supportFixtureIndex')::integer))->0,
    'scenarioKey', min(m.raw_payload#>>'{testArtifact,scenarioKey}'),
    'inputHash', min(m.raw_payload->>'supportFixtureInputHash')) INTO v_result
  FROM public.whatsapp_conversations c JOIN public.whatsapp_messages m ON m.conversation_id=c.id
  WHERE c.business_phone_number_id = 'test-artifact:' || p_run_id::text
    AND m.raw_payload->'supportFixtureAnchor' = 'true'::jsonb
    AND m.raw_payload#>>'{testArtifact,ownerId}' = auth.uid()::text
    AND m.raw_payload#>>'{testArtifact,runId}' = p_run_id::text;
  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_support_test_fixture_manifest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_test_fixture_manifest(uuid) TO authenticated;

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
      RAISE EXCEPTION 'TEST_ARTIFACT_CONFLICT: execução existente não corresponde à solicitação' USING ERRCODE = '40001';
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
REVOKE ALL ON FUNCTION public.customer_support_provision_test_conversations(uuid, text, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_provision_test_conversations(uuid, text, text[], text[]) TO authenticated;
COMMIT;
