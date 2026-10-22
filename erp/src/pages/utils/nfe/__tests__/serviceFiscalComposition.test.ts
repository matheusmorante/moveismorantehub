import { describe, expect, it } from 'vitest';
import type { Item } from '@/pages/types/items.type';
import { assertServiceFiscalCompositionReady, composeServiceFiscalValues } from '../serviceFiscalComposition';
import { HOMOLOGATION_FIRST_ITEM_DESCRIPTION } from '../../../../../../shared-utils/fiscalDocumentModel';
import { buildItemsXml } from '../xml/xmlItemsBlock';
import { buildTotalsAndPaymentXml } from '../xml/xmlTotalsBlock';

const product = (
  id: string,
  unitPrice: number,
  quantity = 1
): Item & {
  fiscal: { ncm: string; cfop: string; cst: string; origem: string };
} => ({
  orderItemId: id,
  itemType: 'product',
  description: `Produto ${id}`,
  code: id,
  quantity,
  unitPrice,
  unitDiscount: 0,
  discountType: 'fixed',
  handlingType: '',
  fiscal: { ncm: '94036000', cfop: '5102', cst: '103', origem: '2' },
});

const service = (
  unitPrice: number,
  linkedProductOrderItemIds?: string | string[],
  quantity = 1
): Item => ({
  orderItemId: `serv-${unitPrice}`,
  itemType: 'service',
  description: 'Montagem',
  quantity,
  unitPrice,
  unitDiscount: 0,
  discountType: 'fixed',
  handlingType: '',
  linkedProductOrderItemIds: Array.isArray(linkedProductOrderItemIds)
    ? linkedProductOrderItemIds
    : linkedProductOrderItemIds
      ? [linkedProductOrderItemIds]
      : undefined,
});

const settings = { companyCRT: '1', fiscalDefaults: { ncm: '94036000' } } as any;

