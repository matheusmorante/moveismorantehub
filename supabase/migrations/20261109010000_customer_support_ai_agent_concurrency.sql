-- Migration: 20261109010000_customer_support_ai_agent_concurrency.sql
-- Módulo: Central de Atendimento WhatsApp (Lizandro AI Agent)
-- Finalidade: Concorrência distribuída entre instâncias Vercel, trava compartilhada atômica no PostgreSQL,
--            reprocessamento e agrupamento de mensagens pendentes chegadas durante a geração,
--            idempotência estrita de despacho para Meta Graph API e prevenção contra duplicidades.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- 1. Tabela de Turnos de IA (Distributed Locks & Queue State)
CREATE TABLE IF NOT EXISTS public.whatsapp_ai_agent_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  lock_token UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_flight', 'completed', 'failed', 'abandoned')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  turn_count INT NOT NULL DEFAULT 1,
  trigger_wamid TEXT,
  trigger_message_id UUID,
  pending_messages_count INT NOT NULL DEFAULT 0,
  latest_inbound_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  model_requested TEXT,
  model_effective TEXT,
  fallback_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantia física no PostgreSQL: no máximo 1 turno ativo ('in_flight') por conversa
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_ai_agent_in_flight
  ON public.whatsapp_ai_agent_turns(conversation_id)
  WHERE status = 'in_flight';

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_agent_turns_conv
  ON public.whatsapp_ai_agent_turns(conversation_id, created_at DESC);

-- 2. Tabela de Despachos de IA (Outbound Idempotency & Delivery State Machine)
CREATE TABLE IF NOT EXISTS public.whatsapp_ai_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES public.whatsapp_ai_agent_turns(id) ON DELETE SET NULL,
  trigger_wamid TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'dispatching', 'sent', 'uncertain', 'failed')),
  planned_text TEXT NOT NULL,
  api_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_dispatches_conv
  ON public.whatsapp_ai_dispatches(conversation_id, created_at DESC);

-- 3. RPC: Aquisição Atômica de Turno / Trava Compartilhada
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
  v_new_turn_id UUID;
BEGIN
  -- 1. Revalidar estado da conversa (Transferência humana, arquivamento, tags)
  SELECT last_customer_message_at, assigned_to, is_archived, tags
  INTO v_last_customer_msg_at, v_assigned_to, v_is_archived, v_tags
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

  IF 'atendimento_humano' = ANY(coalesce(v_tags, ARRAY[]::text[])) THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'tagged_human_handoff');
  END IF;

  -- 2. Verificar se já existe um turno ativo sob row-lock
  SELECT * INTO v_existing
  FROM public.whatsapp_ai_agent_turns
  WHERE conversation_id = p_conversation_id AND status = 'in_flight'
  FOR UPDATE;

  IF FOUND THEN
    -- Recuperação de trava abandonada (instância serverless caiu ou timeout ultrapassado)
    IF v_existing.expires_at <= v_now THEN
      UPDATE public.whatsapp_ai_agent_turns
      SET status = 'abandoned', updated_at = v_now
      WHERE id = v_existing.id;
    ELSE
      -- Turno ainda ativo em outra instância: registrar mensagem pendente
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

