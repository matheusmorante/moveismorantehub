import { describe, expect, it } from 'vitest';
import { applyMovingAverageMove, replayMovingAverageMoves } from './movingAverageCostRules';

describe('regras de CMPM e CMV', () => {
  it('calcula recebimento inicial e mantém a média após venda', () => {
    const receipt = applyMovingAverageMove({ quantity: 0, inventoryValue: 0 }, {
      type: 'entry', quantity: 10, unitCost: 100,
    });
    const sale = applyMovingAverageMove(receipt.state, { type: 'withdrawal', quantity: 6 });

    expect(receipt.state).toMatchObject({ quantity: 10, unitCost: 100 });
    expect(sale.resolvedUnitCost).toBe(100);
    expect(sale.state).toMatchObject({ quantity: 4, unitCost: 100 });
    expect(sale.resolvedUnitCost! * 6).toBe(600);
  });

  it('recalcula a média no novo recebimento e ignora custo antigo com saldo zerado', () => {
    const afterReceipt = applyMovingAverageMove({ quantity: 4, inventoryValue: 400, unitCost: 100 }, {
      type: 'entry', quantity: 8, unitCost: 200,
    });
    const afterZeroStock = applyMovingAverageMove({ quantity: 0, inventoryValue: 0, unitCost: 100 }, {
      type: 'entry', quantity: 5, unitCost: 300,
    });

    expect(afterReceipt.state.quantity).toBe(12);
    expect(afterReceipt.state.unitCost).toBeCloseTo(166.666667, 6);
    expect(afterZeroStock.state).toMatchObject({ quantity: 5, unitCost: 300 });
  });

  it('reprocessa CMVs posteriores após correção histórica e preserva o invariante do replay', () => {
    const history = [
      { id: 'receipt-1', type: 'entry', quantity: 5, unitCost: 500 },
      { id: 'sale-1', type: 'withdrawal', quantity: 2 },
      { id: 'receipt-2', type: 'entry', quantity: 4, unitCost: 700 },
      { id: 'sale-2', type: 'withdrawal', quantity: 3 },
    ];
    const replay = replayMovingAverageMoves(history, true);
    const lastSale = replay.moves.find((move) => move.id === 'sale-2');
    const materialized = history.reduce(
      (state, move) => applyMovingAverageMove(state, move, true).state,
      { quantity: 0, inventoryValue: 0, unitCost: undefined as number | undefined },
    );

    expect(lastSale?.resolvedUnitCost).toBeCloseTo(614.285714, 6);
    expect(replay.state.quantity).toBe(4);
    expect(replay.state.unitCost).toBeCloseTo(614.285714, 6);
    expect(materialized.quantity).toBe(replay.state.quantity);
    expect(materialized.unitCost).toBeCloseTo(replay.state.unitCost!, 6);
  });

  it('ignora movimentos estornados ao reconstruir o saldo', () => {
    const replay = replayMovingAverageMoves([
      { type: 'entry', quantity: 10, unitCost: 100 },
      { type: 'withdrawal', quantity: 6, observation: '{"status":"reversed"}' },
    ]);

    expect(replay.state).toMatchObject({ quantity: 10, unitCost: 100 });
  });

  it('restaura exatamente o saldo ao cancelar a saída agendada', () => {
    const scheduled = replayMovingAverageMoves([{ type: 'withdrawal', quantity: 1 }]);
    const cancelled = replayMovingAverageMoves([
      { type: 'withdrawal', quantity: 1, observation: '{"status":"reversed"}' },
    ]);

    expect(scheduled.state.quantity).toBe(-1);
    expect(cancelled.state.quantity).toBe(0);
  });
});
