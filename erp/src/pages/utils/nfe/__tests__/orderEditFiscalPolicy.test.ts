import { describe, expect, it } from 'vitest';
import { getOrderEditFiscalPolicy } from '../orderEditFiscalPolicy';

const authorized = Date.parse('2026-10-09T12:00:00Z');
const document = (model = '55', environment = 2) => ({
  modelo: model, ambiente: environment, status: environment === 2 ? 'homologada' : 'autorizada',
  chave_acesso: `41${'1'.repeat(42)}`,
  xml_protocolo: '<protNFe><infProt><dhRecbto>2026-10-09T12:00:00Z</dhRecbto></infProt></protNFe>',
});

describe('substituição fiscal por edição sem CC-e', () => {
  it.each(['delivery', 'pickup'])('mantém a venda agendada para %s e decide cancelamento dentro do prazo', (method) => {
    expect(getOrderEditFiscalPolicy({ status: 'scheduled', delivery_method: method }, document(), authorized + 1000).action).toBe('cancel');
  });
  it.each([['55', 168 * 60 * 60_000], ['65', 30 * 60_000]] as const)('usa o limite exato para modelo %s', (model, milliseconds) => {
    const order = { status: 'scheduled' };
    expect(getOrderEditFiscalPolicy(order, document(model), authorized + milliseconds).action).toBe('cancel');
    expect(getOrderEditFiscalPolicy(order, document(model), authorized + milliseconds + 1).action).toBe('estorno');
  });
  it.each([1, 2])('aplica a mesma política preservando ambiente %s', (environment) => {
    expect(getOrderEditFiscalPolicy({ status: 'scheduled' }, document('55', environment), authorized + 169 * 60 * 60_000).action).toBe('estorno');
  });
  it.each([
    { status: 'fulfilled', delivery_method: 'delivery' },
    { status: 'fulfilled', delivery_method: 'pickup' },
    { status: 'scheduled', delivery_status: 'in_transit' },
    { status: 'scheduled', delivery_started_at: '2026-10-09T12:30:00Z' },
    { status: 'scheduled', pickupConfirmedAt: '2026-10-09T12:30:00Z' },
    { status: 'fulfilled', order_data: { autoFulfilledAfter12h: true } },
  ])('bloqueia circulação/conclusão: %j', (order) => {
    expect(getOrderEditFiscalPolicy(order, document(), authorized + 1000).action).toBe('blocked');
  });
  it('não presume estorno sem autorização ou UF verificáveis', () => {
    expect(getOrderEditFiscalPolicy({ status: 'scheduled' }, { ...document(), xml_protocolo: null }).action).toBe('manual_review');
    expect(getOrderEditFiscalPolicy({ status: 'scheduled' }, { ...document(), chave_acesso: '35' + '1'.repeat(42) }).action).toBe('manual_review');
  });
});
