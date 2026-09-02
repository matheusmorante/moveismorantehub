import Order from '../types/order.type';

export type SuggestedFiscalDocument = 'NFE' | 'NFCE';

/**
 * Defines the document initially suggested for a sale.
 * Fiscal model is based on how the sale is fulfilled, never on CPF/CNPJ alone.
 */
export const getSuggestedFiscalDocument = (order: Pick<Order, 'orderType' | 'shipping'>): SuggestedFiscalDocument => {
  return order.shipping?.deliveryMethod === 'pickup' ? 'NFCE' : 'NFE';
};

export const getSuggestedFiscalDocumentLabel = (order: Pick<Order, 'orderType' | 'shipping'>): string => (
  getSuggestedFiscalDocument(order) === 'NFCE' ? 'Gerar NFC-e' : 'Gerar NF-e'
);
