import type { RateioMode } from './ReceiptRateioField';
import type { MobileReceiptItem } from '../utils/receiptSource';

export interface ValidatedGoodsReceiptFormValues {
  supplierId: string;
  receiptDate: string;
  items: MobileReceiptItem[];
  totalValue: number;
  fiscalKey: string;
  ipiPercent: number;
  freightPercent: number;
  invoiceNumber: string;
  invoiceDate: string;
  attachments: any[];
  observations: string[];
  nonFiscalDiscountMode: 'percent' | 'fixed';
  nonFiscalDiscountValue: number;
  nonFiscalFreightMode: RateioMode;
  nonFiscalFreightValue: number;
  nonFiscalOtherExpensesMode: RateioMode;
  nonFiscalOtherExpensesValue: number;
  fiscalIpi: number;
  fiscalFreight: number;
  fiscalDiscount: number;
  fiscalOtherExpenses: number;
}

/** Constrói o payload compartilhado entre rascunho, criação e edição de recebimento mobile. */
export function buildBaseGoodsReceiptPayload({
  id,
  receiptIndex,
  purchaseId,
  values,
  supplierName,
  existingReceipt,
  isEditingInvoiceLinked = false,
}: {
  id: string;
  receiptIndex?: number;
  purchaseId?: string;
  values: ValidatedGoodsReceiptFormValues;
  supplierName: string;
  existingReceipt?: any;
  isEditingInvoiceLinked?: boolean;
}) {
  return {
    id,
    receiptIndex,
    purchaseId,
    supplierId: values.supplierId,
    supplierName,
    receivedAt: new Date(`${values.receiptDate}T12:00:00`).toISOString(),
    totalValue: values.totalValue,
    observation: values.observations.join('\n'),
    invoiceNumber: values.invoiceNumber,
    invoiceDate: values.invoiceDate,
    fiscalKey: values.fiscalKey,
    attachments: values.attachments,
    ipiPercent: values.ipiPercent,
    freightPercent: values.freightPercent,
    nonFiscalDiscountMode: values.nonFiscalDiscountMode,
    nonFiscalDiscountValue: values.nonFiscalDiscountValue,
    nonFiscalFreightMode: isEditingInvoiceLinked
      ? existingReceipt?.non_fiscal_freight_mode || values.nonFiscalFreightMode
      : values.nonFiscalFreightMode,
    nonFiscalFreightValue: isEditingInvoiceLinked
      ? Number(existingReceipt?.non_fiscal_freight_value ?? values.nonFiscalFreightValue)
      : values.nonFiscalFreightValue,
    nonFiscalOtherExpensesMode: isEditingInvoiceLinked
      ? existingReceipt?.non_fiscal_other_expenses_mode || values.nonFiscalOtherExpensesMode
      : values.nonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue: isEditingInvoiceLinked
      ? Number(
          existingReceipt?.non_fiscal_other_expenses_value ?? values.nonFiscalOtherExpensesValue,
        )
      : values.nonFiscalOtherExpensesValue,
    fiscalIpi: values.fiscalIpi,
    fiscalFreight: values.fiscalFreight,
    fiscalDiscount: values.fiscalDiscount,
    fiscalOtherExpenses: values.fiscalOtherExpenses,
    items: values.items,
  };
}
