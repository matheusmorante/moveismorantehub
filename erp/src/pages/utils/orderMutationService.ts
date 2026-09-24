import Order from "../types/order.type";
import { executeSaveOrder } from './orderMutation/orderCreationService';
import { executeUpdateOrder } from './orderMutation/orderUpdateService';

/**
 * Criação atômica e persistência de pedidos com resolução de cliente, regras de estoque e notificações.
 */
export const saveOrder = async (order: Order): Promise<string> => {
    return executeSaveOrder(order, updateOrder);
};

/**
 * Atualização completa ou parcial de pedidos com conciliação de estoque, transição de status e CRM.
 */
export const updateOrder = async (
    id: string,
    orderToUpdate: Partial<Order>,
    currentOrder?: Order
): Promise<void> => {
    return executeUpdateOrder(id, orderToUpdate, currentOrder);
};

// Re-exports dos serviços especializados para consumo modular
export * from './orderMutation';
