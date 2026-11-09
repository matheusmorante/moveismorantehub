export interface WhatsAppAiAgentDependencies {
  /** @deprecated Ignored; retained for legacy test and caller compatibility. */
  fetchGemini?: typeof fetch;
  fetchOpenAi?: typeof fetch;
  fetchMeta?: typeof fetch;
  /** @deprecated Ignored; credentials are read from OPENAI_API_KEY on the server. */
  geminiApiKey?: string;
  openAiApiKey?: string;
  whatsappAccessToken?: string;
  now?: () => Date;
}

export interface InboundMessageParams {
  conversationId: string;
  messageId: string;
  from: string;
  contactPhoneE164: string;
  contactProfile?: string | null;
  text: string;
  wamid: string;
  businessPhoneNumberId: string;
}

export interface WhatsAppConversationLike {
  id: string;
  assigned_to?: string | null;
  is_archived?: boolean;
  tags?: string[] | null;
  customer_id?: string | null;
  contact_phone?: string | null;
  ai_status?: 'active' | 'needs_human' | 'human_active' | 'paused' | string | null;
  ai_handoff_reason?: string | null;
  ai_handoff_at?: string | null;
}

export interface WhatsAppAiAgentResult {
  executed: boolean;
  reason?: string;
  replyText?: string;
  apiMessageId?: string;
  toolsUsed?: string[];
  situationDetected?: string | null;
  mandatoryPhrasesEnforced?: string[];
  knowledgeArticlesUsed?: string[];
  workflowApplied?: string | null;
  executionTimeMs?: number;
  supportMode?: string;
  error?: string;
}
