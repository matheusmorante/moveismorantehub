import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InboundMessageParams,
  WhatsAppConversationLike,
  WhatsAppAiAgentDependencies,
  WhatsAppAiAgentResult,
} from '../whatsappAiAgentTypes.js';
import type { WhatsAppAiAgentConfig } from '../../../settings/types.js';
import { completeDistributedAiTurnLock } from '../whatsappAiAgentSecurity.js';
import { checkAndPrepareNextPendingTurn } from './pendingMessageChainer.js';

interface FinalizeTurnAndChainOptions {
  supabase: SupabaseClient;
  inbound: InboundMessageParams;
  conv: WhatsAppConversationLike;
  config: WhatsAppAiAgentConfig;
  settings: any;
  dependencies: WhatsAppAiAgentDependencies;
  turnLock?: { turnId?: string; lockToken?: string };
  chainedCount: number;
  dispatchResult: WhatsAppAiAgentResult;
  aiTurnResult: {
    modelEffective: string;
    fallbackReason: string | null;
    quotaBlocked?: boolean;
  };
  toolsUsed: string[];
  startTime: number;
  now: Date;
  isHandoff: boolean;
  targetModel: string;
  executeTurnFn: (
    supabase: SupabaseClient,
    inbound: InboundMessageParams,
    conv: WhatsAppConversationLike,
    config: WhatsAppAiAgentConfig,
    settings: any,
    dependencies: WhatsAppAiAgentDependencies,
    turnLock?: { turnId?: string; lockToken?: string },
    chainedCount?: number
  ) => Promise<WhatsAppAiAgentResult>;
}

export async function finalizeTurnAndChainPending(
  options: FinalizeTurnAndChainOptions
): Promise<WhatsAppAiAgentResult> {
  const {
    supabase,
    inbound,
    conv,
    config,
    settings,
    dependencies,
    turnLock,
    chainedCount,
    dispatchResult,
    aiTurnResult,
    toolsUsed,
    startTime,
    now,
    isHandoff,
    targetModel,
    executeTurnFn,
  } = options;

  if (!turnLock) {
    return dispatchResult;
  }

  const completeResult = await completeDistributedAiTurnLock(supabase, {
    turnId: turnLock.turnId,
    lockToken: turnLock.lockToken,
    conversationId: inbound.conversationId,
    status: dispatchResult.executed ? 'completed' : 'failed',
    modelEffective: aiTurnResult.modelEffective,
    fallbackReason: aiTurnResult.fallbackReason,
    metadata: {
      toolsUsed,
      executionTimeMs: Date.now() - startTime,
      dispatchExecuted: dispatchResult.executed,
      dispatchReason: dispatchResult.reason,
    },
  });

  // Se novas mensagens do cliente chegaram durante o turno atual, processar em cadeia
  if (
    completeResult.hasPending &&
    !isHandoff &&
    !aiTurnResult.quotaBlocked &&
    chainedCount < 3
  ) {
    const chained = await checkAndPrepareNextPendingTurn({
      supabase,
      conversationId: inbound.conversationId,
      now,
      targetModel,
    });

    if (chained?.nextLock && chained?.chainedInbound) {
      const nextInbound: InboundMessageParams = {
        ...inbound,
        ...chained.chainedInbound,
      };
      return await executeTurnFn(
        supabase,
        nextInbound,
        conv,
        config,
        settings,
        dependencies,
        chained.nextLock,
        chainedCount + 1
      );
    }
  }

  return dispatchResult;
}
