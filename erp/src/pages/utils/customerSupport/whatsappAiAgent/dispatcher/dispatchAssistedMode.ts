import type { WhatsAppAiAgentResult } from '../whatsappAiAgentTypes.js';
import { markMessageProcessed } from '../whatsappAiAgentSecurity.js';
import type { DispatchAiResponseParams } from './types.js';
import { buildAiMessagePayload } from './aiPayloadBuilder.js';
import { persistOutboundMessageAndSyncConversation } from './dispatchOutcomeRecorder.js';

export async function dispatchAssistedMode(
  params: DispatchAiResponseParams
): Promise<WhatsAppAiAgentResult> {
  const {
    supabase,
    inbound,
    config,
    aiResponseText,
    toolsUsed,
    situationKey,
    matchedKeywords,
    enforcedPhrases,
    relevantArticleIds,
    workflowKey,
    executionTimeMs,
    now,
    modelEffective,
    fallbackReason,
  } = params;

  const sendAt = now.toISOString();
  const suggestionMessageId = `ai_sug_${Date.now()}`;
  const rawPayload = buildAiMessagePayload({
    isSuggestion: true,
    authorName: 'Lizandro (Sugestão IA)',
    toolsUsed,
    situationKey,
    matchedKeywords,
    enforcedPhrases,
    relevantArticleIds,
    workflowKey,
    executionTimeMs,
    supportMode: 'assistido',
    modelEffective: modelEffective || config.model,
    fallbackReason,
  });

  await persistOutboundMessageAndSyncConversation(supabase, {
    conversationId: inbound.conversationId,
    apiMessageId: suggestionMessageId,
    replyToWamid: inbound.wamid,
    textContent: aiResponseText,
    status: 'suggested',
    rawPayload,
    sendAt,
    syncConversationLastMessage: false,
  });

  markMessageProcessed(inbound.wamid);

  return {
    executed: true,
    reason: 'assisted_mode_suggested',
    replyText: aiResponseText,
    apiMessageId: suggestionMessageId,
    toolsUsed,
    situationDetected: situationKey,
    mandatoryPhrasesEnforced: enforcedPhrases,
    knowledgeArticlesUsed: relevantArticleIds,
    workflowApplied: workflowKey,
    executionTimeMs,
    supportMode: 'assistido',
  };
}
