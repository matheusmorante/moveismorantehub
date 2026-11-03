import { supabase } from '../../../services/supabaseClient';
import { syncLocalOrderCaches } from './deliveryOrderCacheSync';
import type { SyncEvent, SyncEventType } from '../../../services/offline/offlineTypes';

type RecordOfflineEvent = (
  type: SyncEventType,
  entityType: SyncEvent['entityType'],
  entityId: string,
  payload: any
) => Promise<void>;

export function createDeliveryFlowRollbackActions(recordOfflineEvent: RecordOfflineEvent) {
  return {
    /** Retrocede o status de Deslocamento para Preparação/Conferência. */
    async stepBackToPreparation(orderId: string, currentData: Record<string, any>) {
      const now = new Date().toISOString();
      const updatedData = { ...currentData, deliveryPreparationStartedAt: now };
      delete updatedData.deliveryStatus;
      delete updatedData.deliveryStartedAt;
      delete updatedData.deliveryArrivedAt;
      delete updatedData.deliveryServiceStartedAt;

      try {
        await supabase
          .from('orders')
          .update({
            delivery_status: null,
            delivery_started_at: null,
            delivery_arrived_at: null,
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', orderId);
      } catch (dbErr) {
        console.warn('[deliveryFlowService] Falha ao retroceder para preparação:', dbErr);
      }

      await syncLocalOrderCaches(orderId, updatedData);
      await recordOfflineEvent('DELIVERY_STEP_BACK', 'order', orderId, {
        ...updatedData,
        deliveryStatus: null,
        deliveryStartedAt: null,
        deliveryArrivedAt: null,
        deliveryServiceStartedAt: null,
      });

      return { updatedData };
    },

    /** Retrocede o status de Chegada para Deslocamento. */
    async stepBackToRoute(orderId: string, currentData: Record<string, any>) {
      const now = new Date().toISOString();
      const updatedData: Record<string, any> = {
        ...currentData,
        deliveryStatus: 'in_progress',
      };
      delete updatedData.deliveryArrivedAt;
      delete updatedData.deliveryServiceStartedAt;

      try {
        await supabase
          .from('orders')
          .update({
            delivery_status: 'in_progress',
            delivery_arrived_at: null,
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', orderId);
      } catch (dbErr) {
        console.warn('[deliveryFlowService] Falha ao retroceder para rota:', dbErr);
      }

      await syncLocalOrderCaches(orderId, updatedData);
      await recordOfflineEvent('DELIVERY_STEP_BACK', 'order', orderId, {
        ...updatedData,
        deliveryStatus: 'in_progress',
        deliveryArrivedAt: null,
        deliveryServiceStartedAt: null,
      });

      return { updatedData };
    },

    /** Retrocede o status de Em Atendimento para Chegada. */
    async stepBackToArrival(orderId: string, currentData: Record<string, any>) {
      const now = new Date().toISOString();
      const updatedData: Record<string, any> = {
        ...currentData,
        deliveryStatus: 'arrived',
      };
      delete updatedData.deliveryServiceStartedAt;

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
        console.warn('[deliveryFlowService] Falha ao retroceder para chegada:', dbErr);
      }

      await syncLocalOrderCaches(orderId, updatedData);
      await recordOfflineEvent('DELIVERY_STEP_BACK', 'order', orderId, {
        ...updatedData,
        deliveryStatus: 'arrived',
        deliveryServiceStartedAt: null,
      });

      return { updatedData };
    },

    /** Cancela a entrega e redefine o status do pedido para 'scheduled'. */
    async cancelDelivery(orderId: string, currentData: Record<string, any>) {
      const now = new Date().toISOString();
      const updatedData = { ...currentData };
      delete updatedData.deliveryStatus;
      delete updatedData.deliveryPreparationStartedAt;
      delete updatedData.deliveryStartedAt;
      delete updatedData.deliveryArrivedAt;
      delete updatedData.deliveryServiceStartedAt;
      delete updatedData.deliveryFinishedAt;
      delete updatedData.deliveryChecklist;
      delete updatedData.unattendedReason;
      delete updatedData.unattendedNotes;
      delete updatedData.unattendedProofUrl;
      delete updatedData.unattendedProofUrls;
      delete updatedData.unattendedAt;

      try {
        await supabase
          .from('orders')
          .update({
            status: 'scheduled',
            delivery_status: null,
            delivery_started_at: null,
            delivery_arrived_at: null,
            delivery_finished_at: null,
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', orderId);
      } catch (dbErr) {
        console.warn('[deliveryFlowService] Falha na persistência direta do cancelamento:', dbErr);
      }

      await syncLocalOrderCaches(orderId, updatedData, 'scheduled');
      await recordOfflineEvent('DELIVERY_CANCEL', 'order', orderId, {
        ...updatedData,
        status: 'scheduled',
        deliveryStatus: null,
        deliveryPreparationStartedAt: null,
        deliveryStartedAt: null,
        deliveryArrivedAt: null,
        deliveryServiceStartedAt: null,
        deliveryFinishedAt: null,
        deliveryChecklist: null,
        unattendedAt: null,
        unattendedReason: null,
        unattendedNotes: null,
        unattendedProofUrl: null,
        unattendedProofUrls: null,
      });

      return { updatedData };
    },
  };
}
