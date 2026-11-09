import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppConversation, WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { mapRowToConversation, mapRowToMessage } from '../customerSupportMappers';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supportGlobalMessageSearchSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';
import {
  CONVERSATION_SELECT_COLUMNS,
  type CustomerSupportHistoryCursor,
} from '../customerSupportHistoryTypes';
import {
  applyColumnTimestampCursor,
  applyHistoryCursor,
  getGlobalSearchLimit,
  literalSupportSearchPattern,
  supportSearchOrFilters,
  withSupportSearchAbort,
} from './customerSupportSearchFilters';

const MESSAGE_GLOBAL_SEARCH_COLUMNS =
  'id, conversation_id, direction, message_type, text_content, media_filename, media_caption, timestamp, created_at';

export interface CustomerSupportGlobalSearchPage<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: CustomerSupportHistoryCursor | null;
}

export interface CustomerSupportGlobalMessageMatch {
  message: WhatsAppMessage;
  conversation: WhatsAppConversation;
}

/** Searches message content across conversations visible to the current operator via RLS. */
export async function fetchGlobalCustomerSupportMessagePage(
  supabase: SupabaseClient,
  search: string,
  cursor: CustomerSupportHistoryCursor | null = null,
  pageSize = 5,
  signal?: AbortSignal
): Promise<CustomerSupportGlobalSearchPage<CustomerSupportGlobalMessageMatch>> {
  const parsed = supportGlobalMessageSearchSchema.safeParse({ search });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Busca inválida.');
  const term = parsed.data.search;
  if (signal?.aborted) throw new Error('Busca cancelada.');

  const limit = getGlobalSearchLimit(pageSize);
  const pattern = literalSupportSearchPattern(term);
  let query = supabase
    .from('whatsapp_messages')
    .select(MESSAGE_GLOBAL_SEARCH_COLUMNS)
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
    'central:busca-global-mensagens'
  );
  if (signal?.aborted) throw new Error('Busca cancelada.');
  if (!response || response.error || !Array.isArray(response.data)) {
    throw new Error('Não foi possível pesquisar as mensagens. Tente novamente.');
  }

  const rows = response.data as any[];
  const pageRows = rows.slice(0, limit);
  const conversationIds = Array.from(new Set(pageRows.map((row) => String(row.conversation_id))));
  const conversationResponse = conversationIds.length
    ? await withTimeout<any>(
        withSupportSearchAbort(
          supabase.from('whatsapp_conversations').select(CONVERSATION_SELECT_COLUMNS).in('id', conversationIds),
          signal
        ),
        15_000,
        null,
        'central:busca-global-conversas'
      )
    : { data: [], error: null };
  if (signal?.aborted) throw new Error('Busca cancelada.');
  if (
    !conversationResponse ||
    conversationResponse.error ||
    !Array.isArray(conversationResponse.data)
  ) {
    throw new Error('Não foi possível carregar as conversas dos resultados. Tente novamente.');
  }
  const conversations = new Map<string, WhatsAppConversation>(
    conversationResponse.data.map((row: any) => [String(row.id), mapRowToConversation(row)] as const)
  );
  const items = pageRows.flatMap((row) => {
    const conversation = conversations.get(String(row.conversation_id));
    return conversation
      ? [
          {
            message: mapRowToMessage({
              ...row,
              api_message_id: null,
              media_id: null,
              media_mime_type: null,
              media_url: null,
              reply_to_message_id: null,
              reply_to_wamid: null,
              status: 'received',
              error_code: null,
              failure_reason: null,
              raw_payload: null,
            }),
            conversation,
          },
        ]
      : [];
  });
  const last = pageRows[pageRows.length - 1];
  return {
    items,
    hasMore: rows.length > limit,
    nextCursor: last ? { timestamp: last.timestamp || last.created_at, id: last.id } : null,
  };
}

/** Searches contact name and phone separately from message content, under the same conversation RLS. */
export async function fetchGlobalCustomerSupportContactPage(
  supabase: SupabaseClient,
  search: string,
  cursor: CustomerSupportHistoryCursor | null = null,
  pageSize = 5,
  signal?: AbortSignal
): Promise<CustomerSupportGlobalSearchPage<WhatsAppConversation>> {
  const parsed = supportGlobalMessageSearchSchema.safeParse({ search });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Busca inválida.');
  if (signal?.aborted) throw new Error('Busca cancelada.');

  const limit = getGlobalSearchLimit(pageSize);
  const term = parsed.data.search;
  const pattern = literalSupportSearchPattern(term);
  const digits = term.replace(/\D/g, '');
  const filters = [{ column: 'contact_name', pattern }];
  if (digits.length >= 3) {
    const phonePattern = literalSupportSearchPattern(digits);
    filters.push(
      { column: 'contact_phone', pattern: phonePattern },
      { column: 'contact_wa_id', pattern: phonePattern }
    );
  }
  let query = supabase.from('whatsapp_conversations').select(CONVERSATION_SELECT_COLUMNS).or(supportSearchOrFilters(filters));
  query = applyColumnTimestampCursor(query, 'created_at', cursor)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  const response = await withTimeout<any>(
    withSupportSearchAbort(query, signal),
    15_000,
    null,
    'central:busca-global-contatos'
  );
  if (signal?.aborted) throw new Error('Busca cancelada.');
  if (!response || response.error || !Array.isArray(response.data)) {
    throw new Error('Não foi possível pesquisar conversas por contato. Tente novamente.');
  }
  const rows = response.data as any[];
  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map(mapRowToConversation),
    hasMore: rows.length > limit,
    nextCursor: last ? { timestamp: last.created_at, id: last.id } : null,
  };
}
