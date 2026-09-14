import { InventoryMoveEntry } from './priceHistory.types';

export interface WithdrawalRecord {
    readonly parent_move_id: string;
    readonly quantity: number;
}

/**
 * Calcula os saldos restantes de cada lote/entrada de estoque com base nos registros de saídas/retiradas vinculadas.
 * Função pura e imutável, defensiva contra valores nulos ou NaN.
 */
export function calculateLotBalances(
    entries: readonly InventoryMoveEntry[],
    withdrawals: readonly WithdrawalRecord[]
): InventoryMoveEntry[] {
    const usedByLot: Record<string, number> = {};

    for (const withdrawal of withdrawals) {
        if (!withdrawal || !withdrawal.parent_move_id) continue;
        const qty = Number(withdrawal.quantity);
        const safeQty = Number.isFinite(qty) ? qty : 0;
        usedByLot[withdrawal.parent_move_id] = (usedByLot[withdrawal.parent_move_id] || 0) + safeQty;
    }

    return entries.map(entry => {
        const entryQty = Number(entry.quantity);
        const safeEntryQty = Number.isFinite(entryQty) ? entryQty : 0;
        const used = usedByLot[entry.id] || 0;
        return {
            ...entry,
            balance: safeEntryQty - used
        };
    });
}
