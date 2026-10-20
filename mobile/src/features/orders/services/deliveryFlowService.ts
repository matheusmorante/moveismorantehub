import { supabase } from '../../../services/supabaseClient';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { SyncEventType, SyncEvent } from '../../../services/offline/offlineTypes';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { DeliveryResponsibleItem } from '../screens/delivery-preparation/deliveryPreparation.types';

export interface StartRouteParams {
  orderId: string;
  currentData: Record<string, any>;
  checklist: Array<{ id: string; checked: boolean }>;
  responsibles: DeliveryResponsibleItem[];
  userProfileId?: string | null;
}

export interface ArriveDestinationParams {
  orderId: string;
  currentData: Record<string, any>;
}

export interface StartServiceParams {
  orderId: string;
  currentData: Record<string, any>;
}

export interface FinishDeliveryParams {
  orderId: string;
  currentData: Record<string, any>;
  payments: Array<Record<string, any>>;
}

export interface UnattendedDeliveryParams {
  orderId: string;
  currentData: Record<string, any>;
  reason: string;
  notes: string;
  proofUrls: string[];
}

const syncLocalOrderCaches = async (
  orderId: string,
  updatedData: Record<string, any>,
  nextStatus?: string
) => {
  const now = new Date().toISOString();
  try {
    const existing = await OrderRepository.getById(orderId);
    const status = nextStatus || updatedData.status || existing?.status || 'scheduled';
    await OrderRepository.saveLocal({
      id: orderId,
      status,
      orderType: existing?.orderType,
      customerName:
        existing?.customerName ||
        updatedData?.customerData?.fullName ||
        updatedData?.customerName,
      totalAmount:
        existing?.totalAmount ??
        Number(updatedData?.paymentsSummary?.totalOrderValue ?? updatedData?.totalValue ?? 0),
      orderData: updatedData,
      version: existing?.version ?? 1,
      updatedAt: now,
      syncedAt: existing?.syncedAt,
      isPendingLocal: true,
    });
  } catch {}

  for (const cacheKey of ['logistics_orders', 'assemblies_orders']) {
    try {
      const cached = await offlineStorageService.getWorkingSet<any[]>(cacheKey);
      if (Array.isArray(cached?.data) && cached.data.length > 0) {
        let changed = false;
        const nextList = cached.data.map((ord) => {
          if (ord?.id === orderId) {
            changed = true;
            const status = nextStatus || updatedData.status || ord.status || 'scheduled';
            return {
              ...ord,
              status,
              delivery_status: updatedData.deliveryStatus ?? null,
              deliveryStatus: updatedData.deliveryStatus,
              order_data: updatedData,
              updated_at: now,
            };
          }
          return ord;
        });
        if (changed) {
          await offlineStorageService.cacheWorkingSet(cacheKey, nextList);
        }
      }
    } catch {}
  }
};

const safeRecordOfflineEvent = async (
  type: SyncEventType,
  entityType: SyncEvent['entityType'],
  entityId: string,
  payload: any
) => {
  try {
    await offlineSyncManager.recordEvent(type, entityType, entityId, payload);
  } catch (err) {
    console.warn(`[deliveryFlowService] Falha não impeditiva ao registrar evento offline (${type}):`, err);
  }
};

/**
 * Serviço de domínio responsável pela persistência e sincronização offline
 * dos eventos do fluxo de entrega (SRP & Separation of Concerns).
 */
