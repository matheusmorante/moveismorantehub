BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Additive rollout: only the new receipt RPC creates jobs; existing webhooks keep their contract.
CREATE TABLE IF NOT EXISTS public.whatsapp_ai_message_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  phase text NOT NULL DEFAULT 'pending' CHECK (phase IN ('pending', 'ready', 'sending')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  lock_token uuid,
  response_payload jsonb,
  dispatch_id uuid REFERENCES public.whatsapp_ai_dispatches(id),
  last_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_ai_jobs_one_processing_per_conversation
  ON public.whatsapp_ai_message_jobs(conversation_id) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS whatsapp_ai_jobs_ready
  ON public.whatsapp_ai_message_jobs(available_at, created_at) WHERE status IN ('pending', 'processing');
ALTER TABLE public.whatsapp_ai_message_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_ai_message_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.whatsapp_ai_message_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.customer_support_receive_message_with_ai_job(
  p_business_phone_number_id text, p_contact_wa_id text, p_contact_phone text,
  p_contact_name text, p_customer_id text, p_customer_link_status text, p_message jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_receipt jsonb; v_job uuid;
BEGIN
  v_receipt := public.customer_support_receive_message(p_business_phone_number_id, p_contact_wa_id,
    p_contact_phone, p_contact_name, p_customer_id, p_customer_link_status, p_message);
  IF p_message->>'message_type' = 'text' AND nullif(btrim(p_message->>'text_content'), '') IS NOT NULL THEN
    IF (v_receipt->>'inserted')::boolean THEN
      INSERT INTO public.whatsapp_ai_message_jobs(message_id, conversation_id)
      VALUES ((v_receipt->>'message_id')::uuid, (v_receipt->>'conversation_id')::uuid)
      ON CONFLICT (message_id) DO NOTHING;
    END IF;
    SELECT id INTO v_job FROM public.whatsapp_ai_message_jobs WHERE message_id = (v_receipt->>'message_id')::uuid;
  END IF;
  RETURN v_receipt || jsonb_build_object('ai_job_id', v_job);
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_claim_ai_job(p_job_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_job public.whatsapp_ai_message_jobs%ROWTYPE; v_token uuid := gen_random_uuid(); v_result jsonb;
BEGIN
  SELECT j.* INTO v_job FROM public.whatsapp_ai_message_jobs j
  WHERE (p_job_id IS NULL OR j.id = p_job_id)
    AND ((j.status = 'pending' AND j.available_at <= now()) OR (j.status = 'processing' AND j.locked_until <= now()))
    AND NOT EXISTS (SELECT 1 FROM public.whatsapp_ai_message_jobs other
      WHERE other.conversation_id = j.conversation_id AND other.id <> j.id AND other.status = 'processing')
  ORDER BY j.available_at, j.created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.whatsapp_ai_message_jobs SET status = 'processing', attempts = attempts + 1,
    lock_token = v_token, locked_until = now() + interval '120 seconds', updated_at = now()
  WHERE id = v_job.id RETURNING * INTO v_job;

  SELECT jsonb_build_object('id', v_job.id, 'token', v_token, 'attempts', v_job.attempts,
    'phase', v_job.phase, 'response', v_job.response_payload,
    'dispatchStatus', d.status, 'dispatchMessageId', d.api_message_id, 'dispatchSentAt', d.updated_at,
    'inbound', jsonb_build_object('conversationId', c.id, 'messageId', m.id,
      'from', c.contact_wa_id, 'contactPhoneE164', c.contact_phone, 'contactProfile', c.contact_name,
      'text', m.text_content, 'wamid', m.api_message_id, 'businessPhoneNumberId', c.business_phone_number_id))
  INTO v_result FROM public.whatsapp_messages m
  JOIN public.whatsapp_conversations c ON c.id = v_job.conversation_id
  LEFT JOIN public.whatsapp_ai_dispatches d ON d.idempotency_key = 'ai_dispatch:' || c.id::text || ':' || m.api_message_id
  WHERE m.id = v_job.message_id;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_stage_ai_job(p_job_id uuid, p_lock_token uuid, p_payload jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  UPDATE public.whatsapp_ai_message_jobs j SET phase = 'ready', response_payload = p_payload, updated_at = now()
  WHERE j.id = p_job_id AND j.status = 'processing' AND j.lock_token = p_lock_token AND j.locked_until > now()
    AND (j.phase IN ('pending', 'ready') OR (j.phase = 'sending' AND EXISTS
      (SELECT 1 FROM public.whatsapp_ai_dispatches d WHERE d.id = j.dispatch_id AND d.status = 'failed')));
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_mark_ai_job_sending(p_job_id uuid, p_lock_token uuid, p_dispatch_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  UPDATE public.whatsapp_ai_message_jobs j SET phase = 'sending', dispatch_id = p_dispatch_id, updated_at = now()
  WHERE j.id = p_job_id AND j.status = 'processing' AND j.lock_token = p_lock_token AND j.locked_until > now() + interval '15 seconds'
    AND j.phase = 'ready' AND EXISTS (SELECT 1 FROM public.whatsapp_ai_dispatches d
      JOIN public.whatsapp_messages m ON m.id = j.message_id
      JOIN public.whatsapp_conversations c ON c.id = j.conversation_id
      WHERE d.id = p_dispatch_id AND d.conversation_id = j.conversation_id AND d.trigger_wamid = m.api_message_id
        AND d.status = 'dispatching' AND c.assigned_to IS NULL AND NOT c.is_archived
        AND c.ai_status NOT IN ('needs_human', 'human_active', 'paused')
        AND NOT ('atendimento_humano' = ANY(coalesce(c.tags, ARRAY[]::text[]))));
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_finish_ai_job(p_job_id uuid, p_lock_token uuid, p_outcome text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_job public.whatsapp_ai_message_jobs%ROWTYPE; v_reason text := left(coalesce(p_reason, 'Falha no atendimento automático'), 250);
BEGIN
  SELECT * INTO v_job FROM public.whatsapp_ai_message_jobs
    WHERE id = p_job_id AND status = 'processing' AND lock_token = p_lock_token FOR UPDATE;
  IF NOT FOUND OR p_outcome IS NULL OR p_outcome NOT IN ('completed', 'retry', 'busy', 'handoff') THEN RETURN false; END IF;
  IF p_outcome = 'handoff' THEN
    UPDATE public.whatsapp_conversations SET
      ai_status = CASE WHEN ai_status = 'human_active' THEN ai_status ELSE 'needs_human' END,
      ai_handoff_reason = v_reason, ai_handoff_at = now(),
      tags = ARRAY(SELECT DISTINCT unnest(coalesce(tags, ARRAY[]::text[]) || ARRAY['atendimento_humano','intervencao_necessaria','aguardando_atendente'])),
      updated_at = now() WHERE id = v_job.conversation_id;
    IF NOT FOUND THEN RETURN false; END IF;
    INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
      VALUES (v_job.conversation_id, 'outbound', 'internal_note',
        'Intervenção humana necessária: ' || v_reason, 'delivered',
        jsonb_build_object('origin', 'customer_support_ai_agent', 'is_internal_note', true, 'ai_job_id', v_job.id), now());
  END IF;
  UPDATE public.whatsapp_ai_message_jobs j SET
    status = CASE WHEN p_outcome = 'completed' THEN 'completed' WHEN p_outcome = 'handoff' THEN 'failed' ELSE 'pending' END,
    phase = CASE WHEN p_outcome = 'retry' AND j.phase = 'sending' AND EXISTS
      (SELECT 1 FROM public.whatsapp_ai_dispatches d WHERE d.id = j.dispatch_id AND d.status = 'failed')
      THEN 'ready' ELSE j.phase END,
    attempts = CASE WHEN p_outcome = 'busy' THEN greatest(0, j.attempts - 1) ELSE j.attempts END,
    available_at = CASE WHEN p_outcome = 'busy' THEN now() + interval '15 seconds'
      WHEN p_outcome = 'retry' THEN now() + make_interval(secs => least(900, 15 * power(2, least(6, greatest(0, j.attempts - 1)))::integer))
      ELSE j.available_at END,
    lock_token = NULL, locked_until = NULL, last_reason = v_reason, updated_at = now()
  WHERE j.id = v_job.id;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_record_ai_dispatch_outcome(
  p_dispatch_id uuid, p_status text, p_api_message_id text DEFAULT NULL, p_error_message text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  UPDATE public.whatsapp_ai_dispatches SET status = p_status, api_message_id = coalesce(p_api_message_id, api_message_id),
    error_message = p_error_message, updated_at = now() WHERE id = p_dispatch_id;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_record_ai_handoff(p_conversation_id uuid, p_reason text, p_silent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_reason text := left(coalesce(nullif(btrim(p_reason), ''), 'Atendimento humano solicitado.'), 500);
BEGIN
  UPDATE public.whatsapp_conversations SET
    ai_status = CASE WHEN ai_status = 'human_active' THEN ai_status ELSE 'needs_human' END,
    ai_handoff_reason = v_reason, ai_handoff_at = now(),
    tags = ARRAY(SELECT DISTINCT unnest(coalesce(tags, ARRAY[]::text[]) || ARRAY['atendimento_humano','intervencao_necessaria','aguardando_atendente'])),
    internal_notes = concat_ws(E'\n', nullif(internal_notes, ''),
      '[' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '] Intervenção humana necessária: ' || v_reason),
    updated_at = now() WHERE id = p_conversation_id;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.whatsapp_messages(conversation_id, direction, message_type, text_content, status, raw_payload, timestamp)
  VALUES (p_conversation_id, 'outbound', 'internal_note', 'Intervenção humana necessária: ' || v_reason,
    'delivered', jsonb_build_object('origin', 'customer_support_ai_agent', 'is_internal_note', true,
      'silent_handoff', coalesce(p_silent, true), 'handoff_reason', v_reason), now());
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_receive_message_with_ai_job(text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_claim_ai_job(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_stage_ai_job(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_mark_ai_job_sending(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_finish_ai_job(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_record_ai_handoff(uuid,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_receive_message_with_ai_job(text,text,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_claim_ai_job(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_stage_ai_job(uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_mark_ai_job_sending(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_finish_ai_job(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_support_record_ai_handoff(uuid,text,boolean) TO service_role;
COMMIT;
