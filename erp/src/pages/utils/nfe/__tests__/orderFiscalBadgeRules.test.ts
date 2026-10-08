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

  it.each(['return', 'estorno'])('does not use authorized %s documents as NF status', (document_type) => {
    expect(
      resolveOrderFiscalBadgeStatus([{ order_id: 'order-1', status: 'autorizada', document_type }])
    ).toBe('not_issued');
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

  it('exibe rejeição de homologação como failed e mantém ausência de documento como not_issued', () => {
    const result = resolveOrderFiscalBadgePair([outbound('rejeitada', 2), outbound('rascunho', 2)]);
    expect(result.production).toBe('not_issued');
    expect(result.homologation).toBe('failed');
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

  it('mantém cancelamento no NFH e separa devolução e estorno dos rótulos NF/NFH', () => {
    const cancelledHml = resolveOrderFiscalBadgePair([outbound('cancelada', 2)]);
    expect(cancelledHml.homologation).toBe('cancelled');

    const returnHml = resolveOrderFiscalBadgePair([
      { order_id: 'order-1', status: 'autorizada', document_type: 'return', ambiente: 2 },
    ]);
    expect(returnHml.homologation).toBe('not_issued');
    expect(returnHml.devolucaoStatus).toBe('issued');

    const estornoHml = resolveOrderFiscalBadgePair([
      { order_id: 'order-1', status: 'autorizada', document_type: 'estorno', ambiente: 2 },
    ]);
    expect(estornoHml.homologation).toBe('not_issued');
    expect(estornoHml.estornoStatus).toBe('issued');
  });
});
