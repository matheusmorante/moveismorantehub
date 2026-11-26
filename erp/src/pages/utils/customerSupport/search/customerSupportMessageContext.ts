import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { mapRowToMessage } from '../query/customerSupportMappers';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { MESSAGE_SELECT_COLUMNS } from '../query/customerSupportHistoryTypes';
import { applyTimestampCursor } from './customerSupportSearchFilters';

export interface CustomerSupportMessageContext {
  messages: WhatsAppMessage[];
  hasOlderMessages: boolean;
}

/** Loads a message plus neighboring history so global search can jump to unloaded messages. */
export async function fetchConversationMessageContext(
  supabase: SupabaseClient,
  conversationId: string,
  messageId: string,
  contextSize = 10,
  resolvedTarget?: WhatsAppMessage
): Promise<CustomerSupportMessageContext> {
  if (!conversationId || !messageId) {
    return { messages: [], hasOlderMessages: false };
  }
  let target: WhatsAppMessage;
  if (resolvedTarget) {
    if (resolvedTarget.conversationId !== conversationId || resolvedTarget.id !== messageId) {
      throw new Error('A mensagem citada não pertence a esta conversa.');
    }
    target = resolvedTarget;
  } else {
    const targetResponse = await withTimeout<any>(
      supabase
        .from('whatsapp_messages')
        .select(MESSAGE_SELECT_COLUMNS)
        .eq('conversation_id', conversationId)
        .eq('id', messageId)
        .maybeSingle(),
      15_000,
      null,
      'central:mensagem-alvo'
    );
    if (!targetResponse || targetResponse.error || !targetResponse.data) {
      throw new Error('Não foi possível localizar essa mensagem no histórico da conversa.');
    }
    target = mapRowToMessage(targetResponse.data);
  }
  const cursor = { timestamp: target.timestamp, id: target.id };
  const limit = Math.max(1, Math.min(20, Math.trunc(contextSize) || 10));
  const beforeQuery = applyTimestampCursor(
    supabase
      .from('whatsapp_messages')
      .select(MESSAGE_SELECT_COLUMNS)
      .eq('conversation_id', conversationId),
    cursor
  )
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  const afterTimestamp = JSON.stringify(cursor.timestamp);
  const afterQuery = supabase
    .from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .or('timestamp.gt.' + afterTimestamp + ',and(timestamp.eq.' + afterTimestamp + ',id.gt.' + cursor.id + ')')
    .order('timestamp', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);
  const [beforeResponse, afterResponse] = await Promise.all([
    withTimeout<any>(beforeQuery, 15_000, null, 'central:mensagem-contexto-anterior'),
    withTimeout<any>(afterQuery, 15_000, null, 'central:mensagem-contexto-posterior'),
  ]);
  if (
    !beforeResponse ||
    beforeResponse.error ||
    !Array.isArray(beforeResponse.data) ||
    !afterResponse ||
    afterResponse.error ||
    !Array.isArray(afterResponse.data)
  ) {
    throw new Error('Não foi possível carregar o contexto da mensagem. Tente novamente.');
  }
  const beforeRows = beforeResponse.data.slice(0, limit).reverse();
  const rows = [
    ...beforeRows.map(mapRowToMessage),
    target,
    ...afterResponse.data.map(mapRowToMessage),
  ];
  const uniqueRows = Array.from(new Map(rows.map((message) => [message.id, message])).values()).sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
  );
  return {
    messages: uniqueRows,
    hasOlderMessages: beforeResponse.data.length > limit,
  };
}

/** Resolve a quoted source only inside the same conversation and under the caller's RLS. */
export async function fetchConversationReplyTarget(
  supabase: SupabaseClient,
  conversationId: string,
  reference: { messageId?: string | null; apiMessageId?: string | null }
): Promise<WhatsAppMessage | null> {
  if (!conversationId || (!reference.messageId && !reference.apiMessageId)) return null;
  const find = async (column: 'id' | 'api_message_id', value: string) => {
    const query = supabase
      .from('whatsapp_messages')
      .select(MESSAGE_SELECT_COLUMNS)
      .eq('conversation_id', conversationId)
      .eq(column, value);
    const response = await withTimeout<any>(query.maybeSingle(), 10_000, null, 'central:mensagem-citada');
    if (!response || response.error) throw new Error('Não foi possível localizar a mensagem citada.');
    return response.data ? mapRowToMessage(response.data) : null;
  };
  if (reference.messageId) {
    const byLocalId = await find('id', reference.messageId);
    if (byLocalId || !reference.apiMessageId) return byLocalId;
  }
  return reference.apiMessageId ? find('api_message_id', reference.apiMessageId) : null;
}
