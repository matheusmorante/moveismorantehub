import { PurchaseItem } from '../../types/purchase.type';

export type GoodsReceiptStatus = 'draft' | 'received' | 'estornado';

export type GoodsReceipt = {
    id: string;
    receiptIndex?: number;
    purchaseId?: string;
    supplierId?: string;
    supplierName: string;
    receivedAt: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    items: PurchaseItem[];
    totalValue: number;
    observation?: string;
    fiscalKey?: string;
    attachments?: string[];
    status: GoodsReceiptStatus;
    isDraft: boolean;
    ipiPercent?: number;
    freightPercent?: number;
    // Dados não fiscais
    nonFiscalDiscountMode?: 'percent' | 'fixed';
    nonFiscalDiscountValue?: number;
    nonFiscalFreightMode?: 'percent' | 'fixed';
    nonFiscalFreightValue?: number;
    nonFiscalOtherExpensesMode?: 'percent' | 'fixed';
    nonFiscalOtherExpensesValue?: number;
    // Dados fiscais espelhados
    fiscalIpi?: number;
    fiscalFreight?: number;
    fiscalDiscount?: number;
    fiscalOtherExpenses?: number;
    createdAt?: string;
    updatedAt?: string;
};

export const STATUS_RANK: Record<GoodsReceiptStatus, number> = {
    draft: 0,
    received: 1,
    estornado: 2,
};

export interface FetchGoodsReceiptsOptions {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    status?: GoodsReceiptStatus;
}

export interface FetchGoodsReceiptsResult {
    items: GoodsReceipt[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
