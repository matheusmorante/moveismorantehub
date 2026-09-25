import type InventoryMove from "@/pages/types/inventoryMove.type";
import type { InventorySnapshotItem } from "../types/inventoryAudit.types";

export const readSnapshot = (move: InventoryMove) => {
    try {
        const data = JSON.parse(move.observation || '{}') as Record<string, unknown>;
        if (data.inventoryAudit && Array.isArray(data.items)) {
            return {
                items: data.items as InventorySnapshotItem[],
                status: (data.status || 'completed') as 'in_progress' | 'completed',
                inventoryCode: (data.inventoryCode || move.label?.replace('Inventário #', '') || '') as string,
                name: data.name as string | undefined,
                hasStages: data.hasStages as boolean | undefined,
                responsibleId: data.responsibleId as string | undefined,
                responsibleName: data.responsibleName as string | undefined,
            };
        }
    } catch {
        // Ignora erro de parse em observações não-JSON
    }
    return null;
};
