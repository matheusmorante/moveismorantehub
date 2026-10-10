import Order from '../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { assertDeletedOrderId, canPermanentlyDeleteDraft } from './orderDeletionRules';
import { buildCancelledReturn } from './returnCancellation';
import { mapOrderFromDatabase } from './orderMapper';

const TABLE_NAME = 'orders';

export const moveToTrash = async (
  id: string,
  updateOrderFn: (id: string, updates: Partial<Order>) => Promise<void>
): Promise<void> => {
  try {
    await updateOrderFn(id, {
      deleted: true,
      deletedAt: new Date().toLocaleString('pt-BR'),
    } as any);
  } catch (error) {
    console.error('Erro ao mover para lixeira: ', error);
    throw error;
  }
};

export const restoreOrder = async (
  id: string,
  updateOrderFn: (id: string, updates: Partial<Order>) => Promise<void>
): Promise<void> => {
  try {
    await updateOrderFn(id, {
      deleted: false,
      deletedAt: null,
    } as any);
  } catch (error) {
    console.error('Erro ao restaurar o pedido: ', error);
    throw error;
  }
};

export const permanentDeleteDraftOrder = async (id: string): Promise<void> => {
  const { data: row, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('status, order_data')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  const orderStatus = row?.status || row?.order_data?.status;
  if (!canPermanentlyDeleteDraft(orderStatus)) {
    throw new Error('Somente pedidos em rascunho podem ser excluídos.');
  }

  const deletedAt = new Date().toISOString();
  const rawLegacy = row.order_data || {};
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      deleted: true,
      deleted_at: deletedAt,
      order_data: { ...rawLegacy, deleted: true, deletedAt: new Date().toLocaleString('pt-BR') },
      updated_at: deletedAt,
    })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertDeletedOrderId(id, data);
};

export const undoReturn = async (
  order: Order,
  updateOrderFn: (
    id: string,
    updates: Partial<Order>,
    currentOrder?: Order,
    expectedUpdatedAt?: string
  ) => Promise<void>
): Promise<void> => {
  if (!order.id) return;
  if (order.orderType !== 'return') {
    throw new Error('Selecione o pedido de devolução específico que deseja cancelar.');
  }

  try {
    const { data: returnRow, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', order.id)
      .single();

    if (fetchError || !returnRow) {
      throw new Error('Pedido de devolução não encontrado.');
    }

    const returnOrder = mapOrderFromDatabase(returnRow);
    if (returnOrder.orderType !== 'return') {
      throw new Error('O pedido informado não é uma devolução.');
    }
    if (returnOrder.status === 'cancelled') return;

    // A devolução agendada ainda não representa retorno físico nem gera entrada de estoque.
    // A atualização usa a versão lida para recusar uma confirmação física concorrente.
    const cancelledReturn = buildCancelledReturn(returnOrder);
    await updateOrderFn(returnOrder.id!, cancelledReturn, returnOrder, returnRow.updated_at);
  } catch (error) {
    console.error('Erro ao desfazer devolução:', error);
    throw error;
  }
};
