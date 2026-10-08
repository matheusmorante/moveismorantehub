import { describe, expect, it } from 'vitest';
import {
  getRecipientIeIndicatorConsistencyError,
  resolveEffectiveRecipientIeIndicator,
} from '../../../../../../../../shared-utils/recipientIeIndicator';
import { resolveNfeItemCfopOptions } from './itemFiscalCfopOptions';

const baseItem = {
  itemType: 'product' as const,
  productId: 'product-1',
  fiscal: {
    ncm: '85165000',
    cest: '',
    origem: '0',
    cfop: '',
    cst: '103',
    merchandiseOrigin: 'third_party' as 'third_party' | 'own_production',
    hasSt: false,
  },
};

const operationScope = {
  scope: 'interstate' as const,
  destination: '2' as const,
  issuerUf: 'PR',
  operationUf: 'SC',
};

const resolve = (
  recipientIeIndicator: '1' | '2' | '9',
  finalConsumer: boolean,
  item: typeof baseItem = baseItem
) =>
  resolveNfeItemCfopOptions({
    item,
    operationScope,
    environment: 2,
    model: '55',
    issuerRegime: '1',
    recipientIeIndicator,
    recipientIe: recipientIeIndicator === '1' ? '123456789' : '',
    finalConsumer,
    recipientPersonType: 'PJ',
    presence: '9',
    effectiveAt: '2026-10-07T12:00:00.000Z',
  });

const enabledCfops = (decision: ReturnType<typeof resolveNfeItemCfopOptions>) =>
  decision.options.filter((option) => !option.disabled).map((option) => option.value);

describe('resolveNfeItemCfopOptions', () => {
  it.each([
    { label: 'contribuinte', recipientIeIndicator: '1' as const, finalConsumer: false },
    { label: 'contribuinte isento', recipientIeIndicator: '2' as const, finalConsumer: true },
    {
      label: 'não contribuinte consumidor final',
      recipientIeIndicator: '9' as const,
      finalConsumer: true,
    },
  ])('mantém CFOPs candidatos bloqueados para $label enquanto não há regra aprovada', (facts) => {
    const decision = resolve(facts.recipientIeIndicator, facts.finalConsumer);

    expect(decision.defaultCfop).toBe('');
    expect(enabledCfops(decision)).toEqual([]);
    expect(decision.options.map((option) => option.value)).toEqual(
      expect.arrayContaining(['6102', '6108'])
    );
    expect(decision.options.every((option) => option.disabled)).toBe(true);
    expect(decision.options.every((option) => option.diagnostic?.source === 'matrix')).toBe(true);
  });

  it('mantém os CFOPs visíveis e desabilitados quando a matriz bloqueia a combinação', () => {
    const decision = resolve('9', false);

    expect(decision.options.length).toBeGreaterThan(0);
    expect(decision.options.every((option) => option.disabled)).toBe(true);
    expect(decision.defaultCfop).toBe('');
    expect(decision.reason).toContain('indIEDest=9');
  });

  it('não oferece CFOP base para produção própria ou mercadoria com ST sem matriz aplicável', () => {
    const ownProduction = resolve('1', true, {
      ...baseItem,
      fiscal: { ...baseItem.fiscal, merchandiseOrigin: 'own_production' },
    });
    const st = resolve('1', true, {
      ...baseItem,
      fiscal: { ...baseItem.fiscal, hasSt: true },
    });

    expect(ownProduction.options.length).toBeGreaterThan(0);
    expect(ownProduction.options.every((option) => option.disabled)).toBe(true);
    expect(st.options.length).toBeGreaterThan(0);
    expect(st.options.every((option) => option.disabled)).toBe(true);
  });

  it('preserva indIEDest=9 explícito mesmo com IE preenchida', () => {
    expect(
      resolveEffectiveRecipientIeIndicator({
        selected: '9',
        persisted: '9',
        customer: '1',
        ie: '123456789',
      })
    ).toBe('9');
  });

  it('valida IE em conjunto com indIEDest sem reinterpretar 9 como contribuinte', () => {
    expect(getRecipientIeIndicatorConsistencyError('1', '')).toContain('indIEDest=1');
    expect(getRecipientIeIndicatorConsistencyError('2', '123456789')).toContain('indIEDest=2');
    expect(getRecipientIeIndicatorConsistencyError('9', '123456789')).toBeNull();
    expect(getRecipientIeIndicatorConsistencyError('9', 'X')).toContain('indIEDest=9');
  });
});
