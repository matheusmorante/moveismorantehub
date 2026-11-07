export interface NewMobileGoodsReceipt {
  id: string;
  receiptIndex?: number;
  purchaseId?: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  reversedAt?: string;
  totalValue: number;
  observation?: string;
  invoiceId?: string;
  invoiceComplete?: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
  fiscalKey?: string;
  attachments?: string[];
  ipiPercent?: number;
  freightPercent?: number;
  nonFiscalDiscountMode?: 'percent' | 'fixed';
  nonFiscalDiscountValue?: number;
  nonFiscalFreightMode?: 'percent' | 'fixed';
  nonFiscalFreightValue?: number;
  nonFiscalOtherExpensesMode?: 'percent' | 'fixed';
  nonFiscalOtherExpensesValue?: number;
  fiscalIpi?: number;
  fiscalFreight?: number;
  fiscalDiscount?: number;
  fiscalOtherExpenses?: number;
  items: Array<{
    productId: string;
    variationId?: string;
    receiptItemId?: string;
    description: string;
    quantity: number;
    baseCost: number;
    unitCost: number;
    totalCost: number;
    freightFiscalUnit?: number;
    freightNonFiscalUnit?: number;
    discountUnit?: number;
    otherExpensesFiscalUnit?: number;
    otherExpensesNonFiscalUnit?: number;
    additionalCostUnit?: number;
    sku?: string;
  }>;
}

export type MobileGoodsReceiptDraft = Omit<NewMobileGoodsReceipt, 'supplierId' | 'supplierName'> & {
  supplierId?: string;
  supplierName?: string;
};
