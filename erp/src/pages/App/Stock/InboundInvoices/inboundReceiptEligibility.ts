import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { isSalvadosOnlySupplier } from '../../../../../../shared-utils/productSupplierStockOrigin';

export function hasCompleteInboundInvoiceMappings(invoice: InboundInvoice): boolean {
  const items = invoice.items || [];
  return Boolean(
    invoice.supplierId &&
      hasCompleteInboundInvoiceItems(invoice) &&
      items.every((item) =>
        item.linkMode === 'not_applicable'
          ? true
          : item.linkMode === 'composition'
            ? Boolean(item.compositionLinks?.some((link) => link.productId))
            : Boolean(item.matchedProductId)
      )
  );
}

export function hasCompleteInboundInvoiceItems(invoice: InboundInvoice): boolean {
  const items = invoice.items || [];
  return items.length > 0 && (invoice.itemsCount === 0 || invoice.itemsCount === items.length);
}

export function getInboundReceiptBlockedReason(
  invoice: InboundInvoice,
  canAccessReceipts: boolean
): string | null {
  if (!canAccessReceipts) return 'Seu usuário precisa ter acesso ao módulo Recebimentos.';
  if (invoice.status === 'received' || invoice.receiptId) {
    return 'Esta nota fiscal já está vinculada a um recebimento concluído.';
  }
  if (isSalvadosOnlySupplier(invoice.supplierStockOrigins)) {
    return 'Fornecedor exclusivo de Salvados: esta NF-e não gera recebimento nem movimentação de estoque.';
  }
  if (!invoice.nfeKey?.trim()) return 'A chave de acesso da nota fiscal não está disponível.';
  if (!invoice.supplierId) return 'Vincule o fornecedor da NF-e ao cadastro de fornecedores.';

  if (!hasCompleteInboundInvoiceItems(invoice)) {
    return 'Importe o XML completo para carregar todos os itens da NF-e.';
  }
  if (!hasCompleteInboundInvoiceMappings(invoice)) {
    return 'Vincule cada item da NF-e a um produto cadastrado ou marque “Não se aplica”.';
  }

  return null;
}