-- 4. RPC: Finalização de Turno e Detecção Atômica de Novas Mensagens Pendentes
CREATE OR REPLACE FUNCTION public.customer_support_complete_ai_turn(
  p_turn_id UUID,
  p_lock_token UUID,
  p_status TEXT, -- 'completed' ou 'failed'
  p_model_effective TEXT DEFAULT NULL,
  p_fallback_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_turn public.whatsapp_ai_agent_turns%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_has_pending BOOLEAN := false;
  v_pending_count INT := 0;
  v_latest_unprocessed_msg RECORD;
BEGIN
  SELECT * INTO v_turn
  FROM public.whatsapp_ai_agent_turns
  WHERE id = p_turn_id AND lock_token = p_lock_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'turn_or_token_not_found');
  END IF;

  -- Atualizar turno atual para o status final
  UPDATE public.whatsapp_ai_agent_turns
  SET status = p_status,
      model_effective = coalesce(p_model_effective, model_effective),
      fallback_reason = p_fallback_reason,
      metadata = p_metadata,
      updated_at = v_now
  WHERE id = p_turn_id;

  -- Verificar se chegaram novas mensagens do cliente após o instante de aquisição deste turno
  SELECT id, text_content, timestamp INTO v_latest_unprocessed_msg
  FROM public.whatsapp_messages
  WHERE conversation_id = v_turn.conversation_id
    AND direction = 'inbound'
    AND timestamp > v_turn.acquired_at
  ORDER BY timestamp DESC
  LIMIT 1;

  IF FOUND THEN
    v_has_pending := true;
    SELECT count(*) INTO v_pending_count
    FROM public.whatsapp_messages
    WHERE conversation_id = v_turn.conversation_id
      AND direction = 'inbound'
      AND timestamp > v_turn.acquired_at;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'has_pending', v_has_pending,
    'pending_count', v_pending_count,
    'latest_pending_message_id', v_latest_unprocessed_msg.id,
    'latest_pending_text', v_latest_unprocessed_msg.text_content
  );
END;
$$;

-- 5. RPC: Preparação de Despacho com Idempotência Estrita
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
BEGIN
  -- Revalidação atômica de transferência humana e arquivamento
  SELECT assigned_to, is_archived, tags
  INTO v_assigned_to, v_is_archived, v_tags
  FROM public.whatsapp_conversations
  WHERE id = p_conversation_id;

  IF v_is_archived THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'conversation_archived');
  END IF;

  IF v_assigned_to IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'assigned_to_human');
  END IF;

  -- Idempotência estrita: verificar se já existe despacho com esta chave
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

    -- Se já existia como 'uncertain', não reenviar cegamente
    IF v_existing.status = 'uncertain' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'outcome_uncertain_no_blind_retry',
        'status', 'uncertain'
      );
    END IF;

    -- Reativação de despacho com falha prévia para nova tentativa controlada
    UPDATE public.whatsapp_ai_dispatches
    SET status = 'dispatching', updated_at = timezone('utc'::text, now())
    WHERE id = v_existing.id;

    RETURN jsonb_build_object('allowed', true, 'dispatch_id', v_existing.id);
  END IF;

  -- Registrar novo despacho com status 'dispatching'
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

-- 6. RPC: Registro do Resultado do Despacho (sent, uncertain, failed)
CREATE OR REPLACE FUNCTION public.customer_support_record_ai_dispatch_outcome(
  p_dispatch_id UUID,
  p_status TEXT,
  p_api_message_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.whatsapp_ai_dispatches
  SET status = p_status,
      api_message_id = coalesce(p_api_message_id, api_message_id),
      error_message = p_error_message,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_dispatch_id;
  RETURN true;
END;
$$;

-- 7. Segurança: RLS e Permissões
ALTER TABLE public.whatsapp_ai_agent_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_ai_agent_turns_service_role"
  ON public.whatsapp_ai_agent_turns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_ai_agent_turns_authenticated_read"
  ON public.whatsapp_ai_agent_turns FOR SELECT TO authenticated USING (true);

CREATE POLICY "whatsapp_ai_dispatches_service_role"
  ON public.whatsapp_ai_dispatches FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_ai_dispatches_authenticated_read"
  ON public.whatsapp_ai_dispatches FOR SELECT TO authenticated USING (true);

GRANT ALL ON TABLE public.whatsapp_ai_agent_turns TO service_role;
GRANT SELECT ON TABLE public.whatsapp_ai_agent_turns TO authenticated;

GRANT ALL ON TABLE public.whatsapp_ai_dispatches TO service_role;
GRANT SELECT ON TABLE public.whatsapp_ai_dispatches TO authenticated;

GRANT EXECUTE ON FUNCTION public.customer_support_acquire_ai_turn(UUID, TEXT, UUID, INT, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_complete_ai_turn(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_prepare_ai_dispatch(TEXT, UUID, UUID, TEXT, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_record_ai_dispatch_outcome(UUID, TEXT, TEXT, TEXT) TO service_role, authenticated;

COMMIT;
