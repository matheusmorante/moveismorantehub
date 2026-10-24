-- Prepared for the separately authorized positive-order support fixture.
-- No table/trigger changes; the existing guard gains one owner-bound scenario.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
DO $preflight$
BEGIN
  IF to_regprocedure('public.assert_test_artifact_link(jsonb,text,text)') IS NULL
    OR to_regprocedure('public.customer_support_can_view_commercial_info()') IS NULL
    OR to_regprocedure('public.create_test_artifact_order(uuid,text)') IS NULL
    OR to_regprocedure('public.customer_support_provision_test_conversations(uuid,text,text[],text[])') IS NULL
    OR to_regprocedure('public.customer_support_link_customer(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Install the reviewed test-artifact and commercial-permission helpers first.';
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
  v_positive_orders_fixture boolean := false;
  v_order_count integer;
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
      OR (NEW.customer_id IS NOT NULL AND (
        v_meta->>'scenarioKey' IS DISTINCT FROM 'support-positive-orders'
        OR NEW.customer_link_status IS DISTINCT FROM 'manually_linked'
        OR (OLD.customer_id IS NULL AND OLD.customer_link_status IS DISTINCT FROM 'unlinked')
        OR (OLD.customer_id IS NOT NULL AND (
          OLD.customer_link_status IS DISTINCT FROM 'manually_linked'
          OR OLD.customer_id IS DISTINCT FROM NEW.customer_id))
        OR v_identity->>'ownerId' IS DISTINCT FROM auth.uid()::text
        OR NOT public.customer_support_can_view_commercial_info()
      )) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: identidade e vínculos operacionais protegidos' USING ERRCODE = '42501';
    END IF;
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
      IF OLD.customer_id IS NOT NULL OR NEW.customer_id IS NULL
        OR OLD.customer_link_status IS DISTINCT FROM 'unlinked'
        OR NEW.customer_link_status IS DISTINCT FROM 'manually_linked' THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_IMMUTABLE: vínculo sintético só pode ser criado uma vez' USING ERRCODE = '42501';
      END IF;
      PERFORM public.assert_test_artifact_link(v_identity, 'people', NEW.customer_id);
      SELECT count(*) INTO v_order_count FROM public.orders AS order_row
      WHERE order_row.customer_id = NEW.customer_id
        AND order_row.order_data->>'is_test' = 'true'
        AND order_row.order_data#>>'{testArtifact,runId}' = v_identity->>'runId'
        AND order_row.order_data#>>'{testArtifact,ownerId}' = v_identity->>'ownerId'
        AND (order_row.deleted IS NULL OR order_row.deleted = false);
      IF v_order_count <> 1 THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: cliente deve ter exatamente um pedido desta execução' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.customer_id IS NOT NULL THEN
      PERFORM public.assert_test_artifact_link(v_identity, 'people', NEW.customer_id);
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
      OR coalesce(v_meta->>'scenarioKey', '') !~ '^[a-z][a-z0-9_-]{2,63}$'
      OR (NEW.raw_payload->'testArtifact' IS NOT NULL AND NEW.raw_payload->'testArtifact' IS DISTINCT FROM v_meta) THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: conteúdo ou vínculo da mensagem inválido' USING ERRCODE = '42501';
    END IF;
    v_reopening_fixture := v_meta->>'scenarioKey'='support-reopening';
    v_positive_orders_fixture := v_meta->>'scenarioKey'='support-positive-orders';
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
    IF v_positive_orders_fixture THEN
      v_limit := 2;
      IF (SELECT count(*) FROM public.whatsapp_conversations WHERE business_phone_number_id=v_business) <> 1 THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_LIMIT: uma conversa por execução de pedidos' USING ERRCODE = '22023';
      END IF;
      IF v_anchor AND NEW.raw_payload->>'supportFixtureIndex' IS DISTINCT FROM '1' THEN
        RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: âncora da fixture de pedidos inválida' USING ERRCODE = '42501';
      END IF;
      IF v_anchor THEN
        IF current_setting('morante.customer_support_order_fixture', true) IS DISTINCT FROM v_identity->>'runId' THEN
          RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: use o provisionador atômico de pedidos' USING ERRCODE = '42501';
        END IF;
        SELECT count(*) INTO v_order_count FROM public.orders AS order_row
        WHERE order_row.order_data->>'is_test' = 'true'
          AND order_row.order_data#>>'{testArtifact,runId}' = v_identity->>'runId'
          AND order_row.order_data#>>'{testArtifact,ownerId}' = v_identity->>'ownerId'
          AND (order_row.deleted IS NULL OR order_row.deleted = false);
        IF v_order_count <> 1 THEN
          RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: deve existir exatamente um pedido sintético próprio' USING ERRCODE = '42501';
        END IF;
      END IF;
    END IF;
    SELECT count(*) INTO v_message_count FROM public.whatsapp_messages m JOIN public.whatsapp_conversations c ON c.id=m.conversation_id
      WHERE c.business_phone_number_id=v_business;
    IF v_message_count >= v_limit
      OR (v_reopening_fixture AND v_message_count >= 63 AND NOT coalesce((
        NEW.direction='outbound' AND NEW.message_type='system_event' AND NEW.raw_payload->>'event'='status'
          AND NEW.raw_payload->>'status'='closed'), false))
      OR (v_positive_orders_fixture AND v_message_count >= 1 AND NOT coalesce((
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
  ELSIF v_result->>'scenarioKey'='support-positive-orders' THEN
    RETURN v_result || jsonb_build_object('conversationLimit', 1, 'messageLimit', 2, 'workingMessageLimit', 1, 'cleanupReserved', 1);
  END IF;
  RETURN v_result || jsonb_build_object('messageLimit', 202);
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_provision_test_order_conversation(p_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
SET statement_timeout = '20s' SET lock_timeout = '5s'
AS $function$
DECLARE
  v_order jsonb;
  v_fixture jsonb;
  v_conversation_id uuid;
  v_contact_name text;
  v_anchor_text text;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_administrator(), false)
    OR NOT public.customer_support_can_view()
    OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: administrador com acesso comercial obrigatório' USING ERRCODE = '42501';
  END IF;
  IF p_run_id IS NULL THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: runId obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('support-fixture:' || p_run_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.whatsapp_conversations
      WHERE business_phone_number_id = 'test-artifact:' || p_run_id::text)
    OR EXISTS (SELECT 1 FROM public.orders
      WHERE order_data->>'is_test' = 'true'
        AND order_data#>>'{testArtifact,runId}' = p_run_id::text)
    OR EXISTS (SELECT 1 FROM public.people
      WHERE full_address#>>'{testArtifact,runId}' = p_run_id::text) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_CONFLICT: runId já utilizado; inspecione os artefatos antes de qualquer retry' USING ERRCODE = '40001';
  END IF;

  PERFORM set_config('morante.customer_support_order_fixture', p_run_id::text, true);
  v_order := public.create_test_artifact_order(p_run_id, NULL);
  IF v_order->>'ownerId' IS DISTINCT FROM auth.uid()::text
    OR v_order->>'runId' IS DISTINCT FROM p_run_id::text
    OR nullif(v_order->>'personId', '') IS NULL
    OR nullif(v_order->>'orderId', '') IS NULL THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: pedido e cliente não correspondem à execução própria' USING ERRCODE = '42501';
  END IF;
  v_contact_name := 'Conversa pedido ' || left(p_run_id::text, 8);
  v_anchor_text := 'Âncora da fixture com pedido ' || left(p_run_id::text, 8);
  v_fixture := public.customer_support_provision_test_conversations(
    p_run_id, 'support-positive-orders', ARRAY[v_contact_name], ARRAY[v_anchor_text]);
  IF v_fixture->>'ownerId' IS DISTINCT FROM auth.uid()::text
    OR v_fixture->>'runId' IS DISTINCT FROM p_run_id::text
    OR v_fixture->>'scenarioKey' IS DISTINCT FROM 'support-positive-orders'
    OR coalesce(jsonb_array_length(v_fixture->'conversationIds'), 0) <> 1 THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_INVALID: manifesto da fixture não corresponde à execução' USING ERRCODE = '42501';
  END IF;
  v_conversation_id := (v_fixture->>'principalConversationId')::uuid;
  IF NOT public.customer_support_link_customer(v_conversation_id, v_order->>'personId') THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: vínculo do cliente sintético não foi persistido' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'runId', p_run_id,
    'ownerId', auth.uid(),
    'scenarioKey', 'support-positive-orders',
    'conversationId', v_conversation_id,
    'contactName', v_contact_name,
    'personId', v_order->>'personId',
    'orderId', v_order->>'orderId',
    'orderNumber', v_order->>'orderNumber',
    'conversationIds', v_fixture->'conversationIds',
    'messageLimit', 2,
    'cleanupReserved', 1
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_support_provision_test_order_conversation(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_provision_test_order_conversation(uuid) TO authenticated;
COMMIT;
