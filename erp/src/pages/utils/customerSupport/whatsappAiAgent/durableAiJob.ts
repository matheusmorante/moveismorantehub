import type { SupabaseClient } from '@supabase/supabase-js';
import type { InboundMessageParams, WhatsAppAiAgentDependencies, WhatsAppAiAgentResult, WhatsAppNativeCatalogProduct } from './whatsappAiAgentTypes.js';
import { maybeTriggerWhatsAppAiAgent } from './orchestrator/inboundTriggerHandler.js';
import { evaluateTurnPreconditions } from './orchestrator/turnEligibility.js';
import { dispatchAiResponse } from './whatsappAiAgentDispatcher.js';
import { buildAiMessagePayload } from './dispatcher/aiPayloadBuilder.js';
import { persistOutboundMessageAndSyncConversation } from './dispatcher/dispatchOutcomeRecorder.js';

type SavedResponse = {
  aiResponseText: string; toolsUsed: string[]; situationKey: string | null; matchedKeywords: string[];
  enforcedPhrases: string[]; relevantArticleIds: string[]; workflowKey: string | null;
  executionTimeMs: number; modelEffective?: string; fallbackReason?: string | null;
  nativeCatalogProducts?: WhatsAppNativeCatalogProduct[]; messageType?: 'text' | 'interactive'; storedText?: string;
};
type ClaimedJob = {
  id: string; token: string; attempts: number; phase: 'pending' | 'ready' | 'sending';
  response: SavedResponse | null; dispatchStatus: string | null; dispatchMessageId: string | null;
  dispatchSentAt: string | null; inbound: InboundMessageParams;
};

const TERMINAL_REASONS = new Set([
  'agent_disabled', 'mode_human_only', 'unauthorized_phone_number', 'conversation_archived_or_missing',
  'assigned_to_human_attendant', 'handoff_to_human_active', 'ai_status_human_active', 'ai_status_paused',
  'conversation_archived_during_processing', 'assigned_to_human_during_processing',
  'handoff_to_human_during_processing', 'disabled_during_processing', 'support_mode_changed_during_processing',
  'unauthorized_phone_number_pre_dispatch_guard',
]);

async function finish(supabase: SupabaseClient, job: ClaimedJob, outcome: 'completed' | 'retry' | 'busy' | 'handoff', reason: string) {
  const { data, error } = await supabase.rpc('customer_support_finish_ai_job', {
    p_job_id: job.id, p_lock_token: job.token, p_outcome: outcome, p_reason: reason,
  });
  if (error || data !== true) throw new Error('Não foi possível confirmar o estado do atendimento pendente.');
}

function validResponse(value: SavedResponse | null): value is SavedResponse {
  return !!value && typeof value.aiResponseText === 'string' && !!value.aiResponseText.trim()
    && Array.isArray(value.toolsUsed) && Array.isArray(value.matchedKeywords)
    && Array.isArray(value.enforcedPhrases) && Array.isArray(value.relevantArticleIds);
}

async function resumeResponse(supabase: SupabaseClient, job: ClaimedJob, deps: WhatsAppAiAgentDependencies): Promise<WhatsAppAiAgentResult> {
  const eligibility = await evaluateTurnPreconditions(supabase, job.inbound);
  if (!eligibility.eligible || !eligibility.config || !eligibility.conv) {
    return { executed: false, reason: eligibility.reason || 'ineligible_turn' };
  }
  if ((eligibility.config.supportMode || 'automatico') !== 'automatico') return { executed: false, reason: 'support_mode_changed_during_processing' };
  const saved = job.response!;
  return dispatchAiResponse({
    supabase, inbound: job.inbound, conv: eligibility.conv, config: eligibility.config, settings: eligibility.settings,
    ...saved, accessToken: deps.whatsappAccessToken || eligibility.settings?.whatsappConfig?.accessToken
      || process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '',
    fetchMeta: deps.fetchMeta || globalThis.fetch, now: deps.now?.() || new Date(),
    durableJob: { id: job.id, token: job.token },
  });
}

