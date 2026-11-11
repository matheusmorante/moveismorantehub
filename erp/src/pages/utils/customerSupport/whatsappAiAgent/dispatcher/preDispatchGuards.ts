import type { WhatsAppAiAgentResult } from '../whatsappAiAgentTypes.js';
import type { WhatsAppAiAgentConfig } from '../../settings/types.js';
import {
  isPhoneNumberAuthorizedForTesting,
  markMessageProcessed,
} from '../whatsappAiAgentSecurity.js';
import type { DispatchAiResponseParams } from './types.js';

export interface PreDispatchGuardResult {
  canProceed: boolean;
  earlyResult?: WhatsAppAiAgentResult;
}

export async function evaluatePreDispatchGuards(
  params: DispatchAiResponseParams
): Promise<PreDispatchGuardResult> {
  const {
    supabase,
    inbound,
    config,
    situationKey,
    toolsUsed,
  } = params;

  // 1. Revalidação da conversa no banco imediatamente antes de disparar
  const { data: latestConv, error: conversationError } = await supabase
    .from('whatsapp_conversations')
    .select('assigned_to, is_archived, tags, ai_status')
    .eq('id', inbound.conversationId)
    .maybeSingle();

  if (conversationError) throw new Error('Não foi possível revalidar a conversa antes do envio.');
  if (!latestConv || latestConv.is_archived) {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: { executed: false, reason: 'conversation_archived_during_processing', toolsUsed },
    };
  }

  if (latestConv.assigned_to) {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: { executed: false, reason: 'assigned_to_human_during_processing', toolsUsed },
    };
  }

  // 2. ESCALONAMENTO SILENCIOSO: NÃO envia mensagem no WhatsApp do cliente quando a IA não sabe responder ou endereço não foi localizado!
  if (params.isSilentHandoff) {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: {
        executed: true,
        reason: 'silent_handoff_no_customer_message',
        toolsUsed,
        situationDetected: situationKey,
      },
    };
  }

  const isHandoffNotification =
    situationKey === 'solicitacao_atendente' ||
    toolsUsed.includes('encaminharParaAtendimentoHumano') ||
    params.isQuotaBlocked === true;

  if (
    !isHandoffNotification &&
    (
      (latestConv.ai_status && ['human_active', 'paused'].includes(latestConv.ai_status)) ||
      (Array.isArray(latestConv.tags) && latestConv.tags.includes('atendimento_humano'))
    )
  ) {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: { executed: false, reason: 'handoff_to_human_during_processing', toolsUsed },
    };
  }

  // 3. Revalidação das configurações ativas
  const { data: latestSettings, error: settingsError } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();

  const latestConfig = latestSettings?.data?.whatsappAiAgent as WhatsAppAiAgentConfig | undefined;
  if (settingsError) throw new Error('Não foi possível revalidar as configurações antes do envio.');
  if (!latestConfig || latestConfig.enabled !== true) {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: { executed: false, reason: 'disabled_during_processing', toolsUsed },
    };
  }

  // A geração pode durar vários segundos. Se o administrador mudar o modo
  // durante esse intervalo, descarte a resposta em vez de enviá-la com a
  // política antiga (por exemplo, automático após mudar para humano/assistido).
  if (latestConfig.supportMode !== config.supportMode || latestConfig.supportMode === 'humano') {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: { executed: false, reason: 'support_mode_changed_during_processing', toolsUsed },
    };
  }

  // 4. Revalidação estrita do número de teste autorizado imediatamente antes do envio
  const allowedNumbers = latestConfig?.testPhoneNumbers ?? config.testPhoneNumbers;
  const isStillAuthorized = isPhoneNumberAuthorizedForTesting(
    inbound.from,
    inbound.contactPhoneE164,
    allowedNumbers
  );

  if (!isStillAuthorized) {
    markMessageProcessed(inbound.wamid);
    return {
      canProceed: false,
      earlyResult: {
        executed: false,
        reason: 'unauthorized_phone_number_pre_dispatch_guard',
        toolsUsed,
        situationDetected: situationKey,
      },
    };
  }

  return { canProceed: true };
}
