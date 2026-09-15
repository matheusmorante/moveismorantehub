import { supabase } from '@/pages/utils/supabaseConfig';
import { PurchaseItem } from '../types/purchase.type';
import { isValidUuid } from './goodsReceiptMapper';

export const syncGoodsReceiptItems = async (receiptId: string, items: PurchaseItem[]): Promise<void> => {
    if (!isValidUuid(receiptId)) return;
    try {
        await supabase.from('goods_receipt_items').delete().eq('receipt_id', receiptId);
        if (items && items.length > 0) {
            const rows = items.map((item, index) => ({
                receipt_id: receiptId,
                item_index: index + 1,
                product_id: isValidUuid(item.productId) ? item.productId : null,
                variation_id: isValidUuid(item.variationId) ? item.variationId : null,
                description: item.description || 'Item de Recebimento',
                quantity: Number(item.quantity || 1),
                base_cost: Number(item.baseCost || 0),
                unit_cost: Number(item.unitCost || 0),
                freight_fiscal_unit: Number(item.freightFiscalUnit || 0),
                freight_non_fiscal_unit: Number(item.freightNonFiscalUnit || 0),
                discount_unit: Number(item.discountUnit || 0),
                other_expenses_fiscal_unit: Number(item.otherExpensesFiscalUnit || 0),
                other_expenses_non_fiscal_unit: Number(item.otherExpensesNonFiscalUnit || 0),
                additional_cost_unit: Number(item.additionalCostUnit || 0),
                item_snapshot: item,
            }));
            await supabase.from('goods_receipt_items').insert(rows);
        }
    } catch (err) {
        console.error('[GoodsReceipt] Falha ao sincronizar goods_receipt_items:', err);
    }
};
