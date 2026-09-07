import { describe, expect, it } from 'vitest';
import { calculateLotBalances } from './priceHistoryBalance';

describe('calculateLotBalances', () => {
    it('deduz retiradas vinculadas de cada lote', () => {
        const result = calculateLotBalances([
            { id: 'lot-1', product_id: 'p', type: 'entry', quantity: 10, unit_cost: 20, date: '', label: '', observation: '' },
        ], [
            { parent_move_id: 'lot-1', quantity: 3 },
            { parent_move_id: 'lot-1', quantity: 2 },
        ]);
        expect(result[0].balance).toBe(5);
    });
});
