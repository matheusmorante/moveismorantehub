import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from '../whatsappAiAgentTools.js';
import type { AiModelErrorInfo } from '../whatsappAiErrorClassifier.js';

export interface RunAiTurnWithFallbackOptions {
  modelToUse: string;
  /** @deprecated Ignored; every turn uses the OpenAI runner. */
  shouldUseOpenAi?: boolean;
  openAiApiKey?: string;
  /** @deprecated Ignored; Gemini is no longer a provider. */
  geminiApiKey?: string;
  fetchOpenAi: typeof fetch;
  /** @deprecated Ignored; Gemini is no longer a provider. */
  fetchGemini?: typeof fetch;
  systemInstructionText: string;
  historyForOpenAi: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** @deprecated Ignored; requests use OpenAI messages. */
  contentsForGemini?: any[];
  toolsDeclarations: any[];
  /** @deprecated Ignored; tools use the OpenAI schema. */
  toolsPayloadGemini?: any[];
  supabase: SupabaseClient;
  toolContext?: SafeToolContext;
  onToolExecuted?: (name: string, args: any, result: any) => void;
}

export interface RunAiTurnResult {
  text: string;
  toolsCalled: string[];
  modelRequested: string;
  modelEffective: string;
  fallbackReason: string | null;
  errorInfo?: AiModelErrorInfo;
  quotaBlocked?: boolean;
  handoffConfirmed?: boolean;
  reservationId?: string;
}
