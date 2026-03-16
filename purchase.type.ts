export type PurchaseItem = {
    productId: string;
    variationId?: string;
    description: string;
    quantity: number;
    receivedQuantity?: number;
    unitCost: number;
    totalCost: number;
};

export type Purchase = {
    id?: string;
    supplierId: string;
    supplierName: string;
    date: string;
    items: PurchaseItem[];
    totalValue: number;
    observation?: string;
    status: 'pending' | 'completed' | 'cancelled';
    createdAt?: string;
    stockProcessed?: boolean;
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceStatus?: 'pending' | 'partially_received' | 'received';
};

export default Purchase;
