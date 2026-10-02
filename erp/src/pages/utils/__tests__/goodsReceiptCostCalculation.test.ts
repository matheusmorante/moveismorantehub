import { describe, expect, it } from 'vitest';
import { calculateReceiptItems } from '../goodsReceiptCostCalculation';

describe('goodsReceiptCostCalculation', () => {
  it('prioriza IPI individual e mantém custo unitário e total consistentes', () => {
    const [first, second] = calculateReceiptItems(
      [
        {
          productId: 'a',
          description: 'A',
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
          fiscalBaseCost: 100,
          additionalCostUnit: 10,
          ipiPercent: 3.25,
        },
        {
          productId: 'b',
          description: 'B',
          quantity: 2,
          unitCost: 500,
          totalCost: 1000,
          fiscalBaseCost: 500,
          additionalCostUnit: 20,
          ipiPercent: 7,
        },
      ],
      99,
      0
    );

    expect(first.unitCost).toBe(113.25);
    expect(first.totalCost).toBe(1132.5);
    expect(second.unitCost).toBe(555);
    expect(second.totalCost).toBe(1110);
  });

  it('usa a alíquota global apenas quando o item não informa IPI', () => {
    const [item] = calculateReceiptItems(
      [{ productId: 'a', description: 'A', quantity: 1, unitCost: 100, totalCost: 100 }],
      10,
      0
    );
    expect(item.unitCost).toBe(110);
  });

  it('calcula o exemplo exato do usuário: 1 un, R$ 200 custo, R$ 6 IPI (3%), R$ 20 frete (10%) = R$ 226', () => {
    const [item] = calculateReceiptItems(
      [
        {
          productId: 'prod-1',
          description: 'Guarda Roupa',
          quantity: 1,
          unitCost: 200,
          totalCost: 200,
        },
      ],
      {
        fallbackIpiPercent: 3,
        fallbackFreightPercent: 10,
      }
    );

    expect(item.baseCost).toBe(200);
    expect(item.ipiValue).toBe(6);
    expect(item.freightUnit).toBe(20);
    expect(item.unitCost).toBe(226); // Custo unitário final
    expect(item.totalCost).toBe(226); // Total do item
  });

  it('aplica desconto não fiscal em R$ rateado proporcionalmente entre os itens', () => {
    const [itemA, itemB] = calculateReceiptItems(
      [
        { productId: 'a', description: 'Produto A', quantity: 1, unitCost: 200, totalCost: 200 },
        { productId: 'b', description: 'Produto B', quantity: 1, unitCost: 800, totalCost: 800 },
      ],
      {
        fallbackIpiPercent: 0,
        fallbackFreightPercent: 0,
        nonFiscalDiscount: { mode: 'fixed', value: 100 }, // R$ 100 de desconto no total de R$ 1000
      }
    );

    // Item A (20% da base) deve receber R$ 20 de desconto -> 200 - 20 = 180
    expect(itemA.discountUnit).toBe(20);
    expect(itemA.netBaseCost).toBe(180);
    expect(itemA.unitCost).toBe(180);
    expect(itemA.totalCost).toBe(180);

    // Item B (80% da base) deve receber R$ 80 de desconto -> 800 - 80 = 720
    expect(itemB.discountUnit).toBe(80);
    expect(itemB.netBaseCost).toBe(720);
    expect(itemB.unitCost).toBe(720);
    expect(itemB.totalCost).toBe(720);
  });

  it('aplica desconto não fiscal em % diretamente sobre o custo unitário', () => {
    const [item] = calculateReceiptItems(
      [{ productId: 'a', description: 'Produto A', quantity: 2, unitCost: 150, totalCost: 300 }],
      {
        fallbackIpiPercent: 0,
        fallbackFreightPercent: 0,
        nonFiscalDiscount: { mode: 'percent', value: 10 }, // 10% de desconto
      }
    );

    expect(item.discountUnit).toBe(15);
    expect(item.netBaseCost).toBe(135);
    expect(item.unitCost).toBe(135);
    expect(item.totalCost).toBe(270);
  });

  it('calcula custo unitário final com desconto, IPI, frete e outras despesas rateadas', () => {
    // Exemplo complexo:
    // Item: Qtd 2, Custo Unitário R$ 100, IPI 5% (R$ 5), Frete Não Fiscal R$ 20 fixo (R$ 10 un), Desconto Não Fiscal 10% (R$ 10 un)
    // Custo Unitário Final = 100 - 10 (desc) + 5 (ipi) + 10 (frete) = 105
    // Total do item = 2 * 105 = 210
    const [item] = calculateReceiptItems(
      [{ productId: 'a', description: 'Mesa', quantity: 2, unitCost: 100, totalCost: 200 }],
      {
        fallbackIpiPercent: 5,
        fallbackFreightPercent: 0,
        nonFiscalDiscount: { mode: 'percent', value: 10 },
        nonFiscalFreight: { mode: 'fixed', value: 20 },
      }
    );

    expect(item.baseCost).toBe(100);
    expect(item.discountUnit).toBe(10);
    expect(item.netBaseCost).toBe(90);
    expect(item.freightUnit).toBe(10);
    expect(item.unitCost).toBe(105);
    expect(item.totalCost).toBe(210);
  });

  it('aplica frete não fiscal em percentual e outras despesas não fiscais fixas rateadas', () => {
    // 2 itens: A (R$ 200) e B (R$ 800) -> Total R$ 1000
    // Frete Não Fiscal 5% -> A recebe 5% (R$ 10 un), B recebe 5% (R$ 40 un)
    // Outras Despesas Fixas R$ 100 -> A (20%) recebe R$ 20, B (80%) recebe R$ 80
    const [itemA, itemB] = calculateReceiptItems(
      [
        { productId: 'a', description: 'Item A', quantity: 1, unitCost: 200, totalCost: 200 },
        { productId: 'b', description: 'Item B', quantity: 1, unitCost: 800, totalCost: 800 },
      ],
      {
        nonFiscalFreight: { mode: 'percent', value: 5 },
        nonFiscalOtherExpenses: { mode: 'fixed', value: 100 },
      }
    );

    expect(itemA.freightNonFiscalUnit).toBe(10);
    expect(itemA.otherExpensesNonFiscalUnit).toBe(20);
    expect(itemA.unitCost).toBe(230); // 200 + 10 + 20 = 230
    expect(itemA.totalCost).toBe(230);

    expect(itemB.freightNonFiscalUnit).toBe(40);
    expect(itemB.otherExpensesNonFiscalUnit).toBe(80);
    expect(itemB.unitCost).toBe(920); // 800 + 40 + 80 = 920
    expect(itemB.totalCost).toBe(920);
  });

  it('aplica rateio de desconto fiscal global e outras despesas fiscais globais', () => {
    // Item: Qtd 1, Custo R$ 500
    // Desconto Fiscal Global fixo: R$ 50 -> netBaseCost 450
    // Outras Despesas Fiscais Global fixo: R$ 30 -> otherExpensesUnit 30
    // Final unitCost: 500 - 50 + 30 = 480
    const [item] = calculateReceiptItems(
      [{ productId: 'x', description: 'Item X', quantity: 1, unitCost: 500, totalCost: 500 }],
      {
        fiscalDiscount: { mode: 'fixed', value: 50 },
        fiscalOtherExpenses: { mode: 'fixed', value: 30 },
      }
    );

    expect(item.discountFiscalUnit).toBe(50);
    expect(item.netBaseCost).toBe(450);
    expect(item.otherExpensesFiscalUnit).toBe(30);
    expect(item.unitCost).toBe(480);
    expect(item.totalCost).toBe(480);
  });

  it('garante que desconto superior à base não gere custo negativo (guard clause >= 0)', () => {
    const [item] = calculateReceiptItems(
      [{ productId: 'z', description: 'Item Z', quantity: 1, unitCost: 50, totalCost: 50 }],
      {
        nonFiscalDiscount: { mode: 'fixed', value: 100 }, // Desconto de 100 em produto de 50
      }
    );

    expect(item.netBaseCost).toBe(0);
    expect(item.unitCost).toBe(0);
    expect(item.totalCost).toBe(0);
  });

  it('calcula corretamente com quantidades fracionárias (ex: 2.5 unidades)', () => {
    // 2.5 m de tecido a R$ 40/m = R$ 100 total base
    // Frete Não Fiscal fixo de R$ 10 total -> R$ 4/m
    // IPI 10% -> R$ 4/m
    // Custo unitário final = 40 + 4 + 4 = 48/m
    // Total do item = 2.5 * 48 = 120
    const [item] = calculateReceiptItems(
      [
        {
          productId: 'tec',
          description: 'Tecido Linho',
          quantity: 2.5,
          unitCost: 40,
          totalCost: 100,
        },
      ],
      {
        fallbackIpiPercent: 10,
        nonFiscalFreight: { mode: 'fixed', value: 10 },
      }
    );

    expect(item.freightNonFiscalUnit).toBe(4);
    expect(item.ipiValue).toBe(10);
    expect(item.unitCost).toBe(48);
    expect(item.totalCost).toBe(120);
  });
});
