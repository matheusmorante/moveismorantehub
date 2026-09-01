import { describe, expect, it } from 'vitest';
import { canProcessReturnStock, getReturnInventoryDate, getReturnUnitCost, shouldCreateReturnEntry } from './returnInventoryRules';
import { replayMovingAverageMoves } from './movingAverageCostRules';
import { canCreateSaleExitForItem } from './saleInventoryRules';

describe('devolução de produto cadastrado', () => {
  it('usa o CMV materializado na venda, sem consultar o custo atual', () => {
    const item = { unitCost: 100, costPrice: 250 } as any;

    expect(getReturnUnitCost(item)).toBe(100);
    expect(shouldCreateReturnEntry({ ...item, productId: 'produto-teste' }, false)).toBe(true);
    expect(shouldCreateReturnEntry({ ...item, productId: 'produto-teste' }, true)).toBe(false);
  });

  it('só movimenta devolução atendida e preserva a data histórica na reconciliação', () => {
    const scheduled = { orderType: 'return', status: 'scheduled', date: '2026-08-01T10:00:00.000Z' } as any;
    const fulfilled = { ...scheduled, status: 'fulfilled' };

    expect(canProcessReturnStock(scheduled)).toBe(false);
    expect(canProcessReturnStock(fulfilled)).toBe(true);
    expect(getReturnInventoryDate(fulfilled, true)).toBe('2026-08-01T10:00:00.000Z');
  });

  it('materializa uma única saída e entrada histórica após reconciliação de venda e devolução atendidas', () => {
    const temporary = { description: 'TESTE_ERP_item', quantity: 1, unitPrice: 900, unitDiscount: 0, discountType: 'fixed', handlingType: '', isTemporaryProduct: true } as any;
    const linked = { ...temporary, productId: 'produto-teste', isTemporaryProduct: false, unitCost: 500 };
    const sale = { orderType: 'sale', status: 'fulfilled' } as any;
    const returned = { orderType: 'return', status: 'fulfilled' } as any;

    expect(canCreateSaleExitForItem(sale, temporary, false)).toBe(false);
    expect(shouldCreateReturnEntry(temporary, false)).toBe(false);
    expect(canCreateSaleExitForItem(sale, linked, false)).toBe(true);
    expect(canProcessReturnStock(returned)).toBe(true);
    expect(shouldCreateReturnEntry(linked, false)).toBe(true);

    const replay = replayMovingAverageMoves([
      { id: 'entrada-inicial', type: 'entry', quantity: 1, unitCost: 500 },
      { id: 'saida-venda', type: 'withdrawal', quantity: 1, unitCost: linked.unitCost },
      { id: 'entrada-devolucao', type: 'entry', quantity: 1, unitCost: getReturnUnitCost(linked) },
    ]);

    expect(replay.moves).toHaveLength(3);
    expect(replay.state).toMatchObject({ quantity: 1, unitCost: 500 });
    expect(canCreateSaleExitForItem(sale, linked, true)).toBe(false);
    expect(shouldCreateReturnEntry(linked, true)).toBe(false);
  });
});
