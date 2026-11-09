-- Migration: 20261109070000_customer_support_silent_handoff.sql
-- Módulo: Central de Atendimento WhatsApp (Lizandro AI Agent)
-- Finalidade: Escalonamento Silencioso para Atendimento Humano (Silent Handoff),
--            estados estruturados da IA na conversa ('active', 'needs_human', 'human_active', 'paused'),
--            registro de motivo/timestamp do handoff e atualização de RPCs de consulta e turno.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- 1. Colunas de Estado da IA em whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ai_status TEXT NOT NULL DEFAULT 'active'
  CHECK (ai_status IN ('active', 'needs_human', 'human_active', 'paused'));

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ai_handoff_reason TEXT;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ai_handoff_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_ai_status
  ON public.whatsapp_conversations(ai_status);

-- 2. RPC: Alteração controlada do estado da IA na conversa (Assumir atendimento, pausar, reativar)
CREATE OR REPLACE FUNCTION public.customer_support_set_conversation_ai_status(
  p_conversation_id UUID,
  p_ai_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_assign_to_current_user BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_assignee UUID := NULL;
  v_conv public.whatsapp_conversations%ROWTYPE;
BEGIN
  IF p_ai_status NOT IN ('active', 'needs_human', 'human_active', 'paused') THEN
    RAISE EXCEPTION 'Status de IA inválido: %', p_ai_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_conv
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'conversation_not_found');
  END IF;

  IF p_assign_to_current_user AND auth.uid() IS NOT NULL THEN
    v_assignee := auth.uid();
  ELSE
    v_assignee := v_conv.assigned_to;
  END IF;

  UPDATE public.whatsapp_conversations
  SET ai_status = p_ai_status,
      ai_handoff_reason = CASE
        WHEN p_ai_status = 'active' THEN NULL
        ELSE coalesce(p_reason, ai_handoff_reason)
      END,
      ai_handoff_at = CASE
        WHEN p_ai_status = 'needs_human' THEN v_now
        WHEN p_ai_status = 'active' THEN NULL
        ELSE ai_handoff_at
      END,
      assigned_to = v_assignee,
      updated_at = v_now
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'ai_status', p_ai_status,
    'assigned_to', v_assignee
  );
END;
$$;

-- 3. Atualizar Aquisição Atômica de Turno para respeitar ai_status
CREATE OR REPLACE FUNCTION public.customer_support_acquire_ai_turn(
  p_conversation_id UUID,
  p_trigger_wamid TEXT,
  p_trigger_message_id UUID,
  p_lease_seconds INT DEFAULT 60,
  p_model_requested TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_existing public.whatsapp_ai_agent_turns%ROWTYPE;
  v_token UUID := gen_random_uuid();
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_expires_at TIMESTAMPTZ := v_now + (coalesce(p_lease_seconds, 60) || ' seconds')::interval;
  v_last_customer_msg_at TIMESTAMPTZ;
  v_assigned_to UUID;
  v_is_archived BOOLEAN;
  v_tags TEXT[];
  v_ai_status TEXT;
  v_new_turn_id UUID;
BEGIN
  -- 1. Revalidar estado da conversa
  SELECT last_customer_message_at, assigned_to, is_archived, tags, ai_status
  INTO v_last_customer_msg_at, v_assigned_to, v_is_archived, v_tags, v_ai_status
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'conversation_not_found');
  END IF;

  IF v_is_archived THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'conversation_archived');
  END IF;

  IF v_assigned_to IS NOT NULL THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'assigned_to_human');
  END IF;

  -- Guarda estrita: se a IA precisa de humano, humano já assumiu ou IA foi pausada
  IF v_ai_status IN ('needs_human', 'human_active', 'paused') THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'ai_status_' || v_ai_status);
  END IF;

  IF 'atendimento_humano' = ANY(coalesce(v_tags, ARRAY[]::text[])) THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'tagged_human_handoff');
  END IF;

  -- 2. Verificar se já existe um turno ativo sob row-lock
  SELECT * INTO v_existing
  FROM public.whatsapp_ai_agent_turns
  WHERE conversation_id = p_conversation_id AND status = 'in_flight'
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.expires_at <= v_now THEN
      UPDATE public.whatsapp_ai_agent_turns
      SET status = 'abandoned', updated_at = v_now
      WHERE id = v_existing.id;
    ELSE
      UPDATE public.whatsapp_ai_agent_turns
      SET pending_messages_count = pending_messages_count + 1,
          latest_inbound_message_at = greatest(latest_inbound_message_at, coalesce(v_last_customer_msg_at, v_now)),
          updated_at = v_now
      WHERE id = v_existing.id;

      RETURN jsonb_build_object(
        'acquired', false,
        'reason', 'in_flight',
        'lock_token', v_existing.lock_token,
        'turn_id', v_existing.id,
        'expires_at', v_existing.expires_at,
        'pending_messages_count', v_existing.pending_messages_count + 1
      );
    END IF;
  END IF;

  -- 3. Inserir novo turno ativo
  INSERT INTO public.whatsapp_ai_agent_turns (
    conversation_id,
    lock_token,
    status,
    acquired_at,
    expires_at,
    last_heartbeat_at,
    trigger_wamid,
    trigger_message_id,
    latest_inbound_message_at,
    model_requested
  ) VALUES (
    p_conversation_id,
    v_token,
    'in_flight',
    v_now,
    v_expires_at,
    v_now,
    p_trigger_wamid,
    p_trigger_message_id,
    coalesce(v_last_customer_msg_at, v_now),
    p_model_requested
  )
  RETURNING id INTO v_new_turn_id;

  RETURN jsonb_build_object(
    'acquired', true,
    'turn_id', v_new_turn_id,
    'lock_token', v_token,
    'expires_at', v_expires_at,
    'latest_inbound_message_at', coalesce(v_last_customer_msg_at, v_now)
  );
