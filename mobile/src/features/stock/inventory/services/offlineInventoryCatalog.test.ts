import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../services/supabaseClient', () => ({ supabase: {} }));
vi.mock('../../../../services/offline/connectivityService', () => ({ connectivityService: { connected: true } }));
vi.mock('../../../../services/sqlite/inventoryCatalog', () => ({
  getLocalInventoryCatalogSnapshot: vi.fn(),
  saveLocalInventoryCatalogSnapshot: vi.fn(),
}));

import { resolveOfflineInventoryMatch, type OfflineInventoryCatalog } from './offlineInventoryCatalog';

const labelId = '11111111-1111-4111-8111-111111111111';
const legacyUnlinkedLabelId = '33333333-3333-4333-8333-333333333333';
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

describe('índice offline de inventário mobile', () => {
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
});
