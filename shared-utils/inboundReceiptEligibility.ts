import { isSalvadosOnlySupplier } from './productSupplierStockOrigin';
import { hasInboundItemCommercialData } from './inboundInvoiceCompleteness';

export interface InboundReceiptEligibilityItem extends Record<string, unknown> {
  linkMode?: string | null;
  link_mode?: string | null;
  matchedProductId?: string | null;
  matched_product_id?: string | null;
  compositionLinks?: Array<{ productId?: string | null; product_id?: string | null }> | null;
  composition_links?: Array<{ productId?: string | null; product_id?: string | null }> | null;
}

export interface InboundReceiptEligibilityInvoice extends Record<string, unknown> {
  supplierId?: string | null;
  supplier_id?: string | null;
  supplierStockOrigins?: string[];
  status?: string | null;
  status_recebimento?: string | null;
  receiptId?: string | null;
  receipt_id?: string | null;
  nfeKey?: string | null;
  chave_acesso?: string | null;
  itemsCount?: number | null;
  items_count?: number | null;
  items?: InboundReceiptEligibilityItem[] | null;
}

export function hasCompleteInboundReceiptItems(invoice: InboundReceiptEligibilityInvoice): boolean {
  const items = invoice.items || [];
  const itemCount = invoice.itemsCount ?? invoice.items_count;
  return items.length > 0 &&
    (itemCount === 0 || itemCount === items.length) &&
    hasInboundItemCommercialData(items);
}

export function hasCompleteInboundReceiptMappings(invoice: InboundReceiptEligibilityInvoice): boolean {
  const items = invoice.items || [];
  const supplierId = invoice.supplierId ?? invoice.supplier_id;
  return Boolean(
    supplierId &&
      hasCompleteInboundReceiptItems(invoice) &&
      items.every((item) => {
        const linkMode = item.linkMode ?? item.link_mode ?? 'single';
        if (linkMode === 'not_applicable') return true;
        if (linkMode === 'composition') {
          const links = item.compositionLinks ?? item.composition_links ?? [];
          return Boolean(links.some((link) => link.productId ?? link.product_id));
        }
        return Boolean(item.matchedProductId ?? item.matched_product_id);
      }),
  );
}

export function getInboundReceiptBlockedReason(
  invoice: InboundReceiptEligibilityInvoice,
  canAccessReceipts: boolean,
): string | null {
  if (!canAccessReceipts) return 'Seu usuário precisa ter acesso ao módulo Recebimentos.';
  const status = invoice.status ?? invoice.status_recebimento;
  const receiptId = invoice.receiptId ?? invoice.receipt_id;
  if (status === 'received' || receiptId) {
    return 'Esta nota fiscal já está vinculada a um recebimento concluído.';
  }
  if (isSalvadosOnlySupplier(invoice.supplierStockOrigins)) {
    return 'Fornecedor exclusivo de Salvados: esta NF-e não gera recebimento nem movimentação de estoque.';
  }
  const nfeKey = invoice.nfeKey ?? invoice.chave_acesso;
  if (!nfeKey?.trim()) return 'A chave de acesso da nota fiscal não está disponível.';
  const supplierId = invoice.supplierId ?? invoice.supplier_id;
  if (!supplierId) return 'Vincule o fornecedor da NF-e ao cadastro de fornecedores.';

  if (!hasCompleteInboundReceiptItems(invoice)) {
    return 'Obtenha o XML atualizado no Portal da NF-e e importe-o para conferir os dados dos itens antes de gerar o recebimento.';
  }
  if (!hasCompleteInboundReceiptMappings(invoice)) {
    return 'Vincule cada item da NF-e a um produto cadastrado ou marque “Não se aplica”.';
  }

  return null;
}
