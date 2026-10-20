import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getNextOrderIndex, getOrderIndex, resolveOrderIndexForUpdate } from '../orderCode';
import {
  resolveOrderCustomerSnapshot,
  buildOrderPersistencePayload,
} from '../orderSnapshotResolution';
import { validateOrderStatusTransition } from '../orderStatusTransitionRules';
import type { OrderCirculationState } from '../nfe/cancellationEligibility';
import { ensureCustomerInCrm, syncCustomerToCrmBackground } from './orderCrmSyncService';
import { dispatchOrderUpdateNotifications } from './orderNotificationDispatcher';
import { removeNonStockItemLinks } from '../saleInventoryRules';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import { queryClient } from '@/lib/queryClient';
import { ensureOrderItemsHaveFiscalSnapshots } from '../orderFiscalSnapshotService';
import {
  getPersistedOrderDataSnapshot,
  setPersistedOrderDataSnapshot,
} from '../orderMapper';
import type { OrderUpdateOptions } from './orderMutationTypes';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { returnFulfillmentFormSchema, getReturnFulfillmentFormValues, returnFulfillmentReceiptSchema, ReturnFulfillmentUnconfirmedError,
  returnCancellationFormSchema, getReturnCancellationFormValues, returnCancellationReceiptSchema, ReturnCancellationUnconfirmedError,
  type ReturnCancellationValues, type ReturnCancellationReceipt, type ReturnFulfillmentValues, type ReturnFulfillmentReceipt } from '../../../../../shared-utils/returnFormSchemas';
import {
  applyTestArtifactUpdateRules,
  assertValidMutationScheduling,
  assertValidOrderQuotedStatus,
  buildUpdateOrderRpcCall,
  sanitizeOrderUpdateFields,
} from './orderUpdateSchema';

const TABLE_NAME = 'orders';

