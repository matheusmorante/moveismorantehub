import type { Invoice } from '../../types/stock.types';

export function invoiceReason(invoice: Invoice): string | null {
  if (!invoice.accessKey?.trim()) return 'Chave de acesso indisponível';
  if (!Array.isArray(invoice.supplierStockOrigins) || !invoice.supplierStockOrigins.includes('normal'))
    return 'Fornecedor sem estoque normal';
  return null;
}

export function isInvoiceXmlIncomplete(invoice: Invoice): boolean {
  return Boolean(
    invoice.isSummaryOnly ||
      invoice.itemsCount === 0 ||
      /<(?:[\w.-]+:)?resNFe\b/i.test(invoice.rawXml || ''),
  );
}
