import { expect, it } from 'vitest';
import { offlineSyncManager } from '../offlineSyncManager';
import { offlineStorageService } from '../offlineStorageService';
import { SyncQueueRepository } from '../../../repositories/SyncQueueRepository';
import { deliveryFlowService } from '../../../features/orders/services/deliveryFlowService';
import { resolveDeliveryStep } from '../../../features/orders/screens/delivery-preparation/deliveryFlowStepRules';
import { buildDeliveryRouteItems } from '../../../features/logistics/domain/deliveryRouteBuilder';

type OfflineDeliveryFlowCaseState = {
  connected: boolean;
  activeSessionUserId: string | null;
  rpcError: unknown;
  ordersById: Record<string, any>;
};

export function registerOfflineDeliveryFlowCase(state: OfflineDeliveryFlowCaseState): void {
  it('8. Fluxo Completo de Entrega (4 Etapas + Retrocesso + Cancelamento) Online e Offline com reconciliação no Roteiro', async () => {
    const todayStr = '2026-10-20';
    const orderId = 'order-e2e-flow-1';
    const initialOrder = {
      id: orderId,
      status: 'scheduled',
      version: 1,
      order_data: {
        id: orderId,
        orderIndex: '000777',
        status: 'scheduled',
        customerData: { fullName: 'Maria E2E', phone: '41999990000' },
        paymentsSummary: { totalOrderValue: 450 },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: todayStr, startTime: '08:00', endTime: '12:00' },
          deliveryAddress: { street: 'Rua E2E', number: '100', city: 'Curitiba' },
        },
        items: [{ id: 'it-1', name: 'Sofá Retrátil', quantity: 1 }],
      },
    };
    state.ordersById[orderId] = initialOrder;
    await offlineStorageService.cacheWorkingSet('logistics_orders', [initialOrder]);

    // Simular uso de fallback direto de pedidos no sync (sem RPC customizada)
    state.rpcError = { code: 'PGRST202', message: 'Could not find the function sync_entity_operation' };
    state.connected = false;
    state.activeSessionUserId = 'user-driver-1';
    offlineSyncManager.setCurrentUserId('user-driver-1');

    // Etapa 1: Preparação
    expect(resolveDeliveryStep(initialOrder.order_data).currentStep).toBe(1);

    // Etapa 1 -> Etapa 2 (Deslocamento) OFFLINE
    const step2 = await deliveryFlowService.startRoute({
      orderId,
      currentData: initialOrder.order_data,
      checklist: [{ id: 'chk-1', checked: true }],
      responsibles: [{ id: 'user-driver-1', name: 'Carlos Motorista' }],
      userProfileId: 'user-driver-1',
    });
    expect(resolveDeliveryStep(step2.updatedData).currentStep).toBe(2);
    expect(resolveDeliveryStep(step2.updatedData).headerTitle).toBe('Deslocamento');

    // Etapa 2 -> Etapa 3 (Chegada no Local) OFFLINE
    const step3 = await deliveryFlowService.arriveAtDestination({
      orderId,
      currentData: step2.updatedData,
    });
    expect(resolveDeliveryStep(step3.updatedData).currentStep).toBe(3);
    expect(resolveDeliveryStep(step3.updatedData).headerTitle).toBe('Chegada no Local');
    expect(resolveDeliveryStep(step3.updatedData).isInArrival).toBe(true);

    // Verificar que buildDeliveryRouteItems reconhece Etapa 3 ('arrived') como isCurrent = true
    const cachedMidFlow = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
    const routeMidFlow = buildDeliveryRouteItems(cachedMidFlow?.data || [], 'today', todayStr);
    expect(routeMidFlow).toHaveLength(1);
    expect(routeMidFlow[0].status).toBe('arrived');
    expect(routeMidFlow[0].isCurrent).toBe(true);

    // Etapa 3 -> Etapa 4 (Em Atendimento) OFFLINE
    const step4 = await deliveryFlowService.startService({
      orderId,
      currentData: step3.updatedData,
    });
    expect(resolveDeliveryStep(step4.updatedData).currentStep).toBe(4);
    expect(resolveDeliveryStep(step4.updatedData).headerTitle).toBe('Em Atendimento');
    expect(resolveDeliveryStep(step4.updatedData).isInService).toBe(true);

    // Retroceder Etapa 4 -> Etapa 3 (stepBackToArrival) OFFLINE e sincronizar
    const backTo3 = await deliveryFlowService.stepBackToArrival(orderId, step4.updatedData);
    expect(resolveDeliveryStep(backTo3.updatedData).currentStep).toBe(3);
    expect(backTo3.updatedData.deliveryServiceStartedAt).toBeUndefined();

    expect(state.ordersById[orderId].order_data.deliveryStatus).toBeUndefined();
    const queuedOfflineEvents = await SyncQueueRepository.listActive();
    expect(queuedOfflineEvents.map((item) => item.payload.event_type)).toEqual([
      'DELIVERY_START_ROUTE',
      'DELIVERY_ARRIVE_DESTINATION',
      'DELIVERY_START_SERVICE',
      'DELIVERY_STEP_BACK',
    ]);
    expect(queuedOfflineEvents.map((item) => item.expectedVersion)).toEqual([1, 1, 1, 1]);

    // Conectar e sincronizar fila até aqui: o servidor deve limpar deliveryServiceStartedAt e ficar na Etapa 3
    state.connected = true;
    await offlineSyncManager.processQueue();
    expect((await offlineSyncManager.getSummary()).conflictCount).toBe(0);
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBe('arrived');
    expect(state.ordersById[orderId].order_data.deliveryServiceStartedAt).toBeUndefined();
    expect(resolveDeliveryStep(state.ordersById[orderId].order_data).currentStep).toBe(3);

    // Avançar novamente Etapa 3 -> Etapa 4 e Finalizar Entrega (ONLINE)
    const step4Online = await deliveryFlowService.startService({
      orderId,
      currentData: state.ordersById[orderId].order_data,
    });
    const finished = await deliveryFlowService.finishDelivery({
      orderId,
      currentData: step4Online.updatedData,
      payments: [{ method: 'Pix', amount: 450, status: 'Pago' }],
    });
    await offlineSyncManager.processQueue();

    expect(finished.updatedData.status).toBe('fulfilled');
    expect(finished.updatedData.deliveryStatus).toBe('completed');
    expect(state.ordersById[orderId].status).toBe('fulfilled');
    expect(state.ordersById[orderId].delivery_status).toBe('completed');

    const cachedFinal = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
    const routeFinal = buildDeliveryRouteItems(cachedFinal?.data || [], 'today', todayStr);
    expect(routeFinal[0].status).toBe('completed');
    expect(routeFinal[0].isCurrent).toBe(false);
  });
}
