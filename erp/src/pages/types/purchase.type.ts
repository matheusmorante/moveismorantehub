export type PurchaseItem = {
    productId: string;
    variationId?: string;
    description: string;
    quantity: number;
    receivedQuantity?: number;
    unitCost: number;
    totalCost: number;
    baseCost?: number;
    ipiPercent?: number;
    ipiValue?: number;
    freightValue?: number;
    allocatedFreight?: number;
    allocatedAdditionalCosts?: number;
    totalAdditionalCosts?: number;
    acquisitionCost?: number;
    fiscalBaseCost?: number;
    additionalCostUnit?: number;
    // Campos discriminados de desconto, frete e despesas
    discountFiscalUnit?: number;
    discountNonFiscalUnit?: number;
    discountUnit?: number;
    freightFiscalUnit?: number;
    freightNonFiscalUnit?: number;
    freightUnit?: number;
    otherExpensesFiscalUnit?: number;
    otherExpensesNonFiscalUnit?: number;
    otherExpensesUnit?: number;
    netBaseCost?: number;
};

export type Purchase = {
    id?: string;
    purchaseNumber?: number;
    supplierId: string;
    supplierName: string;
    date: string;
    items: PurchaseItem[];
    totalValue: number;
    observation?: string;
    status: 'ordered' | 'fulfilled' | 'cancelled'; // Em Ordem, Atendido, Cancelado
    createdAt?: string;
    stockProcessed?: boolean;
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceStatus?: 'pending' | 'partially_received' | 'received';
    fiscalKey?: string;
    attachments?: string[];
    ipiPercent?: number;
    freightPercent?: number;
};

export default Purchase;
