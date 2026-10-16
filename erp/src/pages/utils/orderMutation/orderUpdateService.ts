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
  cleanUpdates: Record<string, any>
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
          if (currentOrder) {
            setPersistedOrderDataSnapshot(currentOrder, persistedSnapshot);
          }
        }
      }
    } catch {
      // Fallback seguro se a consulta do banco falhar ou estiver em ambiente restrito
    }
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

  return {
    ...statusUpdateSnapshot,
    status: cleanUpdates.status,
    ...(Object.hasOwn(cleanUpdates, 'autoFulfillExempt')
      ? { autoFulfillExempt: cleanUpdates.autoFulfillExempt }
      : {}),
  };
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
): Promise<void> => {
  try {
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

    if (!options.metadataOnly && !isStatusOnlyUpdate) {
      merged = removeNonStockItemLinks(await resolveOrderCustomerSnapshot(merged as Order));
    }

    if (
      !options.metadataOnly &&
      ['draft', 'scheduled'].includes(previousOrderData?.status) &&
      ['draft', 'scheduled'].includes(merged.status) &&
      Object.hasOwn(cleanUpdates, 'items') &&
      Array.isArray(merged.items)
    ) {
      merged.items = await ensureOrderItemsHaveFiscalSnapshots(merged.items, merged.nfeData);
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

    const updatePayload = buildOrderPersistencePayload(merged);
    if (isStatusOnlyUpdate) {
      updatePayload.order_data = await resolveStatusOnlyOrderDataSnapshot(
        id,
        currentOrder,
        merged,
        persistedOrderDataSnapshot,
        cleanUpdates
      );
    }

    const { rpcName, rpcArguments } = buildUpdateOrderRpcCall(
      id,
      merged,
      updatePayload,
      expectedUpdatedAt
    );

    const { data: transaction, error: rpcError } = await supabase.rpc(rpcName, rpcArguments);
    if (rpcError?.message?.includes('ORDER_VERSION_CONFLICT')) {
      throw new Error(
        'O pedido mudou durante a conferência fiscal. Reabra a edição para revisar os dados atuais.'
      );
    }
    if (rpcError) throw rpcError;
    merged = { ...merged, ...(transaction?.order_data || {}) };

    const oldStatus = previousStatus;
    const newStatus = orderToUpdate.status || merged.status || oldStatus;
    if (
      !options.metadataOnly &&
      !isIdentifiedTestArtifact(previousOrderData) &&
      !isIdentifiedTestArtifact(merged)
    ) {
      dispatchOrderUpdateNotifications(id, previousOrderData, merged, oldStatus, newStatus);
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
  } catch (error) {
    console.error('Erro ao atualizar o pedido: ', error);
    throw error;
  }
};