END;
$$;

-- 4. Atualizar Preparação de Despacho para respeitar ai_status
CREATE OR REPLACE FUNCTION public.customer_support_prepare_ai_dispatch(
  p_idempotency_key TEXT,
  p_conversation_id UUID,
  p_turn_id UUID,
  p_trigger_wamid TEXT,
  p_planned_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_existing public.whatsapp_ai_dispatches%ROWTYPE;
  v_dispatch_id UUID;
  v_assigned_to UUID;
  v_is_archived BOOLEAN;
  v_tags TEXT[];
  v_ai_status TEXT;
BEGIN
  SELECT assigned_to, is_archived, tags, ai_status
  INTO v_assigned_to, v_is_archived, v_tags, v_ai_status
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id;

  IF v_is_archived THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'conversation_archived');
  END IF;

  IF v_assigned_to IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'assigned_to_human');
  END IF;

  IF v_ai_status IN ('needs_human', 'human_active', 'paused') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ai_status_' || v_ai_status);
  END IF;

  SELECT * INTO v_existing
  FROM public.whatsapp_ai_dispatches
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status IN ('dispatching', 'sent') THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'already_dispatched_or_dispatching',
        'status', v_existing.status,
        'api_message_id', v_existing.api_message_id
      );
    END IF;

    IF v_existing.status = 'uncertain' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'outcome_uncertain_no_blind_retry',
        'status', 'uncertain'
      );
    END IF;

    UPDATE public.whatsapp_ai_dispatches
    SET status = 'dispatching', updated_at = timezone('utc'::text, now())
    WHERE id = v_existing.id;

    RETURN jsonb_build_object('allowed', true, 'dispatch_id', v_existing.id);
  END IF;

  INSERT INTO public.whatsapp_ai_dispatches (
    idempotency_key,
    conversation_id,
    turn_id,
    trigger_wamid,
    status,
    planned_text
  ) VALUES (
    p_idempotency_key,
    p_conversation_id,
    p_turn_id,
    p_trigger_wamid,
    'dispatching',
    p_planned_text
  )
  RETURNING id INTO v_dispatch_id;

  RETURN jsonb_build_object('allowed', true, 'dispatch_id', v_dispatch_id);
END;
$$;

-- 5. Atualizar customer_support_list_conversations retornando colunas ai_status
DROP FUNCTION IF EXISTS public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text);

