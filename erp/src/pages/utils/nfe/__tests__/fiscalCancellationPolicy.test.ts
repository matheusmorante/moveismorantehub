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
  issuerUf: 'PR',
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

  it('usa a janela paranaense de 30 minutos para NFC-e 65 e decide estorno após o limite', () => {
    const now = new Date(authorization).getTime() + 29 * 60 * 1000;
    expect(getFiscalCancellationPolicy({ ...input({ model: '65' }), now }).action).toBe('cancel');
    expect(
      getFiscalCancellationPolicy({
        ...input({ model: '65' }),
        now: new Date(authorization).getTime() + 30 * 60 * 1000 + 1,
      })
    ).toMatchObject({
      action: 'estorno',
      reason: expect.stringContaining('NF-e modelo 55 de ajuste'),
    });
  });

  it.each([
    { model: '55', environment: 2 as const, status: 'homologada' },
    { model: '65', environment: 2 as const, status: 'homologada' },
    { model: '55', environment: 1 as const, status: 'autorizada' },
    { model: '65', environment: 1 as const, status: 'autorizada' },
  ])('permite cancelamento dentro do prazo para modelo $model no ambiente $environment', (document) => {
    const now = new Date(authorization).getTime() + 10 * 60 * 1000;
    expect(
      getFiscalCancellationPolicy({
        ...input({ ...document }),
        now,
      }).action
    ).toBe('cancel');
  });

  it('não habilita estorno sem comprovar que a origem é do Paraná', () => {
    const now = new Date(authorization).getTime() + 169 * hour;
    expect(getFiscalCancellationPolicy({ ...input({ issuerUf: '' }), now })).toMatchObject({
      action: 'manual_review',
      reason: expect.stringContaining('UF do emitente'),
    });
  });

  it('não aplica o prazo do Paraná automaticamente a documento de outra UF', () => {
    const now = new Date(authorization).getTime() + 10 * 60 * 1000;
    expect(getFiscalCancellationPolicy({ ...input({ issuerUf: 'SP' }), now })).toMatchObject({
      action: 'manual_review',
      reason: expect.stringContaining('prazo fiscal específico'),
      deadline: null,
    });
  });

  it('prioriza devolução quando a mercadoria circulou, mesmo antes do prazo', () => {
    expect(
      getFiscalCancellationPolicy({ ...input({ goodsCirculated: true }), now: Date.now() }).action
    ).toBe('return');
  });

  it('não cria efeito fiscal para documento rejeitado ou não autorizado', () => {
    expect(getFiscalCancellationPolicy(input({ status: 'rejeitada' })).action).toBe('none');
  });

  it('bloqueia estorno se expirou, mas a operação não foi comprovada como não realizada', () => {
    const now = new Date(authorization).getTime() + 169 * hour;
    expect(
      getFiscalCancellationPolicy({ ...input({ operationDidNotOccur: false }), now }).action
    ).toBe('manual_review');
  });
});
