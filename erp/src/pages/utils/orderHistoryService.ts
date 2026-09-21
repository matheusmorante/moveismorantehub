import Order from "../types/order.type";
import { formatOrderSchedulingText, resolveCompletedOrderStatus } from './orderSchedulingStatus';
import { handleStockAndBusinessRules, manuallyReverseStock } from './orderStockOperations';
import { 
    getNoticeFrequency, 
    getOrdersByProductId, 
    getOrdersByCustomerInfo, 
    getOrdersCustomerDataOnly, 
    fetchOrderById 
} from './orderSearchQueries';
import { 
    fetchOrdersPage, 
    subscribeToOrders, 
    subscribeToOrderChanges,
    enrichOrdersWithPeopleOrigins,
    fetchScheduledAndDraftOrders
} from './orderSyncQueries';
import { 
    moveToTrash as moveToTrashOp, 
    restoreOrder as restoreOrderOp, 
    permanentDeleteDraftOrder, 
    undoReturn as undoReturnOp 
} from './orderLifecycleOperations';
import { saveOrder, updateOrder } from './orderMutationService';

// Re-exports canônicos mantendo retrocompatibilidade 100% dos consumidores
export {
    formatOrderSchedulingText,
    resolveCompletedOrderStatus,
    handleStockAndBusinessRules,
    manuallyReverseStock,
    getNoticeFrequency,
    getOrdersByProductId,
    getOrdersByCustomerInfo,
    getOrdersCustomerDataOnly,
    fetchOrderById,
    fetchOrdersPage,
    subscribeToOrders,
    subscribeToOrderChanges,
    fetchScheduledAndDraftOrders,
    permanentDeleteDraftOrder,
    saveOrder,
    updateOrder
};

export const moveToTrash = (id: string): Promise<void> => moveToTrashOp(id, updateOrder);

export const restoreOrder = (id: string): Promise<void> => restoreOrderOp(id, updateOrder);

export const permanentDeleteOrder = async (id: string): Promise<void> => {
    await moveToTrash(id);
};

export const undoReturn = (order: Order): Promise<void> => undoReturnOp(order, updateOrder);

/** @deprecated Use moveToTrash instead */
export const deleteOrder = moveToTrash;
