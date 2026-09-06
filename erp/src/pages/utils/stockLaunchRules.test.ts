import { describe, expect, it } from 'vitest';
import { applyMovingAverageMove, replayMovingAverageMoves } from './movingAverageCostRules';

describe('Lançamentos manuais de estoque (Entrada, Saída e Ajuste/Balanço)', () => {
  it('calcula o valor da diferença de ajuste em relação ao saldo atual', () => {
    const currentStock = 15;
    const desiredStock = 20;
    const adjustmentQuantity = desiredStock - currentStock;

    expect(adjustmentQuantity).toBe(5);

    const afterAdjustment = applyMovingAverageMove({ quantity: currentStock, inventoryValue: 1500, unitCost: 100 }, {
      type: 'entry',
      quantity: adjustmentQuantity,
      unitCost: 100,
    });

    expect(afterAdjustment.state.quantity).toBe(20);
    expect(afterAdjustment.state.unitCost).toBe(100);
  });

  it('registra lançamento de entrada alterando a quantidade mantendo ou atualizando o custo', () => {
    const initial = { quantity: 10, inventoryValue: 1000, unitCost: 100 };
    const entry = applyMovingAverageMove(initial, {
      type: 'entry',
      quantity: 5,
      unitCost: 100,
    });

    expect(entry.state.quantity).toBe(15);
    expect(entry.state.unitCost).toBe(100);
  });

  it('registra lançamento de saída reduzindo a quantidade sem alterar o CMPM unitário', () => {
    const initial = { quantity: 10, inventoryValue: 1000, unitCost: 100 };
    const exit = applyMovingAverageMove(initial, {
      type: 'withdrawal',
      quantity: 3,
    });

    expect(exit.state.quantity).toBe(7);
    expect(exit.state.unitCost).toBe(100);
  });

  it('estorno de lançamento manual reverte a movimentação no histórico de replay', () => {
    const history = [
      { id: 'move-1', type: 'entry', quantity: 10, unitCost: 100 },
      { id: 'move-2', type: 'withdrawal', quantity: 4 },
      { id: 'move-3', type: 'entry', quantity: 2, unitCost: 100, observation: '{"status":"reversed"}' },
    ];

    const replay = replayMovingAverageMoves(history);
    expect(replay.state.quantity).toBe(6);
    expect(replay.state.unitCost).toBe(100);
  });
});
