import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import type {
  InboundMessageParams,
  WhatsAppConversationLike,
} from '../whatsappAiAgentTypes.js';
import { isPhoneNumberAuthorizedForTesting } from '../whatsappAiAgentSecurity.js';

export interface TurnEligibilityResult {
  eligible: boolean;
  reason?: string;
  config?: WhatsAppAiAgentConfig;
  settings?: any;
  conv?: WhatsAppConversationLike;
}

/**
 * Avalia as pré-condições necessárias para o disparo de um turno de IA:
 * 1. Agente ativado nas configurações
 * 2. Modo de suporte não exclusivo para humanos
 * 3. Validação do modo de testes obrigatório para o número remetente
 * 4. Conversa existente, não arquivada, não atribuída a humano e sem tag ativa de atendimento humano
 */
export async function evaluateTurnPreconditions(
  supabase: SupabaseClient,
  inbound: InboundMessageParams
): Promise<TurnEligibilityResult> {
  const { data: settingsRow } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();

  const settings = settingsRow?.data;
  const config = settings?.whatsappAiAgent as WhatsAppAiAgentConfig | undefined;

  if (!config || config.enabled !== true) {
    return { eligible: false, reason: 'agent_disabled' };
  }

  if (config.supportMode === 'humano') {
    return { eligible: false, reason: 'mode_human_only' };
  }

  const isAuthorized = isPhoneNumberAuthorizedForTesting(
    inbound.from,
    inbound.contactPhoneE164,
    config.testPhoneNumbers
  );

  if (!isAuthorized) {
    return { eligible: false, reason: 'unauthorized_phone_number' };
  }

  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('id, assigned_to, is_archived, tags, customer_id, contact_phone, ai_status')
    .eq('id', inbound.conversationId)
    .maybeSingle();

  if (!conv || conv.is_archived) {
    return { eligible: false, reason: 'conversation_archived_or_missing' };
  }

  if (conv.assigned_to) {
    return { eligible: false, reason: 'assigned_to_human_attendant' };
  }

  if (
    (Array.isArray(conv.tags) && conv.tags.includes('atendimento_humano')) ||
    conv.ai_status === 'needs_human'
  ) {
    return { eligible: false, reason: 'handoff_to_human_active' };
  }

  if (conv.ai_status && ['human_active', 'paused'].includes(conv.ai_status)) {
    return { eligible: false, reason: `ai_status_${conv.ai_status}` };
  }

  return {
    eligible: true,
    config,
    settings,
    conv,
  };
}
