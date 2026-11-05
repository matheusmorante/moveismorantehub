import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { mapRowToMessage } from './customerSupportMappers';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

export async function fetchInitialConversationMessagePage(client: SupabaseClient, conversationId: string, limit = 80) {
  const { data, error } = await withAbortTimeout(client.rpc('customer_support_message_page', {
    p_conversation_id: conversationId, p_limit: limit,
  }), 'central:primeira-pagina-mensagens', 15_000);
  if (error || !Array.isArray(data?.messages) || !data?.watermark) throw new Error('Não foi possível carregar as mensagens. Tente atualizar o histórico.');
  return { messages: data.messages.map(mapRowToMessage) as WhatsAppMessage[], watermark: String(data.watermark) };
}

export async function fetchConversationMessageChanges(
  client: SupabaseClient, conversationId: string, since: string | null, current: WhatsAppMessage[], signal?: AbortSignal,
) {
  const known = Object.fromEntries(current.filter((message) => message.changedAt).map((message) => [message.id, message.changedAt]));
  const messages: WhatsAppMessage[] = [];
  let after: { changedAt: string; id: string } | null = null;
  let watermark: string | null = null;
  do {
    const response: { data: any; error: unknown } = await withAbortTimeout(client.rpc('customer_support_message_changes', {
      p_conversation_id: conversationId, p_since: since, p_known: known,
      p_after_changed_at: after?.changedAt || null, p_after_id: after?.id || null, p_until: watermark,
    }), 'central:alteracoes-mensagens', 15_000, signal);
    const data: any = response.data;
    const error: unknown = response.error;
    if (error || !Array.isArray(data?.messages) || !data?.watermark) throw new Error('Não foi possível atualizar as mensagens. Tente novamente.');
    messages.push(...data.messages.map(mapRowToMessage));
    watermark = String(data.watermark);
    if (!data.hasMore) break;
    if (!data.nextCursor?.id || !data.nextCursor?.changedAt || (after?.id === data.nextCursor.id && after?.changedAt === data.nextCursor.changedAt)) {
      throw new Error('A sincronização do histórico não avançou. Tente atualizar.');
    }
    after = data.nextCursor;
  } while (!signal?.aborted);
  return { messages, watermark: watermark! };
}

export function mergeSupportMessageChanges(current: WhatsAppMessage[], incoming: WhatsAppMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => {
    const existing = byId.get(message.id);
    if (existing?.changedAt && message.changedAt) {
      const difference = Date.parse(existing.changedAt) - Date.parse(message.changedAt);
      const fraction = (value: string) => (value.match(/\.(\d+)/)?.[1] || '').padEnd(9, '0');
      if (difference > 0 || (difference === 0 && fraction(existing.changedAt) > fraction(message.changedAt))) return;
    }
    byId.set(message.id, { ...existing, ...message });
  });
  return [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
}
