export interface Invoice {
    id: string;
    number: string;
    series: string;
    accessKey: string;
    supplierName: string;
    supplierCnpj?: string;
    issueDate: string;
    totalValue: number;
    itemsCount: number;
    status: 'available' | 'processed';
    hasPendingBindings: boolean;
    sefazStatus: 'authorized' | 'cancelled' | 'denied' | 'pending';
}

export interface InventorySession {
    id: string;
    name?: string;
    status: 'in_progress' | 'completed' | 'pending';
    created_at: string;
    updated_at: string;
    items_count?: number;
}

export interface StockMove {
    id: string;
    type: 'in' | 'out' | 'entry' | 'exit' | 'withdrawal' | 'adjustment' | 'balance';
    quantity: number;
    productDescription?: string;
    label?: string;
    unitCost?: number;
    unitPrice?: number;
    status?: string;
    reversedAt?: string;
    created_at: string;
    observation?: string;
    reversalReason?: string;
}
