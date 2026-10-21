-- Reserve 51 persisted closure events for the authorized normal cleanup flow.
-- The owner explicitly authorized the 51 cleanup events on 2026-10-21.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

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
      WHERE c.business_phone_number_id = v_business) >= 202 THEN
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
  RETURN v_result || jsonb_build_object('messageLimit', 202);
END;
$function$;
COMMIT;
