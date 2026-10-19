import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getNextOrderIndex, getOrderIndex } from '../orderCode';
import {
  resolveOrderCustomerSnapshot,
  buildOrderPersistencePayload,
} from '../orderSnapshotResolution';
import { ensureCustomerInCrm, syncCustomerToCrmBackground } from './orderCrmSyncService';
import { dispatchOrderCreationNotifications } from './orderNotificationDispatcher';
import { removeNonStockItemLinks } from '../saleInventoryRules';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import { queryClient } from '@/lib/queryClient';
import { ensureOrderItemsHaveFiscalSnapshots } from '../orderFiscalSnapshotService';
import {
  UUID_PATTERN,
  applyTestArtifactCreateRules,
  assertValidMutationScheduling,
  assertValidOrderQuotedStatus,
  buildCreateOrderRpcCall,
} from './orderUpdateSchema';

/**
 * Criação atômica e persistência de pedidos com resolução de cliente, regras de estoque e notificações.
 */
export const executeSaveOrder = async (
  order: Order,
  updateOrderFn: (id: string, partial: Partial<Order>, current?: Order) => Promise<void>,
  options: { idempotencyKey?: string } = {}
): Promise<string> => {
  assertValidOrderQuotedStatus(order.status, order.orderType);
  assertValidMutationScheduling(order, order.status);

  if (order.id) {
    await updateOrderFn(order.id, order);
    return order.id;
  }

  try {
    const sanitizedOrder = removeNonStockItemLinks(order);
    const [orderWithCustomerSnapshot, itemsWithFiscalSnapshots] = await Promise.all([
      resolveOrderCustomerSnapshot(sanitizedOrder),
      ensureOrderItemsHaveFiscalSnapshots(
        sanitizedOrder.items || [],
        sanitizedOrder.nfeData
      ),
    ]);
    let orderToSave = {
      ...orderWithCustomerSnapshot,
      items: itemsWithFiscalSnapshots,
    };
    orderToSave = applyTestArtifactCreateRules(orderToSave);
    delete orderToSave.id;
    orderToSave.deleted = false;
    orderToSave.deletedAt = null;

    if (!orderToSave.is_test && !orderToSave.orderIndex) {
      const nextIndex = await getNextOrderIndex();
      orderToSave.orderIndex = nextIndex;
      orderToSave.orderNumber = nextIndex;
    }
    if (!orderToSave.is_test && !getOrderIndex(orderToSave)) {
      throw new Error('Não foi possível gerar um código válido. O pedido não foi salvo.');
    }

    const customerId = orderToSave.is_test
      ? orderToSave.customerData?.id
      : await ensureCustomerInCrm(
          orderToSave.customerData,
          orderToSave.marketingOrigin,
          true
        );
    if (orderToSave.is_test && !customerId) {
      throw new Error('Pedido de teste exige um cliente identificado da própria execução.');
    }
    if (customerId && orderToSave.customerData) {
      orderToSave.customerData.id = customerId;
    }

    const insertPayload = buildOrderPersistencePayload(orderToSave);
    const { rpcName, rpcArgs } = buildCreateOrderRpcCall(orderToSave, insertPayload, options);

    const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, rpcArgs);
    if (rpcError) throw rpcError;

    const rowId = (rpcData as any)?.id;
    const persistedIndex = getOrderIndex(rpcData as any) ?? undefined;

    if (
      !rowId ||
      (orderToSave.is_test
        ? !UUID_PATTERN.test(String(rowId)) || persistedIndex !== undefined
        : persistedIndex !== orderToSave.orderIndex && !(rpcData as any)?.idempotent_replay)
    ) {
      throw new Error(
        orderToSave.is_test
          ? 'O banco não confirmou o UUID do artefato de teste sem código comercial.'
          : 'O banco não confirmou o código do pedido. O cadastro foi interrompido.'
      );
    }

    orderToSave = { ...orderToSave, ...((rpcData as any)?.order_data || {}) };

    if (!orderToSave.is_test) {
      syncCustomerToCrmBackground(
        orderToSave.customerData?.id,
        orderToSave.customerData?.phone,
        orderToSave.marketingOrigin
      );
    }

    if (!isIdentifiedTestArtifact(orderToSave) && !(rpcData as any)?.idempotent_replay) {
      dispatchOrderCreationNotifications(rowId, orderToSave);
    }

    void queryClient
      .invalidateQueries({ queryKey: ['orders'] })
      .catch((error) =>
        console.error('[OrderCreation] Falha ao atualizar a lista de pedidos:', error)
      );
    return String(rowId);
  } catch (error) {
    console.error('Erro ao salvar o pedido: ', error);
    throw error;
  }
};
