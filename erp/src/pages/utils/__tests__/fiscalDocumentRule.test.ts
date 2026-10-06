import { describe, expect, it, vi } from 'vitest';
vi.mock('../settingsService', () => ({ getSettings: () => ({ companyUF: 'PR' }) }));
import { getSuggestedFiscalDocument, getSuggestedFiscalDocumentLabel } from '../fiscalDocumentRule';

describe('fiscal document suggestion', () => {
  it('suggests NFC-e for in-store pickup', () => {
    const order = { orderType: 'sale' as const, shipping: { deliveryMethod: 'pickup' as const } };
    expect(getSuggestedFiscalDocument(order)).toBe('NFCE');
    expect(getSuggestedFiscalDocumentLabel(order)).toBe('Gerar NFC-e');
  });

  it('suggests NFC-e for final-consumer delivery in Paraná', () => {
    const order = {
      orderType: 'sale' as const,
      shipping: { deliveryMethod: 'delivery' as const, deliveryAddress: { state: 'PR' } },
    };
    expect(getSuggestedFiscalDocument(order)).toBe('NFCE');
    expect(getSuggestedFiscalDocumentLabel(order)).toBe('Gerar NFC-e');
  });
  it('requires recipient UF before suggesting an invoice for delivery', () => {
    expect(getSuggestedFiscalDocument({ shipping: { deliveryMethod: 'delivery' } })).toBe(
      'UNDETERMINED'
    );
  });
});
