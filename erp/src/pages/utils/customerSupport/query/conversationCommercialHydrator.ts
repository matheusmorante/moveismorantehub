import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppConversation, AssignedProfileSummary } from '@/pages/App/CustomerSupport/types';
import { mapPersonToSummary, type CustomerLinkStatus, type CustomerSummary } from '../customerMatchingService';
import type { SupportOrderSummary } from '../supportOrdersService';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export async function hydrateConversationsCommercialData(
  supabase: SupabaseClient,
  listedConversations: Array<WhatsAppConversation & { assignedProfile: AssignedProfileSummary | null }>,
  canViewCommercialInfo: boolean,
  canViewScheduledOperations: boolean
): Promise<WhatsAppConversation[]> {
  const identityByConversationId = new Map<
    string,
    {
      customerId: string;
      customerLinkStatus: CustomerLinkStatus;
      fullName: string;
    }
  >();

  const conversationsNeedingAutoLink = listedConversations.filter(
    (conversation) => !conversation.customerId && conversation.customerLinkStatus !== 'manually_linked'
  );

  if (canViewCommercialInfo && conversationsNeedingAutoLink.length > 0) {
    const identityResponse = await withTimeout<any>(
      supabase.rpc('customer_support_auto_link_conversations', {
        p_conversation_ids: conversationsNeedingAutoLink.map((conversation) => conversation.id),
      }),
      15_000,
      null,
      'central:vinculo-erp-por-telefone'
    );
    const identityRows = identityResponse?.data;

    if (identityResponse?.error || !Array.isArray(identityRows)) {
      console.warn('[CustomerSupport] Não foi possível conferir os cadastros do ERP pelo telefone nesta atualização.');
    } else {
      for (const row of identityRows) {
        const customerId = String(row.customer_id || '').trim();
        const fullName = String(row.customer_full_name || '').trim() || 'Cliente Sem Nome';
        const customerLinkStatus = row.customer_link_status as CustomerLinkStatus;
        if (
          !row.conversation_id ||
          !customerId ||
          !fullName ||
          !['unlinked', 'auto_matched', 'manually_linked', 'ambiguous'].includes(customerLinkStatus)
        )
          continue;
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
  const customerIds = Array.from(new Set(rawConversations.map((c) => c.customerId).filter(Boolean) as string[]));
  const contactPhones = Array.from(new Set(rawConversations.map((c) => c.contactPhone).filter(Boolean) as string[]));

  const customersMap = new Map<string, CustomerSummary>();
  const customerOrdersCountMap = new Map<string, number>();
  const scheduledOrderIndicatorsMap = new Map<string, {
    delivery: boolean;
    pickup: boolean;
    assistance: boolean;
    returnCollection: boolean;
  }>();

  if (canViewCommercialInfo && customerIds.length > 0) {
    const customerResponse = await withTimeout<any>(
      supabase.rpc('customer_support_list_customer_summaries', {
        p_customer_ids: customerIds,
      }),
      15_000,
      null,
      'central:clientes'
    );
    const customersData = customerResponse?.data;

    if (customerResponse?.error || !Array.isArray(customersData)) {
      throw new Error('Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.');
    }
    for (const c of customersData) {
      customersMap.set(String(c.id), mapPersonToSummary(c));
    }
  }

  if ((canViewCommercialInfo || canViewScheduledOperations) && (customerIds.length > 0 || contactPhones.length > 0)) {
    const targetKeys = Array.from(new Set([...customerIds, ...contactPhones]));
    const ordersResponse = await withTimeout<any>(
      supabase.rpc('customer_support_list_customer_order_indicators', {
        p_customer_ids: targetKeys,
      }),
      15_000,
      null,
      'central:indicadores-agendamento-pedidos'
    );
    const ordersData = ordersResponse?.data;

    if (ordersResponse?.error || !Array.isArray(ordersData)) {
      throw new Error('Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.');
    }
    for (const row of ordersData) {
      if (!row.customer_id) continue;
      const key = String(row.customer_id);
      const existing = scheduledOrderIndicatorsMap.get(key);
      scheduledOrderIndicatorsMap.set(key, {
        delivery: Boolean(existing?.delivery || row.scheduled_delivery),
        pickup: Boolean(existing?.pickup || row.scheduled_pickup),
        assistance: Boolean(existing?.assistance || row.scheduled_assistance),
        returnCollection: Boolean(existing?.returnCollection || row.scheduled_return_collection),
      });
      if (canViewCommercialInfo) customerOrdersCountMap.set(key, Number(row.order_count) || 0);
    }
  }

  // Hidrata conversas com clientes, pedidos e atendentes
  return rawConversations.map((c) => {
    const cust = c.customerId ? customersMap.get(c.customerId) || null : null;
    const ordersCountByCust = c.customerId ? customerOrdersCountMap.get(c.customerId) || 0 : 0;
    const ordersCountByPhone = c.contactPhone ? customerOrdersCountMap.get(c.contactPhone) || 0 : 0;
    const ordersCount = Math.max(ordersCountByCust, ordersCountByPhone);
    const indicatorsByCust = c.customerId ? scheduledOrderIndicatorsMap.get(c.customerId) : undefined;
    const indicatorsByPhone = c.contactPhone ? scheduledOrderIndicatorsMap.get(c.contactPhone) : undefined;

    return {
      ...c,
      customer: cust || c.customer || null,
      orders: ordersCount > 0 ? (Array(ordersCount).fill({}) as SupportOrderSummary[]) : [],
      scheduledOrderIndicators: {
        delivery: Boolean(indicatorsByCust?.delivery || indicatorsByPhone?.delivery),
        pickup: Boolean(indicatorsByCust?.pickup || indicatorsByPhone?.pickup),
        assistance: Boolean(indicatorsByCust?.assistance || indicatorsByPhone?.assistance),
        returnCollection: Boolean(indicatorsByCust?.returnCollection || indicatorsByPhone?.returnCollection),
      },
    };
  });
}
