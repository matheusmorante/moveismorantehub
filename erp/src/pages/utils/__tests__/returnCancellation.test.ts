import { describe, expect, it } from 'vitest';
import { buildCancelledReturn } from '../returnCancellation';

describe('cancelamento e estorno de devolucao', () => {
  it('preserva o registro e muda o status para cancelado com flags de estorno', () => {
    expect(
      buildCancelledReturn({
        orderType: 'return',
        status: 'scheduled',
        returnStockProcessed: false,
      } as any)
    ).toEqual({ status: 'cancelled', returnStockProcessed: false, returnStockReversed: false });
  });

  it('preserva o retorno físico confirmado e bloqueia o cancelamento comercial', () => {
    expect(() =>
      buildCancelledReturn({
        orderType: 'return',
        status: 'fulfilled',
        returnStockProcessed: true,
      } as any)
    ).toThrow('A confirmação física desta devolução já foi registrada');
  });

  it('também bloqueia cancelamento se a entrada de estoque já tiver sido registrada', () => {
    expect(() =>
      buildCancelledReturn({
        orderType: 'return',
        status: 'scheduled',
        returnStockProcessed: true,
      } as any)
    ).toThrow('A confirmação física desta devolução já foi registrada');
  });
});
