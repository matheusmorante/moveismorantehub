import { describe, expect, it } from 'vitest';
import { resolveMobileProductFinalPurchasePrice } from './productPurchasePrice';

describe('resolveMobileProductFinalPurchasePrice', () => {
  it('recalcula custo final dos campos persistidos em vez de reutilizar total obsoleto', () => {
    expect(
      resolveMobileProductFinalPurchasePrice({
        cost_price: '250,00',
        ipi_percent: '10',
        freight_cost: '5',
        freight_type: 'percentage',
      })
    ).toBe(287.5);
  });

  it('aceita os campos camel case do rascunho e mantém o cálculo de IPI fixo', () => {
    expect(
      resolveMobileProductFinalPurchasePrice({
        costPrice: '250,00',
        ipiPercent: '10,00',
        ipiType: 'fixed',
        freightCost: '30,00',
        freightType: 'fixed',
      })
    ).toBe(290);
  });
});
