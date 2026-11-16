import { expandOrderAppointments, projectDeliveryOperation } from '../../../../../shared-utils/orderAppointmentOccurrences';
import { hasSeparateFulfillments } from '../../../../../shared-utils/fulfillmentScheduleGuard';

export type DeliveryOperationEvent = {
  operationId: string;
  expectedOperationRevision: number;
  operationPatch: Record<string, unknown>;
  expectedPayments?: unknown;
  payments?: Array<Record<string, unknown>>;
};

/** Attach the read-only operation projection to an order fetched by ID. */
export function attachDeliveryOperationStates(order: Record<string, any>) {
  const rows = order.order_delivery_operations;
  if (!Array.isArray(rows)) return order;
  const data = { ...(order.order_data || {}) };
  const legacyPayments = Array.isArray(data.payments) ? data.payments : [];
  const normalizedPayments = Array.isArray(order.order_payments) ? [...order.order_payments]
    .sort((a: any, b: any) => Number(a.payment_index) - Number(b.payment_index)) : [];
  data.__sharedPaymentSnapshot = { orderData: data.payments ?? null, normalized: normalizedPayments };
  if (normalizedPayments.length) {
    data.payments = normalizedPayments.map((payment: any, index: number) => ({
      ...(legacyPayments[Number(payment.payment_index) > 0 ? Number(payment.payment_index) - 1 : index] || {}),
      method: payment.payment_method || '', amount: Number(payment.amount || 0), fee: Number(payment.fee || 0),
      feeType: payment.fee_type || 'fixed', status: payment.status || 'PAGO',
      installments: Number(payment.installments ?? 1),
    }));
  }
  delete data.deliveryOperations;
  if (rows.length) {
    data.deliveryOperations = Object.fromEntries(rows.map((row: any) => [
      String(row.appointment_id), { ...(row.state || {}), revision: Number(row.revision || 0) },
    ]));
  }
  const { order_delivery_operations: _rows, order_payments: _payments, ...rest } = order;
  return { ...rest, order_data: data };
}

/** Apply an intent locally while its atomic server update is in the outbox. */
export function applyDeliveryOperationEvent(
  data: Record<string, any>,
  event: DeliveryOperationEvent,
): Record<string, any> {
  const operations = data.deliveryOperations && typeof data.deliveryOperations === 'object'
    ? data.deliveryOperations : {};
  const previous = operations[event.operationId] || {};
  const next = { ...previous, ...event.operationPatch, revision: event.expectedOperationRevision + 1 };
  const updated: Record<string, any> = { ...data, deliveryOperations: { ...operations, [event.operationId]: next } };
  if (event.payments) {
    const paid = event.payments.reduce((sum, payment) => {
      const amount = Number(payment.amount || 0);
      const fee = Number(payment.fee || 0);
      return sum + amount + (payment.feeType === 'percentage' ? amount * fee / 100 : fee);
    }, 0);
    const total = Number(data.paymentsSummary?.totalOrderValue || paid);
    updated.payments = event.payments;
    updated.paymentsSummary = {
      ...data.paymentsSummary, totalOrderValue: total, totalPaid: paid,
      totalAmountPaid: paid, amountRemaining: Math.max(0, total - paid),
    };
  }
  return updated;
}

export function projectDeliveryOperationData(data: Record<string, any>, operationId: string) {
  return projectDeliveryOperation(data, operationId);
}

export function getIndependentOperationId(order: Record<string, any>): string | null {
  const id = order.scheduleAppointment?.appointmentId;
  const source = order._sourceOrderData;
  if (!id || !source) return null;
  return hasSeparateFulfillments(source.shipping?.scheduling, source.items) || source.deliveryOperations?.[id]
    ? String(id) : null;
}

export function projectOperationOrder(order: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const id = order.scheduleAppointment?.appointmentId;
  const occurrence = expandOrderAppointments({ ...order, order_data: source })
    .find((candidate: any) => candidate.scheduleAppointment?.appointmentId === id);
  if (!occurrence) throw new Error('Esta operação mudou ou não possui mais itens. Atualize a lista.');
  return { ...occurrence, _sourceOrderData: source };
}
