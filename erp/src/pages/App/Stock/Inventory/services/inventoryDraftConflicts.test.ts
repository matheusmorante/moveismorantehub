import { describe, expect, it } from 'vitest';
import { findInventoryDraftConflicts } from './inventoryDraftConflicts';
import type { OfflineInventoryCatalog } from './offlineInventoryCatalog';

const catalog = { syncedAt: '2026-09-25T20:00:00Z', products: {}, labels: {}, suppliers: {}, cursors: {},
    variations: { A: { id: 'A', merged_to_variation_id: 'B' }, B: { id: 'B', merged_to_variation_id: 'C' },
        C: { id: 'C' } } } as OfflineInventoryCatalog;

describe('conflito entre draft e índice', () => {
    it('preserva a identidade antiga para revisão após merge em cadeia', () => {
        expect(findInventoryDraftConflicts(catalog, [{ variationId: 'A', physicalCount: 2 },
            { variationId: 'B', physicalCount: 1 }, { variationId: 'C', physicalCount: 3 }])).toEqual(['A', 'B']);
    });
});
