import { SupabaseClient } from '@supabase/supabase-js';
import { WhatsAppConversation, WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { mapRowToConversation, mapRowToMessage } from './customerSupportMappers';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { buildPostgrestAccentInsensitivePattern } from '../../../../../shared-utils/searchText';
import {
  supportGlobalMessageSearchSchema,
  supportMessageSearchSchema,
} from '../../../../../shared-utils/customerSupportFormSchemas';

export const CONVERSATION_SELECT_COLUMNS =
  'id, business_phone_number_id, contact_phone, contact_wa_id, contact_name, customer_id, customer_link_status, last_message_text, last_message_at, last_customer_message_at, unread_count, is_archived, internal_notes, tags, assigned_to, created_at, updated_at';

export const MESSAGE_SELECT_COLUMNS =
  'id, conversation_id, api_message_id, direction, message_type, text_content, media_id, media_mime_type, media_url, media_filename, media_caption, reply_to_message_id, reply_to_wamid, status, error_code, failure_reason, raw_payload, timestamp, created_at';

const MESSAGE_GLOBAL_SEARCH_COLUMNS =
  'id, conversation_id, direction, message_type, text_content, media_filename, media_caption, timestamp, created_at';

/**
 * Busca histórico de mensagens de uma conversa com limite
 */
export async function fetchConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 80
): Promise<WhatsAppMessage[]> {
  if (!conversationId) return [];

  const response = await withTimeout<any>(supabase
    .from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit), 15_000, null, 'central:mensagens');
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
  const query = applyTimestampCursor(supabase
    .from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId), before)
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

export interface CustomerSupportHistoryCursor {
  timestamp: string;
  id: string;
}

export interface CustomerSupportHistoryPage {
  messages: WhatsAppMessage[];
  hasMore: boolean;
  nextCursor: CustomerSupportHistoryCursor | null;
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
  return buildPostgrestAccentInsensitivePattern(search);
}

function supportSearchOrFilters(filters: Array<{ column: string; pattern: string }>) {
  return filters.map(({ column, pattern }) =>
    column + '.imatch.' + pattern
  ).join(',');
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
  let query = supabase.from('whatsapp_messages')
    .select('id, conversation_id, message_type, text_content, timestamp, created_at')
    .eq('conversation_id', conversationId)
    .in('message_type', ['internal_note', 'system_event']);
  query = applyHistoryCursor(query, cursor)
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);
  return fetchConversationHistoryPage(query, 'Não foi possível carregar as atividades. Tente novamente.', pageSize, 'central:atividades');
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
    let query = supabase.from('whatsapp_messages')
      .select(MESSAGE_SELECT_COLUMNS)
      .eq('conversation_id', conversationId)
      .in('message_type', ['image', 'document', 'audio', 'video', 'sticker'])
      .not('media_id', 'is', null);
    query = applyHistoryCursor(query, cursor)
      .order('timestamp', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize + 1);
    if (column && pattern) query = query.filter(column, 'imatch', pattern);
    return withTimeout<any>(query, 15_000, null, 'central:anexos');
  });
  const responses = await Promise.all(requests);
  const failed = responses.some((response) => !response || response.error || !Array.isArray(response.data));
  if (failed) throw new Error('Não foi possível carregar os anexos. Tente novamente.');
  const rows = Array.from(new Map(
    responses.flatMap((response) => response.data as any[]).map((row) => [row.id, row])
  ).values()).sort((a: any, b: any) =>
    String(b.timestamp).localeCompare(String(a.timestamp)) || String(b.id).localeCompare(String(a.id))
  );
  return toHistoryPage(rows, pageSize);
}

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
  let query = supabase.from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .or(supportSearchOrFilters(['text_content', 'media_filename', 'media_caption']
      .map((column) => ({ column, pattern }))));
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

export interface CustomerSupportGlobalSearchPage<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: CustomerSupportHistoryCursor | null;
}

export interface CustomerSupportGlobalMessageMatch {
  message: WhatsAppMessage;
  conversation: WhatsAppConversation;
}

