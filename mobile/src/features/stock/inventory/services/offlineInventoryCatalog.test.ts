import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../services/supabaseClient', () => ({ supabase: {} }));
vi.mock('../../../../services/offline/connectivityService', () => ({
  connectivityService: { connected: true },
}));
vi.mock('../../../../services/sqlite/inventoryCatalog', () => ({
  getLocalInventoryCatalogSnapshot: vi.fn(),
  saveLocalInventoryCatalogSnapshot: vi.fn(),
}));

import { resolveOfflineInventoryMatch, type OfflineInventoryCatalog } from './offlineInventoryCatalog';
import { buildScopeProductsFromCatalog } from './catalog/offlineInventoryCatalogMatcher';
import { OFFLINE_INVENTORY_CATALOG_FORMAT_VERSION } from './catalog/offlineInventoryCatalogTypes';

const labelId = '11111111-1111-4111-8111-111111111111';
const legacyUnlinkedLabelId = '33333333-3333-4333-8333-333333333333';
const catalog: OfflineInventoryCatalog = {
  formatVersion: OFFLINE_INVENTORY_CATALOG_FORMAT_VERSION,
  products: {
    'product-old': { id: 'product-old', item_type: 'product', deleted: true, active: false },
    'product-current': {
      id: 'product-current',
      item_type: 'product',
      name: 'Produto inativo',
      active: false,
      main_supplier_id: 'supplier-1',
    },
  },
  variations: {
    'variation-old': {
      id: 'variation-old',
      product_id: 'product-old',
      sku: 'SKU-ANTIGO',
      merged_to_variation_id: 'variation-current',
    },
    'variation-current': {
      id: 'variation-current',
      product_id: 'product-current',
      name: 'Variação canônica',
      sku: 'SKU-ATUAL',
      active: true,
      stock: 4,
    },
  },
  labels: {
    [labelId]: {
      id: labelId,
      product_id: 'product-old',
      variation_id: 'variation-old',
      sku: 'SKU-ANTIGO',
      status: 'archived',
    },
    [legacyUnlinkedLabelId]: {
      id: legacyUnlinkedLabelId,
      product_id: 'product-old',
      variation_id: null,
      sku: 'SKU-ANTIGO',
      status: 'archived',
    },
  },
  suppliers: { 'supplier-1': { id: 'supplier-1', full_name: 'Fornecedor 1' } },
  cursors: {},
  syncedAt: '2026-09-25T12:00:00.000Z',
};

describe('índice offline de inventário mobile', () => {
  it('resolve UUID de etiqueta antiga para variação mesclada e preserva item inativo', () => {
    const result = resolveOfflineInventoryMatch(catalog, labelId);

    expect(result).toMatchObject({
      productId: 'product-current',
      variationId: 'variation-current',
      name: 'Variação canônica',
      sku: 'SKU-ATUAL',
      isActive: false,
      supplierNames: ['Fornecedor 1'],
    });
  });

  it('também resolve SKU antigo pelo alias canônico e ignora código desconhecido', () => {
    expect(resolveOfflineInventoryMatch(catalog, 'SKU-ANTIGO')?.variationId).toBe(
      'variation-current'
    );
    expect(resolveOfflineInventoryMatch(catalog, 'SKU-DESCONHECIDO')).toBeNull();
  });

  it('resolve etiqueta antiga sem variation_id quando o produto antigo tinha uma única variação canônica', () => {
    expect(resolveOfflineInventoryMatch(catalog, legacyUnlinkedLabelId)?.variationId).toBe(
      'variation-current'
    );
  });

  it('resolve cadeia A -> B -> C e nunca seleciona aliases como itens operacionais', () => {
    const chained: OfflineInventoryCatalog = {
      ...catalog,
      variations: {
        ...catalog.variations,
        'variation-current': {
          ...catalog.variations['variation-current'],
          merged_to_variation_id: 'variation-final',
        },
        'variation-final': {
          id: 'variation-final',
          product_id: 'product-current',
          name: 'Variação final',
          sku: 'SKU-FINAL',
          active: true,
        },
      },
    };

    expect(resolveOfflineInventoryMatch(chained, labelId)?.variationId).toBe('variation-final');
    expect(resolveOfflineInventoryMatch(chained, 'SKU-ANTIGO')?.variationId).toBe(
      'variation-final'
    );
  });

  it('rejeita cadeia cíclica de merges sem criar contagem em alias antigo', () => {
    const cyclic: OfflineInventoryCatalog = {
      ...catalog,
      variations: {
        ...catalog.variations,
        'variation-current': {
          ...catalog.variations['variation-current'],
          merged_to_variation_id: 'variation-old',
        },
      },
    };
    expect(resolveOfflineInventoryMatch(cyclic, labelId)).toBeNull();
  });

  it('exclui do inventário e do scanner o produto ligado somente a fornecedor Salvados', () => {
    const salvadosOnly: OfflineInventoryCatalog = {
      ...catalog,
      suppliers: {
        ...catalog.suppliers,
        'supplier-salvados': {
          id: 'supplier-salvados',
          full_name: 'Multiloja Salvados',
          stock_origins: ['salvados'],
        },
      },
      products: {
        ...catalog.products,
        'product-current': {
          ...catalog.products['product-current'],
          main_supplier_id: 'supplier-salvados',
          supplier_id: null,
          supplier_ids: [],
        },
      },
    };

    expect(buildScopeProductsFromCatalog(salvadosOnly)).toEqual([]);
    expect(resolveOfflineInventoryMatch(salvadosOnly, 'SKU-ATUAL')).toBeNull();
  });

  it('mantém item de fornecedor misto e projeta somente fornecedores convencionais', () => {
    const mixedOrigins: OfflineInventoryCatalog = {
      ...catalog,
      suppliers: {
        ...catalog.suppliers,
        'supplier-salvados': {
          id: 'supplier-salvados',
          full_name: 'Multiloja Salvados',
          stock_origins: ['salvados'],
        },
      },
      products: {
        ...catalog.products,
        'product-current': {
          ...catalog.products['product-current'],
          main_supplier_id: 'supplier-salvados',
          supplier_id: 'supplier-1',
          supplier_ids: ['supplier-salvados', 'supplier-1'],
        },
      },
    };

    expect(buildScopeProductsFromCatalog(mixedOrigins)).toMatchObject([
      {
        id: 'product-current',
        main_supplier_id: undefined,
        supplier_id: 'supplier-1',
        supplier_ids: ['supplier-1'],
      },
    ]);
    expect(resolveOfflineInventoryMatch(mixedOrigins, 'SKU-ATUAL')).toMatchObject({
      supplierIds: ['supplier-1'],
      supplierNames: ['Fornecedor 1'],
      assignedSupplier: 'Fornecedor 1',
    });
  });
});
