import { describe, expect, it } from 'vitest';
import { getSuggestedFiscalDocument, getSuggestedFiscalDocumentLabel } from './fiscalDocumentRule';

describe('fiscal document suggestion', () => {
  it('suggests NFC-e for in-store pickup', () => {
    const order = { orderType: 'sale' as const, shipping: { deliveryMethod: 'pickup' as const } };
    expect(getSuggestedFiscalDocument(order)).toBe('NFCE');
    expect(getSuggestedFiscalDocumentLabel(order)).toBe('Gerar NFC-e');
  });

  it('suggests NF-e for delivery', () => {
    const order = { orderType: 'sale' as const, shipping: { deliveryMethod: 'delivery' as const } };
    expect(getSuggestedFiscalDocument(order)).toBe('NFE');
    expect(getSuggestedFiscalDocumentLabel(order)).toBe('Gerar NF-e');
  });
});
