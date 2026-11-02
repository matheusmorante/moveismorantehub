import { describe, expect, it } from 'vitest';
import { mobileReceiptFormSchema } from '../../../../../../shared-utils/receiptFormSchemas';
import {
  calculateMobileReceiptItems,
  inboundReceiptOrigin,
  purchaseReceiptOrigin,
  receiptItemWithCosts,
} from './receiptSource';

const invoice = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
  id: 'invoice',
  supplier_id: 'supplier',
  supplierStockOrigins: ['normal'],
  chave_acesso: '43261092051440000196550020002708921266772440',
  numero_nfe: '270892',
  data_emissao: '2026-10-30',
  status_recebimento: 'pending',
  valor_produtos: 500,
  valor_ipi: 25,
  valor_frete: 50,
  items,
  ...overrides,
});

describe('origens de recebimento no aplicativo', () => {
  it('rateia desconto e frete percentuais proporcionalmente entre os itens', () => {
    const items = calculateMobileReceiptItems(
      [
        { productId: 'a', description: 'Mesa', quantity: 2, baseCost: 100, unitCost: 100, totalCost: 200 },
        { productId: 'b', description: 'Cadeira', quantity: 1, baseCost: 50, unitCost: 50, totalCost: 50 },
      ],
      { discountMode: 'percent', discountValue: 10, freightMode: 'percent', freightValue: 5 },
    );

    expect(items[0].discountNonFiscalUnit).toBe(10);
    expect(items[0].freightNonFiscalUnit).toBe(5);
    expect(items[0].unitCost).toBe(95);
    expect(items[0].totalCost).toBe(190);
    expect(items[1].discountNonFiscalUnit).toBe(5);
    expect(items[1].freightNonFiscalUnit).toBe(2.5);
    expect(items[1].unitCost).toBe(47.5);
    expect(items[1].totalCost).toBe(47.5);
  });

  it('rateia valores fixos proporcionalmente e preserva os centavos', () => {
    const items = calculateMobileReceiptItems(
      [
        { productId: 'a', description: 'Mesa', quantity: 2, baseCost: 100, unitCost: 100, totalCost: 200 },
        { productId: 'b', description: 'Cadeira', quantity: 1, baseCost: 50, unitCost: 50, totalCost: 50 },
      ],
      { discountMode: 'fixed', discountValue: 15, freightMode: 'fixed', freightValue: 6 },
    );

    expect(items[0].discountNonFiscalUnit).toBe(6);
    expect(items[0].freightNonFiscalUnit).toBe(2.4);
    expect(items[0].totalCost).toBe(192.8);
    expect(items[1].discountNonFiscalUnit).toBe(3);
    expect(items[1].freightNonFiscalUnit).toBe(1.2);
    expect(items[1].totalCost).toBe(48.2);
  });

  it('traz o pedido e calcula os custos por item para conferência', () => {
    const origin = purchaseReceiptOrigin({
      id: 'purchase',
      supplierId: 'supplier',
      supplierName: 'Fornecedor',
      date: '2026-10-30',
      status: 'ordered',
      items: [
        {
          productId: 'p',
          variationId: 'v',
          description: 'Produto',
          quantity: 2,
          baseCost: 100,
          unitCost: 100,
          totalCost: 200,
        },
      ],
      totalValue: 200,
      ipiPercent: 5,
      freightPercent: 10,
      stockProcessed: false,
      attachments: [],
    });
    expect(origin.purchaseId).toBe('purchase');
    expect(origin.items[0]).toMatchObject({
      productId: 'p',
      variationId: 'v',
      quantity: 2,
      baseCost: 100,
      unitCost: 115,
      totalCost: 230,
    });
    expect(receiptItemWithCosts({ ...origin.items[0], quantity: 1 }).totalCost).toBe(115);
  });

  it('inclui custos fiscais e ignora linhas marcadas como não se aplica', () => {
    const origin = inboundReceiptOrigin(
      invoice([
        {
          productDescription: 'Produto',
          matchedProductId: 'p',
          matchedVariationId: 'v',
          quantity: 5,
          unitCost: 100,
          totalCost: 500,
          freightValue: 50,
          insuranceValue: 5,
          otherExpensesValue: 10,
          icmsStValue: 10,
          discountValue: 20,
          ipiValue: 25,
        },
        {
          productDescription: 'Serviço',
          linkMode: 'not_applicable',
          quantity: 1,
          unitCost: 20,
          totalCost: 20,
        },
      ]),
    );
    expect(origin.items).toHaveLength(1);
    expect(origin.items[0]).toMatchObject({
      productId: 'p',
      variationId: 'v',
      quantity: 5,
      expectedQuantity: 5,
      unitCost: 116,
      totalCost: 580,
    });
  });

  it('expande a composição usando o multiplicador e rateia o valor pelos preços de venda', () => {
    const origin = inboundReceiptOrigin(
      invoice(
        [
          {
            productDescription: 'Conjunto',
            quantity: 2,
            unitCost: 150,
            totalCost: 300,
            freightValue: 30,
            linkMode: 'composition',
            compositionLinks: [
              {
                productId: 'mesa',
                variationId: 'm',
                productErpName: 'Mesa',
                quantityMultiplier: 1,
                sellingPrice: 100,
              },
              {
                productId: 'cadeira',
                variationId: 'c',
                productErpName: 'Cadeira',
                quantityMultiplier: 2,
                sellingPrice: 100,
              },
            ],
          },
        ],
        { valor_produtos: 300, valor_ipi: 0, valor_frete: 30 },
      ),
    );
    expect(
      origin.items.map((item) => [item.productId, item.quantity, item.unitCost, item.totalCost]),
    ).toEqual([
      ['mesa', 2, 55, 110],
      ['cadeira', 4, 55, 220],
    ]);
  });

  it('preserva o centavo restante no rateio da composição', () => {
    const origin = inboundReceiptOrigin(
      invoice(
        [
          {
            quantity: 1,
            unitCost: 100,
            totalCost: 100,
            linkMode: 'composition',
            compositionLinks: ['a', 'b', 'c'].map((productId) => ({
              productId,
              quantityMultiplier: 1,
              sellingPrice: 1,
            })),
          },
        ],
        { valor_produtos: 100, valor_ipi: 0, valor_frete: 0 },
      ),
    );
    expect(origin.items.map((item) => item.totalCost)).toEqual([33.33, 33.33, 33.34]);
  });

  it('ignora vínculo antigo da NF e valida fornecedor, XML e vínculos', () => {
    const linked = [{ matchedProductId: 'p', quantity: 1, unitCost: 10, totalCost: 10 }];
    expect(() => inboundReceiptOrigin(invoice(linked, { receipt_id: 'receipt', status_recebimento: 'received' }))).not.toThrow();
    expect(() =>
      inboundReceiptOrigin(invoice(linked, { supplierStockOrigins: ['salvados'] })),
    ).toThrow('estoque normal');
    expect(() => inboundReceiptOrigin(invoice([]))).toThrow('XML completo');
    expect(() => inboundReceiptOrigin(invoice([{ quantity: 1, unitCost: 10 }]))).toThrow(
      'Vincule cada item',
    );
    expect(() =>
      inboundReceiptOrigin(invoice([{ matchedProductId: 'p', quantity: 1, unitCost: -10 }])),
    ).toThrow('Confira os valores');
  });

  it('valida data, fornecedor, quantidade e custo antes de confirmar', () => {
    const values = {
      supplierId: 'supplier',
      receiptDate: '2026-10-30',
      items: [
        {
          productId: 'p',
          description: 'P',
          quantity: 1,
          baseCost: 10,
          unitCost: 10,
          totalCost: 10,
        },
      ],
      totalValue: 10,
      fiscalKey: '',
      ipiPercent: 0,
      freightPercent: 0,
    };
    expect(mobileReceiptFormSchema.safeParse(values).success).toBe(true);
    expect(mobileReceiptFormSchema.safeParse({ ...values, receiptDate: '' }).success).toBe(false);
    expect(
      mobileReceiptFormSchema.safeParse({
        ...values,
        items: [{ ...values.items[0], quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(mobileReceiptFormSchema.safeParse({ ...values, supplierId: '' }).success).toBe(false);
  });
});
