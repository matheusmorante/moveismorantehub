import type {
  OfflineInventoryCatalog,
  OfflineInventoryCatalogRow,
} from '../types/offlineInventoryCatalog.types';

interface OfflineInventoryCatalogProductVariationOption {
  id: string;
  name: string | undefined;
  sku: string;
  stock: number;
  active: boolean;
  status: string | undefined;
  mergedToVariationId: string | number | undefined;
  barcode: string;
}

interface OfflineInventoryCatalogProductOption {
  id: string | number | undefined;
  code: string;
  sku: string;
  name: string | undefined;
  title: string | undefined;
  description: string | undefined;
  unit: string;
  stock: number;
  active: boolean;
  deleted: false;
  itemType: 'product';
  mainSupplierId: string | number | undefined;
  supplierId: string | number | undefined;
  supplierIds: string[];
  variations: OfflineInventoryCatalogProductVariationOption[];
}

interface OfflineInventoryCatalogSupplierOption {
  id: string | number | undefined;
  fullName: string | undefined;
  tradeName: string | undefined;
  nickname: string | undefined;
  type: 'suppliers';
}

export const selectOfflineInventoryCatalogProducts = (
  catalog: OfflineInventoryCatalog
): OfflineInventoryCatalogProductOption[] => {
  const labelsByVariation = new Map<string, OfflineInventoryCatalogRow[]>();
  for (const entry of Object.values(catalog.labels)) {
    if (!entry.variation_id) continue;
    const key = String(entry.variation_id);
    labelsByVariation.set(key, [...(labelsByVariation.get(key) || []), entry]);
  }

  return Object.values(catalog.variations).flatMap((variation) => {
    if (variation.merged_to_variation_id || variation.deleted) return [];
    const product = catalog.products[String(variation.product_id)];
    if (
      !product ||
      product.item_type !== 'product' ||
      product.deleted ||
      product.deleted_at ||
      product.is_draft ||
      product.product_kind === 'salvado' ||
      product.product_kind === 'usado'
    )
      return [];

    const supplierIds = [
      ...new Set(
        [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])]
          .filter(Boolean)
          .map(String)
      ),
    ];
    const labels = labelsByVariation.get(String(variation.id)) || [];
    return [
      {
        id: product.id,
        code: product.code || '',
        sku: variation.sku || product.code || '',
        name: product.name || variation.name,
        title: product.name || variation.name,
        description: product.description || variation.name,
        unit: product.unit || 'UN',
        stock: Number(variation.stock ?? product.stock ?? 0),
        active:
          product.active !== false &&
          variation.active !== false &&
          !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase()),
        deleted: false,
        itemType: 'product',
        mainSupplierId: product.main_supplier_id,
        supplierId: product.supplier_id,
        supplierIds,
        variations: [
          {
            id: String(variation.id),
            name: variation.name || product.name,
            sku: variation.sku || '',
            stock: Number(variation.stock ?? 0),
            active: variation.active !== false,
            status: variation.status || undefined,
            mergedToVariationId: variation.merged_to_variation_id || undefined,
            barcode: labels.find((entry) => entry.barcode)?.barcode || '',
          },
        ],
      },
    ];
  });
};

export const selectOfflineInventoryCatalogSuppliers = (
  catalog: OfflineInventoryCatalog
): OfflineInventoryCatalogSupplierOption[] =>
  Object.values(catalog.suppliers)
    .filter((supplier) => !supplier.deleted)
    .map((supplier) => ({
      id: supplier.id,
      fullName: supplier.full_name,
      tradeName: supplier.social_name,
      nickname: supplier.nickname,
      type: 'suppliers',
    }));
