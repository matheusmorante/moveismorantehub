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
    situationKey: string;
  }
): Promise<PrepareDispatchIdempotencyResult> {
  const { conversationId, wamid, turnId, aiResponseText, toolsUsed, situationKey } = params;

  if (typeof supabase?.rpc !== 'function') {
    return { allowed: true };
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
      return { allowed: true };
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

    return {
      allowed: true,
      dispatchId: prepareDispatch?.dispatch_id,
    };
  } catch (rpcErr: any) {
    console.warn('[AI Dispatcher] Exceção ao preparar despacho:', rpcErr?.message || rpcErr);
    return { allowed: true };
  }
}
