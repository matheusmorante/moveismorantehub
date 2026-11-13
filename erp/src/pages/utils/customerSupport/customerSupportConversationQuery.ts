import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  WhatsAppConversation,
  ConversationFilter,
  AssignedProfileSummary,
} from '@/pages/App/CustomerSupport/types';
import { mapRowToConversation } from './customerSupportMappers';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  fetchConversationCounts,
  hydrateConversationsCommercialData,
} from './query';

export { fetchConversationCounts };

export interface FetchConversationsOptions {
  page?: number;
  pageSize?: number;
  filter?: ConversationFilter;
  search?: string;
  agentId?: string | null;
  criteria?: import('@/pages/App/CustomerSupport/types').CustomerSupportFolderCriteria | null;
  canViewCommercialInfo?: boolean;
  canViewScheduledOperations?: boolean;
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
    canViewScheduledOperations = false,
    sortOrder = 'newest',
  } = options;
  const response = await withTimeout<any>(
    supabase.rpc('customer_support_list_conversations', {
      p_filter: filter,
      p_search: search.trim(),
      p_agent_id: agentId,
      p_criteria: criteria || {},
      p_page: page,
      p_page_size: pageSize,
      p_sort_order: sortOrder,
    }),
    15_000,
    null,
    'central:conversations'
  );
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

  const listedConversations: Array<WhatsAppConversation & { assignedProfile: AssignedProfileSummary | null }> = (
    data as Array<Record<string, any>>
  ).map((row) => ({
    ...mapRowToConversation(row),
    assignedProfile: row.assigned_to
      ? {
          id: row.assigned_to,
          fullName: row.assigned_profile_name || 'Atendente',
          role: row.assigned_profile_role || undefined,
        }
      : null,
  }));

  const hydrated = await hydrateConversationsCommercialData(
    supabase,
    listedConversations,
    canViewCommercialInfo,
    canViewScheduledOperations
  );

  return {
    conversations: hydrated,
    totalCount: Number(data[0]?.total_count || 0),
  };
}
