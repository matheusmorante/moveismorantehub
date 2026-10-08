import { describe, expect, it, vi } from 'vitest';
import { emitNormalSale } from '../../../../../../api/nfe/emitNormalSale';
import { isSyntheticOrderBlockedInProduction } from '../../../../../../api/nfe/normal-sale/testOrderProductionGuard';

describe('proteção de pedidos sintéticos em Produção', () => {
  it('bloqueia somente quando o pedido persistido tem is_test=true em Produção', () => {
    expect(isSyntheticOrderBlockedInProduction(1, { is_test: true })).toBe(true);
    expect(isSyntheticOrderBlockedInProduction(1, { is_test: false })).toBe(false);
    expect(
      isSyntheticOrderBlockedInProduction(1, { syntheticFixture: { scenarioKey: 'SCENARIO_001' } })
    ).toBe(false);
    expect(isSyntheticOrderBlockedInProduction(1, { id: 'TEST_AUT_legacy' })).toBe(false);
  });

  it('permite avaliação normal do cenário sintético em Homologação', () => {
    expect(isSyntheticOrderBlockedInProduction(2, { is_test: true })).toBe(false);
  });

  it('recusa antes de recuperar tentativa ou chamar RPC de reserva fiscal', async () => {
    const db = { rpc: vi.fn() };
    const result = await emitNormalSale(
      db as any,
      { environment: 1 } as any,
      { order: { data: { is_test: true } } } as any,
      {},
      'administrator-id'
    );
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('TEST_ORDER_PRODUCTION_BLOCKED');
    expect(result.body.numberReserved).toBe(false);
    expect(result.body.sefazContacted).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
