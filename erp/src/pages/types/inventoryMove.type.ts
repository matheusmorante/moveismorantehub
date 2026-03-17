export type InventoryMoveType = 'entry' | 'withdrawal' | 'balance';

export type InventoryMove = {
    id?: string;
    productId: string;
    variationId?: string;
    productDescription: string;
    type: InventoryMoveType;
    quantity: number;
    date: string;
    label?: string; // e.g., 'Venda', 'Compra', 'Ajuste Manual'
    unitCost?: number;
    parentMoveId?: string; // Links withdrawal to original entry for FIFO
    relatedEntityId?: string; // e.g., orderId, purchaseId
    relatedEntityType?: 'sales_order' | 'purchase_order' | 'adjustment' | 'manual';
    observation?: string;
    createdAt?: string;
};

export default InventoryMove;
