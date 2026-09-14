import { describe, expect, it } from 'vitest';
import { calculateLotBalances } from './priceHistoryBalance';
import { InventoryMoveEntry } from './priceHistory.types';

describe('calculateLotBalances', () => {
    it('calcula o saldo de lotes subtraindo retiradas vinculadas pelo parent_move_id', () => {
        const entries: InventoryMoveEntry[] = [
            { id: 'move-1', product_id: 'prod-1', type: 'entry', quantity: 10, unit_cost: 50, date: '', label: '', observation: '' },
            { id: 'move-2', product_id: 'prod-1', type: 'entry', quantity: 5, unit_cost: 60, date: '', label: '', observation: '' },
        ];
        const withdrawals = [
            { parent_move_id: 'move-1', quantity: 3 },
            { parent_move_id: 'move-1', quantity: 2 },
            { parent_move_id: 'move-2', quantity: 1 },
        ];

        const result = calculateLotBalances(entries, withdrawals);

        expect(result[0].balance).toBe(5);
        expect(result[1].balance).toBe(4);
    });
});
