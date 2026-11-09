import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

/**
 * Atualiza o estado da IA na conversa ('active', 'needs_human', 'human_active', 'paused')
 */
export async function updateConversationAiStatus(
  supabase: SupabaseClient,
  conversationId: string,
  aiStatus: 'active' | 'needs_human' | 'human_active' | 'paused',
  reason?: string,
  assignToCurrentUser?: boolean
): Promise<boolean> {
  try {
    const response = await withTimeout<any>(
      supabase.rpc('customer_support_set_conversation_ai_status', {
        p_conversation_id: conversationId,
        p_ai_status: aiStatus,
        p_reason: reason || null,
        p_assign_to_current_user: Boolean(assignToCurrentUser),
      }),
      10_000,
      null,
      'central:set-ai-status'
    );
    return Boolean(response?.data?.success);
  } catch (err) {
    console.warn('[CustomerSupport] Erro ao atualizar status de IA da conversa:', err);
    return false;
  }
}
