/**
 * customerSupportHistoryService.ts
 *
 * Serviço de paginação e histórico de mensagens da Central de Atendimento.
 * Modularizado segundo o princípio de Single Responsibility (SRP):
 * - `./customerSupportHistoryTypes.js`: Colunas de projeção e contratos de cursores
 * - `./customerSupportSearchService.js`: Buscas em chat, buscas globais e contexto de saltos
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { mapRowToMessage } from './customerSupportMappers';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { buildAccentInsensitiveWordsRegex, buildPostgrestAccentInsensitiveWordsPattern } from '../../../../../shared-utils/searchText';
import {
  CONVERSATION_SELECT_COLUMNS,
  MESSAGE_SELECT_COLUMNS,
  type CustomerSupportHistoryCursor,
  type CustomerSupportHistoryPage,
} from './customerSupportHistoryTypes';

export * from './customerSupportHistoryTypes';
export * from './customerSupportSearchService';

/**
 * Busca histórico de mensagens de uma conversa com limite
 */
export async function fetchConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 80
): Promise<WhatsAppMessage[]> {
  if (!conversationId) return [];

  const response = await withTimeout<any>(
    supabase
      .from('whatsapp_messages')
      .select(MESSAGE_SELECT_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit),
    15_000,
    null,
    'central:mensagens'
  );
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar mensagens') };

  if (error || !data) {
    throw new Error('Não foi possível carregar as mensagens. Tente atualizar o histórico.');
  }

  return data.reverse().map(mapRowToMessage);
}

function applyTimestampCursor(query: any, before: { timestamp: string; id: string }) {
  const timestamp = JSON.stringify(before.timestamp);
  const filter = 'timestamp.lt.' + timestamp + ',and(timestamp.eq.' + timestamp + ',id.lt.' + before.id + ')';
  return query.or(filter);
}

export async function fetchPreviousConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  before: { timestamp: string; id: string },
  limit: number = 50
): Promise<WhatsAppMessage[]> {
  if (!conversationId) return [];
  const query = applyTimestampCursor(
    supabase
      .from('whatsapp_messages')
      .select(MESSAGE_SELECT_COLUMNS)
      .eq('conversation_id', conversationId),
    before
  )
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  const response = await withTimeout<any>(query, 15_000, null, 'central:mensagens-anteriores');
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar mensagens anteriores') };

  if (error || !data) {
    throw new Error('Não foi possível carregar as mensagens anteriores. Tente novamente.');
  }
  return data.reverse().map(mapRowToMessage);
}

const CUSTOMER_SUPPORT_HISTORY_PAGE_SIZE = 30;

function toHistoryPage(rows: any[], pageSize: number): CustomerSupportHistoryPage {
  const hasMore = rows.length > pageSize;
  const messages = rows.slice(0, pageSize).map(mapRowToMessage);
  const last = messages[messages.length - 1];
  return {
    messages,
    hasMore,
    nextCursor: last ? { timestamp: last.timestamp, id: last.id } : null,
  };
}

function applyHistoryCursor(query: any, cursor: CustomerSupportHistoryCursor | null) {
  return cursor ? applyTimestampCursor(query, cursor) : query;
}

function literalSupportSearchPattern(search: string): string {
  return buildPostgrestAccentInsensitiveWordsPattern(search);
}

async function fetchConversationHistoryPage(
  query: any,
  fallbackMessage: string,
  pageSize: number,
  label: string
): Promise<CustomerSupportHistoryPage> {
  const response = await withTimeout<any>(query, 15_000, null, label);
  const { data, error } = response || { data: null, error: new Error(fallbackMessage) };
  if (error || !Array.isArray(data)) throw new Error(fallbackMessage);
  return toHistoryPage(data, pageSize);
}

/** Activities are read from persisted comments/events and paged independently of the chat window. */
export function fetchConversationActivityPage(
  supabase: SupabaseClient,
  conversationId: string,
  cursor: CustomerSupportHistoryCursor | null = null,
  pageSize = CUSTOMER_SUPPORT_HISTORY_PAGE_SIZE
): Promise<CustomerSupportHistoryPage> {
  if (!conversationId) return Promise.resolve({ messages: [], hasMore: false, nextCursor: null });
  let query = supabase
    .from('whatsapp_messages')
    .select('id, conversation_id, message_type, text_content, timestamp, created_at')
    .eq('conversation_id', conversationId)
    .in('message_type', ['internal_note', 'system_event']);
  query = applyHistoryCursor(query, cursor)
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);
  return fetchConversationHistoryPage(
    query,
    'Não foi possível carregar as atividades. Tente novamente.',
    pageSize,
    'central:atividades'
  );
}

/** Attachments have their own cursor so the gallery is not limited to loaded chat messages. */
export async function fetchConversationAttachmentPage(
  supabase: SupabaseClient,
  conversationId: string,
  cursor: CustomerSupportHistoryCursor | null = null,
  search = '',
  pageSize = CUSTOMER_SUPPORT_HISTORY_PAGE_SIZE
): Promise<CustomerSupportHistoryPage> {
  if (!conversationId) return { messages: [], hasMore: false, nextCursor: null };
  const trimmedSearch = search.trim();
  const searchColumns = trimmedSearch ? ['text_content', 'media_filename', 'media_caption'] : [null];
  const pattern = trimmedSearch ? literalSupportSearchPattern(trimmedSearch) : null;
  const requests = searchColumns.map((column) => {
    let query = supabase
      .from('whatsapp_messages')
      .select(MESSAGE_SELECT_COLUMNS)
      .eq('conversation_id', conversationId)
      .in('message_type', ['image', 'document', 'audio', 'video', 'sticker'])
      .not('media_id', 'is', null);
    query = applyHistoryCursor(query, cursor)
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize + 1);
    if (column && pattern) query = query.filter(column, 'imatch', buildAccentInsensitiveWordsRegex(trimmedSearch));
    return withTimeout<any>(query, 15_000, null, 'central:anexos');
  });
  const responses = await Promise.all(requests);
  const failed = responses.some((response) => !response || response.error || !Array.isArray(response.data));
  if (failed) throw new Error('Não foi possível carregar os anexos. Tente novamente.');
  const rows = Array.from(
    new Map(
      responses
        .flatMap((response) => response.data as any[])
        .map((row) => [row.id, row])
    ).values()
  ).sort(
    (a: any, b: any) =>
      String(b.timestamp).localeCompare(String(a.timestamp)) || String(b.id).localeCompare(String(a.id))
  );
  return toHistoryPage(rows, pageSize);
}
