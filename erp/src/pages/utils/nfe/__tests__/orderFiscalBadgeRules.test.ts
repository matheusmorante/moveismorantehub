import { describe, expect, it } from 'vitest';
import {
  resolveOrderFiscalBadgePair,
  resolveOrderFiscalBadgeStatus,
  type FiscalDocumentStatusRow,
} from '../orderFiscalBadgeRules';

const outbound = (status: string, ambiente?: number): FiscalDocumentStatusRow => ({
  order_id: 'order-1',
  status,
  document_type: 'outbound',
  ambiente,
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

  it.each(['return', 'estorno'])('marks authorized %s documents as reversed', (document_type) => {
    expect(
      resolveOrderFiscalBadgeStatus([{ order_id: 'order-1', status: 'autorizada', document_type }])
    ).toBe('reversed');
  });

  it('keeps issued state when one of several outbound documents was canceled', () => {
    expect(resolveOrderFiscalBadgeStatus([outbound('cancelada'), outbound('autorizada')])).toBe(
      'issued'
    );
  });
});

describe('resolveOrderFiscalBadgePair', () => {
  it('retorna produção not_issued e homologação not_issued quando não há documentos', () => {
    const result = resolveOrderFiscalBadgePair([]);
    expect(result).toEqual({
      production: 'not_issued',
      homologation: 'not_issued',
    });
  });

  it('mantém homologação como not_issued se não houver nota autorizada/emitida em homologação', () => {
    const result = resolveOrderFiscalBadgePair([outbound('rejeitada', 2), outbound('rascunho', 2)]);
    expect(result.production).toBe('not_issued');
    expect(result.homologation).toBe('not_issued');
  });

  it('exibe NFH quando homologação estiver autorizada e NF permanece not_issued se produção não tiver nota', () => {
    const result = resolveOrderFiscalBadgePair([outbound('autorizada', 2)]);
    expect(result.production).toBe('not_issued');
    expect(result.homologation).toBe('issued');
  });

  it('reconhece nota emitida em produção no rótulo NF e preserva NFH not_issued se homologação não tiver nota', () => {
    const result = resolveOrderFiscalBadgePair([outbound('autorizada', 1)]);
    expect(result.production).toBe('issued');
    expect(result.homologation).toBe('not_issued');
  });

  it('permite coexistência de NF e NFH quando ambos foram emitidos', () => {
    const result = resolveOrderFiscalBadgePair([
      outbound('autorizada', 1),
      outbound('autorizada', 2),
    ]);
    expect(result.production).toBe('issued');
    expect(result.homologation).toBe('issued');
  });

  it('exibe cancelamento e estorno de homologação no NFH', () => {
    const cancelledHml = resolveOrderFiscalBadgePair([outbound('cancelada', 2)]);
    expect(cancelledHml.homologation).toBe('cancelled');

    const reversedHml = resolveOrderFiscalBadgePair([
      { order_id: 'order-1', status: 'autorizada', document_type: 'return', ambiente: 2 },
    ]);
    expect(reversedHml.homologation).toBe('reversed');
  });
});
