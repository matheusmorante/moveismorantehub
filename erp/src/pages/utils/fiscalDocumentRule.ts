import Order from '../types/order.type';

export type SuggestedFiscalDocument = 'NFE' | 'NFCE';

type FiscalOrderContext = Pick<Order, 'orderType' | 'shipping'> | { orderType?: string; shipping?: { deliveryMethod?: string } };

/**
 * Defines the document initially suggested for a sale.
 * Fiscal model is based on how the sale is fulfilled, never on CPF/CNPJ alone.
 */
export const getSuggestedFiscalDocument = (order: FiscalOrderContext): SuggestedFiscalDocument => {
  return (order as any).shipping?.deliveryMethod === 'pickup' ? 'NFCE' : 'NFE';
};

export const getSuggestedFiscalDocumentLabel = (order: FiscalOrderContext): string => (
  getSuggestedFiscalDocument(order) === 'NFCE' ? 'Gerar NFC-e' : 'Gerar NF-e'
);
