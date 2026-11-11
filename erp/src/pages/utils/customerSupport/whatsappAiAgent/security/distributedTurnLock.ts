import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isConversationTurnInFlight,
  markConversationInFlight,
  releaseConversationInFlight,
} from './inMemoryDeduplicator.js';

export interface AcquireTurnLockParams {
  conversationId: string;
  triggerWamid?: string;
  triggerMessageId?: string;
  leaseSeconds?: number;
  modelRequested?: string;
}

export interface AcquireTurnLockResult {
  acquired: boolean;
  turnId?: string;
  lockToken?: string;
  reason?: string;
  expiresAt?: string;
  pendingMessagesCount?: number;
}

/**
 * Adquire trava atômica distribuída no PostgreSQL via RPC customer_support_acquire_ai_turn.
 * Garante que em múltiplas instâncias serverless (Vercel) apenas UMA execução por conversa
 * possa gerar respostas ativas simultaneamente, recuperando travas abandonadas e registrando
 * mensagens pendentes recebidas durante o processamento.
 */
export async function acquireDistributedAiTurnLock(
  supabase: SupabaseClient,
  params: AcquireTurnLockParams
): Promise<AcquireTurnLockResult> {
  const {
    conversationId,
    triggerWamid,
    triggerMessageId,
    leaseSeconds = 60,
    modelRequested,
  } = params;

  // 1. Defesa em memória rápida local
  if (isConversationTurnInFlight(conversationId)) {
    return {
      acquired: false,
      reason: 'in_flight',
    };
  }

  // 2. Trava atômica no banco de dados (Garantia física entre instâncias distribuídas)
  if (typeof supabase?.rpc !== 'function') {
    return { acquired: false, reason: 'distributed_lock_unavailable' };
  }

  try {
    const { data, error } = await supabase.rpc('customer_support_acquire_ai_turn', {
      p_conversation_id: conversationId,
      p_trigger_wamid: triggerWamid || null,
      p_trigger_message_id: triggerMessageId || null,
      p_lease_seconds: leaseSeconds,
      p_model_requested: modelRequested || null,
    });

    if (error) {
      console.warn('[Distributed Lock] Erro ao chamar customer_support_acquire_ai_turn:', error.message);
      return { acquired: false, reason: 'distributed_lock_unavailable' };
    }

    if (data && data.acquired === true) {
      markConversationInFlight(conversationId);
      return {
        acquired: true,
        turnId: data.turn_id,
        lockToken: data.lock_token,
        expiresAt: data.expires_at,
      };
    }

    return {
      acquired: false,
      reason: data?.reason || 'in_flight',
      lockToken: data?.lock_token,
      turnId: data?.turn_id,
      expiresAt: data?.expires_at,
      pendingMessagesCount: data?.pending_messages_count,
    };
  } catch (err: any) {
    console.warn('[Distributed Lock] Exceção ao adquirir trava:', err?.message || err);
    return { acquired: false, reason: 'distributed_lock_unavailable' };
  }
}

export interface CompleteTurnLockParams {
  turnId?: string;
  lockToken?: string;
  conversationId: string;
  status: 'completed' | 'failed';
  modelEffective?: string;
  fallbackReason?: string | null;
  metadata?: Record<string, any>;
}

export interface CompleteTurnLockResult {
  success: boolean;
  hasPending: boolean;
  pendingCount: number;
  latestPendingMessageId?: string;
  latestPendingText?: string;
}

/**
 * Libera a trava atômica no PostgreSQL via RPC customer_support_complete_ai_turn
 * e retorna se novas mensagens do cliente chegaram durante a execução da resposta.
 */
export async function completeDistributedAiTurnLock(
  supabase: SupabaseClient,
  params: CompleteTurnLockParams
): Promise<CompleteTurnLockResult> {
  const {
    turnId,
    lockToken,
    conversationId,
    status,
    modelEffective,
    fallbackReason,
    metadata = {},
  } = params;

  releaseConversationInFlight(conversationId);

  if (!turnId || !lockToken || turnId.startsWith('local-')) {
    return { success: false, hasPending: false, pendingCount: 0 };
  }

  try {
    const { data, error } = await supabase.rpc('customer_support_complete_ai_turn', {
      p_turn_id: turnId,
      p_lock_token: lockToken,
      p_status: status,
      p_model_effective: modelEffective || null,
      p_fallback_reason: fallbackReason || null,
      p_metadata: metadata,
    });

    if (error) {
      console.warn('[Distributed Lock] Erro ao chamar customer_support_complete_ai_turn:', error.message);
      return { success: false, hasPending: false, pendingCount: 0 };
    }

    return {
      success: data?.success === true,
      hasPending: data?.has_pending === true,
      pendingCount: data?.pending_count || 0,
      latestPendingMessageId: data?.latest_pending_message_id,
      latestPendingText: data?.latest_pending_text,
    };
  } catch (err: any) {
    console.warn('[Distributed Lock] Exceção ao finalizar trava:', err?.message || err);
    return { success: false, hasPending: false, pendingCount: 0 };
  }
}
