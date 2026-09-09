import { describe, expect, it } from 'vitest';
import { fiscalAdditionalCost, itemAdditionalCost, itemCostWithAdditionalCosts, nonFiscalAdditionalCost } from './inboundItemCosts';

const item = {
    itemNumber: 1,
    productCode: 'A1',
    productDescription: 'Produto de teste',
    ncm: '',
    cfop: '',
    unit: 'UN',
    quantity: 2,
    unitCost: 100,
    totalCost: 200,
    ipiValue: 10,
    icmsStValue: 8,
    freightValue: 6,
    insuranceValue: 4,
    otherExpensesValue: 2,
    totalAdditionalCosts: 20,
};

describe('inbound item costs', () => {
    it('soma os custos fiscais e não fiscais ao custo unitário', () => {
        expect(fiscalAdditionalCost(item)).toBe(30);
        expect(nonFiscalAdditionalCost(item)).toBe(20);
        expect(itemAdditionalCost(item)).toBe(50);
        expect(itemCostWithAdditionalCosts(item)).toBe(125);
    });

    it('usa o rateio não fiscal legado quando o total ainda não foi persistido', () => {
        expect(nonFiscalAdditionalCost({ ...item, totalAdditionalCosts: undefined, allocatedAdditionalCosts: 12 })).toBe(12);
    });
});
