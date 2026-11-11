import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppAiAgentResult } from '../whatsappAiAgentTypes.js';
import { markMessageProcessed } from '../whatsappAiAgentSecurity.js';

export interface PrepareDispatchIdempotencyResult {
  allowed: boolean;
  dispatchId?: string;
  earlyResult?: WhatsAppAiAgentResult;
}

export async function prepareDispatchIdempotency(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    wamid: string;
    turnId?: string;
    aiResponseText: string;
    toolsUsed: string[];
    situationKey: string | null;
  }
): Promise<PrepareDispatchIdempotencyResult> {
  const { conversationId, wamid, turnId, aiResponseText, toolsUsed, situationKey } = params;

  if (typeof supabase?.rpc !== 'function') {
    return {
      allowed: false,
      earlyResult: { executed: false, reason: 'dispatch_idempotency_unavailable', toolsUsed },
    };
  }

  const idempotencyKey = `ai_dispatch:${conversationId}:${wamid || 'nowamid'}`;

  try {
    const { data: prepareDispatch, error: prepareError } = await supabase.rpc(
      'customer_support_prepare_ai_dispatch',
      {
        p_idempotency_key: idempotencyKey,
        p_conversation_id: conversationId,
        p_turn_id: turnId || null,
        p_trigger_wamid: wamid || null,
        p_planned_text: aiResponseText,
      }
    );

    if (prepareError) {
      console.warn('[AI Dispatcher] Erro ao preparar despacho no PostgreSQL:', prepareError.message);
      return {
        allowed: false,
        earlyResult: { executed: false, reason: 'dispatch_idempotency_unavailable', toolsUsed },
      };
    }

    if (prepareDispatch && prepareDispatch.allowed === false) {
      markMessageProcessed(wamid);
      return {
        allowed: false,
        earlyResult: {
          executed: false,
          reason: prepareDispatch.reason || 'dispatch_not_allowed',
          toolsUsed,
          situationDetected: situationKey,
        },
      };
    }

    if (!prepareDispatch?.allowed || !prepareDispatch?.dispatch_id) {
      return {
        allowed: false,
        earlyResult: { executed: false, reason: 'dispatch_idempotency_unavailable', toolsUsed },
      };
    }

    return {
      allowed: true,
      dispatchId: prepareDispatch.dispatch_id,
    };
  } catch (rpcErr: any) {
    console.warn('[AI Dispatcher] Exceção ao preparar despacho:', rpcErr?.message || rpcErr);
    return {
      allowed: false,
      earlyResult: { executed: false, reason: 'dispatch_idempotency_unavailable', toolsUsed },
    };
  }
}
