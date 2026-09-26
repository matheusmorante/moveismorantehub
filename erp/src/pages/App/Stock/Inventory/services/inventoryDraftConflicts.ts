import type { OfflineInventoryCatalog } from './offlineInventoryCatalog';

export const findInventoryDraftConflicts = (
    catalog: OfflineInventoryCatalog,
    items: ReadonlyArray<{ variationId?: string; physicalCount: number | null }>,
): string[] => {
    if (!catalog.syncedAt) return [];
    return [...new Set(items.filter(item => item.physicalCount !== null && item.variationId).flatMap(item => {
        const variation = catalog.variations[item.variationId!];
        return !variation || variation.deleted || variation.merged_to_variation_id ? [item.variationId!] : [];
    }))];
};