CREATE OR REPLACE FUNCTION public.customer_support_list_conversations(
  p_filter text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text,
  p_agent_id uuid DEFAULT NULL::uuid,
  p_criteria jsonb DEFAULT '{}'::jsonb,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
  p_sort_order text DEFAULT 'newest'::text
)
RETURNS TABLE(
  id uuid,
  business_phone_number_id text,
  contact_phone text,
  contact_wa_id text,
  contact_name text,
  customer_id text,
  customer_link_status text,
  last_message_text text,
  last_message_at timestamp with time zone,
  last_customer_message_at timestamp with time zone,
  unread_count integer,
  is_archived boolean,
  internal_notes text,
  tags text[],
  assigned_to uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  assigned_profile_name text,
  assigned_profile_role text,
  total_count bigint,
  ai_status text,
  ai_handoff_reason text,
  ai_handoff_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_criteria jsonb := CASE WHEN jsonb_typeof(p_criteria) = 'object' THEN p_criteria ELSE '{}'::jsonb END;
  v_folder_status text;
  v_folder_assignee text;
  v_folder_link text;
  v_folder_orders text;
  v_folder_search text;
  v_folder_phone_digits text;
  v_filter text := COALESCE(NULLIF(p_filter, ''), 'all');
  v_search text := btrim(COALESCE(p_search, ''));
  v_phone_digits text;
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 100);
  v_sort_order text := CASE WHEN p_sort_order IN ('newest', 'oldest', 'unread') THEN p_sort_order ELSE 'newest' END;
  v_needs_orders boolean := false;
