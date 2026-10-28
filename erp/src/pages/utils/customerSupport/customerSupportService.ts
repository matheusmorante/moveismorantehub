import { SupabaseClient } from '@supabase/supabase-js';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  ConversationFilter,
  ConversationStatus,
  AssignedProfileSummary,
  QuickSnippet,
} from '@/pages/App/CustomerSupport/types';
import { mapPersonToSummary } from './customerMatchingService';
import type { CustomerLinkStatus, CustomerSummary } from './customerMatchingService';
import { SupportOrderSummary } from './supportOrdersService';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import type { ProductCatalogSendSelection } from '../../../../../shared-utils/productCatalogFormSchemas';
import {
  supportInternalCommentSchema,
  supportGlobalMessageSearchSchema,
  supportMessageSearchSchema,
  supportNotesSchema,
  supportSandboxMessageSchema,
  supportCustomerSendSchema,
  supportTagSchema,
} from '../../../../../shared-utils/customerSupportFormSchemas';

export const CONVERSATION_SELECT_COLUMNS =
  'id, business_phone_number_id, contact_phone, contact_wa_id, contact_name, customer_id, customer_link_status, last_message_text, last_message_at, last_customer_message_at, unread_count, is_archived, internal_notes, tags, assigned_to, created_at, updated_at';

export const MESSAGE_SELECT_COLUMNS =
  'id, conversation_id, api_message_id, direction, message_type, text_content, media_id, media_mime_type, media_url, media_filename, media_caption, reply_to_message_id, reply_to_wamid, status, error_code, failure_reason, raw_payload, timestamp, created_at';

const MESSAGE_GLOBAL_SEARCH_COLUMNS =
  'id, conversation_id, direction, message_type, text_content, media_filename, media_caption, timestamp, created_at';

// Modelos fixos orientam a conferência; dados e resultados comerciais exigem uma fonte real.
export const DEFAULT_QUICK_SNIPPETS: QuickSnippet[] = [
  {
    id: 'pix-payment',
    title: 'Orientação de Pagamento via PIX',
    category: 'pagamento',
    shortcut: '/pix',
    content:
      'Olá! Para orientar seu pagamento via PIX, vou conferir as instruções oficiais vinculadas ao seu pedido. Aguarde a confirmação dos dados antes de realizar a transferência.',
  },
  {
    id: 'delivery-status',
    title: 'Status e Previsão de Entrega do Pedido',
    category: 'entrega',
    shortcut: '/entrega',
    content:
      'Olá! Vou consultar a situação do seu pedido e confirmar a previsão de entrega com a equipe de logística.',
  },
  {
    id: 'store-location',
    title: 'Consultar Endereço e Horários da Loja',
    category: 'loja',
    shortcut: '/loja',
    content:
      'Olá! Vou confirmar o endereço da loja e o horário de atendimento para a data da sua visita.',
  },
  {
    id: 'warranty-assistance',
    title: 'Solicitação de Assistência Técnica',
    category: 'assistencia',
    shortcut: '/garantia',
    content:
      'Olá! Para analisar sua solicitação de assistência, informe o número do pedido e descreva o problema. Se puder, envie fotos ou um vídeo do produto. Vamos conferir os próximos passos com a equipe responsável.',
  },
  {
    id: 'welcome-greeting',
    title: 'Saudação Inicial e Boas-Vindas',
    category: 'geral',
    shortcut: '/ola',
    content:
      'Olá! Boas-vindas à Móveis Morante. Como podemos ajudar?',
  },
];

export function computeConversationStatus(row: any): ConversationStatus {
  if (row.is_archived || (Array.isArray(row.tags) && row.tags.includes('status:closed'))) {
    return 'closed';
  }
  if (Array.isArray(row.tags) && row.tags.includes('status:snoozed')) {
    return 'snoozed';
  }
  return 'open';
}

