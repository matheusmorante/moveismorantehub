export interface ProductMetadataSource {
  opportunityId?: string | null;
  opportunity_id?: string | null;
  opportunityName?: string | null;
  opportunity?: { name?: string | null } | null;
  mainSupplierId?: string | null;
  supplierId?: string | null;
  main_supplier_id?: string | null;
  supplier_id?: string | null;
  supplierIds?: readonly string[] | null;
  supplier_ids?: readonly string[] | null;
  supplierName?: string | null;
  supplier_name?: string | null;
  supplier?: { name?: string | null } | string | null;
}

export interface ProductNameMaps {
  opportunities: Record<string, string>;
  suppliers: Record<string, string>;
}

export const emptyProductNameMaps: ProductNameMaps = { opportunities: {}, suppliers: {} };

const supplierIdsFor = (product: ProductMetadataSource): string[] => [...new Set([
  product.mainSupplierId, product.supplierId, product.main_supplier_id, product.supplier_id,
  ...(product.supplierIds || product.supplier_ids || []),
].filter((id): id is string => Boolean(id)))];

export function collectProductMetadataIds(products: readonly ProductMetadataSource[]) {
  return {
    opportunityIds: [...new Set(products.map((product) => product.opportunity_id || product.opportunityId)
      .filter((id): id is string => Boolean(id)))].sort(),
    supplierIds: [...new Set(products.flatMap(supplierIdsFor))].sort(),
  };
}

export function resolveProductMetadata(
  product: ProductMetadataSource,
  maps: ProductNameMaps,
  sortSupplierIds = false,
) {
  const opportunityId = product.opportunity_id || product.opportunityId;
  const ids = supplierIdsFor(product);
  if (sortSupplierIds) ids.sort();
  const names = ids.map((id) => maps.suppliers[id]).filter(Boolean);
  const fallback = product.supplierName || product.supplier_name ||
    (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name);
  return {
    oppName: (opportunityId && maps.opportunities[opportunityId]) ||
      product.opportunityName || product.opportunity?.name || null,
    supplierNames: [...new Set(names.length ? names : fallback ? [fallback] : [])],
  };
}
