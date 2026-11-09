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
  } = params;

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
    if (dispatchId) {
      await supabase.rpc('customer_support_record_ai_dispatch_outcome', {
        p_dispatch_id: dispatchId,
        p_status: 'failed',
        p_api_message_id: null,
        p_error_message: 'channel_credentials_missing',
      });
    }
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: 'channel_credentials_missing',
      toolsUsed,
      situationDetected: situationKey,
    };
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
    await recordDispatchOutcomeSafe(
      supabase,
      dispatchId,
      sendResult.status,
      null,
      sendResult.error || 'Meta API delivery failed'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: sendResult.status === 'uncertain' ? 'meta_api_network_error_outcome_uncertain' : 'meta_api_rejected',
      error: sendResult.error,
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  const apiMessageId = sendResult.apiMessageId || `ai_out_${Date.now()}`;
  await recordDispatchOutcomeSafe(supabase, dispatchId, 'sent', apiMessageId, null);

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

  await persistOutboundMessageAndSyncConversation(supabase, {
    conversationId: inbound.conversationId,
    apiMessageId,
    replyToWamid: inbound.wamid,
    textContent: aiResponseText,
    status: 'sent',
    rawPayload,
    sendAt,
    syncConversationLastMessage: true,
  });

  markMessageProcessed(inbound.wamid);

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
