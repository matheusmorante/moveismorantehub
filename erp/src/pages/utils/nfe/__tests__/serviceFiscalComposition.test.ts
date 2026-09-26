import { describe, expect, it } from 'vitest';
import type { Item } from '@/pages/types/items.type';
import { composeServiceFiscalValues } from '../serviceFiscalComposition';
import { buildItemsXml } from '../xml/xmlItemsBlock';
import { buildTotalsAndPaymentXml } from '../xml/xmlTotalsBlock';

const product = (id: string, unitPrice: number, quantity = 1): Item => ({
    orderItemId: id, itemType: 'product', description: `Produto ${id}`, code: id,
    quantity, unitPrice, unitDiscount: 0, discountType: 'fixed', handlingType: '',
    fiscal: { ncm: '94036000' } as any,
});
const service = (unitPrice: number, linkedProductOrderItemId?: string, quantity = 1): Item => ({
    orderItemId: `serv-${unitPrice}`, itemType: 'service', description: 'Montagem',
    quantity, unitPrice, unitDiscount: 0, discountType: 'fixed', handlingType: '',
    linkedProductOrderItemId,
});
const settings = { fiscalDefaults: { ncm: '94036000' } } as any;

describe('service fiscal composition', () => {
    it('routes unlinked services to vOutro; linked values attach to the exact product line', () => {
        const result = composeServiceFiscalValues([
            product('A', 1500), product('B', 800), service(100, 'A'), service(50, 'A'), service(30, 'B'), service(20),
        ]);
        expect(result.products.map(line => line.vProdCents)).toEqual([165000, 83000]);
        expect(result.vOutroCents).toBe(2000);
    });

    it('treats moved, removed and unknown links as a fresh redistribution without mutating items', () => {
        const original = [product('A', 1500), service(100, 'missing')];
        const unlinked = composeServiceFiscalValues(original);
        expect(unlinked.vOutroCents).toBe(10000);
        original[1].linkedProductOrderItemId = 'A';
        const linked = composeServiceFiscalValues(original);
        expect(linked.products[0].vProdCents).toBe(160000);
        expect(linked.vOutroCents).toBe(0);
        expect(original[0].unitPrice).toBe(1500);
    });

    it('handles quantity, discounts, empty/service-only orders and cents deterministically', () => {
        const result = composeServiceFiscalValues([
            { ...product('A', 10.01, 3), unitDiscount: 10, discountType: 'percentage' },
            service(1.005, 'A'), service(2.25),
        ]);
        expect(result.products[0].vProdCents).toBe(3003 + 100);
        expect(result.products[0].vDescCents).toBe(300);
        expect(result.vOutroCents).toBe(225);
        expect(composeServiceFiscalValues([])).toEqual({ products: [], vOutroCents: 0 });
        expect(composeServiceFiscalValues([service(4)]).vOutroCents).toBe(400);
    });

    it.each(['55', '65'] as const)('emits model %s composition once, keeping freight separate', model => {
        const order = {
            items: [product('A', 1500), service(100, 'A'), service(25)],
            shipping: { value: 12, deliveryMethod: model === '65' ? 'pickup' : 'delivery' },
            payments: [], orderIndex: 1,
        } as any;
        const first = buildItemsXml(order, settings, false);
        const second = buildItemsXml(order, settings, false);
        const totals = buildTotalsAndPaymentXml(order, first.vProdTotal, first.vDescTotal);
        expect(first.itemsXml.match(/<det /g)).toHaveLength(1);
        expect(first.vProdTotal).toBe(1600);
        expect(first).toEqual(second);
        expect(totals).toContain('<vOutro>25.00</vOutro>');
        expect(totals).toContain('<vFrete>12.00</vFrete>');
        expect(totals).toContain('<vNF>1637.00</vNF>');
    });
});
