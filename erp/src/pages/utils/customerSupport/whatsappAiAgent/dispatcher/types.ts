import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import type {
  InboundMessageParams,
  WhatsAppNativeCatalogProduct,
  WhatsAppConversationLike,
} from '../whatsappAiAgentTypes.js';

export interface DispatchAiResponseParams {
  supabase: SupabaseClient;
  inbound: InboundMessageParams;
  conv: WhatsAppConversationLike;
  config: WhatsAppAiAgentConfig;
  settings: any;
  aiResponseText: string;
  toolsUsed: string[];
  nativeCatalogProducts?: WhatsAppNativeCatalogProduct[];
  situationKey: string | null;
  matchedKeywords: string[];
  enforcedPhrases: string[];
  relevantArticleIds: string[];
  workflowKey: string | null;
  executionTimeMs: number;
  accessToken: string;
  fetchMeta: typeof fetch;
  now: Date;
  turnId?: string;
  modelEffective?: string;
  fallbackReason?: string | null;
  isQuotaBlocked?: boolean;
  isSilentHandoff?: boolean;
  durableJob?: { id: string; token: string };
}

export interface BuildAiPayloadOptions {
  isSuggestion?: boolean;
  authorName: string;
  toolsUsed: string[];
  situationKey: string | null;
  matchedKeywords: string[];
  enforcedPhrases: string[];
  relevantArticleIds: string[];
  workflowKey: string | null;
  executionTimeMs: number;
  supportMode: 'automatico' | 'assistido';
  modelEffective?: string;
  fallbackReason?: string | null;
}