BEGIN
  IF NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF v_filter IN ('with_orders', 'without_orders')
    OR (v_criteria ->> 'orders') IN ('with_orders', 'without_orders') THEN
    v_needs_orders := true;
  END IF;
  IF v_needs_orders AND NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_folder_status := NULLIF(v_criteria ->> 'status', 'all');
  v_folder_assignee := NULLIF(v_criteria ->> 'assigneeId', 'all');
  v_folder_link := NULLIF(v_criteria ->> 'customerLink', 'all');
  v_folder_orders := NULLIF(v_criteria ->> 'orders', 'all');
  v_folder_search := btrim(COALESCE(v_criteria ->> 'search', ''));
  v_folder_phone_digits := CASE WHEN v_folder_search ~ '^[+0-9[:space:]().-]+$' THEN regexp_replace(v_folder_search, '[^0-9]', '', 'g') ELSE '' END;
  v_phone_digits := CASE WHEN v_search ~ '^[+0-9[:space:]().-]+$' THEN regexp_replace(v_search, '[^0-9]', '', 'g') ELSE '' END;

  RETURN QUERY
  WITH filtered AS (
    SELECT conversation.*,
      count(*) OVER () AS matched_count
    FROM public.whatsapp_conversations AS conversation
    WHERE
      CASE
        WHEN v_criteria <> '{}'::jsonb THEN true
        WHEN v_filter = 'archived' THEN conversation.is_archived
        WHEN v_filter = 'closed' THEN conversation.is_archived OR conversation.tags @> ARRAY['status:closed']::text[]
        ELSE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[])
      END
      AND (v_filter <> 'mine' OR conversation.assigned_to = auth.uid())
      AND (v_filter <> 'unassigned' OR conversation.assigned_to IS NULL)
      AND (v_filter <> 'unread' OR conversation.unread_count > 0)
      AND (v_filter <> 'linked' OR conversation.customer_id IS NOT NULL)
      AND (v_filter <> 'unlinked' OR conversation.customer_id IS NULL)
      AND (v_filter <> 'needs_human' OR conversation.ai_status = 'needs_human')
      AND (v_filter <> 'snoozed' OR (NOT conversation.is_archived AND conversation.tags @> ARRAY['status:snoozed']::text[]))
      AND (v_filter <> 'with_orders' OR EXISTS (
        SELECT 1 FROM public.orders AS order_row
        WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
          AND (
            (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
            OR (
              length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
              AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
            )
          )
      ))
      AND (v_filter <> 'without_orders' OR NOT EXISTS (
        SELECT 1 FROM public.orders AS order_row
        WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
          AND (
            (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
            OR (
              length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
              AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
            )
          )
      ))
      AND (p_agent_id IS NULL OR conversation.assigned_to = p_agent_id)
      AND (v_folder_status IS NULL OR CASE v_folder_status
        WHEN 'open' THEN NOT conversation.is_archived
          AND NOT (conversation.tags @> ARRAY['status:closed']::text[])
          AND NOT (conversation.tags @> ARRAY['status:snoozed']::text[])
        WHEN 'closed' THEN conversation.is_archived OR conversation.tags @> ARRAY['status:closed']::text[]
        WHEN 'snoozed' THEN NOT conversation.is_archived AND conversation.tags @> ARRAY['status:snoozed']::text[]
        ELSE true END)
      AND (v_folder_assignee IS NULL OR CASE
        WHEN v_folder_assignee = 'unassigned' THEN conversation.assigned_to IS NULL
        WHEN v_folder_assignee = 'mine' THEN conversation.assigned_to = auth.uid()
        ELSE conversation.assigned_to::text = v_folder_assignee END)
      AND (COALESCE((v_criteria ->> 'unread')::boolean, false) = false OR conversation.unread_count > 0)
      AND (v_folder_link IS NULL OR CASE v_folder_link
        WHEN 'linked' THEN conversation.customer_id IS NOT NULL
        WHEN 'unlinked' THEN conversation.customer_id IS NULL
        ELSE true END)
      AND (v_folder_orders IS NULL OR CASE v_folder_orders
        WHEN 'with_orders' THEN EXISTS (
          SELECT 1 FROM public.orders AS order_row
          WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
            AND (
              (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
              OR (
                length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
                AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
              )
            )
        )
        WHEN 'without_orders' THEN NOT EXISTS (
          SELECT 1 FROM public.orders AS order_row
          WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
            AND (
              (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
              OR (
                length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
                AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
              )
            )
        )
        ELSE true END)
      AND (v_search = '' OR public.immutable_unaccent(conversation.contact_name) ILIKE '%' || public.immutable_unaccent(v_search) || '%'
        OR public.immutable_unaccent(conversation.last_message_text) ILIKE '%' || public.immutable_unaccent(v_search) || '%'
        OR (length(v_phone_digits) >= 3 AND (
          conversation.contact_phone ILIKE '%' || v_phone_digits || '%'
          OR conversation.contact_wa_id ILIKE '%' || v_phone_digits || '%'
        )))
      AND (v_folder_search = '' OR public.immutable_unaccent(conversation.contact_name) ILIKE '%' || public.immutable_unaccent(v_folder_search) || '%'
        OR public.immutable_unaccent(conversation.last_message_text) ILIKE '%' || public.immutable_unaccent(v_folder_search) || '%'
        OR (length(v_folder_phone_digits) >= 3 AND (
          conversation.contact_phone ILIKE '%' || v_folder_phone_digits || '%'
          OR conversation.contact_wa_id ILIKE '%' || v_folder_phone_digits || '%'
        )))
  )
  SELECT filtered.id, filtered.business_phone_number_id, filtered.contact_phone,
    filtered.contact_wa_id, filtered.contact_name, filtered.customer_id,
    filtered.customer_link_status, filtered.last_message_text, filtered.last_message_at,
    filtered.last_customer_message_at, filtered.unread_count, filtered.is_archived,
    filtered.internal_notes, filtered.tags, filtered.assigned_to, filtered.created_at,
    filtered.updated_at, profile.full_name, profile.role, filtered.matched_count,
    filtered.ai_status, filtered.ai_handoff_reason, filtered.ai_handoff_at
  FROM filtered
  LEFT JOIN public.profiles AS profile ON profile.id = filtered.assigned_to
  ORDER BY
    CASE WHEN v_sort_order = 'unread' THEN (filtered.unread_count > 0)::integer ELSE 0 END DESC,
    CASE WHEN v_sort_order = 'oldest' THEN filtered.last_message_at END ASC NULLS LAST,
    CASE WHEN v_sort_order <> 'oldest' THEN filtered.last_message_at END DESC NULLS LAST,
    filtered.created_at DESC,
    filtered.id
  LIMIT v_page_size OFFSET (v_page - 1) * v_page_size;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_set_conversation_ai_status(UUID, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
