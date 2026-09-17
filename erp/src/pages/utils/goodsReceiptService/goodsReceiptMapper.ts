import { GoodsReceipt } from './goodsReceipt.types';
import { PurchaseItem } from '../../types/purchase.type';

export const isValidUuid = (val?: string): boolean =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export const mapGoodsReceiptRow = (row: any): GoodsReceipt => {
    const rawItems: PurchaseItem[] = Array.isArray(row.goods_receipt_items) && row.goods_receipt_items.length > 0
        ? row.goods_receipt_items
            .sort((a: any, b: any) => (a.item_index || 0) - (b.item_index || 0))
            .map((gri: any) => ({
                productId: gri.product_id || gri.item_snapshot?.productId || '',
                variationId: gri.variation_id || gri.item_snapshot?.variationId || undefined,
                description: gri.description || gri.item_snapshot?.description || '',
                quantity: Number(gri.quantity || 1),
                baseCost: Number(gri.base_cost || 0),
                unitCost: Number(gri.unit_cost || 0),
                freightFiscalUnit: Number(gri.freight_fiscal_unit || 0),
                freightNonFiscalUnit: Number(gri.freight_non_fiscal_unit || 0),
                discountUnit: Number(gri.discount_unit || 0),
                otherExpensesFiscalUnit: Number(gri.other_expenses_fiscal_unit || 0),
                otherExpensesNonFiscalUnit: Number(gri.other_expenses_non_fiscal_unit || 0),
                additionalCostUnit: Number(gri.additional_cost_unit || 0),
            }))
        : (row.items || []);

    return {
        id: String(row.id),
        receiptIndex: Number(row.receipt_index) || undefined,
        purchaseId: row.purchase_id || undefined,
        supplierId: row.supplier_id || undefined,
        supplierName: row.supplier_name || 'Fornecedor',
        receivedAt: row.received_at || new Date().toISOString(),
        invoiceNumber: row.invoice_number || undefined,
        invoiceDate: row.invoice_date || undefined,
        items: rawItems,
        totalValue: Number(row.total_value || 0),
        observation: row.observation || '',
        fiscalKey: row.fiscal_key || undefined,
        attachments: row.attachments || [],
        status: row.status === 'estornado' ? 'estornado' : (row.status === 'received' ? 'received' : 'draft'),
        isDraft: row.is_draft ?? (row.status !== 'received' && row.status !== 'estornado'),
        ipiPercent: Number(row.ipi_percent || 0),
        freightPercent: Number(row.freight_percent || 0),
        nonFiscalDiscountMode: row.non_fiscal_discount_mode || undefined,
        nonFiscalDiscountValue: typeof row.non_fiscal_discount_value === 'number' ? row.non_fiscal_discount_value : undefined,
        nonFiscalFreightMode: row.non_fiscal_freight_mode || undefined,
        nonFiscalFreightValue: typeof row.non_fiscal_freight_value === 'number' ? row.non_fiscal_freight_value : undefined,
        nonFiscalOtherExpensesMode: row.non_fiscal_other_expenses_mode || undefined,
        nonFiscalOtherExpensesValue: typeof row.non_fiscal_other_expenses_value === 'number' ? row.non_fiscal_other_expenses_value : undefined,
        fiscalIpi: typeof row.fiscal_ipi === 'number' ? row.fiscal_ipi : undefined,
        fiscalFreight: typeof row.fiscal_freight === 'number' ? row.fiscal_freight : undefined,
        fiscalDiscount: typeof row.fiscal_discount === 'number' ? row.fiscal_discount : undefined,
        fiscalOtherExpenses: typeof row.fiscal_other_expenses === 'number' ? row.fiscal_other_expenses : undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
    };
};

export const buildGoodsReceiptDbPayload = (receipt: GoodsReceipt, now: string) => ({
    id: receipt.id,
    receipt_index: receipt.receiptIndex,
    purchase_id: isValidUuid(receipt.purchaseId) ? receipt.purchaseId : null,
    supplier_id: isValidUuid(receipt.supplierId) ? receipt.supplierId : null,
    supplier_name: receipt.supplierName,
    received_at: receipt.receivedAt,
    invoice_number: receipt.invoiceNumber || null,
    invoice_date: receipt.invoiceDate || null,
    total_value: receipt.totalValue,
    observation: receipt.observation || '',
    fiscal_key: receipt.fiscalKey || null,
    attachments: receipt.attachments || [],
    status: receipt.status,
    is_draft: receipt.isDraft,
    ipi_percent: receipt.ipiPercent,
    freight_percent: receipt.freightPercent,
    non_fiscal_discount_mode: receipt.nonFiscalDiscountMode || null,
    non_fiscal_discount_value: receipt.nonFiscalDiscountValue ?? 0,
    non_fiscal_freight_mode: receipt.nonFiscalFreightMode || null,
    non_fiscal_freight_value: receipt.nonFiscalFreightValue ?? 0,
    non_fiscal_other_expenses_mode: receipt.nonFiscalOtherExpensesMode || null,
    non_fiscal_other_expenses_value: receipt.nonFiscalOtherExpensesValue ?? 0,
    fiscal_ipi: receipt.fiscalIpi ?? 0,
    fiscal_freight: receipt.fiscalFreight ?? 0,
    fiscal_discount: receipt.fiscalDiscount ?? 0,
    fiscal_other_expenses: receipt.fiscalOtherExpenses ?? 0,
    updated_at: now,
});
