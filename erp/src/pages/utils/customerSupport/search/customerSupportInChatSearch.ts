import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supportMessageSearchSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';
import {
  MESSAGE_SELECT_COLUMNS,
  type CustomerSupportHistoryCursor,
  type CustomerSupportHistoryPage,
} from '../customerSupportHistoryTypes';
import {
  applyHistoryCursor,
  literalSupportSearchPattern,
  supportSearchOrFilters,
  toHistoryPage,
  withSupportSearchAbort,
} from './customerSupportSearchFilters';

/** Search all persisted messages under the caller's RLS, with a bounded cursor page. */
export async function fetchConversationMessageSearchPage(
  supabase: SupabaseClient,
  conversationId: string,
  cursor: CustomerSupportHistoryCursor | null = null,
  search = '',
  pageSize = 5,
  signal?: AbortSignal
): Promise<CustomerSupportHistoryPage> {
  const trimmedSearch = search.trim();
  if (!conversationId || !trimmedSearch) return { messages: [], hasMore: false, nextCursor: null };
  const parsed = supportMessageSearchSchema.safeParse({ search });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Busca inválida.');
  const pattern = literalSupportSearchPattern(parsed.data.search);
  const limit = Math.max(1, Math.min(5, Math.trunc(pageSize) || 5));
  let query = supabase
    .from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .or(
      supportSearchOrFilters(
        ['text_content', 'media_filename', 'media_caption'].map((column) => ({ column, pattern }))
      )
    );
  query = applyHistoryCursor(query, cursor)
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  const response = await withTimeout<any>(
    withSupportSearchAbort(query, signal),
    15_000,
    null,
    'central:busca-mensagens'
  );
  if (signal?.aborted) throw new Error('Busca cancelada.');
  if (!response || response.error || !Array.isArray(response.data)) {
    throw new Error('Não foi possível pesquisar as mensagens. Tente novamente.');
  }
  return toHistoryPage(response.data, limit);
}
