import Order from '../types/order.type';
import { resolveOrderFiscalModel } from '../../../../shared-utils/fiscalDocumentModel';

export type SuggestedFiscalDocument = 'NFE' | 'NFCE' | 'UNDETERMINED';

type FiscalOrderContext =
  | Pick<Order, 'orderType' | 'shipping'>
  | { orderType?: string; shipping?: { deliveryMethod?: string } };

/**
 * Defines the document initially suggested for a sale.
 * Retail suggestion only; the backend determines and records the final decision.
 */
export const getSuggestedFiscalDocument = (order: FiscalOrderContext): SuggestedFiscalDocument => {
  const decision = resolveOrderFiscalModel(order, {
    finalConsumer: (order as Order).fiscalContext?.finalConsumer ?? true,
  });
  return decision.status === 'blocked' ? 'UNDETERMINED' : decision.model === '65' ? 'NFCE' : 'NFE';
};

export const getSuggestedFiscalDocumentLabel = (order: FiscalOrderContext): string =>
  getSuggestedFiscalDocument(order) === 'NFCE'
    ? 'Gerar NFC-e'
    : getSuggestedFiscalDocument(order) === 'NFE'
      ? 'Gerar NF-e'
      : 'Emitir nota fiscal';
