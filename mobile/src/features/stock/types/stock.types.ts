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
    status: 'received' | 'manifested' | 'pending';
    hasPendingBindings: boolean;
    sefazStatus: 'authorized' | 'cancelled' | 'denied' | 'pending';
    isSummaryOnly?: boolean;
    rawXml?: string;
}

export type InvoiceDateFilterMode = 'current_month' | 'previous_month' | 'current_year' | 'previous_year' | 'custom_month' | 'custom_range';

export interface InvoiceDateFilter {
    mode: InvoiceDateFilterMode;
    customMonth: string;
    startMonth: string;
    endMonth: string;
}

export interface InvoiceDetail extends Invoice {
    recipientName: string;
    recipientCnpj: string;
    receivedAt?: string;
    totalProducts: number;
    totalFreight: number;
    totalIpi: number;
    totalDiscount: number;
    totalInsurance: number;
    totalOtherExpenses: number;
    totalIcms: number;
    totalIcmsSt: number;
    emitterIe?: string;
    model?: string;
    protocol?: string;
    entryExitAt?: string;
    operationNature?: string;
    additionalInfo?: string;
    freightPercent: number;
    ipiPercent: number;
    rawXml?: string;
    items: InvoiceDetailItem[];
}

export interface InvoiceDetailItem {
    description: string;
    productCode: string;
    ean: string;
    ncm: string;
    cest: string;
    cfop: string;
    unit: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    freightValue: number;
    ipiValue: number;
    ipiPercent: number;
    icmsValue: number;
    icmsPercent: number;
    icmsStValue: number;
}

export interface InventorySession {
    id: string;
    name?: string;
    inventoryCode?: string;
    responsibleName?: string;
    status: 'in_progress' | 'completed' | 'pending' | 'pending_sync';
    created_at: string;
    updated_at: string;
    items_count?: number; // Keep for backward compatibility if needed, but we prefer productsCount
    productsCount?: number;
    adjustmentsCount?: number;
    reversedCount?: number;
}

export interface StockMove {
    id: string;
    date?: string;
    productId?: string;
    variationId?: string;
    productName?: string;
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
    relatedEntityType?: string;
    relatedEntityId?: string;
}
