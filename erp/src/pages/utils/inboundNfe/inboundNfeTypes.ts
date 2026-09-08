export interface InboundInvoiceItem {
    id?: string;
    itemNumber: number;
    productCode: string;
    productDescription: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    freightValue?: number;
    ipiValue?: number;
    ipiPercent?: number;
    discountValue?: number;
    icmsValue?: number;
    matchedProductId?: string;
    matchedVariationId?: string;
}

export type InboundInvoiceStatus = 'pending' | 'received' | 'manifested';

export interface InboundInvoice {
    id: string;
    nfeKey: string;
    nfeNumber: string;
    series: string;
    issuedAt: string;
    emitterCnpj: string;
    emitterName: string;
    emitterTradeName?: string;
    recipientCnpj: string;
    recipientName: string;
    totalProducts: number;
    totalFreight: number;
    totalIpi: number;
    totalDiscount?: number;
    totalInsurance?: number;
    totalOtherExpenses?: number;
    totalIcms?: number;
    freightPercent?: number;
    operationNature?: string;
    model?: string;
    protocol?: string;
    entryExitAt?: string;
    emitterIe?: string;
    emitterAddress?: Record<string, unknown>;
    supplierId?: string;
    originalDocumentPath?: string;
    originalDocumentMime?: string;
    extractionWarnings?: string[];
    extractionConfidence?: Record<string, unknown>;
    totalInvoice: number;
    status: InboundInvoiceStatus;
    itemsCount: number;
    receiptId?: string;
    receivedAt?: string;
    rawXml?: string;
    items: InboundInvoiceItem[];
    createdAt?: string;
}