export function mapRowToConversation(row: any): WhatsAppConversation {
  return {
    id: row.id,
    businessPhoneNumberId: row.business_phone_number_id || '',
    contactPhone: row.contact_phone,
    contactWaId: row.contact_wa_id,
    contactName: row.contact_name,
    customerId: row.customer_id,
    customerLinkStatus: row.customer_link_status || 'unlinked',
    lastMessageText: row.last_message_text,
    lastMessageAt: row.last_message_at || row.created_at,
    lastCustomerMessageAt: row.last_customer_message_at,
    unreadCount: Number(row.unread_count) || 0,
    isArchived: Boolean(row.is_archived),
    internalNotes: row.internal_notes || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    assignedTo: row.assigned_to || null,
    status: computeConversationStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToMessage(row: any): WhatsAppMessage {
  const isLegacyRevocation = row.message_type === 'unsupported'
    && typeof row.text_content === 'string'
    && /a central ainda não consegue exibir este tipo de mensagem\s*\(\s*revoke\s*\)\./i.test(row.text_content);
  const legacyUnsupportedText = row.direction === 'inbound'
    && row.message_type === 'unsupported'
    && (row.text_content === 'Formato de mensagem não suportado diretamente pela central.'
      || row.text_content === '[Mensagem tipo unsupported]')
    ? 'Mensagem sem prévia: a integração não salvou o tipo nem o conteúdo original. Peça ao cliente para reenviar como texto, imagem, áudio ou documento.'
    : row.text_content;
  const legacyUnsupportedCode = row.message_type === 'unsupported'
    && typeof row.text_content === 'string'
    ? /^A API do WhatsApp informou que este tipo de mensagem não é suportado\.\s*\(código\s+(131051)\)$/i.exec(row.text_content)?.[1]
    : null;
  const authorName =
    row.raw_payload?.author_name || (row.direction === 'outbound' ? 'Atendente' : null);
  const authorAvatar = row.raw_payload?.author_avatar || null;
  const authorRole = row.raw_payload?.author_role || null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    apiMessageId: row.api_message_id,
    direction: row.direction,
    messageType: isLegacyRevocation ? 'deleted' : row.message_type || 'text',
    textContent: isLegacyRevocation ? 'Esta mensagem foi apagada' : legacyUnsupportedText,
    mediaId: row.media_id,
    mediaMimeType: row.media_mime_type,
    mediaUrl: row.media_url,
    mediaFilename: row.media_filename,
    mediaCaption: row.media_caption,
    replyToMessageId: row.reply_to_message_id,
    replyToWamid: row.reply_to_wamid,
    status: row.status || 'received',
    errorCode: row.error_code || legacyUnsupportedCode,
    failureReason: row.failure_reason,
    timestamp: row.timestamp || row.created_at,
    createdAt: row.created_at,
    authorName,
    authorAvatar,
    authorRole,
    rawPayload: row.raw_payload,
  };
}

export interface FetchConversationsOptions {
  page?: number;
  pageSize?: number;
  filter?: ConversationFilter;
  search?: string;
  agentId?: string | null;
  criteria?: import('@/pages/App/CustomerSupport/types').CustomerSupportFolderCriteria | null;
  canViewCommercialInfo?: boolean;
  sortOrder?: 'newest' | 'oldest' | 'unread';
}

/**
 * Busca conversas com paginação server-side e filtros seletivos (Egress otimizado)
 */
export async function fetchConversations(
  supabase: SupabaseClient,
  options: FetchConversationsOptions = {}
): Promise<{ conversations: WhatsAppConversation[]; totalCount: number }> {
  const {
    page = 1,
    pageSize = 50,
    filter = 'all',
    search = '',
    agentId = null,
    criteria = null,
    canViewCommercialInfo = false,
    sortOrder = 'newest',
  } = options;
  const response = await withTimeout<any>(supabase.rpc('customer_support_list_conversations', {
    p_filter: filter,
    p_search: search.trim(),
    p_agent_id: agentId,
    p_criteria: criteria || {},
    p_page: page,
    p_page_size: pageSize,
    p_sort_order: sortOrder,
  }), 15_000, null, 'central:conversations');
  const { data, error } = response || { data: null, error: new Error('Timeout na consulta de conversas') };

  if (error || !data) {
    if (error?.code === '42501' && error.message?.includes('CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED')) {
      throw new Error('Você não tem permissão para consultar pedidos nesta fila ou pasta.');
    }
    if (error?.code === '42501' && error.message?.includes('CUSTOMER_SUPPORT_PERMISSION_DENIED')) {
      throw new Error('Você não tem permissão para acessar a Central de Atendimento.');
    }
    throw new Error('Não foi possível carregar as conversas. Tente atualizar a lista.');
  }

  const listedConversations: Array<WhatsAppConversation & { assignedProfile: AssignedProfileSummary | null }> =
    (data as Array<Record<string, any>>).map((row) => ({
    ...mapRowToConversation(row),
    assignedProfile: row.assigned_to
      ? {
          id: row.assigned_to,
          fullName: row.assigned_profile_name || 'Atendente',
          role: row.assigned_profile_role || undefined,
        }
      : null,
    }));

  const identityByConversationId = new Map<string, {
    customerId: string;
    customerLinkStatus: CustomerLinkStatus;
    fullName: string;
  }>();
  if (canViewCommercialInfo && listedConversations.length > 0) {
    const identityResponse = await withTimeout<any>(supabase.rpc('customer_support_auto_link_conversations', {
      p_conversation_ids: listedConversations.map((conversation) => conversation.id),
    }), 15_000, null, 'central:vinculo-erp-por-telefone');
    const identityRows = identityResponse?.data;
    if (identityResponse?.error || !Array.isArray(identityRows)) {
      console.warn('[CustomerSupport] Não foi possível conferir os cadastros do ERP pelo telefone nesta atualização.');
    } else {
      for (const row of identityRows) {
        const customerId = String(row.customer_id || '').trim();
        const fullName = String(row.customer_full_name || '').trim() || 'Cliente Sem Nome';
        const customerLinkStatus = row.customer_link_status as CustomerLinkStatus;
        if (!row.conversation_id || !customerId || !fullName
          || !['unlinked', 'auto_matched', 'manually_linked', 'ambiguous'].includes(customerLinkStatus)) continue;
        identityByConversationId.set(String(row.conversation_id), {
          customerId,
          customerLinkStatus,
          fullName,
        });
      }
    }
  }

  const rawConversations = listedConversations.map((conversation) => {
    const identity = identityByConversationId.get(conversation.id);
    if (!identity) return conversation;
    return {
      ...conversation,
      customerId: identity.customerId,
      customerLinkStatus: identity.customerLinkStatus,
      customer: { id: identity.customerId, fullName: identity.fullName },
    };
  });

  // Dados comerciais só são hidratados quando a permissão específica foi comprovada.
  const customerIds = Array.from(
    new Set(rawConversations.map((c) => c.customerId).filter(Boolean) as string[])
  );
  const contactPhones = Array.from(
    new Set(rawConversations.map((c) => c.contactPhone).filter(Boolean) as string[])
  );

  const customersMap = new Map<string, CustomerSummary>();
  const customerOrdersCountMap = new Map<string, number>();

  if (canViewCommercialInfo && customerIds.length > 0) {
    const customerResponse = await withTimeout<any>(supabase.rpc('customer_support_list_customer_summaries', {
      p_customer_ids: customerIds,
    }), 15_000, null, 'central:clientes');
    const customersData = customerResponse?.data;

    if (customerResponse?.error || !Array.isArray(customersData)) {
      throw new Error('Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.');
    }
    for (const c of customersData) {
      customersMap.set(String(c.id), mapPersonToSummary(c));
    }
  }

  if (canViewCommercialInfo && (customerIds.length > 0 || contactPhones.length > 0)) {
    const targetKeys = Array.from(new Set([...customerIds, ...contactPhones]));
    const ordersResponse = await withTimeout<any>(supabase.rpc('customer_support_count_customer_orders', {
      p_customer_ids: targetKeys,
    }), 15_000, null, 'central:contagem-pedidos');
    const ordersData = ordersResponse?.data;

    if (ordersResponse?.error || !Array.isArray(ordersData)) {
      throw new Error('Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.');
    }
    for (const row of ordersData) {
      if (row.customer_id) customerOrdersCountMap.set(String(row.customer_id), Number(row.order_count) || 0);
    }
  }

  // Hidrata conversas com clientes, pedidos e atendentes
  const hydrated = rawConversations.map((c) => {
    const cust = c.customerId ? customersMap.get(c.customerId) || null : null;
    const ordersCountByCust = c.customerId ? customerOrdersCountMap.get(c.customerId) || 0 : 0;
    const ordersCountByPhone = c.contactPhone ? customerOrdersCountMap.get(c.contactPhone) || 0 : 0;
    const ordersCount = Math.max(ordersCountByCust, ordersCountByPhone);

    return {
      ...c,
      customer: cust || c.customer || null,
      orders: ordersCount > 0 ? (Array(ordersCount).fill({}) as SupportOrderSummary[]) : [],
    };
  });

  return {
    conversations: hydrated,
    totalCount: Number(data[0]?.total_count || 0),
  };
}

export async function fetchConversationCounts(
  supabase: SupabaseClient
): Promise<{ all: number; mine: number; unassigned: number; unread: number }> {
  const response = await withTimeout<any>(supabase.rpc('customer_support_conversation_counts'), 15_000, null, 'central:contagens');
  const { data, error } = response || { data: null, error: new Error('Timeout nas contagens da Central') };
  if (error || !data?.[0]) {
    throw new Error('Não foi possível atualizar as contagens da Inbox.');
  }
  return {
    all: Number(data[0].all_count) || 0,
    mine: Number(data[0].mine_count) || 0,
    unassigned: Number(data[0].unassigned_count) || 0,
    unread: Number(data[0].unread_count) || 0,
  };
}

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
  return `%${search.replace(/[\\%_*]/g, (character) => `\\${character}`)}%`;
}

