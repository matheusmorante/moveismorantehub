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
import { getTestArtifactContext, stampTestOrder } from '../../../../../shared-utils/testArtifactContext';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import { queryClient } from '@/lib/queryClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Criação atômica e persistência de pedidos com resolução de cliente, regras de estoque e notificações.
 */
export const executeSaveOrder = async (
  order: Order,
  updateOrderFn: (id: string, partial: Partial<Order>, current?: Order) => Promise<void>,
  options: { idempotencyKey?: string } = {}
): Promise<string> => {
  if (order.id) {
    await updateOrderFn(order.id, order);
    return order.id;
  }

  try {
    let orderToSave = removeNonStockItemLinks(await resolveOrderCustomerSnapshot(order));
    if (orderToSave.is_test === true) {
      const testIdentity = getTestArtifactContext();
      if (!testIdentity) {
        throw new Error('O modo de artefato de teste exige operador autorizado nesta execução.');
      }
      orderToSave = stampTestOrder(orderToSave, testIdentity);
      // Artefatos de teste usam o UUID persistido como identificador e não
      // consomem nem carregam a sequência comercial do formulário.
      orderToSave.orderIndex = undefined;
      orderToSave.orderNumber = undefined;
    }
    delete orderToSave.id;
    orderToSave.deleted = false;
    orderToSave.deletedAt = null;

    // 1. Código sequencial pertence somente a pedidos comerciais.
    if (!orderToSave.is_test && !orderToSave.orderIndex) {
      const nextIndex = await getNextOrderIndex();
      orderToSave.orderIndex = nextIndex;
      orderToSave.orderNumber = nextIndex;
    }
    if (!orderToSave.is_test && !getOrderIndex(orderToSave)) {
      throw new Error('Não foi possível gerar um código válido. O pedido não foi salvo.');
    }

    // 2. Garantir cliente no CRM
    const customerId = orderToSave.is_test ? orderToSave.customerData?.id : await ensureCustomerInCrm(
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
    const orderItemsPayload = orderToSave.items || [];
    const orderPaymentsPayload = orderToSave.payments || [];

    let rowId: string | null = null;
    let persistedIndex: number | undefined = undefined;

    // A RPC grava pedido, itens, pagamentos, movimentações e saldo no mesmo commit.
    // Em caso de erro, não há fallback parcial que grave somente o pedido.
    const isReturn = orderToSave.orderType === 'return' && Boolean(orderToSave.linkedOrderId);
    const requestOrderId =
      isReturn && orderToSave.returnRequestId
        ? orderToSave.returnRequestId
        : options.idempotencyKey || crypto.randomUUID();
    if (orderToSave.is_test && !UUID_PATTERN.test(requestOrderId)) {
      throw new Error('O pedido de teste exige um UUID válido para sua identificação persistente.');
    }
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      isReturn
        ? Array.isArray((orderToSave as any).fiscalReturnAllocations) &&
          (orderToSave as any).fiscalReturnAllocations.length
          ? 'create_return_order_with_fiscal_capacity'
          : 'create_return_order_with_capacity'
        : 'create_order_with_inventory_transaction',
      {
        p_order_id: requestOrderId,
        p_order_payload: insertPayload,
        p_items: orderItemsPayload,
        p_payments: orderPaymentsPayload,
        ...(isReturn && (orderToSave as any).fiscalReturnAllocations?.length
          ? { p_fiscal_allocations: (orderToSave as any).fiscalReturnAllocations }
          : {}),
      }
    );
    if (rpcError) throw rpcError;
    rowId = (rpcData as any)?.id;
    persistedIndex = getOrderIndex(rpcData as any) ?? undefined;

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

    // O cliente de teste já foi criado pelo fluxo de cadastro da própria execução.
    if (!orderToSave.is_test) {
      syncCustomerToCrmBackground(
        orderToSave.customerData?.id,
        orderToSave.customerData?.phone,
        orderToSave.marketingOrigin
      );
    }

    // 5. Pedidos de teste não enviam avisos ao app, celular ou dispositivos conectados.
    if (!isIdentifiedTestArtifact(orderToSave) && !(rpcData as any)?.idempotent_replay) {
      dispatchOrderCreationNotifications(rowId, orderToSave);
    }

    void queryClient
      .invalidateQueries({ queryKey: ['orders'] })
      .catch((error) => console.error('[OrderCreation] Falha ao atualizar a lista de pedidos:', error));
    return String(rowId);
  } catch (error) {
    console.error('Erro ao salvar o pedido: ', error);
    throw error;
  }
};