export const deliveryFlowService = {
  /**
   * Inicia a rota de entrega, gravando no Supabase e enfileirando o evento offline.
   */
  async startRoute({
    orderId,
    currentData,
    checklist,
    responsibles,
    userProfileId,
  }: StartRouteParams) {
    const now = new Date().toISOString();
    const primaryResponsible = responsibles[0];
    const responsibleName = responsibles.map((r) => r.name).join(', ');

    const payload = {
      deliveryStatus: 'in_progress',
      deliveryStartedAt: now,
      deliveryChecklist: checklist,
      deliveryResponsibles: responsibles,
      deliveryResponsibleName: responsibleName,
      deliveryResponsibleId: primaryResponsible?.id || userProfileId || null,
    };

    const updatedData = {
      ...currentData,
      ...payload,
    };

    try {
      await supabase
        .from('orders')
        .update({
          delivery_status: 'in_progress',
          delivery_started_at: now,
          order_data: updatedData,
          updated_at: now,
        })
        .eq('id', orderId);
    } catch (dbErr) {
      console.warn('[deliveryFlowService] Falha na persistência direta do pedido:', dbErr);
    }

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_START_ROUTE', 'order', orderId, payload);

    return {
      updatedData,
      responsibleName,
    };
  },

  /**
   * Registra a chegada da equipe ao endereço do cliente (Etapa 3: Chegada).
   */
  async arriveAtDestination({ orderId, currentData }: ArriveDestinationParams) {
    const now = new Date().toISOString();
    const payload = {
      deliveryStatus: 'arrived',
      deliveryArrivedAt: now,
    };

    const updatedData = {
      ...currentData,
      ...payload,
    };

    try {
      await supabase
        .from('orders')
        .update({
          delivery_status: 'arrived',
          order_data: updatedData,
          updated_at: now,
        })
        .eq('id', orderId);
    } catch (dbErr) {
      console.warn('[deliveryFlowService] Falha na persistência de chegada:', dbErr);
    }

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_ARRIVE_DESTINATION', 'order', orderId, payload);

    return { updatedData };
  },

  /**
   * Inicia formalmente o atendimento no cliente (Etapa 4: Em Atendimento).
   */
  async startService({ orderId, currentData }: StartServiceParams) {
    const now = new Date().toISOString();
    const payload = {
      deliveryStatus: 'in_service',
      deliveryServiceStartedAt: now,
    };

    const updatedData = {
      ...currentData,
      ...payload,
    };

    try {
      await supabase
        .from('orders')
        .update({
          delivery_status: 'in_service',
          order_data: updatedData,
          updated_at: now,
        })
        .eq('id', orderId);
    } catch (dbErr) {
      console.warn('[deliveryFlowService] Falha na persistência de início de atendimento:', dbErr);
    }

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_START_SERVICE', 'order', orderId, payload);

    return { updatedData };
  },

  /**
   * Conclui a entrega e atualiza o resumo de pagamentos.
   */
  async finishDelivery({ orderId, currentData, payments }: FinishDeliveryParams) {
    const now = new Date().toISOString();
    const paidAmount = payments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );
    const totalValue = Number(currentData.paymentsSummary?.totalOrderValue || paidAmount);

    const payload = {
      payments,
      paymentsSummary: {
        ...currentData.paymentsSummary,
        totalOrderValue: totalValue,
        totalPaid: paidAmount,
        totalAmountPaid: paidAmount,
        amountRemaining: Math.max(0, totalValue - paidAmount),
      },
      status: 'fulfilled',
      deliveryStatus: 'completed',
      deliveryFinishedAt: now,
    };

    const updatedData = {
      ...currentData,
      ...payload,
    };

    await syncLocalOrderCaches(orderId, updatedData, 'fulfilled');
    await safeRecordOfflineEvent('DELIVERY_FINISH', 'order', orderId, payload);

    return { updatedData };
  },

  /**
   * Registra insucesso na entrega (não foi possível entregar).
   */
  async recordUnattended({
    orderId,
    currentData,
    reason,
    notes,
    proofUrls,
  }: UnattendedDeliveryParams) {
    const now = new Date().toISOString();
    const payload = {
      deliveryStatus: 'unattended',
      unattendedReason: reason,
      unattendedNotes: notes,
      unattendedProofUrl: proofUrls[0] || '',
      unattendedProofUrls: proofUrls,
      unattendedAt: now,
    };

    const updatedData = {
      ...currentData,
      ...payload,
    };

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_UNATTENDED', 'order', orderId, payload);

    return { updatedData };
  },

  /**
   * Retrocede o status de Em Rota para Preparação/Conferência.
   */
  async stepBackToPreparation(orderId: string, currentData: Record<string, any>) {
    const updatedData = { ...currentData };
    delete updatedData.deliveryStatus;
    delete updatedData.deliveryStartedAt;

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_STEP_BACK', 'order', orderId, updatedData);

    return { updatedData };
  },

  /**
   * Retrocede o status de Chegada para Em Rota.
   */
  async stepBackToRoute(orderId: string, currentData: Record<string, any>) {
    const updatedData = {
      ...currentData,
      deliveryStatus: 'in_progress',
    };
    delete updatedData.deliveryArrivedAt;
    delete updatedData.deliveryServiceStartedAt;

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_STEP_BACK', 'order', orderId, updatedData);

    return { updatedData };
  },

  /**
   * Retrocede o status de Em Atendimento para Chegada.
   */
  async stepBackToArrival(orderId: string, currentData: Record<string, any>) {
    const updatedData = {
      ...currentData,
      deliveryStatus: 'arrived',
    };
    delete updatedData.deliveryServiceStartedAt;

    await syncLocalOrderCaches(orderId, updatedData);
    await safeRecordOfflineEvent('DELIVERY_STEP_BACK', 'order', orderId, updatedData);

    return { updatedData };
  },

  /**
   * Cancela a entrega e redefine o status do pedido para 'scheduled'.
   */
  async cancelDelivery(orderId: string, currentData: Record<string, any>) {
    const now = new Date().toISOString();
    const updatedData = { ...currentData };
    delete updatedData.deliveryStatus;
    delete updatedData.deliveryStartedAt;
    delete updatedData.deliveryArrivedAt;
    delete updatedData.deliveryServiceStartedAt;
    delete updatedData.deliveryFinishedAt;
    delete updatedData.deliveryChecklist;
    delete updatedData.unattendedReason;
    delete updatedData.unattendedNotes;
    delete updatedData.unattendedProofUrl;
    delete updatedData.unattendedProofUrls;

    try {
      await supabase
        .from('orders')
        .update({
          status: 'scheduled',
          order_data: updatedData,
          updated_at: now,
        })
        .eq('id', orderId);
    } catch (dbErr) {
      console.warn('[deliveryFlowService] Falha na persistência direta do cancelamento:', dbErr);
    }

    await syncLocalOrderCaches(orderId, updatedData, 'scheduled');
    await offlineSyncManager.recordEvent('DELIVERY_CANCEL', 'order', orderId, {
      ...updatedData,
      status: 'scheduled',
      deliveryStatus: null,
      deliveryStartedAt: null,
      deliveryArrivedAt: null,
      deliveryServiceStartedAt: null,
      deliveryFinishedAt: null,
      unattendedAt: null,
      unattendedReason: null,
      unattendedNotes: null,
      unattendedProofUrl: null,
      unattendedProofUrls: null,
    });

    return { updatedData };
  },
};
