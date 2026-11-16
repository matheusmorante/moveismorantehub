import { describe, expect, it } from 'vitest';
import { applyDeliveryOperationEvent, projectDeliveryOperationData } from './deliveryOperationState';
import { eventPatch } from '../../../services/offline/offlineEventPatch';

describe('estado independente das operações de entrega', () => {
  const order = {
    payments: [{ method: 'Pix', amount: 100, status: 'Pendente' }],
    paymentsSummary: { totalOrderValue: 100 },
    deliveryOperations: {
      first: { revision: 1, deliveryStatus: 'in_progress', deliveryStartedAt: 'first-start' },
      second: { revision: 0 },
    },
  };
  it('altera apenas a operação escolhida e conserva os pagamentos compartilhados', () => {
    const updated = applyDeliveryOperationEvent(order, {
      operationId: 'second', expectedOperationRevision: 0,
      operationPatch: { deliveryStatus: 'in_progress', deliveryStartedAt: 'second-start' },
    });
    expect(updated.deliveryOperations.first).toEqual(order.deliveryOperations.first);
    expect(updated.deliveryOperations.second).toMatchObject({ revision: 1, deliveryStatus: 'in_progress' });
    expect(updated.payments).toBe(order.payments);
    expect(order.deliveryOperations.second).toEqual({ revision: 0 });
    expect(projectDeliveryOperationData(updated, 'first').deliveryStartedAt).toBe('first-start');
    expect(projectDeliveryOperationData(updated, 'second').deliveryStartedAt).toBe('second-start');
  });
  it('registra pagamento no pedido e não copia seu valor para cada operação', () => {
    const updated = applyDeliveryOperationEvent(order, {
      operationId: 'first', expectedOperationRevision: 1,
      operationPatch: { deliveryStatus: 'completed' },
      expectedPayments: order.payments,
      payments: [{ method: 'Pix', amount: 100, status: 'Pago' }],
    });
    expect(updated.payments[0].status).toBe('Pago');
    expect(updated.paymentsSummary.amountRemaining).toBe(0);
    expect(updated.deliveryOperations.first).not.toHaveProperty('payments');
    expect(updated.deliveryOperations.second).toEqual(order.deliveryOperations.second);
  });
  it('não transforma evento da operação em conclusão do pedido inteiro na fila', () => {
    const payload = { operationId: 'first', expectedOperationRevision: 1, operationPatch: { deliveryStatus: 'completed' } };
    const patch = eventPatch({ eventId: 'event', type: 'DELIVERY_FINISH', entityType: 'order', entityId: 'one',
      payload, state: 'PENDING', occurredAt: 'now', createdAt: 'now', retryCount: 0 });
    expect(patch).toMatchObject(payload);
    expect(patch).not.toHaveProperty('status');
    expect(patch).not.toHaveProperty('deliveryStatus');
  });
});
