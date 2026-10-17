export interface ReceiptPayloadContext {
  id?: string;
  receiptIndex?: number;
  purchaseId?: string;
  supplierName: string;
  safeReceivedAt: string;
  status?: 'received' | 'draft';
  isDraft?: boolean;
}

export function buildGoodsReceiptPayload(
  validated: any,
  context: ReceiptPayloadContext
) {
  return {
    id: context.id,
    receiptIndex: context.receiptIndex,
    purchaseId: context.purchaseId || undefined,
    supplierId: validated.supplierId,
    supplierName: context.supplierName,
    receivedAt: context.safeReceivedAt,
    invoiceNumber: validated.invoiceNumber,
    invoiceDate: validated.invoiceDate,
    items: validated.items,
    totalValue: validated.totalValue,
    observation: validated.observations.join('\n'),
    fiscalKey: validated.fiscalKey,
    attachments: validated.attachments,
    ipiPercent: validated.ipiPercent,
    freightPercent: validated.freightPercent,
    nonFiscalDiscountMode: validated.nonFiscalDiscountMode,
    nonFiscalDiscountValue: validated.nonFiscalDiscountValue,
    nonFiscalFreightMode: validated.nonFiscalFreightMode,
    nonFiscalFreightValue: validated.nonFiscalFreightValue,
    nonFiscalOtherExpensesMode: validated.nonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue: validated.nonFiscalOtherExpensesValue,
    fiscalIpi: validated.fiscalIpi,
    fiscalFreight: validated.fiscalFreight,
    fiscalDiscount: validated.fiscalDiscount,
    fiscalOtherExpenses: validated.fiscalOtherExpenses,
    ...(context.status ? { status: context.status } : {}),
    ...(context.isDraft !== undefined ? { isDraft: context.isDraft } : {}),
  };
}
