import type Order from '../../types/order.type';
import {
  assertOwnedByTestContext,
  getTestArtifactContext,
  stampTestOrder,
} from '../../../../../shared-utils/testArtifactContext';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import { validateShippingScheduling } from '../../../../../shared-utils/commercialShippingRules';

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const sanitizeOrderUpdateFields = (
  orderToUpdate: Partial<Order>
): { cleanUpdates: Partial<Order> & Record<string, any>; isStatusOnlyUpdate: boolean } => {
  const cleanUpdates: Partial<Order> & Record<string, any> = {};
  for (const [k, v] of Object.entries(orderToUpdate)) {
    if (v !== undefined) {
      cleanUpdates[k] = v;
    }
  }

  const keys = Object.keys(cleanUpdates);
  const statusOnlyKeys = new Set([
    'status',
    'autoFulfillExempt',
    'deliveryStatus',
    'delivery_status',
    'unattendedReason',
    'unattendedNotes',
    'unattendedProofUrl',
    'unattendedProofUrls',
    'unattendedAt',
    'deliveryStartedAt',
    'deliveryArrivedAt',
    'deliveryServiceStartedAt',
    'deliveryFinishedAt',
    'deliveryChecklist',
  ]);
  const isStatusOnlyUpdate =
    Object.hasOwn(cleanUpdates, 'status') &&
    keys.every((key) => statusOnlyKeys.has(key));

  return { cleanUpdates, isStatusOnlyUpdate };
};

export const assertValidOrderQuotedStatus = (status?: string, orderType?: string): void => {
  if (status === 'quoted' && orderType !== 'budget') {
    throw new Error('Somente orçamentos podem ser cadastrados com este status.');
  }
};

export const assertValidMutationScheduling = (
  order: Partial<Order>,
  resultingStatus?: string
): void => {
  const effectiveStatus = resultingStatus ?? order.status;
  if (
    effectiveStatus &&
    effectiveStatus !== 'draft' &&
    order.orderType !== 'budget' &&
    order.orderType !== 'return' &&
    order.orderType !== 'assistance' &&
    order.shipping?.scheduling
  ) {
    const schedulingErrors = validateShippingScheduling(
      order.shipping.scheduling,
      order.shipping.deliveryMethod || 'delivery',
      false
    );
    const firstSchedulingError =
      schedulingErrors['shipping_date'] ||
      schedulingErrors['shipping_time'] ||
      schedulingErrors['shipping_scheduling'];
    if (firstSchedulingError) {
      throw new Error(firstSchedulingError);
    }
  }
};

export const applyTestArtifactCreateRules = (orderToSave: Order): Order => {
  if (orderToSave.is_test !== true) return orderToSave;

  const testIdentity = getTestArtifactContext();
  if (!testIdentity) {
    throw new Error('O modo de artefato de teste exige operador autorizado nesta execução.');
  }
  const stamped = stampTestOrder(orderToSave, testIdentity);
  stamped.orderIndex = undefined;
  stamped.orderNumber = undefined;
  return stamped;
};

export const applyTestArtifactUpdateRules = (
  merged: any,
  previousOrderData: any,
  cleanUpdates: Partial<Order>
): any => {
  if (isIdentifiedTestArtifact(previousOrderData)) {
    assertOwnedByTestContext(previousOrderData);
  }
  if (cleanUpdates.is_test === false) {
    delete merged.testArtifact;
    delete merged.testRunId;
    delete merged.testOwnerId;
    return merged;
  }
  if (cleanUpdates.is_test === true && !isIdentifiedTestArtifact(previousOrderData)) {
    const identity = getTestArtifactContext();
    if (!identity) {
      throw new Error('O modo de teste exige operador autorizado nesta execução.');
    }
    return stampTestOrder(merged, identity);
  }
  return merged;
};

export const buildCreateOrderRpcCall = (
  orderToSave: Order,
  insertPayload: Record<string, any>,
  options: { idempotencyKey?: string } = {}
) => {
  const isReturn = orderToSave.orderType === 'return' && Boolean(orderToSave.linkedOrderId);
  const requestOrderId =
    isReturn && orderToSave.returnRequestId
      ? orderToSave.returnRequestId
      : options.idempotencyKey || crypto.randomUUID();

  if (orderToSave.is_test && !UUID_PATTERN.test(requestOrderId)) {
    throw new Error('O pedido de teste exige um UUID válido para sua identificação persistente.');
  }

  const hasFiscalReturnAllocations =
    isReturn &&
    Array.isArray((orderToSave as any).fiscalReturnAllocations) &&
    (orderToSave as any).fiscalReturnAllocations.length > 0;

  const rpcName = isReturn
    ? hasFiscalReturnAllocations
      ? 'create_return_order_with_fiscal_capacity'
      : 'create_return_order_with_capacity'
    : 'create_order_with_inventory_transaction';

  const rpcArgs = {
    p_order_id: requestOrderId,
    p_order_payload: insertPayload,
    p_items: orderToSave.items || [],
    p_payments: orderToSave.payments || [],
    ...(hasFiscalReturnAllocations
      ? { p_fiscal_allocations: (orderToSave as any).fiscalReturnAllocations }
      : {}),
  };

  return { requestOrderId, rpcName, rpcArgs };
};

export const buildUpdateOrderRpcCall = (
  id: string,
  merged: any,
  updatePayload: Record<string, any>,
  expectedUpdatedAt?: string
) => {
  const orderItemsPayload =
    merged.items && merged.items.length > 0
      ? merged.items
      : Array.isArray((updatePayload.order_data as any)?.items)
        ? (updatePayload.order_data as any).items
        : [];

  const orderPaymentsPayload =
    merged.payments && merged.payments.length > 0
      ? merged.payments
      : Array.isArray((updatePayload.order_data as any)?.payments)
        ? (updatePayload.order_data as any).payments
        : [];

  const rpcName = expectedUpdatedAt
    ? 'update_order_with_inventory_transaction_if_version'
    : 'create_order_with_inventory_transaction';

  const rpcArguments = expectedUpdatedAt
    ? {
        p_order_id: String(id),
        p_expected_updated_at: expectedUpdatedAt,
        p_order_payload: updatePayload,
        p_items: orderItemsPayload,
        p_payments: orderPaymentsPayload,
      }
    : {
        p_order_id: String(id),
        p_order_payload: updatePayload,
        p_items: orderItemsPayload,
        p_payments: orderPaymentsPayload,
        p_is_update: true,
      };

  return { rpcName, rpcArguments };
};
