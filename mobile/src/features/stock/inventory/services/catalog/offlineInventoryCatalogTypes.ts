export type CatalogRow = Record<string, any>;

export interface OfflineInventoryCatalog {
  formatVersion?: 2;
  products: Record<string, CatalogRow>;
  variations: Record<string, CatalogRow>;
  labels: Record<string, CatalogRow>;
  suppliers: Record<string, CatalogRow>;
  cursors: Record<string, string>;
  syncedAt: string | null;
  deletionCursor?: number;
}

export interface OfflineInventoryMatch {
  productId: string;
  variationId: string;
  name: string;
  sku: string;
  code: string;
  barcode: string;
  systemStock: number;
  unit: string;
  supplierIds: string[];
  supplierNames: string[];
  assignedSupplier: string;
  isActive: boolean;
  labelStatus?: string;
}

export const emptyCatalog = (): OfflineInventoryCatalog => ({
  products: {},
  variations: {},
  labels: {},
  suppliers: {},
  cursors: {},
  syncedAt: null,
  deletionCursor: 0,
});

export const compactRows = (
  rows: Record<string, CatalogRow>,
  keys: readonly string[]
): Record<string, CatalogRow> =>
  Object.fromEntries(
    Object.entries(rows).map(([id, row]) => [
      id,
      Object.fromEntries(
        keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]])
      ),
    ])
  );

export const maxTimestamp = (rows: CatalogRow[], previous?: string) =>
  rows.reduce((max, row) => {
    const value = String(row.updated_at || '');
    return value > max ? value : max;
  }, previous || '');

export const compactCatalogSnapshot = (next: OfflineInventoryCatalog): OfflineInventoryCatalog => ({
  ...next,
  formatVersion: 2,
  products: compactRows(next.products, [
    'id',
    'name',
    'code',
    'unit',
    'active',
    'deleted',
    'deleted_at',
    'is_draft',
    'item_type',
    'product_kind',
    'supplier_id',
    'main_supplier_id',
    'supplier_ids',
    'updated_at',
  ]),
  variations: compactRows(next.variations, [
    'id',
    'product_id',
    'name',
    'sku',
    'stock',
    'active',
    'status',
    'merged_to_variation_id',
    'deleted',
    'updated_at',
  ]),
  labels: compactRows(next.labels, [
    'id',
    'product_id',
    'variation_id',
    'sku',
    'barcode',
    'status',
    'updated_at',
  ]),
  suppliers: compactRows(next.suppliers, [
    'id',
    'person_type',
    'full_name',
    'social_name',
    'nickname',
    'active',
    'deleted',
    'updated_at',
  ]),
});
