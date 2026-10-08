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

  it('exibe rejeição de homologação como rejected e mantém ausência de documento como not_issued', () => {
    const result = resolveOrderFiscalBadgePair([outbound('rejeitada', 2), outbound('rascunho', 2)]);
    expect(result.production).toBe('not_issued');
    expect(result.homologation).toBe('rejected');
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

  it('mantém a NF autorizada quando o cancelamento falha e sinaliza a falha em separado', () => {
    const result = resolveOrderFiscalBadgePair([
      {
        ...outbound('autorizada', 1),
        id: 'source-document',
        cancellationEventStatus: 'rejected',
      },
    ]);
    expect(result.production).toBe('issued');
    expect(result.cancellationState).toBe('failed');
  });

  it('mantém a NF autorizada e pede verificação quando o resultado do cancelamento é incerto', () => {
    const result = resolveOrderFiscalBadgePair([
      {
        ...outbound('homologada', 2),
        id: 'source-document',
        cancellationEventStatus: 'unknown',
      },
    ]);
    expect(result.homologation).toBe('issued');
    expect(result.cancellationState).toBe('verify');
  });

  it('expõe falha e confirmação pendente separadamente para NF e NFH', () => {
    const result = resolveOrderFiscalBadgePair(
      [
        { id: 'prod', order_id: 'order', status: 'autorizada', ambiente: 1, cancellationEventStatus: 'rejected' },
        { id: 'hml', order_id: 'order', status: 'homologada', ambiente: 2, cancellationEventStatus: 'unknown' },
      ],
      [],
      true
    );

    expect(result.cancellationDocuments).toEqual([
      { documentId: 'prod', environment: 1, state: 'failed' },
      { documentId: 'hml', environment: 2, state: 'verify' },
    ]);
  });

  it('mostra pendência quando o pedido foi cancelado comercialmente e não há efeito fiscal persistido', () => {
    const result = resolveOrderFiscalBadgePair([outbound('autorizada', 1)], [], true);
    expect(result.production).toBe('issued');
    expect(result.cancellationState).toBe('pending');
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
