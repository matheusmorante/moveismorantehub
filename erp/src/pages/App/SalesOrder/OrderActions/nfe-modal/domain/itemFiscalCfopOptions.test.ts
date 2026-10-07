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
  it('filtra para 6102 quando o destinatário é contribuinte', () => {
    const decision = resolve('1', false);

    expect(decision.defaultCfop).toBe('6102');
    expect(enabledCfops(decision)).toEqual(['6102']);
    expect(decision.options.find((option) => option.value === '6108')?.disabled).toBe(true);
  });

  it('filtra para 6102 quando o destinatário é contribuinte isento aceito pela UF', () => {
    const decision = resolve('2', true);

    expect(decision.defaultCfop).toBe('6102');
    expect(enabledCfops(decision)).toEqual(['6102']);
    expect(decision.options.find((option) => option.value === '6108')?.disabled).toBe(true);
  });

  it('filtra para 6108 quando o destinatário é não contribuinte e consumidor final', () => {
    const decision = resolve('9', true);

    expect(decision.defaultCfop).toBe('6108');
    expect(decision.options.find((option) => option.value === '6108')?.diagnostic?.conflicts).toEqual([]);
    expect(enabledCfops(decision)).toEqual(['6108']);
    const incompatibleCfop = decision.options.find((option) => option.value === '6102');
    expect(incompatibleCfop?.disabled).toBe(true);
    expect(incompatibleCfop?.diagnostic?.recommendedCfop).toBe('6108');
    expect(incompatibleCfop?.diagnostic?.source).toBe('matrix');
    expect(incompatibleCfop?.diagnostic?.context).toEqual(
      expect.arrayContaining([
        { label: 'Modelo fiscal', value: 'NF-e 55' },
        { label: 'indIEDest', value: '9' },
        { label: 'UF de origem', value: 'PR' },
        { label: 'UF de destino', value: 'SC' },
        { label: 'Presença / indPres', value: '9' },
      ])
    );
    expect(incompatibleCfop?.diagnostic?.conflicts.join(' ')).toContain('indIEDest');
  });

  it('não oferece CFOP quando a matriz bloqueia não contribuinte que não é consumidor final', () => {
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
