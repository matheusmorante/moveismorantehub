export type InventoryMoveType = 'entry' | 'exit' | 'withdrawal' | 'adjustment' | 'balance';

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
    unitPrice?: number;
    parentMoveId?: string; // Links withdrawal to original entry for FIFO
    relatedEntityId?: string; // e.g., orderId, purchaseId
    relatedEntityType?: 'sales_order' | 'purchase_order' | 'adjustment' | 'manual';
    observation?: string;
    status?: 'effective' | 'reversed' | 'active' | 'cancelled';
    reversalReason?: string;
    reversedAt?: string;
    productName?: string;
    createdAt?: string;
};

export default InventoryMove;
