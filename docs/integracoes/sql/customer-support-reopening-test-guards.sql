-- PROPOSAL ONLY. Requires a new explicit fixture-operation authorization.
-- New scenario only: max 5 conversations and 68 messages/events total, of which
-- 5 are reserved for normal closure. Old scenarios retain their current guards.
-- No new schema/table/marker column, no Meta calls, no operational fixture.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
DO $preflight$
BEGIN
  IF to_regprocedure('public.customer_support_receive_message(text,text,text,text,text,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Install the reviewed inbound processor RPC before these fixture guards.';
  END IF;
END;
$preflight$;

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
  v_root_payload jsonb;
  v_inbound boolean := false;
  v_auto_reopen boolean := false;
  v_reopening_fixture boolean := false;
  v_message_count integer;
  v_limit integer := 202;
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
        -- Only the single derived new contact may acquire its first anchor
        -- from an existing, persisted, owned run. No arbitrary channel bypass.
        SELECT m.raw_payload INTO v_root_payload
        FROM public.whatsapp_messages m JOIN public.whatsapp_conversations c ON c.id=m.conversation_id
        WHERE c.business_phone_number_id=v_business AND m.raw_payload->'supportFixtureAnchor'='true'::jsonb
          AND m.raw_payload#>>'{testArtifact,scenarioKey}'='support-reopening'
          AND m.raw_payload#>>'{testArtifact,ownerId}'=auth.uid()::text
        ORDER BY (m.raw_payload->>'supportFixtureIndex')::integer LIMIT 1;
        IF v_root_payload IS NULL OR NEW.direction <> 'inbound' OR NOT EXISTS (
          SELECT 1 FROM public.whatsapp_conversations c WHERE c.id=v_conversation_id
            AND c.contact_wa_id='reopening:' || (v_root_payload#>>'{testArtifact,runId}') || ':new'
        ) THEN
          RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: identificação persistida ausente' USING ERRCODE = '42501';
        END IF;
        v_meta := v_root_payload->'testArtifact';
        NEW.raw_payload := coalesce(NEW.raw_payload, '{}'::jsonb) || jsonb_build_object(
          'supportFixtureAnchor', true, 'supportFixtureIndex', 5,
          'supportFixtureInputHash', v_root_payload->>'supportFixtureInputHash', 'testArtifact', v_meta);
      ELSE
        v_meta := NEW.raw_payload->'testArtifact';
      END IF;
    ELSIF v_anchor THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: identificação já existe' USING ERRCODE = '42501';
    END IF;
    v_identity := public.assert_test_artifact_identity(v_meta);
    IF v_business IS DISTINCT FROM 'test-artifact:' || (v_identity->>'runId')
      OR coalesce(v_meta->>'scenarioKey', '') !~ '^[a-z][a-z0-9_-]{2,63}
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
      OR (NEW.raw_payload->'testArtifact' IS NOT NULL AND NEW.raw_payload->'testArtifact' IS DISTINCT FROM v_meta) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: conteúdo ou vínculo da mensagem inválido' USING ERRCODE = '42501';
    END IF;
    v_reopening_fixture := v_meta->>'scenarioKey'='support-reopening';
    v_inbound := v_reopening_fixture AND NEW.direction='inbound';
    v_auto_reopen := v_reopening_fixture AND NEW.direction='outbound' AND NEW.message_type='system_event'
      AND NEW.raw_payload->>'reason'='inbound_message';
    IF v_inbound THEN
      IF NEW.message_type <> 'text' OR NEW.api_message_id IS NULL
        OR NEW.api_message_id NOT LIKE 'test-reopen:' || (v_identity->>'runId') || ':%'
        OR char_length(coalesce(btrim(NEW.text_content), '')) NOT BETWEEN 1 AND 2000
        OR NEW.media_id IS NOT NULL OR NEW.media_url IS NOT NULL OR NEW.media_mime_type IS NOT NULL
        OR NEW.media_filename IS NOT NULL OR NEW.media_caption IS NOT NULL OR NEW.reply_to_wamid IS NOT NULL THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: mensagem recebida de fixture inválida' USING ERRCODE = '42501';
      END IF;
    ELSIF v_auto_reopen THEN
      IF NEW.api_message_id IS NOT NULL OR NEW.media_id IS NOT NULL OR NEW.media_url IS NOT NULL
        OR NEW.raw_payload->>'event' IS DISTINCT FROM 'status' OR NEW.raw_payload->>'status' IS DISTINCT FROM 'open'
        OR NEW.raw_payload->>'author_name' IS DISTINCT FROM 'Sistema'
        OR NOT EXISTS (SELECT 1 FROM public.whatsapp_messages source
          WHERE source.id=(NEW.raw_payload->>'source_message_id')::uuid AND source.conversation_id=v_conversation_id
            AND source.direction='inbound' AND source.api_message_id=NEW.raw_payload->>'source_api_message_id'
            AND source.api_message_id LIKE 'test-reopen:' || (v_identity->>'runId') || ':%'
            AND source.raw_payload->'testArtifact'=v_meta) THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: evento de reabertura sem origem válida' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.raw_payload->>'author_id' IS DISTINCT FROM auth.uid()::text
        OR NEW.direction <> 'outbound' OR NEW.message_type NOT IN ('internal_note', 'system_event')
        OR NEW.api_message_id IS NOT NULL OR NEW.media_id IS NOT NULL OR NEW.media_url IS NOT NULL THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: conteúdo ou vínculo da mensagem inválido' USING ERRCODE = '42501';
      END IF;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('support-fixture:' || (v_identity->>'runId'), 0));
    IF v_reopening_fixture THEN
      v_limit := 68;
      IF (SELECT count(*) FROM public.whatsapp_conversations WHERE business_phone_number_id=v_business) > 5 THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_LIMIT: até cinco conversas neste cenário' USING ERRCODE = '22023';
      END IF;
    END IF;
    SELECT count(*) INTO v_message_count FROM public.whatsapp_messages m JOIN public.whatsapp_conversations c ON c.id=m.conversation_id
      WHERE c.business_phone_number_id=v_business;
    IF v_message_count >= v_limit OR (v_reopening_fixture AND v_message_count >= 63 AND NOT coalesce((
      NEW.direction='outbound' AND NEW.message_type='system_event' AND NEW.raw_payload->>'event'='status'
        AND NEW.raw_payload->>'status'='closed'), false)) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_LIMIT: limite autorizado de mensagens/eventos atingido' USING ERRCODE = '22023';
    END IF;
    IF v_inbound OR v_auto_reopen THEN
      -- Keep the synthetic customer's direction and the automatic author intact.
      NEW.raw_payload := coalesce(NEW.raw_payload, '{}'::jsonb) || jsonb_build_object('testArtifact', v_meta);
    ELSE
      SELECT coalesce(nullif(btrim(full_name), ''), 'Atendente'), role INTO v_actor, v_role
        FROM public.profiles WHERE id=auth.uid();
      NEW.raw_payload := coalesce(NEW.raw_payload, '{}'::jsonb) || jsonb_build_object('testArtifact', v_meta,
        'author_id', auth.uid(), 'author_name', v_actor, 'author_role', v_role);
    END IF;
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
  IF v_result->>'scenarioKey'='support-reopening' THEN
    RETURN v_result || jsonb_build_object('messageLimit', 68, 'workingMessageLimit', 63, 'cleanupReserved', 5);
  END IF;
  RETURN v_result || jsonb_build_object('messageLimit', 202);
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_test_receive_message(
  p_anchor_conversation_id uuid, p_message_key text, p_text text, p_timestamp timestamptz,
  p_new_contact boolean DEFAULT false, p_rollback boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
SET statement_timeout = '15s' SET lock_timeout = '5s'
AS $function$
DECLARE
  v_conversation public.whatsapp_conversations%ROWTYPE;
  v_meta jsonb;
  v_identity jsonb;
  v_receipt jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_administrator(), false) OR NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: operador administrador obrigatório' USING ERRCODE = '42501';
  END IF;
  IF p_anchor_conversation_id IS NULL OR coalesce(p_message_key, '') !~ '^[a-z0-9_-]{3,48}$'
    OR char_length(coalesce(btrim(p_text), '')) NOT BETWEEN 1 AND 2000
    OR p_timestamp IS NULL OR NOT isfinite(p_timestamp) OR p_new_contact IS NULL OR p_rollback IS NULL THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: recebimento de fixture inválido' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO STRICT v_conversation FROM public.whatsapp_conversations WHERE id=p_anchor_conversation_id;
  v_meta := public.customer_support_test_artifact_data(v_conversation.id);
  v_identity := public.assert_test_artifact_identity(v_meta);
  IF v_meta->>'scenarioKey' IS DISTINCT FROM 'support-reopening'
    OR v_conversation.business_phone_number_id IS DISTINCT FROM 'test-artifact:' || (v_identity->>'runId')
    OR v_conversation.customer_id IS NOT NULL THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: conversa fora da execução própria de reabertura' USING ERRCODE = '42501';
  END IF;
  v_receipt := public.customer_support_receive_message(
    v_conversation.business_phone_number_id,
    CASE WHEN p_new_contact THEN 'reopening:' || (v_identity->>'runId') || ':new' ELSE v_conversation.contact_wa_id END,
    CASE WHEN p_new_contact THEN 'fixture-inbound:' || (v_identity->>'runId') || ':new' ELSE v_conversation.contact_phone END,
    CASE WHEN p_new_contact THEN 'Teste reabertura nova ' || left(v_identity->>'runId', 8) ELSE v_conversation.contact_name END,
    NULL, 'unlinked',
    jsonb_build_object('api_message_id', 'test-reopen:' || (v_identity->>'runId') || ':' || p_message_key,
      'message_type', 'text', 'text_content', btrim(p_text), 'timestamp', p_timestamp));
  IF p_rollback THEN
    -- Deliberate failure after the complete shared processor function. The
    -- enclosing RPC transaction must roll back every child write, including
    -- creation, inbound row, counter, status and event.
    RAISE EXCEPTION 'SUPPORT_TEST_CONTROLLED_ROLLBACK' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_receipt;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_support_test_receive_message(uuid,text,text,timestamptz,boolean,boolean)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_test_receive_message(uuid,text,text,timestamptz,boolean,boolean)
  TO authenticated;
COMMIT;