/** Claims one durable message. An uncertain Meta send is always handed to a person. */
export async function processDurableAiJob(supabase: SupabaseClient, jobId?: string, deps: WhatsAppAiAgentDependencies = {}) {
  const { data, error } = await supabase.rpc('customer_support_claim_ai_job', { p_job_id: jobId || null });
  if (error?.code === '23505') return false;
  if (error) throw new Error('Não foi possível adquirir o atendimento pendente.');
  if (!data) return false;
  const job = data as ClaimedJob;
  try {
    if (job.dispatchStatus === 'sent') {
      if (!job.dispatchMessageId || !validResponse(job.response)) {
        await finish(supabase, job, 'handoff', 'Envio confirmado sem dados suficientes para recuperar o histórico.');
        return true;
      }
      const saved = job.response;
      const rawPayload = buildAiMessagePayload({ authorName: 'Lizandro (IA)', ...saved, supportMode: 'automatico' });
      if (saved.messageType === 'interactive' && saved.nativeCatalogProducts?.length) {
        rawPayload.provider_message_type = saved.nativeCatalogProducts.length === 1 ? 'product' : 'product_list';
        rawPayload.catalog_product_count = saved.nativeCatalogProducts.length;
        rawPayload.catalog_products = saved.nativeCatalogProducts.map((product) => ({
          retailer_id: product.retailerId,
          name: product.name,
        }));
      }
      await persistOutboundMessageAndSyncConversation(supabase, {
        conversationId: job.inbound.conversationId, apiMessageId: job.dispatchMessageId,
        replyToWamid: job.inbound.wamid, textContent: saved.storedText || saved.aiResponseText, status: 'sent',
        messageType: saved.messageType || 'text', rawPayload,
        sendAt: job.dispatchSentAt || new Date().toISOString(), syncConversationLastMessage: true, idempotent: true,
      });
      await finish(supabase, job, 'completed', 'Envio e histórico confirmados.');
      return true;
    }
    if (job.dispatchStatus === 'dispatching' || job.dispatchStatus === 'uncertain'
      || (job.phase === 'sending' && job.dispatchStatus !== 'failed')) {
      await finish(supabase, job, 'handoff', 'O envio à Meta tem resultado incerto; confira a conversa antes de responder.');
      return true;
    }
    if (job.attempts > 4) {
      const { data, error: dispatchError } = await supabase.from('whatsapp_ai_dispatches')
        .select('error_message')
        .eq('idempotency_key', `ai_dispatch:${job.inbound.conversationId}:${job.inbound.wamid || 'nowamid'}`)
        .maybeSingle();
      if (dispatchError || data?.error_message !== 'whatsapp_send_quota_exhausted') {
        await finish(supabase, job, 'handoff', 'As tentativas de atendimento automático foram esgotadas.');
        return true;
      }
    }
    if (job.phase === 'ready' && !validResponse(job.response)) {
      await finish(supabase, job, 'handoff', 'A resposta salva não pôde ser recuperada com segurança.');
      return true;
    }
    const durableJob = { id: job.id, token: job.token };
    const result = job.phase === 'ready' || (job.phase === 'sending' && job.dispatchStatus === 'failed')
      ? await resumeResponse(supabase, job, deps)
      : await maybeTriggerWhatsAppAiAgent(supabase, job.inbound, { ...deps, durableJob });
    const reason = result.reason || 'turno_incompleto';
    if (reason === 'whatsapp_send_quota_exhausted') {
      await finish(supabase, job, 'busy', 'A cota compartilhada de envio do WhatsApp está esgotada.');
    } else if (reason === 'whatsapp_send_quota_unavailable') {
      await finish(supabase, job, 'retry', 'Não foi possível consultar a cota compartilhada de envio do WhatsApp.');
    } else if (reason === 'meta_api_network_error_outcome_uncertain' || reason === 'meta_api_result_state_unrecorded') {
      await finish(supabase, job, 'handoff', 'O envio à Meta tem resultado incerto; confira a conversa antes de responder.');
    } else if (reason === 'automatic_sent_persistence_incomplete' || reason === 'turn_finalization_unconfirmed') {
      await finish(supabase, job, 'retry', 'Confirmação do envio ou do turno pendente.');
    } else if (result.executed || TERMINAL_REASONS.has(reason)) {
      await finish(supabase, job, 'completed', reason);
    } else if (reason === 'conversation_turn_already_in_flight' || reason === 'in_flight') {
      await finish(supabase, job, 'busy', 'Outro turno está em andamento.');
    } else {
      await finish(supabase, job, job.attempts >= 4 ? 'handoff' : 'retry', 'Não foi possível concluir o atendimento automático.');
    }
  } catch (cause) {
    console.error('[Atendimento IA] Falha ao processar mensagem pendente:', cause instanceof Error ? cause.message : 'erro');
    await finish(supabase, job, job.attempts >= 4 ? 'handoff' : 'retry', 'Não foi possível concluir o atendimento automático.');
  }
  return true;
}
