import { SupabaseClient } from '@supabase/supabase-js';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  ConversationFilter,
  ConversationStatus,
  AssignedProfileSummary,
  QuickSnippet,
} from '@/pages/App/CustomerSupport/types';
import {
  CustomerSummary,
  mapPersonToSummary,
} from './customerMatchingService';
import { SupportOrderSummary } from './supportOrdersService';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supportInternalCommentSchema, supportNotesSchema, supportTagSchema } from '../../../../../shared-utils/customerSupportFormSchemas';

export const CONVERSATION_SELECT_COLUMNS =
  'id, business_phone_number_id, contact_phone, contact_wa_id, contact_name, customer_id, customer_link_status, last_message_text, last_message_at, last_customer_message_at, unread_count, is_archived, internal_notes, tags, assigned_to, created_at, updated_at';

export const MESSAGE_SELECT_COLUMNS =
  'id, conversation_id, api_message_id, direction, message_type, text_content, media_id, media_mime_type, media_url, media_filename, media_caption, reply_to_message_id, reply_to_wamid, status, error_code, failure_reason, raw_payload, timestamp, created_at';

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
  const authorName =
    row.raw_payload?.author_name || (row.direction === 'outbound' ? 'Atendente' : null);
  const authorAvatar = row.raw_payload?.author_avatar || null;
  const authorRole = row.raw_payload?.author_role || null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    apiMessageId: row.api_message_id,
    direction: row.direction,
    messageType: row.message_type || 'text',
    textContent: row.text_content,
    mediaId: row.media_id,
    mediaMimeType: row.media_mime_type,
    mediaUrl: row.media_url,
    mediaFilename: row.media_filename,
    mediaCaption: row.media_caption,
    replyToMessageId: row.reply_to_message_id,
    replyToWamid: row.reply_to_wamid,
    status: row.status || 'received',
    errorCode: row.error_code,
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

  const rawConversations: Array<WhatsAppConversation & { assignedProfile: AssignedProfileSummary | null }> =
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

  // Dados comerciais só são hidratados quando a permissão específica foi comprovada.
  const customerIds = Array.from(
    new Set(rawConversations.map((c) => c.customerId).filter(Boolean) as string[])
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

    const ordersResponse = await withTimeout<any>(supabase.rpc('customer_support_count_customer_orders', {
      p_customer_ids: customerIds,
    }), 15_000, null, 'central:contagem-pedidos');
    const ordersData = ordersResponse?.data;

    if (ordersResponse?.error || !Array.isArray(ordersData)) {
      throw new Error('Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.');
    }
    for (const row of ordersData) {
      if (row.customer_id) customerOrdersCountMap.set(row.customer_id, Number(row.order_count) || 0);
    }
  }

  // Hidrata conversas com clientes, pedidos e atendentes
  const hydrated = rawConversations.map((c) => {
    const cust = c.customerId ? customersMap.get(c.customerId) || null : null;
    const ordersCount = c.customerId ? customerOrdersCountMap.get(c.customerId) || 0 : 0;

    return {
      ...c,
      customer: cust,
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

export async function fetchPreviousConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  before: { timestamp: string; id: string },
  limit: number = 50
): Promise<WhatsAppMessage[]> {
  if (!conversationId) return [];
  const response = await withTimeout<any>(supabase
    .from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .or(`timestamp.lt.${before.timestamp},and(timestamp.eq.${before.timestamp},id.lt.${before.id})`)
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit), 15_000, null, 'central:mensagens-anteriores');
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar mensagens anteriores') };

  if (error || !data) {
    throw new Error('Não foi possível carregar as mensagens anteriores. Tente novamente.');
  }
  return data.reverse().map(mapRowToMessage);
}

/**
 * Zera contador de não lidas ao abrir a conversa
 */
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
    const response = await withTimeout<any>(pending, 10_000, null, 'central:confirmar-leitura');
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
