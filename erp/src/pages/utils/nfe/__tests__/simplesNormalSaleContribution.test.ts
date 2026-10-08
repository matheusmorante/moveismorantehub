import { describe, expect, it } from 'vitest';
import {
  assertContributionModelScope,
  normalSaleContributionSettingsId,
  parseSimplesNormalSaleContribution,
  resolveNormalSaleContribution,
} from '../../../../../../api/nfe/simplesNormalSaleContribution';

const sharedDecision = () => ({
  scope: { models: ['55', '65'], operation: 'normal_sale', issuerCrt: '1' },
  pis: { cst: '99', base: 0, rate: 0, value: 0 },
  cofins: { cst: '99', base: 0, rate: 0, value: 0 },
  confirmedAt: '2026-09-30T13:59:14Z',
  confirmedBy: 'TEST_UNIT_BUSINESS_DECISION',
  productionApproved: false,
});

const legacyDecision = (model = '55') => ({
  ...sharedDecision(),
  scope: { model, operation: 'normal_sale', issuerCrt: '1' },
});

describe('decisão comum de PIS/COFINS para venda normal do Simples', () => {
  it('aplica os mesmos valores aos modelos explicitamente cobertos', () => {
    const parsed = parseSimplesNormalSaleContribution(sharedDecision());
    expect(parsed.models).toEqual(['55', '65']);
    expect(parsed.decisionId).toBe('fiscal_decision_simples_normal_sale_v1');
    expect(normalSaleContributionSettingsId()).toBe(parsed.decisionId);

    const nfe = resolveNormalSaleContribution({ contributionDecision: sharedDecision() }, '55');
    const nfce = resolveNormalSaleContribution({ contributionDecision: sharedDecision() }, '65');
    expect(nfe).toMatchObject({ model: '55', pis: nfce.pis, cofins: nfce.cofins });
    expect(nfce).toMatchObject({ model: '65', decisionId: nfe.decisionId });
    expect(() => assertContributionModelScope(parsed, '55')).not.toThrow();
    expect(() => assertContributionModelScope(parsed, '65')).not.toThrow();
  });

  it('recusa escopos ausentes, extras, duplicados ou incompatíveis', () => {
    for (const models of [['55'], ['55', '65', '66'], ['55', '55'], []]) {
      expect(() =>
        parseSimplesNormalSaleContribution({
          ...sharedDecision(),
          scope: { ...sharedDecision().scope, models },
        })
      ).toThrow('fora do cenário');
    }
    expect(() =>
      parseSimplesNormalSaleContribution({
        ...sharedDecision(),
        scope: { ...sharedDecision().scope, model: '55' },
      })
    ).toThrow('fora do cenário');
  });

  it('não amplia uma decisão legada do modelo 55 para a NFC-e 65', () => {
    expect(() =>
      resolveNormalSaleContribution({ contributionDecision: legacyDecision('55') }, '65')
    ).toThrow('CONTRIBUTION_MODEL_SCOPE_REQUIRED');
    expect(resolveNormalSaleContribution({ contributionDecision: legacyDecision('55') }, '55')).toMatchObject({
      model: '55',
      decisionId: 'fiscal_decision_simples_nfe55_normal_sale_v1',
    });
  });

  it('mantém a regra tributária independente de metadados de liberação', () => {
    expect(
      parseSimplesNormalSaleContribution({ ...sharedDecision(), productionApproved: true })
    ).toEqual(parseSimplesNormalSaleContribution(sharedDecision()));
  });

  it.each(['scope', 'cst', 'amount', 'confirmation'])(
    'recusa decisão fora do cenário (%s)',
    (field) => {
      const value = sharedDecision();
      if (field === 'scope') value.scope.operation = 'return';
      if (field === 'cst') value.pis.cst = '01';
      if (field === 'amount') value.cofins.value = 1;
      if (field === 'confirmation') value.confirmedAt = 'invalid';
      expect(() => parseSimplesNormalSaleContribution(value)).toThrow('fora do cenário');
    }
  );
});
