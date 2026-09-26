import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

import { resolveOfflineInventoryMatch, type OfflineInventoryCatalog } from './offlineInventoryCatalog';

const labelId = '22222222-2222-4222-8222-222222222222';
const legacyUnlinkedLabelId = '44444444-4444-4444-8444-444444444444';
const catalog: OfflineInventoryCatalog = {
    products: {
        'product-old': { id: 'product-old', item_type: 'product', deleted: true, active: false },
        'product-current': { id: 'product-current', item_type: 'product', name: 'Produto inativo', active: false, main_supplier_id: 'supplier-1' },
    },
    variations: {
        'variation-old': { id: 'variation-old', product_id: 'product-old', sku: 'SKU-ANTIGO', merged_to_variation_id: 'variation-current' },
        'variation-current': { id: 'variation-current', product_id: 'product-current', name: 'Variação canônica', sku: 'SKU-ATUAL', active: true, stock: 4 },
    },
    labels: {
        [labelId]: { id: labelId, product_id: 'product-old', variation_id: 'variation-old', sku: 'SKU-ANTIGO', status: 'archived' },
        [legacyUnlinkedLabelId]: { id: legacyUnlinkedLabelId, product_id: 'product-old', variation_id: null, sku: 'SKU-ANTIGO', status: 'archived' },
    },
    suppliers: { 'supplier-1': { id: 'supplier-1', full_name: 'Fornecedor 1' } },
    cursors: {}, syncedAt: '2026-09-25T12:00:00.000Z',
};

describe('índice offline de inventário web', () => {
    it('resolve UUID de etiqueta antiga para variação mesclada e preserva item inativo', () => {
        const result = resolveOfflineInventoryMatch(catalog, labelId);

        expect(result).toMatchObject({
            productId: 'product-current', variationId: 'variation-current',
            name: 'Variação canônica', sku: 'SKU-ATUAL', isActive: false,
            supplierNames: ['Fornecedor 1'],
        });
    });

    it('também resolve SKU antigo pelo alias canônico e ignora código desconhecido', () => {
        expect(resolveOfflineInventoryMatch(catalog, 'SKU-ANTIGO')?.variationId).toBe('variation-current');
        expect(resolveOfflineInventoryMatch(catalog, 'SKU-DESCONHECIDO')).toBeNull();
    });

    it('resolve etiqueta antiga sem variation_id quando o produto antigo tinha uma única variação canônica', () => {
        expect(resolveOfflineInventoryMatch(catalog, legacyUnlinkedLabelId)?.variationId).toBe('variation-current');
    });

    it('resolve A -> B -> C usando uma etiqueta antiga', () => {
        const chained: OfflineInventoryCatalog = {
            ...catalog,
            variations: {
                ...catalog.variations,
                'variation-current': { ...catalog.variations['variation-current'], merged_to_variation_id: 'variation-final' },
                'variation-final': { id: 'variation-final', product_id: 'product-current', name: 'Variação final', sku: 'SKU-FINAL', active: true },
            },
        };
        expect(resolveOfflineInventoryMatch(chained, labelId)?.variationId).toBe('variation-final');
        expect(resolveOfflineInventoryMatch(chained, 'SKU-ANTIGO')?.variationId).toBe('variation-final');
    });

    it('rejeita cadeia cíclica de merges', () => {
        const cyclic: OfflineInventoryCatalog = {
            ...catalog,
            variations: {
                ...catalog.variations,
                'variation-current': { ...catalog.variations['variation-current'], merged_to_variation_id: 'variation-old' },
            },
        };
        expect(resolveOfflineInventoryMatch(cyclic, labelId)).toBeNull();
    });
});
