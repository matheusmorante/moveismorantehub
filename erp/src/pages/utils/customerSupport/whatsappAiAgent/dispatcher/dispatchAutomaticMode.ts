import type { WhatsAppAiAgentResult } from '../whatsappAiAgentTypes.js';
import { markMessageProcessed } from '../whatsappAiAgentSecurity.js';
import type { DispatchAiResponseParams } from './types.js';
import { buildAiMessagePayload } from './aiPayloadBuilder.js';
import {
  recordDispatchOutcomeSafe,
  persistOutboundMessageAndSyncConversation,
} from './dispatchOutcomeRecorder.js';
import { sendMetaTextMessage } from './metaGraphSender.js';
import { prepareDispatchIdempotency } from './prepareDispatchIdempotency.js';

export async function dispatchAutomaticMode(
  params: DispatchAiResponseParams
): Promise<WhatsAppAiAgentResult> {
  const {
    supabase,
    inbound,
    config,
    settings,
    aiResponseText,
    toolsUsed,
    situationKey,
    matchedKeywords,
    enforcedPhrases,
    relevantArticleIds,
    workflowKey,
    executionTimeMs,
    accessToken,
    fetchMeta,
    now,
    turnId,
    modelEffective,
    fallbackReason,
    durableJob,
  } = params;

  if (durableJob) {
    const { data, error } = await supabase.rpc('customer_support_stage_ai_job', {
      p_job_id: durableJob.id, p_lock_token: durableJob.token,
      p_payload: { aiResponseText, toolsUsed, situationKey, matchedKeywords, enforcedPhrases,
        relevantArticleIds, workflowKey, executionTimeMs, modelEffective, fallbackReason },
    });
    if (error || data !== true) throw new Error('Não foi possível salvar a resposta antes do envio.');
  }

  // 1. Idempotência estrita de despacho no PostgreSQL
  const idempotency = await prepareDispatchIdempotency(supabase, {
    conversationId: inbound.conversationId,
    wamid: inbound.wamid,
    turnId,
    aiResponseText,
    toolsUsed,
    situationKey,
  });

  if (!idempotency.allowed && idempotency.earlyResult) {
    return idempotency.earlyResult;
  }

  const dispatchId = idempotency.dispatchId;

  // 2. Envio direto ao cliente via Meta Cloud API com proteção contra timeout e resultados incertos
  const phoneNumberId =
    inbound.businessPhoneNumberId ||
    settings?.whatsappConfig?.phoneNumberId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    '';

  if (!phoneNumberId || !accessToken) {
    let outcomeRecorded = false;
    if (dispatchId) {
      outcomeRecorded = await recordDispatchOutcomeSafe(
        supabase, dispatchId, 'failed', null, 'channel_credentials_missing'
      );
    }
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: outcomeRecorded ? 'channel_credentials_missing' : 'channel_credentials_missing_state_unrecorded',
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  if (durableJob) {
    const { data, error } = await supabase.rpc('customer_support_mark_ai_job_sending', {
      p_job_id: durableJob.id, p_lock_token: durableJob.token, p_dispatch_id: dispatchId,
    });
    if (error || data !== true) throw new Error('Não foi possível confirmar o início do envio.');
  }

  const sendResult = await sendMetaTextMessage({
    fetchMeta,
    phoneNumberId,
    accessToken,
    recipientPhone: inbound.from,
    textContent: aiResponseText,
    replyToWamid: inbound.wamid,
  });

  if (!sendResult.ok) {
    const outcomeRecorded = await recordDispatchOutcomeSafe(
      supabase,
      dispatchId,
      sendResult.status,
      null,
      sendResult.error || 'Meta API delivery failed'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: !outcomeRecorded
        ? 'meta_api_result_state_unrecorded'
        : sendResult.status === 'uncertain' ? 'meta_api_network_error_outcome_uncertain' : 'meta_api_rejected',
      error: sendResult.error,
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  const apiMessageId = sendResult.apiMessageId || `ai_out_${Date.now()}`;

  // 3. Persiste mensagem enviada e atualiza última mensagem da conversa
  const rawPayload = buildAiMessagePayload({
    authorName: 'Lizandro (IA)',
    toolsUsed,
    situationKey,
    matchedKeywords,
    enforcedPhrases,
    relevantArticleIds,
    workflowKey,
    executionTimeMs,
    supportMode: 'automatico',
    modelEffective: modelEffective || config.model,
    fallbackReason,
  });

  const sendAt = now.toISOString();

  const outcomeRecorded = await recordDispatchOutcomeSafe(supabase, dispatchId, 'sent', apiMessageId, null);
  let messagePersisted = false;
  try {
    await persistOutboundMessageAndSyncConversation(supabase, {
      conversationId: inbound.conversationId,
      apiMessageId,
      replyToWamid: inbound.wamid,
      textContent: aiResponseText,
      status: 'sent',
      rawPayload,
      sendAt,
      syncConversationLastMessage: true,
      idempotent: !!durableJob,
    });
    messagePersisted = true;
  } catch (persistError) {
    console.error('[AI Dispatcher] A mensagem foi enviada, mas não foi persistida:', persistError);
  }

  markMessageProcessed(inbound.wamid);

  if (!outcomeRecorded || !messagePersisted) {
    return {
      executed: true,
      reason: 'automatic_sent_persistence_incomplete',
      error: 'A resposta foi enviada ao cliente, mas o registro do envio ficou incompleto. Não reenvie manualmente sem conferir a conversa.',
      apiMessageId,
      toolsUsed,
      situationDetected: situationKey,
      supportMode: 'automatico',
    };
  }

  return {
    executed: true,
    reason: 'automatic_sent',
    replyText: aiResponseText,
    apiMessageId,
    toolsUsed,
    situationDetected: situationKey,
    mandatoryPhrasesEnforced: enforcedPhrases,
    knowledgeArticlesUsed: relevantArticleIds,
    workflowApplied: workflowKey,
    executionTimeMs,
    supportMode: 'automatico',
  };
}
