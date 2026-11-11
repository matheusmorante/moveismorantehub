import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InboundMessageParams,
  WhatsAppAiAgentResult,
  WhatsAppAiAgentDependencies,
} from '../whatsappAiAgentTypes.js';
import {
  markMessageInFlight,
  releaseMessageInFlight,
  acquireDistributedAiTurnLock,
  isMessageAlreadyProcessedOrInFlight,
} from '../whatsappAiAgentSecurity.js';
import { evaluateTurnPreconditions } from './turnEligibility.js';
import { executeWhatsAppAiTurn } from './turnExecutionPipeline.js';

/**
 * Ponto de entrada chamado a partir do Webhook quando uma nova mensagem inbound é recebida
 */
export async function maybeTriggerWhatsAppAiAgent(
  supabase: SupabaseClient,
  inbound: InboundMessageParams,
  dependencies: WhatsAppAiAgentDependencies = {}
): Promise<WhatsAppAiAgentResult> {
  // 1. Prevenção imediata de duplicatas de webhook no processo (fast-path)
  if (!dependencies.durableJob && isMessageAlreadyProcessedOrInFlight(inbound.wamid)) {
    return { executed: false, reason: 'already_processed_or_in_flight' };
  }
  markMessageInFlight(inbound.wamid);

  try {
    // 2. Avaliação isolada de elegibilidade e pré-condições da conversa
    const eligibility = await evaluateTurnPreconditions(supabase, inbound);
    if (!eligibility.eligible || !eligibility.config || !eligibility.conv) {
      releaseMessageInFlight(inbound.wamid);
      return { executed: false, reason: eligibility.reason || 'ineligible_turn' };
    }

    const { config, settings, conv } = eligibility;

    // 3. Aquisição de trava compartilhada no PostgreSQL (Garantia física entre instâncias distribuídas)
    const targetModel = 'gpt-6-luna';
    const lockResult = await acquireDistributedAiTurnLock(supabase, {
      conversationId: inbound.conversationId,
      triggerWamid: inbound.wamid,
      triggerMessageId: inbound.messageId,
      // O webhook tem maxDuration de 60 s; a lease extra cobre a janela de
      // finalização sem permitir que outra instância assuma o turno no meio.
      leaseSeconds: 120,
      modelRequested: targetModel,
    });

    if (!lockResult.acquired) {
      releaseMessageInFlight(inbound.wamid);
      return {
        executed: false,
        reason: lockResult.reason === 'in_flight'
          ? 'conversation_turn_already_in_flight'
          : lockResult.reason || 'turn_lock_rejected',
      };
    }

    // 4. Executa turno do assistente sob lock distribuído
    return await executeWhatsAppAiTurn(
      supabase,
      inbound,
      conv,
      config,
      settings,
      dependencies,
      { turnId: lockResult.turnId, lockToken: lockResult.lockToken }
    );
  } catch (err: any) {
    releaseMessageInFlight(inbound.wamid);
    throw err;
  }
}