function withSupportSearchAbort(query: any, signal?: AbortSignal) {
  return signal && typeof query?.abortSignal === 'function' ? query.abortSignal(signal) : query;
}

function applyColumnTimestampCursor(query: any, column: string, cursor: CustomerSupportHistoryCursor | null) {
  if (!cursor) return query;
  const timestamp = JSON.stringify(cursor.timestamp);
  return query.or(
    column + '.lt.' + timestamp + ',and(' + column + '.eq.' + timestamp + ',id.lt.' + cursor.id + ')'
  );
}

function getGlobalSearchLimit(pageSize: number) {
  return Math.max(1, Math.min(5, Math.trunc(pageSize) || 5));
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
  let query = supabase.from('whatsapp_messages')
    .select(MESSAGE_GLOBAL_SEARCH_COLUMNS)
    .or(supportSearchOrFilters(['text_content', 'media_filename', 'media_caption']
      .map((column) => ({ column, pattern }))));
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
      withSupportSearchAbort(supabase.from('whatsapp_conversations')
        .select(CONVERSATION_SELECT_COLUMNS)
        .in('id', conversationIds), signal),
      15_000,
      null,
      'central:busca-global-conversas'
    )
    : { data: [], error: null };
  if (signal?.aborted) throw new Error('Busca cancelada.');
  if (!conversationResponse || conversationResponse.error || !Array.isArray(conversationResponse.data)) {
    throw new Error('Não foi possível carregar as conversas dos resultados. Tente novamente.');
  }
  const conversations = new Map<string, WhatsAppConversation>(
    conversationResponse.data.map((row: any) => [String(row.id), mapRowToConversation(row)] as const)
  );
  const items = pageRows.flatMap((row) => {
    const conversation = conversations.get(String(row.conversation_id));
    return conversation ? [{
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
    }] : [];
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
  let query = supabase.from('whatsapp_conversations')
    .select(CONVERSATION_SELECT_COLUMNS)
    .or(supportSearchOrFilters(filters));
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

export interface CustomerSupportMessageContext {
  messages: WhatsAppMessage[];
  hasOlderMessages: boolean;
}

/** Loads a message plus neighboring history so global search can jump to unloaded messages. */
export async function fetchConversationMessageContext(
  supabase: SupabaseClient,
  conversationId: string,
  messageId: string,
  contextSize = 10
): Promise<CustomerSupportMessageContext> {
  if (!conversationId || !messageId) {
    return { messages: [], hasOlderMessages: false };
  }
  const targetResponse = await withTimeout<any>(supabase.from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .eq('id', messageId)
    .maybeSingle(), 15_000, null, 'central:mensagem-alvo');
  if (!targetResponse || targetResponse.error || !targetResponse.data) {
    throw new Error('Não foi possível localizar essa mensagem no histórico da conversa.');
  }
  const target = targetResponse.data;
  const cursor = { timestamp: target.timestamp || target.created_at, id: target.id };
  const limit = Math.max(1, Math.min(20, Math.trunc(contextSize) || 10));
  const beforeQuery = applyTimestampCursor(supabase.from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId), cursor)
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  const afterTimestamp = JSON.stringify(cursor.timestamp);
  const afterQuery = supabase.from('whatsapp_messages')
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
  if (!beforeResponse || beforeResponse.error || !Array.isArray(beforeResponse.data)
    || !afterResponse || afterResponse.error || !Array.isArray(afterResponse.data)) {
    throw new Error('Não foi possível carregar o contexto da mensagem. Tente novamente.');
  }
  const beforeRows = beforeResponse.data.slice(0, limit).reverse();
  const rows = [...beforeRows, target, ...afterResponse.data];
  const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values())
    .sort((a: any, b: any) =>
      String(a.timestamp || a.created_at).localeCompare(String(b.timestamp || b.created_at))
        || String(a.id).localeCompare(String(b.id))
    );
  return {
    messages: uniqueRows.map(mapRowToMessage),
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
    const query = supabase.from('whatsapp_messages')
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
