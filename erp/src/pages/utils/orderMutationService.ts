import Order from '../types/order.type';
import { executeSaveOrder } from './orderMutation/orderCreationService';
import { executeUpdateOrder } from './orderMutation/orderUpdateService';
import type { OrderUpdateOptions } from './orderMutation/orderMutationTypes';

export type { OrderUpdateOptions } from './orderMutation/orderMutationTypes';

/**
 * Criação atômica e persistência de pedidos com resolução de cliente, regras de estoque e notificações.
 */
export const saveOrder = async (
  order: Order,
  options: { idempotencyKey?: string } = {}
): Promise<string> => {
  return executeSaveOrder(order, updateOrder, options);
};

/**
 * Atualização completa ou parcial de pedidos com conciliação de estoque, transição de status e CRM.
 */
export const updateOrder = async (
  id: string,
  orderToUpdate: Partial<Order>,
  currentOrder?: Order,
  expectedUpdatedAt?: string,
  options?: OrderUpdateOptions
): Promise<void> => {
  await executeUpdateOrder(id, orderToUpdate, currentOrder, expectedUpdatedAt, options);
};

// Re-exports dos serviços especializados para consumo modular
export * from './orderMutation';
