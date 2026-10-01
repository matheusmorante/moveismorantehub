import { describe, expect, it } from 'vitest';
import { getFiscalCancellationPolicy } from '../fiscalCancellationPolicy';

const authorization = '2026-09-20T12:00:00.000Z';
const hour = 60 * 60 * 1000;

const input = (overrides: Record<string, unknown> = {}) => ({
  model: '55',
  authorizedAt: authorization,
  status: 'autorizada',
  environment: 1 as const,
  goodsCirculated: false,
  operationDidNotOccur: true,
  ...overrides,
});

describe('política fiscal de cancelamento de venda', () => {
  it('cancela NF-e 55 antes do limite de 168 horas', () => {
    const now = new Date(authorization).getTime() + 167 * hour + 59 * 60 * 1000;
    expect(getFiscalCancellationPolicy({ ...input(), now }).action).toBe('cancel');
  });

  it('mantém cancelável no instante exato de 168 horas e indica estorno após o limite', () => {
    const now = new Date(authorization).getTime() + 168 * hour;
    expect(getFiscalCancellationPolicy({ ...input(), now }).action).toBe('cancel');
    expect(getFiscalCancellationPolicy({ ...input(), now: now + 1 }).action).toBe('estorno');
  });

  it('usa a janela paranaense de 30 minutos para NFC-e 65 e não inventa estorno de modelo 65', () => {
    const now = new Date(authorization).getTime() + 29 * 60 * 1000;
    expect(getFiscalCancellationPolicy({ ...input({ model: '65' }), now }).action).toBe('cancel');
    expect(
      getFiscalCancellationPolicy({
        ...input({ model: '65' }),
        now: new Date(authorization).getTime() + 30 * 60 * 1000 + 1,
      }).action
    ).toBe('manual_review');
  });

  it('prioriza devolução quando a mercadoria circulou, mesmo antes do prazo', () => {
    expect(
      getFiscalCancellationPolicy({ ...input({ goodsCirculated: true }), now: Date.now() }).action
    ).toBe('return');
  });

  it('não cria efeito fiscal para documento rejeitado ou não autorizado', () => {
    expect(getFiscalCancellationPolicy(input({ status: 'rejeitada' })).action).toBe('none');
  });

  it('exige revisão se expirou, mas a operação não foi confirmada como não realizada', () => {
    const now = new Date(authorization).getTime() + 169 * hour;
    expect(
      getFiscalCancellationPolicy({ ...input({ operationDidNotOccur: false }), now }).action
    ).toBe('manual_review');
  });
});
