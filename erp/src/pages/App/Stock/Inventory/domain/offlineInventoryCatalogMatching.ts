import { extractLabelIdentity, extractScannedCodes } from '@/pages/utils/barcodeScannerUtils';
import type {
  OfflineInventoryCatalog,
  OfflineInventoryCatalogRow,
  OfflineInventoryMatch,
} from '../types/offlineInventoryCatalog.types';

const canonicalVariation = (catalog: OfflineInventoryCatalog, initialId: string) => {
  let current = catalog.variations[initialId];
  const seen = new Set<string>();
  while (current?.merged_to_variation_id) {
    if (seen.has(String(current.id))) return null;
    seen.add(String(current.id));
    current = catalog.variations[String(current.merged_to_variation_id)];
  }
  return current && !current.deleted ? current : null;
};

export const resolveOfflineInventoryMatch = (
  catalog: OfflineInventoryCatalog,
  rawCode: string
): OfflineInventoryMatch | null => {
  const { labelId } = extractLabelIdentity(rawCode);
  const label = labelId ? catalog.labels[labelId] : undefined;
  const candidateIds = new Set<string>();
  const addVariation = (variationId?: unknown) => {
    if (!variationId) return;
    const canonical = canonicalVariation(catalog, String(variationId));
    if (canonical) candidateIds.add(String(canonical.id));
  };
  if (label) addVariation(label.variation_id);
  const codes = new Set(
    extractScannedCodes(rawCode)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  if (label?.sku) codes.add(String(label.sku).trim().toLowerCase());
  if (label?.barcode) codes.add(String(label.barcode).trim().toLowerCase());
  if (label?.product_id && !label.variation_id) {
    const productVariationIds = new Set(
      Object.values(catalog.variations)
        .filter((row) => String(row.product_id) === String(label.product_id) && !row.deleted)
        .map((row) => canonicalVariation(catalog, String(row.id)))
        .filter(Boolean)
        .map((row) => String(row!.id))
    );
    if (productVariationIds.size === 1) candidateIds.add([...productVariationIds][0]);
  }
  const labelsByVariation = new Map<string, OfflineInventoryCatalogRow[]>();
  for (const entry of Object.values(catalog.labels)) {
    if (!entry.variation_id) continue;
    const list = labelsByVariation.get(String(entry.variation_id)) || [];
    list.push(entry);
    labelsByVariation.set(String(entry.variation_id), list);
  }
  for (const variation of Object.values(catalog.variations)) {
    const product = catalog.products[String(variation.product_id)];
    if (
      !product ||
      ((product.item_type !== 'product' ||
        product.deleted ||
        product.deleted_at ||
        product.is_draft) &&
        !variation.merged_to_variation_id) ||
      (variation.deleted && !variation.merged_to_variation_id)
    )
      continue;
    const canonical = canonicalVariation(catalog, String(variation.id));
    if (!canonical) continue;
    const identifiers = [
      variation.id,
      variation.sku,
      product.code,
      product.id,
      ...(labelsByVariation.get(String(variation.id)) || []).flatMap((entry) => [
        entry.id,
        entry.sku,
        entry.barcode,
      ]),
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    if ([...codes].some((code) => identifiers.includes(code)))
      candidateIds.add(String(canonical.id));
  }
  if (candidateIds.size !== 1) return null;
  const variationId = [...candidateIds][0];
  const variation = catalog.variations[variationId];
  const product = variation && catalog.products[String(variation.product_id)];
  if (
    !variation ||
    !product ||
    product.item_type !== 'product' ||
    product.deleted ||
    product.deleted_at ||
    product.is_draft ||
    product.product_kind === 'salvado' ||
    product.product_kind === 'usado' ||
    variation.deleted
  )
    return null;
  const ids = [
    ...new Set(
      [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])]
        .filter(Boolean)
        .map(String)
    ),
  ];
  const names = ids
    .map((id) => {
      const supplier = catalog.suppliers[id];
      return supplier?.social_name || supplier?.full_name || supplier?.nickname || '';
    })
    .filter(Boolean);
  const matchedLabel =
    label ||
    (labelsByVariation.get(variationId) || []).find((entry) =>
      [...codes].some((code) =>
        [entry.sku, entry.barcode]
          .filter(Boolean)
          .some((value) => String(value).trim().toLowerCase() === code)
      )
    );
  return {
    productId: String(product.id),
    variationId,
    name: variation.name || product.name || product.description || 'Produto',
    sku: variation.sku || product.code || matchedLabel?.sku || '',
    code: product.code || '',
    barcode: matchedLabel?.barcode || '',
    systemStock: Number(variation.stock ?? product.stock ?? 0),
    unit: product.unit || 'UN',
    supplierIds: ids,
    supplierNames: names,
    assignedSupplier: names[0] || 'Sem fornecedor',
    isActive:
      product.active !== false &&
      variation.active !== false &&
      !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase()),
    labelStatus: matchedLabel?.status,
  };
};