describe('service fiscal composition', () => {
  it('serializes CSOSN 103 in ICMSSN102, preserving origin and other taxes', () => {
    const item = product('A', 100);
    const before = structuredClone(item);
    const { itemsXml } = buildItemsXml({ items: [item] } as any, settings, true, '65');
    expect(itemsXml).toContain('<ICMSSN102>');
    expect(itemsXml).toContain('<CSOSN>103</CSOSN>');
    expect(itemsXml).toContain('<orig>2</orig>');
    expect(itemsXml).not.toContain('<ICMSSN103>');
    expect(itemsXml).toContain('<NCM>94036000</NCM>');
    expect(itemsXml).toContain('<CFOP>5102</CFOP>');
    expect(itemsXml.match(/<CST>49<\/CST>/g)).toHaveLength(2);
    expect(item).toEqual(before);
  });

  it('requires resolved CSOSN and a supported group/regime instead of fabricating a default', () => {
    for (const cst of ['', '500']) {
      const item = product('A', 100);
      item.fiscal.cst = cst;
      expect(() => buildItemsXml({ items: [item] } as any, settings, true, '65')).toThrow();
    }
    expect(() =>
      buildItemsXml(
        { items: [product('A', 100)] } as any,
        { ...settings, companyCRT: '3' },
        true,
        '65'
      )
    ).toThrow(/CRT 1/);
  });

  it('incorporates each linked service once and leaves services without links pending', () => {
    const result = composeServiceFiscalValues([
      product('A', 1500),
      product('B', 800),
      service(100, 'A'),
      service(50, 'A'),
      service(30, 'B'),
      service(20),
    ]);
    expect(result.products.map((line) => line.vProdCents)).toEqual([165000, 83000]);
    expect(result.incorporatedServiceCents).toBe(18000);
    expect(result.pendingServices.map((line) => line.amountCents)).toEqual([2000]);
    expect(result.pendingServices[0].reason).toBe('missing_product_link');
    expect(result.vOutroCents).toBe(0);
    expect(result.additionalInformation).toContain('Produto A');
    expect(result.additionalInformation).toContain('Produto B');
  });

  it('uses the order link without a service catalog or fiscal-treatment snapshot', () => {
    const orderItems = [product('A', 1500), service(100, 'A')];
    const before = structuredClone(orderItems);
    const composition = composeServiceFiscalValues(orderItems, '55');
    expect(composition.products[0].vProdCents).toBe(160000);
    expect(composition.pendingServices).toEqual([]);
    expect(composition.vOutroCents).toBe(0);
    expect(orderItems).toEqual(before);
    expect(orderItems[0].unitPrice).toBe(1500);
  });

  it('distributes service cents by linked product quantities with a stable product-order remainder', () => {
    const composition = composeServiceFiscalValues([
      product('A', 10, 2),
      product('B', 20, 1),
      service(1, ['B', 'A']),
    ]);
    expect(composition.products.map((line) => line.vProdCents)).toEqual([2067, 2033]);
    expect(composition.incorporatedServiceCents).toBe(100);
    expect(composition.products.map((line) => line.incorporatedServices[0]?.allocatedCents)).toEqual([
      67,
      33,
    ]);
    expect(composition.vOutroCents).toBe(0);
    expect(composition.additionalInformation).toContain('rateio do serviço "Montagem"');
    expect(composition.additionalInformation).toContain('R$ 0,67');
    expect(composition.additionalInformation).toContain('R$ 0,33');
    expect(composition.additionalInformation).toContain('valor total do serviço no pedido: R$ 1,00');
  });

  it('preserves product discounts and rounds the final fiscal item totals in cents', () => {
    const result = composeServiceFiscalValues([
      { ...product('A', 10.01, 3), unitDiscount: 10, discountType: 'percentage' },
      service(1, 'A'),
    ]);
    expect(result.products[0].vProdCents).toBe(3103);
    expect(result.products[0].vDescCents).toBe(300);
    expect(result.vOutroCents).toBe(0);

    const serialized = buildItemsXml(
      {
        items: [
          { ...product('Q', 10.01, 3), unitDiscount: 10, discountType: 'percentage' },
          service(1, 'Q'),
        ],
      } as any,
      settings,
      true,
      '55'
    );
    expect(serialized.itemsXml).toContain('<qCom>3.0000</qCom>');
    expect(serialized.itemsXml).toContain('<vUnCom>10.3433333333</vUnCom>');
    expect(serialized.itemsXml).toContain('<vProd>31.03</vProd>');
  });

  it('uses the exact homologation description only on the first NFC-e item', () => {
    const order = { items: [product('A', 100), product('B', 200)] } as any;
    const nfce = buildItemsXml(order, settings, true, '65').itemsXml;
    const nfe = buildItemsXml(order, settings, true, '55').itemsXml;
    const productionNfce = buildItemsXml(order, settings, false, '65').itemsXml;

    expect(nfce.match(/<det /g)).toHaveLength(2);
    expect(nfce).toContain(`<xProd>${HOMOLOGATION_FIRST_ITEM_DESCRIPTION}</xProd>`);
    expect(nfce).toContain('<xProd>Produto B</xProd>');
    expect(nfe).toContain('<xProd>Produto A</xProd>');
    expect(nfe).toContain('<xProd>Produto B</xProd>');
    expect(productionNfce).toContain('<xProd>Produto A</xProd>');
  });

  it('composes two units at R$ 500 with a R$ 100 service as one item at R$ 550', () => {
    const order = {
      items: [product('A', 500, 2), service(100, 'A')],
      shipping: { value: 0, deliveryMethod: 'pickup' },
      payments: [],
    } as any;

    for (const model of ['55', '65'] as const) {
      const composition = composeServiceFiscalValues(order.items, model);
      const serialized = buildItemsXml(order, settings, true, model);
      const totals = buildTotalsAndPaymentXml(order, serialized.vProdTotal, serialized.vDescTotal, model);
      expect(composition.products[0].vProdCents).toBe(110000);
      expect(serialized.itemsXml.match(/<det /g)).toHaveLength(1);
      expect(serialized.itemsXml).toContain('<qCom>2.0000</qCom>');
      expect(serialized.itemsXml).toContain('<vUnCom>550.0000000000</vUnCom>');
      expect(serialized.itemsXml).toContain('<vProd>1100.00</vProd>');
      expect(totals).toContain('<vOutro>0.00</vOutro>');
      expect(totals).toContain('<vNF>1100.00</vNF>');
      expect(totals).toContain('O valor fiscal do item');
      expect(totals).toContain('rateio considera as quantidades dos produtos vinculados');
      expect(totals).toContain('não afirma que o serviço foi executado em cada unidade');
    }
  });

  it('blocks a service without linked products and permits linked services in production', () => {
    for (const model of ['55', '65'] as const) {
      const unlinked = { items: [product('A', 500), service(100)] } as any;
      expect(() => buildItemsXml(unlinked, settings, true, model)).toThrow(/precisa estar vinculado/);

      const linkedOrder = { items: [product('A', 500), service(100, 'A')] } as any;
      const composition = composeServiceFiscalValues(linkedOrder.items, model);
      expect(() => assertServiceFiscalCompositionReady(composition)).not.toThrow();
      const productionXml = buildItemsXml(linkedOrder, settings, false, model);
      expect(productionXml.itemsXml).toContain('<vProd>600.00</vProd>');
    }
  });
});