const resolveStatusOnlyOrderDataSnapshot = async (
  id: string,
  currentOrder: Order | undefined,
  merged: any,
  initialSnapshot: Record<string, unknown> | undefined,
  cleanUpdates: Record<string, any>,
  isCurrent?: () => boolean,
  validateSnapshot?: (snapshot: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> => {
  let persistedSnapshot = initialSnapshot;

  if (!persistedSnapshot && id && typeof supabase?.from === 'function') {
    try {
      const query = supabase.from(TABLE_NAME);
      if (query && typeof query.select === 'function') {
        const { data: currentDbOrder, error: fetchSnapshotError } = await query
          .select('order_data')
          .eq('id', id)
          .maybeSingle();

        if (
          !fetchSnapshotError &&
          currentDbOrder?.order_data &&
          typeof currentDbOrder.order_data === 'object'
        ) {
          persistedSnapshot = currentDbOrder.order_data as Record<string, unknown>;
          if (currentOrder && (!isCurrent || isCurrent())) {
            setPersistedOrderDataSnapshot(currentOrder, persistedSnapshot);
          }
        }
      }
    } catch {
      // Fallback seguro se a consulta do banco falhar ou estiver em ambiente restrito
    }
  }

  if (isCurrent && !persistedSnapshot) {
    throw new Error('Não foi possível conferir o registro original da devolução comercial. Atualize o histórico antes de confirmar o recebimento.');
  }

  const statusUpdateSnapshot =
    persistedSnapshot ??
    (currentOrder && !currentOrder.updatedAt ? merged : undefined) ??
    merged;

  if (!statusUpdateSnapshot) {
    throw new Error(
      'Não foi possível preservar o snapshot original do pedido. Atualize a lista e tente novamente.'
    );
  }

  validateSnapshot?.(statusUpdateSnapshot);

  const nextSnapshot: Record<string, unknown> = {
    ...statusUpdateSnapshot,
    status: cleanUpdates.status,
    ...(Object.hasOwn(cleanUpdates, 'autoFulfillExempt')
      ? { autoFulfillExempt: cleanUpdates.autoFulfillExempt }
      : {}),
  };

  if (cleanUpdates.status === 'scheduled') {
    delete (nextSnapshot as any).deliveryStatus;
    delete (nextSnapshot as any).unattendedReason;
    delete (nextSnapshot as any).unattendedNotes;
    delete (nextSnapshot as any).unattendedProofUrl;
    delete (nextSnapshot as any).unattendedProofUrls;
    delete (nextSnapshot as any).unattendedAt;
    delete (nextSnapshot as any).deliveryStartedAt;
    delete (nextSnapshot as any).deliveryArrivedAt;
    delete (nextSnapshot as any).deliveryServiceStartedAt;
    delete (nextSnapshot as any).deliveryFinishedAt;
    delete (nextSnapshot as any).deliveryChecklist;
  }

  return nextSnapshot;
};

/**
 * Atualização completa ou parcial de pedidos com conciliação de estoque, transição de status e CRM.
 */
export const executeUpdateOrder = async (
  id: string,
  orderToUpdate: Partial<Order>,
  currentOrder?: Order,
  expectedUpdatedAt?: string,
  options: OrderUpdateOptions = {}
): Promise<void | ReturnFulfillmentReceipt | ReturnCancellationReceipt> => {
  const cancellation = Boolean(options.returnCancellation);
  const confirmation = options.returnFulfillment ?? options.returnCancellation;
  const unconfirmed = () => cancellation ? new ReturnCancellationUnconfirmedError() : new ReturnFulfillmentUnconfirmedError();
  const assertCurrent = (committed = false) => {
    if (confirmation && !confirmation.isCurrent()) throw Object.assign(new Error('O contexto da confirmação mudou. Atualize o histórico da devolução comercial.'), { requiresRefresh: committed });
  };
  try {
    assertCurrent();
    if (confirmation) {
      const source = cancellation
        ? returnCancellationFormSchema.parse(getReturnCancellationFormValues(currentOrder ?? {}, true))
        : returnFulfillmentFormSchema.parse(getReturnFulfillmentFormValues(currentOrder ?? {}, true));
      if (id !== source.orderId || expectedUpdatedAt !== source.expectedUpdatedAt || options.metadataOnly
        || (options.returnCancellation && options.returnFulfillment)
        || orderToUpdate.status !== (cancellation ? 'cancelled' : 'fulfilled') || Object.keys(orderToUpdate).some((key) => key !== 'status')) {
        throw new Error('A devolução comercial mudou. Reabra a confirmação.');
      }
    }
    const { cleanUpdates, isStatusOnlyUpdate } = sanitizeOrderUpdateFields(orderToUpdate);
    let merged: any;
    let previousOrderData: any = currentOrder || null;
    let currentCirculationState: OrderCirculationState | undefined = currentOrder;
    let persistedOrderDataSnapshot = currentOrder
      ? getPersistedOrderDataSnapshot(currentOrder) ||
        ((currentOrder as any)?.order_data && typeof (currentOrder as any).order_data === 'object'
          ? (currentOrder as any).order_data
          : undefined)
      : undefined;

    if (currentOrder) {
      const { id: _id, ...rest } = { ...currentOrder, ...cleanUpdates } as any;
      merged = rest;
    } else {
      const { data: current, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !current) {
        console.error(
          '[OrderUpdate] Erro crítico: Não foi possível obter o pedido original para atualização segura.',
          fetchError
        );
        throw new Error(
          'Não foi possível encontrar o pedido original para realizar a atualização. A operação foi cancelada para evitar perda de dados.'
        );
      }

      previousOrderData = current.order_data || {};
      persistedOrderDataSnapshot = current.order_data || undefined;
      currentCirculationState = current as OrderCirculationState;
      const { id: _id, ...rest } = { ...(current.order_data || {}), ...cleanUpdates } as any;
      merged = rest;
    }

    merged = applyTestArtifactUpdateRules(merged, previousOrderData, cleanUpdates);

    const persistedCodeSource = getOrderIndex(previousOrderData) ? previousOrderData : currentOrder;
    const existingCode = resolveOrderIndexForUpdate(persistedCodeSource, cleanUpdates);
    if (existingCode) {
      merged.orderIndex = existingCode;
      merged.orderNumber = existingCode;
    } else if (!options.metadataOnly) {
      const newIndex = await getNextOrderIndex();
      merged.orderIndex = newIndex;
      merged.orderNumber = newIndex;
    }

    const shouldEnsureFiscalSnapshots =
      !options.metadataOnly &&
      ['draft', 'scheduled'].includes(previousOrderData?.status) &&
      ['draft', 'scheduled'].includes(merged.status) &&
      Object.hasOwn(cleanUpdates, 'items') &&
      Array.isArray(merged.items);

    if (!options.metadataOnly && !isStatusOnlyUpdate) {
      const sanitizedOrder = removeNonStockItemLinks(merged as Order);
      if (shouldEnsureFiscalSnapshots) {
        const [orderWithCustomerSnapshot, itemsWithFiscalSnapshots] = await Promise.all([
          resolveOrderCustomerSnapshot(sanitizedOrder),
          ensureOrderItemsHaveFiscalSnapshots(
            sanitizedOrder.items || [],
            sanitizedOrder.nfeData
          ),
        ]);
        merged = { ...orderWithCustomerSnapshot, items: itemsWithFiscalSnapshots };
      } else {
        merged = await resolveOrderCustomerSnapshot(sanitizedOrder);
      }
    }
    if (merged.id) delete merged.id;

    const previousStatus = previousOrderData?.status;
    const resultingStatus = orderToUpdate.status || merged.status || previousStatus;

    assertValidOrderQuotedStatus(resultingStatus, merged.orderType);

    if (!options.metadataOnly && !isStatusOnlyUpdate && Object.hasOwn(cleanUpdates, 'shipping')) {
      assertValidMutationScheduling(merged, resultingStatus);
    }

    const validation = validateOrderStatusTransition(
      previousStatus,
      orderToUpdate.status,
      currentCirculationState
    );
    if (!validation.allowed && validation.reason) {
      throw new Error(validation.reason);
    }

    const customerId =
      options.metadataOnly || merged.is_test || isStatusOnlyUpdate
        ? merged.customerData?.id
        : await ensureCustomerInCrm(merged.customerData, merged.marketingOrigin, false);
    if (merged.is_test && !customerId) {
      throw new Error('Pedido de teste exige um cliente identificado da própria execução.');
    }
    if (customerId && merged.customerData) {
      merged.customerData.id = customerId;
    }

    const updatePayload: Record<string, unknown> = buildOrderPersistencePayload(merged);
    if (options.metadataOnly) {
      // Fiscal drafts must not persist normalized customer/address/item values
      // over unrelated fields of the original commercial snapshot.
      if (!persistedOrderDataSnapshot) {
        const original = await withTimeout(
          supabase.from(TABLE_NAME).select('order_data').eq('id', id).maybeSingle(),
          15_000, null, 'pedido:conferir-snapshot-metadados'
        );
        if (original && !original.error && original.data?.order_data
          && typeof original.data.order_data === 'object' && !Array.isArray(original.data.order_data)) {
          persistedOrderDataSnapshot = original.data.order_data as Record<string, unknown>;
        }
      }
      if (!persistedOrderDataSnapshot) {
        throw new Error('Não foi possível conferir o snapshot original do pedido. Reabra a preparação fiscal antes de salvar.');
      }
      updatePayload.order_data = { ...persistedOrderDataSnapshot, ...cleanUpdates };
      if (!Object.hasOwn(cleanUpdates, 'items') && Array.isArray(persistedOrderDataSnapshot.items)) {
        merged.items = persistedOrderDataSnapshot.items;
        updatePayload.items = persistedOrderDataSnapshot.items;
      }
      if (!Object.hasOwn(cleanUpdates, 'payments') && Array.isArray(persistedOrderDataSnapshot.payments)) {
        merged.payments = persistedOrderDataSnapshot.payments;
      }
    }
    if (isStatusOnlyUpdate) {
      const statusSnapshot = await resolveStatusOnlyOrderDataSnapshot(
        id,
        currentOrder,
        merged,
        persistedOrderDataSnapshot,
        cleanUpdates,
        confirmation?.isCurrent,
        confirmation ? (snapshot) => {
          const original = { ...currentOrder, ...snapshot, updatedAt: currentOrder?.updatedAt };
          const parsed = cancellation ? returnCancellationFormSchema.safeParse(getReturnCancellationFormValues(original, true))
            : returnFulfillmentFormSchema.safeParse(getReturnFulfillmentFormValues(original, true));
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Confira o registro original da devolução comercial.');
          if (parsed.data.orderId !== id || parsed.data.returnMethod !== (currentOrder?.returnMethod ?? 'store_collection')) throw new Error('A devolução comercial mudou. Reabra a confirmação.');
        } : undefined,
      );
      updatePayload.order_data = statusSnapshot;
      if (Array.isArray(statusSnapshot.items)) {
        merged.items = statusSnapshot.items;
        updatePayload.items = statusSnapshot.items;
      }
      if (Array.isArray(statusSnapshot.payments)) {
        merged.payments = statusSnapshot.payments;
      }
    }

    const { rpcName, rpcArguments } = buildUpdateOrderRpcCall(
      id,
      merged,
      updatePayload,
      expectedUpdatedAt
    );

    assertCurrent();
    let response;
    if (confirmation) {
      try { response = await withTimeout(supabase.rpc(rpcName, rpcArguments), 30000, null, cancellation ? 'devolucao:confirmar-cancelamento-comercial' : 'devolucao:confirmar-recebimento-comercial'); }
      catch { throw unconfirmed(); }
      if (!response || response.status === 0) throw unconfirmed();
    } else response = await supabase.rpc(rpcName, rpcArguments);
    const { data: transaction, error: rpcError } = response;
    if (confirmation && rpcError && (!rpcError.code || rpcError.code.startsWith('08') || ['40003', 'PGRST116'].includes(rpcError.code))) throw unconfirmed();
    if (rpcError?.message?.includes('ORDER_VERSION_CONFLICT')) {
      throw new Error(
        confirmation ? 'A devolução comercial mudou. Atualize o histórico antes de confirmar a operação.'
          : 'O pedido mudou durante a conferência fiscal. Reabra a edição para revisar os dados atuais.'
      );
    }
    if (rpcError) throw rpcError;
    let confirmedReturn: ReturnFulfillmentReceipt | ReturnCancellationReceipt | undefined;
    if (confirmation) {
      const receipt = (cancellation ? returnCancellationReceiptSchema : returnFulfillmentReceiptSchema).safeParse(transaction);
      if (!receipt.success || receipt.data.id !== id || receipt.data.order_data.id !== id
        || (receipt.data.order_data.returnMethod ?? 'store_collection') !== (currentOrder?.returnMethod ?? 'store_collection')) throw unconfirmed();
      confirmedReturn = receipt.data;
      assertCurrent(true);
    }
    merged = { ...merged, ...(transaction?.order_data || {}) };

    const oldStatus = previousStatus;
    const newStatus = orderToUpdate.status || merged.status || oldStatus;
    if (
      !options.metadataOnly &&
      !isIdentifiedTestArtifact(previousOrderData) &&
      !isIdentifiedTestArtifact(merged)
    ) {
      try { dispatchOrderUpdateNotifications(id, previousOrderData, merged, oldStatus, newStatus); }
      catch (error) {
        if (!confirmation) throw error;
        console.error('[OrderUpdate] A operação comercial foi confirmada, mas houve falha na notificação.', error);
      }
    }

    if (!options.metadataOnly && !isStatusOnlyUpdate && !merged.is_test) {
      syncCustomerToCrmBackground(
        merged.customerData?.id,
        merged.customerData?.phone,
        merged.marketingOrigin
      );
    }
    if (!options.metadataOnly) {
      void queryClient
        .invalidateQueries({ queryKey: ['orders'] })
        .catch((error) =>
          console.error('[OrderUpdate] Falha ao atualizar a lista de pedidos:', error)
        );
    }
    return confirmedReturn;
  } catch (error) {
    if (!confirmation) console.error('Erro ao atualizar o pedido: ', error);
    throw error;
  }
};

export const confirmReturnOrderFulfillment = async (input: ReturnFulfillmentValues, order: Order, isCurrent: () => boolean): Promise<ReturnFulfillmentReceipt> => {
  const values = returnFulfillmentFormSchema.parse(input);
  const source = returnFulfillmentFormSchema.parse(getReturnFulfillmentFormValues(order, values.physicalConfirmed));
  if (values.orderId !== source.orderId || values.returnMethod !== source.returnMethod || values.expectedUpdatedAt !== source.expectedUpdatedAt) throw new Error('A devolução comercial mudou. Reabra a confirmação.');
  return returnFulfillmentReceiptSchema.parse(await executeUpdateOrder(values.orderId, { status: 'fulfilled' }, order, values.expectedUpdatedAt, { returnFulfillment: { isCurrent } }));
};

export const confirmReturnOrderCancellation = async (input: ReturnCancellationValues, order: Order, isCurrent: () => boolean): Promise<ReturnCancellationReceipt> => {
  const values = returnCancellationFormSchema.parse(input);
  const source = returnCancellationFormSchema.parse(getReturnCancellationFormValues(order, values.cancellationConfirmed));
  if (values.orderId !== source.orderId || values.returnMethod !== source.returnMethod || values.expectedUpdatedAt !== source.expectedUpdatedAt) throw new Error('A devolução comercial mudou. Reabra a confirmação.');
  return returnCancellationReceiptSchema.parse(await executeUpdateOrder(values.orderId, { status: 'cancelled' }, order, values.expectedUpdatedAt, { returnCancellation: { isCurrent } }));
};
