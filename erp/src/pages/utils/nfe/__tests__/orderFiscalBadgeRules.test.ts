import { describe, expect, it } from 'vitest';
import {
  resolveOrderFiscalBadgeStatus,
  type FiscalDocumentStatusRow,
} from '../orderFiscalBadgeRules';

const outbound = (status: string): FiscalDocumentStatusRow => ({
  order_id: 'order-1',
  status,
  document_type: 'outbound',
});

describe('resolveOrderFiscalBadgeStatus', () => {
  it('returns not_issued when no document exists', () => {
    expect(resolveOrderFiscalBadgeStatus([])).toBe('not_issued');
  });

  it.each(['autorizada', 'homologada'])('marks %s outbound documents as issued', (status) => {
    expect(resolveOrderFiscalBadgeStatus([outbound(status)])).toBe('issued');
  });

  it('marks a canceled outbound document as cancelled', () => {
    expect(resolveOrderFiscalBadgeStatus([outbound('cancelada')])).toBe('cancelled');
  });

  it('marks authorized return documents as returns', () => {
    expect(
      resolveOrderFiscalBadgeStatus([
        { order_id: 'order-1', status: 'autorizada', document_type: 'return' },
      ])
    ).toBe('return');
  });

  it('marks authorized estorno documents as estornos', () => {
    expect(
      resolveOrderFiscalBadgeStatus([
        { order_id: 'order-1', status: 'autorizada', document_type: 'estorno' },
      ])
    ).toBe('estorno');
  });

  it('keeps issued state when one of several outbound documents was canceled', () => {
    expect(
      resolveOrderFiscalBadgeStatus([outbound('cancelada'), outbound('autorizada')])
    ).toBe('issued');
  });
});
