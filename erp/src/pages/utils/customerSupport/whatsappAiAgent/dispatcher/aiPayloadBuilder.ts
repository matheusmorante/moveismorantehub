import type { BuildAiPayloadOptions } from './types.js';

export function buildAiMessagePayload(options: BuildAiPayloadOptions): Record<string, any> {
  const payload: Record<string, any> = {
    origin: 'customer_support_ai_agent',
    is_ai: true,
    author_name: options.authorName,
    tools_used: options.toolsUsed,
    situation_detected: options.situationKey,
    matched_keywords: options.matchedKeywords,
    mandatory_phrases_enforced: options.enforcedPhrases,
    knowledge_used: options.relevantArticleIds,
    workflow: options.workflowKey,
    execution_time_ms: options.executionTimeMs,
    support_mode: options.supportMode,
    model_effective: options.modelEffective,
    fallback_reason: options.fallbackReason || null,
  };
  if (options.isSuggestion) {
    payload.is_suggestion = true;
  }
  return payload;
}
