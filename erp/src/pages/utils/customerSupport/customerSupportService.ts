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
import {
  computeConversationStatus,
  mapRowToConversation,
  mapRowToMessage,
} from './customerSupportMappers';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import type { ProductCatalogSendSelection } from '../../../../../shared-utils/productCatalogFormSchemas';
import {
  supportInternalCommentSchema,
  supportNotesSchema,
  supportSandboxMessageSchema,
  supportCustomerSendSchema,
  supportTagSchema,
} from '../../../../../shared-utils/customerSupportFormSchemas';

export {
  computeConversationStatus,
  mapRowToConversation,
  mapRowToMessage,
};

export {
  CONVERSATION_SELECT_COLUMNS,
  MESSAGE_SELECT_COLUMNS,
  fetchConversationMessages,
  fetchPreviousConversationMessages,
  fetchConversationActivityPage,
  fetchConversationAttachmentPage,
  fetchConversationMessageSearchPage,
  fetchGlobalCustomerSupportMessagePage,
  fetchGlobalCustomerSupportContactPage,
  fetchConversationMessageContext,
  fetchConversationReplyTarget,
} from './customerSupportHistoryService';
export type {
  CustomerSupportHistoryCursor,
  CustomerSupportHistoryPage,
  CustomerSupportGlobalSearchPage,
  CustomerSupportGlobalMessageMatch,
  CustomerSupportMessageContext,
} from './customerSupportHistoryService';

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
