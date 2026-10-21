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

export const CONVERSATION_SELECT_COLUMNS =
  'id, business_phone_number_id, contact_phone, contact_wa_id, contact_name, customer_id, customer_link_status, last_message_text, last_message_at, last_customer_message_at, unread_count, is_archived, internal_notes, tags, assigned_to, created_at, updated_at';

export const MESSAGE_SELECT_COLUMNS =
  'id, conversation_id, api_message_id, direction, message_type, text_content, media_id, media_mime_type, media_url, media_filename, media_caption, reply_to_message_id, reply_to_wamid, status, error_code, failure_reason, raw_payload, timestamp, created_at';

export const DEFAULT_QUICK_SNIPPETS: QuickSnippet[] = [
  {
    id: 'pix-payment',
    title: 'Chave PIX e Instruções de Pagamento',
    category: 'pagamento',
    shortcut: '/pix',
    content:
      'Olá! Para pagamento via PIX, utilize nossa chave oficial CNPJ: 12.345.678/0001-90 (Móveis Morante Ltda). Após efetuar a transferência, por favor nos envie o comprovante aqui. Muito obrigado! 🛋️',
  },
  {
    id: 'delivery-status',
    title: 'Status e Previsão de Entrega do Pedido',
    category: 'entrega',
    shortcut: '/entrega',
    content:
      'Olá! Verificamos aqui seu pedido no sistema. Nossa equipe de logística está preparando os produtos para rota de entrega. Entraremos em contato com antecedência para confirmar a data exata e o melhor horário de recebimento! 🚚',
  },
  {
    id: 'store-location',
    title: 'Endereço da Loja Física e Horários',
    category: 'loja',
    shortcut: '/loja',
    content:
      'Nossa loja física está localizada na Av. Principal dos Móveis, 1000 - Centro. Horário de funcionamento: Segunda a Sexta das 08h30 às 18h30, e aos Sábados das 09h às 15h. Temos estacionamento próprio no local! Venha tomar um café conosco! ☕✨',
  },
  {
    id: 'warranty-assistance',
    title: 'Garantia e Solicitação de Assistência Técnica',
    category: 'assistencia',
    shortcut: '/garantia',
    content:
      'Compreendemos perfeitamente. Todos os produtos Morante contam com garantia legal e termo de assistência técnica. Para agilizar, por favor nos envie fotos ou um vídeo curto mostrando o detalhe do produto e o número do seu pedido ou CPF. Abriremos o protocolo imediatamente! 🔧📦',
  },
  {
    id: 'welcome-greeting',
    title: 'Saudação Inicial e Boas-Vindas',
    category: 'geral',
    shortcut: '/ola',
    content:
      'Olá! Seja muito bem-vindo(a) à Móveis Morante. Sou seu atendente virtual no MoranteHub. Como posso te ajudar hoje? 🪑',
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
    console.error('[CustomerSupportService] Erro ao buscar conversas:', error);
    return { conversations: [], totalCount: 0 };
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

  let customersMap = new Map<string, CustomerSummary>();
  let customerOrdersCountMap = new Map<string, number>();

  if (canViewCommercialInfo && customerIds.length > 0) {
    const customerResponse = await withTimeout<any>(supabase.rpc('customer_support_list_customer_summaries', {
      p_customer_ids: customerIds,
    }), 15_000, null, 'central:clientes');
    const customersData = customerResponse?.data;

    if (customersData) {
      for (const c of customersData) {
        customersMap.set(String(c.id), mapPersonToSummary(c));
      }
    }

    const ordersResponse = await withTimeout<any>(supabase.rpc('customer_support_count_customer_orders', {
      p_customer_ids: customerIds,
    }), 15_000, null, 'central:contagem-pedidos');
    const ordersData = ordersResponse?.data;

    if (ordersData) {
      for (const row of ordersData) {
        if (row.customer_id) customerOrdersCountMap.set(row.customer_id, Number(row.order_count) || 0);
      }
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
    console.error('[CustomerSupportService] Erro ao buscar contagens da Inbox:', error);
    return { all: 0, mine: 0, unassigned: 0, unread: 0 };
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
    console.error('[CustomerSupportService] Erro ao buscar mensagens da conversa:', error);
    return [];
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
    console.error('[CustomerSupportService] Erro ao buscar mensagens anteriores:', error);
    return [];
  }
  return data.reverse().map(mapRowToMessage);
}

/**
 * Zera contador de não lidas ao abrir a conversa
 */
export async function markConversationAsRead(
  supabase: SupabaseClient,
  conversationId: string
): Promise<void> {
  const query = supabase
    .from('whatsapp_conversations')
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (typeof (query as any).gt === 'function') {
    await (query as any).gt('unread_count', 0);
  } else {
    await query;
  }
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

/**
 * Atribui a conversa a um atendente e registra evento no histórico
 */
export async function assignConversation(
  supabase: SupabaseClient,
  conversationId: string,
  profileId: string | null,
  profileName?: string,
  currentUserName: string = 'Atendente'
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({
      assigned_to: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[CustomerSupportService] Erro ao atribuir conversa:', error);
    return false;
  }

  // Registra evento de sistema no histórico da conversa
  const systemText = profileName
    ? `Atendimento atribuído a ${profileName} por ${currentUserName}`
    : `Atendimento retornado para a fila geral por ${currentUserName}`;

  const { error: eventError } = await supabase.from('whatsapp_messages').insert([
    {
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'system_event',
      text_content: systemText,
      status: 'received',
      timestamp: new Date().toISOString(),
    },
  ]);

  return !eventError;
}

/**
 * Altera status da conversa (open, closed, snoozed)
 */
export async function updateConversationStatus(
  supabase: SupabaseClient,
  conversationId: string,
  newStatus: ConversationStatus,
  currentTags: string[] = [],
  currentUserName: string = 'Atendente'
): Promise<boolean> {
  const isArchived = newStatus === 'closed';

  // Remove tags de status antigas
  const filteredTags = currentTags.filter((t) => !t.startsWith('status:'));
  if (newStatus === 'closed') {
    filteredTags.push('status:closed');
  } else if (newStatus === 'snoozed') {
    filteredTags.push('status:snoozed');
  }

  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({
      is_archived: isArchived,
      tags: filteredTags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[CustomerSupportService] Erro ao alterar status:', error);
    return false;
  }

  const statusLabel =
    newStatus === 'closed'
      ? 'Fechado / Resolvido'
      : newStatus === 'snoozed'
        ? 'Adiado'
        : 'Reaberto';

  const { error: eventError } = await supabase.from('whatsapp_messages').insert([
    {
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'system_event',
      text_content: `Status do atendimento alterado para "${statusLabel}" por ${currentUserName}`,
      status: 'received',
      timestamp: new Date().toISOString(),
    },
  ]);

  return !eventError;
}

/**
 * Registra um comentário interno da equipe diretamente no fluxo do chat
 */
export async function createInternalNoteMessage(
  supabase: SupabaseClient,
  conversationId: string,
  textContent: string,
  author: { id: string; name: string; role?: string }
): Promise<WhatsAppMessage | null> {
  if (!textContent.trim()) return null;

  const payload = {
    conversation_id: conversationId,
    direction: 'outbound',
    message_type: 'internal_note',
    text_content: textContent.trim(),
    status: 'sent',
    raw_payload: {
      author_id: author.id,
      author_name: author.name,
      author_role: author.role || 'Colaborador',
    },
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert([payload])
    .select(MESSAGE_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error('[CustomerSupportService] Erro ao criar comentário interno:', error);
    return null;
  }

  // Atualiza campo internal_notes na conversa para compatibilidade legada
  await supabase
    .from('whatsapp_conversations')
    .update({
      internal_notes: textContent.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return mapRowToMessage(data);
}

/**
 * Busca lista de perfis de atendentes/usuários ativos do sistema
 */
export async function fetchTeamProfiles(
  supabase: SupabaseClient
): Promise<AssignedProfileSummary[]> {
  const response = await withTimeout<any>(supabase.rpc('customer_support_list_agents'), 15_000, null, 'central:atendentes');
  const { data, error } = response || { data: null, error: new Error('Timeout ao carregar atendentes') };

  if (error || !data) return [];

  return (data as Array<{ id: string; full_name: string | null; role: string | null }>).map((p) => ({
    id: p.id,
    fullName: p.full_name || 'Atendente',
    role: p.role || undefined,
  }));
}
