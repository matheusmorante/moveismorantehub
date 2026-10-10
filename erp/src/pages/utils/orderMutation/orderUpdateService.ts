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
import { assertOwnedByTestContext } from '../../../../../shared-utils/testArtifactContext';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import { queryClient } from '@/lib/queryClient';

const TABLE_NAME = 'orders';

/**
 * Atualização completa ou parcial de pedidos com conciliação de estoque, transição de status e CRM.
 */
export const executeUpdateOrder = async (
  id: string,
  orderToUpdate: Partial<Order>,
  currentOrder?: Order,
  expectedUpdatedAt?: string
): Promise<void> => {
  try {
    let merged: any;
    let previousOrderData: any = currentOrder || null;
    let currentCirculationState: OrderCirculationState | undefined = currentOrder;

    const cleanUpdates: any = {};
    for (const [k, v] of Object.entries(orderToUpdate)) {
      if (v !== undefined) {
        cleanUpdates[k] = v;
      }
    }

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
      currentCirculationState = current as OrderCirculationState;
      const { id: _id, ...rest } = { ...(current.order_data || {}), ...cleanUpdates } as any;
      merged = rest;
    }

    assertOwnedByTestContext(previousOrderData);

    // 1. Manutenção do código do pedido
    const persistedCodeSource = getOrderIndex(previousOrderData) ? previousOrderData : currentOrder;
    const existingCode = resolveOrderIndexForUpdate(persistedCodeSource, cleanUpdates);
    if (existingCode) {
      merged.orderIndex = existingCode;
      merged.orderNumber = existingCode;
    } else {
      const newIndex = await getNextOrderIndex();
      merged.orderIndex = newIndex;
      merged.orderNumber = newIndex;
    }

    merged = removeNonStockItemLinks(await resolveOrderCustomerSnapshot(merged as Order));
    if (merged.id) delete merged.id;

    // 2. Validação da transição de status
    const previousStatus = previousOrderData?.status;
    const validation = validateOrderStatusTransition(
      previousStatus,
      orderToUpdate.status,
      currentCirculationState
    );
    if (!validation.allowed && validation.reason) {
      throw new Error(validation.reason);
    }
    // 3. Garantir cliente no CRM
    const customerId = merged.is_test ? merged.customerData?.id : await ensureCustomerInCrm(
      merged.customerData,
      merged.marketingOrigin,
      false
    );
    if (merged.is_test && !customerId) {
      throw new Error('Pedido de teste exige um cliente identificado da própria execução.');
    }
    if (customerId && merged.customerData) {
      merged.customerData.id = customerId;
    }

    const updatePayload = buildOrderPersistencePayload(merged);
    const orderItemsPayload = merged.items || [];
    const orderPaymentsPayload = merged.payments || [];

    // 4. Pedido, saídas/entradas, estornos e saldo são uma única transação.
    // Sem fallback de escrita parcial quando a movimentação falha.
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
    const { data: transaction, error: rpcError } = await supabase.rpc(rpcName, rpcArguments);
    if (rpcError?.message?.includes('ORDER_VERSION_CONFLICT'))
      throw new Error('O pedido mudou durante a conferência fiscal. Reabra a edição para revisar os dados atuais.');
    if (rpcError) throw rpcError;
    merged = { ...merged, ...(transaction?.order_data || {}) };

    // 5. Notificações de eventos e alterações
    const oldStatus = previousStatus;
    const newStatus = orderToUpdate.status || merged.status || oldStatus;
    if (
      !isIdentifiedTestArtifact(previousOrderData) &&
      !isIdentifiedTestArtifact(merged)
    ) {
      dispatchOrderUpdateNotifications(id, previousOrderData, merged, oldStatus, newStatus);
    }

    // 6. Sincronização em background do cliente no CRM
    if (!merged.is_test) syncCustomerToCrmBackground(
      merged.customerData?.id,
      merged.customerData?.phone,
      merged.marketingOrigin
    );
    void queryClient
      .invalidateQueries({ queryKey: ['orders'] })
      .catch((error) => console.error('[OrderUpdate] Falha ao atualizar a lista de pedidos:', error));
  } catch (error) {
    console.error('Erro ao atualizar o pedido: ', error);
    throw error;
  }
};
