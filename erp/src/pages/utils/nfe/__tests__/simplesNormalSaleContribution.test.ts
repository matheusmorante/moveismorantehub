import { describe, expect, it } from 'vitest';
import {
  assertContributionModelScope,
  parseSimplesNormalSaleContribution,
  resolveNormalSaleContribution,
} from '../../../../../../api/nfe/simplesNormalSaleContribution';

const decision = (model = '55') => ({
  scope: { model, operation: 'normal_sale', issuerCrt: '1' },
  pis: { cst: '99', base: 0, rate: 0, value: 0 },
  cofins: { cst: '99', base: 0, rate: 0, value: 0 },
  confirmedAt: '2026-09-30T13:59:14Z',
  confirmedBy: 'TEST_UNIT_BUSINESS_DECISION',
  productionApproved: false,
});

describe('decisões de PIS/COFINS de venda normal separadas por modelo', () => {
  it.each(['55', '65'] as const)('identifica a decisão própria do modelo %s', (model) => {
    const parsed = parseSimplesNormalSaleContribution(decision(model));
    expect(parsed.model).toBe(model);
    expect(parsed.decisionId).toContain(model === '55' ? 'nfe55' : 'nfce65');
    expect(() => assertContributionModelScope(parsed, model)).not.toThrow();
    expect(() => assertContributionModelScope(parsed, model === '55' ? '65' : '55')).toThrow(
      'CONTRIBUTION_MODEL_SCOPE_REQUIRED'
    );
  });
  it('não usa metadata de liberação para mudar a regra de negócio', () => {
    expect(parseSimplesNormalSaleContribution({ ...decision(), productionApproved: true })).toEqual(
      parseSimplesNormalSaleContribution(decision())
    );
  });
  it('recusa ampliar a decisão 55 com uma lista de modelos', () => {
    const value = decision();
    const invalid = {
      ...value,
      scope: { ...value.scope, models: ['55', '65'] },
    };
    expect(() => parseSimplesNormalSaleContribution(invalid)).toThrow();
  });
  it('não usa a decisão 55 como fallback da 65 ausente ou incorretamente indexada', () => {
    expect(() => resolveNormalSaleContribution({ contributionDecision: decision() }, '65')).toThrow(
      'CONTRIBUTION_MODEL_SCOPE_REQUIRED'
    );
    expect(() =>
      resolveNormalSaleContribution(
        {
          contributionDecisions: { '65': decision() },
        },
        '65'
      )
    ).toThrow('CONTRIBUTION_MODEL_SCOPE_REQUIRED');
  });
  it('preserva snapshots legados somente no modelo declarado', () => {
    expect(resolveNormalSaleContribution({ contributionDecision: decision() }, '55').model).toBe(
      '55'
    );
  });
  it.each(['scope', 'cst', 'amount', 'confirmation'])(
    'recusa decisão fora do cenário (%s)',
    (field) => {
      const value = decision();
      if (field === 'scope') value.scope.operation = 'return';
      if (field === 'cst') value.pis.cst = '01';
      if (field === 'amount') value.cofins.value = 1;
      if (field === 'confirmation') value.confirmedAt = 'invalid';
      expect(() => parseSimplesNormalSaleContribution(value)).toThrow('fora do cenário');
    }
  );
});
