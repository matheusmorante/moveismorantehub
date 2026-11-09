import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationStatus } from '@/pages/App/CustomerSupport/types';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

/** Marca a conversa como lida somente na central de atendimento. */
export async function markConversationAsRead(
  supabase: SupabaseClient,
  conversationId: string
): Promise<boolean> {
  try {
    const query = supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
    const pending = typeof (query as any).gt === 'function' ? (query as any).gt('unread_count', 0) : query;
    const response = await withTimeout<any>(pending, 10_000, null, 'central:marcar-como-lida');
    return Boolean(response && !response.error);
  } catch {
    return false;
  }
}

/** Marca manualmente a conversa como não lida somente na central de atendimento. */
export async function markConversationAsUnread(
  supabase: SupabaseClient,
  conversationId: string
): Promise<boolean> {
  try {
    const response = await withTimeout<any>(
      supabase.from('whatsapp_conversations').update({ unread_count: 1 }).eq('id', conversationId),
      10_000,
      null,
      'central:marcar-como-nao-lida'
    );
    return Boolean(response && !response.error);
  } catch {
    return false;
  }
}

/** The server derives current tags and actor; client snapshots are not authoritative. */
export async function updateConversationStatus(
  supabase: SupabaseClient,
  conversationId: string,
  newStatus: ConversationStatus,
  _currentTags: string[] = [],
  _currentUserName?: string
): Promise<boolean> {
  if (!['open', 'closed', 'snoozed'].includes(newStatus)) return false;
  const response = await withTimeout(
    supabase.rpc('customer_support_set_conversation_status', {
      p_conversation_id: conversationId,
      p_status: newStatus,
    }),
    15_000,
    null,
    'central:status'
  );
  return !response?.error && response?.data === true;
}

/** Alterna estado de arquivamento da conversa */
export async function toggleArchiveConversation(
  supabase: SupabaseClient,
  conversationId: string,
  currentArchived: boolean
): Promise<boolean> {
  return updateConversationStatus(supabase, conversationId, currentArchived ? 'open' : 'closed');
}
