import { connectivityService } from '../offline/connectivityService';
import { supabase } from '../supabaseClient';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { receiptInvoiceConflictError } from '../../../../shared-utils/receiptInvoiceAvailability';
import type { MobileGoodsReceiptDraft } from './goodsReceiptTypes';

const isUuid = (value?: string) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));

/** Persiste o formulário sem movimentar estoque; só a RPC de confirmação efetiva a entrada. */
export const saveMobileGoodsReceiptDraft = async (
  receipt: MobileGoodsReceiptDraft,
): Promise<{ id: string; receiptIndex?: number }> => {
  if (!connectivityService.connected) {
    throw new Error('Conecte-se à internet para salvar o rascunho do recebimento.');
  }

  const header = await withTimeout<any | null>(
    Promise.resolve(
      supabase.from('goods_receipts').upsert({
        id: receipt.id,
        receipt_index: receipt.receiptIndex ?? null,
        purchase_id: receipt.purchaseId || null,
        supplier_id: receipt.supplierId || null,
        supplier_name: receipt.supplierName || 'Fornecedor',
        received_at: receipt.receivedAt,
        invoice_number: receipt.invoiceNumber || null,
        invoice_date: receipt.invoiceDate || null,
        items: receipt.items || [],
        total_value: receipt.totalValue || 0,
        observation: receipt.observation || '',
        fiscal_key: receipt.fiscalKey || null,
        attachments: receipt.attachments || [],
        status: 'draft',
        is_draft: true,
        ipi_percent: receipt.ipiPercent || 0,
        freight_percent: receipt.freightPercent || 0,
        non_fiscal_discount_mode: receipt.nonFiscalDiscountMode || null,
        non_fiscal_discount_value: receipt.nonFiscalDiscountValue || 0,
        non_fiscal_freight_mode: receipt.nonFiscalFreightMode || null,
        non_fiscal_freight_value: receipt.nonFiscalFreightValue || 0,
        non_fiscal_other_expenses_mode: receipt.nonFiscalOtherExpensesMode || null,
        non_fiscal_other_expenses_value: receipt.nonFiscalOtherExpensesValue || 0,
        fiscal_ipi: receipt.fiscalIpi || 0,
        fiscal_freight: receipt.fiscalFreight || 0,
        fiscal_discount: receipt.fiscalDiscount || 0,
        fiscal_other_expenses: receipt.fiscalOtherExpenses || 0,
        updated_at: new Date().toISOString(),
      }).select('receipt_index').single(),
    ),
    15_000,
    null,
    'mobile:goods-receipt-draft-header',
  );
  if (!header) throw new Error('O salvamento do rascunho demorou. Tente novamente.');
  if (header.error) {
    throw receiptInvoiceConflictError(header.error) || new Error(header.error.message || 'Não foi possível salvar o rascunho.');
  }

  const deletedItems = await withTimeout<any | null>(
    Promise.resolve(supabase.from('goods_receipt_items').delete().eq('receipt_id', receipt.id)),
    15_000,
    null,
    'mobile:goods-receipt-draft-items-delete',
  );
  if (!deletedItems) {
    throw new Error('A atualização dos itens do rascunho demorou. Tente novamente.');
  }
  if (deletedItems.error) {
    throw new Error(
      deletedItems.error.message || 'Não foi possível atualizar os itens do rascunho.',
    );
  }

  if (receipt.items.length > 0) {
    const rows = receipt.items.map((item, index) => ({
      receipt_id: receipt.id,
      item_index: index + 1,
      product_id: isUuid(item.productId) ? item.productId : null,
      variation_id: isUuid(item.variationId) ? item.variationId : null,
      description: item.description || 'Item de Recebimento',
      quantity: Number(item.quantity ?? 1),
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
    const insertedItems = await withTimeout<any | null>(
      Promise.resolve(supabase.from('goods_receipt_items').insert(rows)),
      15_000,
      null,
      'mobile:goods-receipt-draft-items-insert',
    );
    if (!insertedItems) {
      throw new Error('O salvamento dos itens do rascunho demorou. Tente novamente.');
    }
    if (insertedItems.error) {
      throw new Error(
        insertedItems.error.message || 'Não foi possível salvar os itens do rascunho.',
      );
    }
  }

  const receiptIndex = Number(header.data?.receipt_index);
  return {
    id: receipt.id,
    receiptIndex: Number.isInteger(receiptIndex) && receiptIndex > 0 ? receiptIndex : undefined,
  };
};

export const discardMobileGoodsReceiptDraft = async (receiptId: string): Promise<void> => {
  if (!connectivityService.connected) {
    throw new Error('Conecte-se à internet para descartar o rascunho.');
  }
  const response = await withTimeout<any | null>(
    Promise.resolve(
      supabase.rpc('delete_goods_receipt_draft_transaction', { p_receipt_id: receiptId }),
    ),
    15_000,
    null,
    'mobile:receipt-draft-discard',
  );
  if (!response) {
    const check = await withTimeout<any | null>(
      Promise.resolve(
        supabase.from('goods_receipts').select('id').eq('id', receiptId).maybeSingle(),
      ),
      8_000,
      null,
      'mobile:receipt-draft-discard-check',
    );
    if (check && !check.error && !check.data) return;
    throw new Error('O descarte demorou. Atualize a lista antes de tentar novamente.');
  }
  if (response.error) throw response.error;
};
