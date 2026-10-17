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
  CUSTOMER_QUERY_COLUMNS,
  mapPersonToSummary,
} from './customerMatchingService';
import { SupportOrderSummary } from './supportOrdersService';

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
  currentUserId?: string;
}

/**
 * Busca conversas com paginação server-side e filtros seletivos (Egress otimizado)
 */
export async function fetchConversations(
  supabase: SupabaseClient,
  options: FetchConversationsOptions = {}
): Promise<{ conversations: WhatsAppConversation[]; totalCount: number }> {
  const { page = 1, pageSize = 30, filter = 'all', search = '', currentUserId } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('whatsapp_conversations')
    .select(CONVERSATION_SELECT_COLUMNS, { count: 'exact' });

  // Filtros de estado / arquivamento
  if (filter === 'archived' || filter === 'closed') {
    query = query.eq('is_archived', true);
  } else {
    query = query.eq('is_archived', false);
  }

  // Filtros de fila de atendimento
  if (filter === 'mine' && currentUserId) {
    query = query.eq('assigned_to', currentUserId);
  } else if (filter === 'unassigned') {
    query = query.is('assigned_to', null);
  } else if (filter === 'unread') {
    query = query.gt('unread_count', 0);
  } else if (filter === 'linked') {
    query = query.not('customer_id', 'is', null);
  } else if (filter === 'unlinked') {
    query = query.is('customer_id', null);
  } else if (filter === 'snoozed') {
    query = query.contains('tags', ['status:snoozed']);
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

  // 1. Hidratação de atendentes responsáveis (assigned_to)
  const assignedIds = Array.from(
    new Set(rawConversations.map((c) => c.assignedTo).filter(Boolean) as string[])
  );
  const profilesMap = new Map<string, AssignedProfileSummary>();
  if (assignedIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .in('id', assignedIds);

    if (profilesData) {
      for (const p of profilesData) {
        profilesMap.set(String(p.id), {
          id: p.id,
          fullName: p.full_name || p.email || 'Atendente',
          role: p.role,
          email: p.email,
        });
      }
    }
  }

  // 2. Hidratação em LOTE de clientes (sem N+1 queries, consumo ultra-reduzido de Egress)
  const customerIds = Array.from(
    new Set(rawConversations.map((c) => c.customerId).filter(Boolean) as string[])
  );

  let customersMap = new Map<string, CustomerSummary>();
  let customerOrdersCountMap = new Map<string, number>();

  if (customerIds.length > 0) {
    const { data: customersData } = await supabase
      .from('people')
      .select(CUSTOMER_QUERY_COLUMNS)
      .in('id', customerIds);

    if (customersData) {
      for (const c of customersData) {
        customersMap.set(String(c.id), mapPersonToSummary(c));
      }
    }

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

  // Hidrata conversas com clientes, pedidos e atendentes
  let hydrated = rawConversations.map((c) => {
    const cust = c.customerId ? customersMap.get(c.customerId) || null : null;
    const ordersCount = c.customerId ? customerOrdersCountMap.get(c.customerId) || 0 : 0;
    const assignedProf = c.assignedTo ? profilesMap.get(c.assignedTo) || null : null;

    return {
      ...c,
      assignedProfile: assignedProf,
      customer: cust,
      orders: ordersCount > 0 ? (Array(ordersCount).fill({}) as SupportOrderSummary[]) : [],
    };
  });

  // Filtros em memória pós-hidratação de pedidos
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
  limit: number = 80
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

  await supabase.from('whatsapp_messages').insert([
    {
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'system_event',
      text_content: systemText,
      status: 'received',
      timestamp: new Date().toISOString(),
    },
  ]);

  return true;
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

  await supabase.from('whatsapp_messages').insert([
    {
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'system_event',
      text_content: `Status do atendimento alterado para "${statusLabel}" por ${currentUserName}`,
      status: 'received',
      timestamp: new Date().toISOString(),
    },
  ]);

  return true;
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .order('full_name', { ascending: true });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    fullName: p.full_name || p.email || 'Atendente',
    role: p.role,
    email: p.email,
  }));
}