function quoteSupportFilterValue(value: string) {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function supportSearchOrFilters(filters: Array<{ column: string; pattern: string }>) {
  return filters.map(({ column, pattern }) =>
    column + '.ilike.' + quoteSupportFilterValue(pattern)
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
    .select(MESSAGE_SELECT_COLUMNS)
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
    if (column && pattern) query = query.ilike(column, pattern);
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

/**
 * Alterna estado de arquivamento da conversa
 */
export async function toggleArchiveConversation(
  supabase: SupabaseClient, conversationId: string, currentArchived: boolean
): Promise<boolean> {
  return updateConversationStatus(supabase, conversationId, currentArchived ? 'open' : 'closed');
}

/** Change only notes, with optimistic conflict detection; never overwrite tags. */
export async function updateConversationNotes(
  supabase: SupabaseClient, conversationId: string, notes: string, expectedNotes: string | null
): Promise<boolean> {
  const parsed = supportNotesSchema.safeParse({ notes });
  if (!parsed.success) return false;
  const response = await withTimeout(supabase.rpc('customer_support_set_internal_notes', {
    p_conversation_id: conversationId, p_notes: parsed.data.notes, p_expected_notes: expectedNotes,
  }), 15_000, null, 'central:salvar-notas');
  if (response?.error?.code === '40001' || (response?.error?.code === 'P0001'
    && response.error.message?.startsWith('CUSTOMER_SUPPORT_NOTES_CONFLICT:'))) {
    throw new Error('As notas foram alteradas por outro atendimento. Atualize antes de salvar.');
  }
  return !response?.error && response?.data === true;
}

/** Add/remove a single tag on the server, preserving concurrent status/notes. */
export async function updateConversationTag(
  supabase: SupabaseClient, conversationId: string, tag: string, remove: boolean
): Promise<string[] | null> {
  const parsed = supportTagSchema.safeParse({ tagInput: tag });
  if (!parsed.success) return null;
  const response = await withTimeout(supabase.rpc('customer_support_update_tag', {
    p_conversation_id: conversationId, p_tag: parsed.data.tagInput, p_remove: remove,
  }), 15_000, null, 'central:salvar-marcador');
  return !response?.error && Array.isArray(response?.data) ? response.data as string[] : null;
}

/** Assignment and its persisted event are a single server command. */
export async function assignConversation(
  supabase: SupabaseClient, conversationId: string, profileId: string | null,
  _profileName?: string, _currentUserName?: string
): Promise<boolean> {
  const response = await withTimeout(supabase.rpc('customer_support_assign_conversation', {
    p_conversation_id: conversationId, p_assignee_id: profileId,
  }), 15_000, null, 'central:atribuir');
  return !response?.error && response?.data === true;
}

/** The server derives current tags and actor; client snapshots are not authoritative. */
export async function updateConversationStatus(
  supabase: SupabaseClient, conversationId: string, newStatus: ConversationStatus,
  _currentTags: string[] = [], _currentUserName?: string
): Promise<boolean> {
  if (!['open', 'closed', 'snoozed'].includes(newStatus)) return false;
  const response = await withTimeout(supabase.rpc('customer_support_set_conversation_status', {
    p_conversation_id: conversationId, p_status: newStatus,
  }), 15_000, null, 'central:status');
  return !response?.error && response?.data === true;
}

/** Authenticated identity and timestamp are derived by the RPC. */
export async function createInternalNoteMessage(
  supabase: SupabaseClient, conversationId: string, textContent: string,
  _author?: { id: string; name: string; role?: string }
): Promise<WhatsAppMessage | null> {
  const parsed = supportInternalCommentSchema.safeParse({ comment: textContent });
  if (!parsed.success) return null;
  const response = await withTimeout(supabase.rpc('customer_support_add_internal_note', {
    p_conversation_id: conversationId, p_text: parsed.data.comment,
  }), 15_000, null, 'central:comentario');
  const row = Array.isArray(response?.data) ? response.data[0] : null;
  return !response?.error && row ? mapRowToMessage(row) : null;
}

export interface CustomerSupportTestSendResult {
  accepted: true;
  persisted: boolean;
  warning?: string;
}

/** Sends only through the Meta test sender endpoint; the server enforces the Development sandbox. */
export async function sendCustomerSupportTestMessage(
  supabase: SupabaseClient,
  conversationId: string,
  message: string
): Promise<CustomerSupportTestSendResult> {
  const parsed = supportSandboxMessageSchema.safeParse({ message });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Mensagem inválida.');

  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:envio-teste-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('/api/whatsapp-dispatch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, message: parsed.data.message }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível enviar a mensagem de teste.');
    if (data.accepted !== true) throw new Error('A Meta não confirmou o envio da mensagem.');
    return {
      accepted: true,
      persisted: data.persisted === true,
      ...(typeof data.warning === 'string' ? { warning: data.warning } : {}),
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Resultado do envio incerto. Atualize a conversa antes de tentar novamente.');
    }
    throw error instanceof Error ? error : new Error('Não foi possível enviar a mensagem de teste.');
  } finally {
    clearTimeout(timeout);
  }
}

export interface CustomerSupportTestSender {
  enabled: boolean;
  phoneNumberId?: string;
  phoneNumber?: string;
}

export class CustomerSupportSendError extends Error {
  constructor(message: string, readonly outcomeUncertain = false) {
    super(message);
    this.name = 'CustomerSupportSendError';
  }
}

export interface CustomerSupportSendInput {
  message: string;
  file?: File;
  contact?: { name: string; phone: string };
  catalogSelection?: ProductCatalogSendSelection;
  replyToWamid?: string;
  forwarded?: boolean;
}

export interface CustomerSupportSendResult {
  accepted: true;
  persisted: boolean;
  apiMessageId?: string;
  warning?: string;
}

/** Envia uma mensagem do atendimento pela rota autenticada, vinculada à conversa ativa. */
export async function sendCustomerSupportMessage(
  supabase: SupabaseClient,
  conversationId: string,
  input: CustomerSupportSendInput
): Promise<CustomerSupportSendResult> {
  const attachmentType = input.contact ? 'contact' : input.file ? 'file' : input.catalogSelection ? 'catalog' : 'text';
  const parsed = supportCustomerSendSchema.safeParse({
    conversationId,
    message: input.message,
    attachmentType,
    ...(input.replyToWamid ? { replyToWamid: input.replyToWamid } : {}),
    ...(input.forwarded ? { forwarded: true } : {}),
    ...(input.file ? {
      fileName: input.file.name,
      fileMimeType: input.file.type || 'application/octet-stream',
      fileSize: input.file.size,
    } : {}),
    ...(input.contact ? {
      contactName: input.contact.name,
      contactPhone: input.contact.phone,
    } : {}),
    ...(input.catalogSelection ? { catalogSelection: input.catalogSelection } : {}),
  });
  if (!parsed.success) {
    throw new CustomerSupportSendError(parsed.error.issues[0]?.message || 'Mensagem inválida.');
  }
  if (input.file && parsed.data.message.trim().length > 1024) {
    throw new CustomerSupportSendError('A legenda do anexo pode ter até 1024 caracteres.');
  }

  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:envio-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new CustomerSupportSendError('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let responseReceived = false;
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    let body: BodyInit;
    if (input.file) {
      const formData = new FormData();
      formData.set('conversationId', parsed.data.conversationId);
      formData.set('message', parsed.data.message);
      if (parsed.data.replyToWamid) formData.set('replyToWamid', parsed.data.replyToWamid);
      if (parsed.data.forwarded) formData.set('forwarded', 'true');
      formData.set('file', input.file, input.file.name);
      body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        conversationId: parsed.data.conversationId,
        message: parsed.data.message,
        ...(parsed.data.replyToWamid ? { replyToWamid: parsed.data.replyToWamid } : {}),
        ...(parsed.data.forwarded ? { forwarded: true } : {}),
        ...(input.contact ? { contact: input.contact } : {}),
        ...(parsed.data.catalogSelection ? { catalogSelection: parsed.data.catalogSelection } : {}),
      });
    }

    const response = await fetch('/api/whatsapp-support-send', {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    responseReceived = true;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new CustomerSupportSendError(
        typeof data.error === 'string' ? data.error : 'Não foi possível enviar a mensagem.',
        data.outcomeUncertain === true,
      );
    }
    if (data.accepted !== true) {
      throw new CustomerSupportSendError('O WhatsApp não confirmou o envio. Atualize a conversa antes de tentar novamente.', true);
    }
    return {
      accepted: true,
      persisted: data.persisted === true,
      ...(typeof data.apiMessageId === 'string' ? { apiMessageId: data.apiMessageId } : {}),
      ...(typeof data.warning === 'string' ? { warning: data.warning } : {}),
    };
  } catch (error) {
    if (error instanceof CustomerSupportSendError) throw error;
    if (controller.signal.aborted || !responseReceived) {
      throw new CustomerSupportSendError(
        'Resultado do envio incerto. Atualize a conversa antes de tentar novamente.',
        true,
      );
    }
    throw new CustomerSupportSendError(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadCustomerSupportForwardFile(
  supabase: SupabaseClient,
  message: WhatsAppMessage
): Promise<File> {
  const templateHeaderType = message.messageType === 'template'
    ? message.rawPayload?.template_preview?.header?.type
    : null;
  const mediaType = message.messageType === 'template' ? templateHeaderType : message.messageType;
  if (!message.mediaId || !['image', 'document', 'audio', 'video', 'sticker'].includes(mediaType)) {
    throw new CustomerSupportSendError('Esta mensagem não possui uma mídia que possa ser encaminhada.');
  }
  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:encaminhar-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new CustomerSupportSendError('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`/api/whatsapp-media?id=${encodeURIComponent(message.mediaId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new CustomerSupportSendError(typeof data.error === 'string' ? data.error : 'Não foi possível carregar a mídia para encaminhar.');
    }
    const blob = await response.blob();
    const maxBytes = mediaType === 'sticker' ? 500 * 1024 : 4 * 1024 * 1024;
    if (!blob.size || blob.size > maxBytes) {
      throw new CustomerSupportSendError(mediaType === 'sticker'
        ? 'A figurinha precisa ter até 500 KB para ser encaminhada pela Central.'
        : 'A mídia precisa ter até 4 MB para ser encaminhada pela Central.');
    }
    const extensionByType: Record<string, string> = { image: 'jpg', video: 'mp4', audio: 'ogg', document: 'pdf', sticker: 'webp' };
    const filename = (message.mediaFilename || `mensagem.${extensionByType[mediaType]}`)
      .replace(/[\\/]/g, '_').slice(0, 255);
    return new File([blob], filename, { type: message.mediaMimeType || blob.type || 'application/octet-stream' });
  } catch (error) {
    if (error instanceof CustomerSupportSendError) throw error;
    throw new CustomerSupportSendError(controller.signal.aborted
      ? 'A consulta da mídia demorou demais. Tente encaminhar novamente.'
      : error instanceof Error ? error.message : 'Não foi possível carregar a mídia para encaminhar.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCustomerSupportTestSender(): Promise<CustomerSupportTestSender> {
  try {
    const response = await withTimeout<Response | null>(fetch('/api/whatsapp-dispatch?operation=test-sender', { cache: 'no-store' }), 10_000, null, 'central:remetente-teste');
    if (!response?.ok) return { enabled: false };
    const data = await response.json();
    return data?.enabled === true && typeof data.phoneNumberId === 'string' && typeof data.phoneNumber === 'string'
      ? { enabled: true, phoneNumberId: data.phoneNumberId, phoneNumber: data.phoneNumber }
      : { enabled: false };
  } catch {
    return { enabled: false };
  }
}

/**
 * Busca lista de perfis de atendentes/usuários ativos do sistema
 */
export async function fetchTeamProfiles(
  supabase: SupabaseClient
): Promise<AssignedProfileSummary[]> {
  const response = await withTimeout<any>(supabase.rpc('customer_support_list_agents'), 15_000, null, 'central:atendentes');
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar atendentes') };

  if (error || !Array.isArray(data)) {
    throw new Error('Não foi possível carregar os atendentes. Tente novamente.');
  }

  return (data as Array<{ id: string; full_name: string | null; role: string | null }>).map((p) => ({
    id: p.id,
    fullName: p.full_name || 'Atendente',
    role: p.role || undefined,
  }));
}
