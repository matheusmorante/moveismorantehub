import { SupabaseClient } from '@supabase/supabase-js';
import { WhatsAppConversation, WhatsAppMessage, ConversationFilter } from '@/pages/App/CustomerSupport/types';
import { CustomerSummary, CUSTOMER_QUERY_COLUMNS, mapPersonToSummary } from './customerMatchingService';
import { SupportOrderSummary } from './supportOrdersService';

export const CONVERSATION_SELECT_COLUMNS =
  'id, business_phone_number_id, contact_phone, contact_wa_id, contact_name, customer_id, customer_link_status, last_message_text, last_message_at, last_customer_message_at, unread_count, is_archived, internal_notes, tags, assigned_to, created_at, updated_at';

export const MESSAGE_SELECT_COLUMNS =
  'id, conversation_id, api_message_id, direction, message_type, text_content, media_id, media_mime_type, media_url, media_filename, media_caption, reply_to_message_id, reply_to_wamid, status, error_code, failure_reason, timestamp, created_at';

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
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToMessage(row: any): WhatsAppMessage {
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
  };
}

export interface FetchConversationsOptions {
  page?: number;
  pageSize?: number;
  filter?: ConversationFilter;
  search?: string;
}

/**
 * Busca conversas com paginação server-side e filtros seletivos (Egress otimizado)
 */
export async function fetchConversations(
  supabase: SupabaseClient,
  options: FetchConversationsOptions = {}
): Promise<{ conversations: WhatsAppConversation[]; totalCount: number }> {
  const { page = 1, pageSize = 30, filter = 'all', search = '' } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('whatsapp_conversations')
    .select(CONVERSATION_SELECT_COLUMNS, { count: 'exact' });

  // Filtros de estado
  if (filter === 'archived') {
    query = query.eq('is_archived', true);
  } else {
    query = query.eq('is_archived', false);
  }

  if (filter === 'unread') {
    query = query.gt('unread_count', 0);
  } else if (filter === 'linked') {
    query = query.not('customer_id', 'is', null);
  } else if (filter === 'unlinked') {
    query = query.is('customer_id', null);
  }

  // Pesquisa por texto, nome ou telefone
  if (search && search.trim().length > 0) {
    const term = search.trim();
    const cleanDigits = term.replace(/\D/g, '');
    const searchConditions = [`contact_name.ilike.%${term}%`, `last_message_text.ilike.%${term}%`];
    if (cleanDigits.length >= 3) {
      searchConditions.push(`contact_phone.ilike.%${cleanDigits}%`);
      searchConditions.push(`contact_wa_id.ilike.%${cleanDigits}%`);
    }
    query = query.or(searchConditions.join(','));
  }

  // Ordenação da mais recente para a mais antiga
  query = query.order('last_message_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error || !data) {
    console.error('[CustomerSupportService] Erro ao buscar conversas:', error);
    return { conversations: [], totalCount: 0 };
  }

  const rawConversations = data.map(mapRowToConversation);

  // Hidratação em LOTE de clientes (sem N+1 queries, consumo ultra-reduzido de Egress)
  const customerIds = Array.from(
    new Set(rawConversations.map((c) => c.customerId).filter(Boolean) as string[])
  );

  let customersMap = new Map<string, CustomerSummary>();
  let customerOrdersCountMap = new Map<string, number>();

  if (customerIds.length > 0) {
    // 1. Busca clientes vinculados
    const { data: customersData } = await supabase
      .from('people')
      .select(CUSTOMER_QUERY_COLUMNS)
      .in('id', customerIds);

    if (customersData) {
      for (const c of customersData) {
        customersMap.set(String(c.id), mapPersonToSummary(c));
      }
    }

    // 2. Busca contagem de pedidos vinculados
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, customer_id')
      .in('customer_id', customerIds)
      .or('deleted.is.null,deleted.eq.false');

    if (ordersData) {
      for (const o of ordersData) {
        if (o.customer_id) {
          const current = customerOrdersCountMap.get(o.customer_id) || 0;
          customerOrdersCountMap.set(o.customer_id, current + 1);
        }
      }
    }
  }

  // Hidrata conversas com clientes e pedidos
  let hydrated = rawConversations.map((c) => {
    const cust = c.customerId ? customersMap.get(c.customerId) || null : null;
    const ordersCount = c.customerId ? customerOrdersCountMap.get(c.customerId) || 0 : 0;
    return {
      ...c,
      customer: cust,
      orders: ordersCount > 0 ? (Array(ordersCount).fill({}) as SupportOrderSummary[]) : [],
    };
  });

  // Filtros de pedidos se aplicável
  if (filter === 'with_orders') {
    hydrated = hydrated.filter((c) => (c.orders?.length || 0) > 0);
  } else if (filter === 'without_orders') {
    hydrated = hydrated.filter((c) => (c.orders?.length || 0) === 0);
  }

  return {
    conversations: hydrated,
    totalCount: count || hydrated.length,
  };
}

/**
 * Busca histórico de mensagens de uma conversa com limite
 */
export async function fetchConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 60
): Promise<WhatsAppMessage[]> {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select(MESSAGE_SELECT_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error('[CustomerSupportService] Erro ao buscar mensagens da conversa:', error);
    return [];
  }

  return data.map(mapRowToMessage);
}

/**
 * Zera contador de não lidas ao abrir a conversa
 */
export async function markConversationAsRead(
  supabase: SupabaseClient,
  conversationId: string
): Promise<void> {
  await supabase
    .from('whatsapp_conversations')
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

/**
 * Alterna estado de arquivamento da conversa
 */
export async function toggleArchiveConversation(
  supabase: SupabaseClient,
  conversationId: string,
  currentArchived: boolean
): Promise<boolean> {
  const nextArchived = !currentArchived;
  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({ is_archived: nextArchived, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return !error;
}

/**
 * Salva notas internas e marcadores da conversa
 */
export async function updateInternalNotesAndTags(
  supabase: SupabaseClient,
  conversationId: string,
  notes: string,
  tags: string[]
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({
      internal_notes: notes,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return !error;
}
