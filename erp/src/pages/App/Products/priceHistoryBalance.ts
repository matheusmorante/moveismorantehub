import { InventoryMoveEntry } from './priceHistory.types';

export function calculateLotBalances(entries: InventoryMoveEntry[], withdrawals: Array<{ parent_move_id: string; quantity: number }>): InventoryMoveEntry[] {
    const usedByLot: Record<string, number> = {};
    withdrawals.forEach(withdrawal => {
        usedByLot[withdrawal.parent_move_id] = (usedByLot[withdrawal.parent_move_id] || 0) + Number(withdrawal.quantity);
    });
    return entries.map(entry => ({ ...entry, balance: Number(entry.quantity) - (usedByLot[entry.id] || 0) }));
}
