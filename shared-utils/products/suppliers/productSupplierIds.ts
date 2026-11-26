/**
 * Resolves the supplier IDs shown by the product form, preserving ERP order
 * and compatibility fallback while removing duplicate/empty legacy values.
 */
export const normalizeProductSupplierIds = (
  supplierIds?: readonly unknown[] | null,
  mainSupplierId?: unknown,
  supplierId?: unknown
): string[] => {
  const source = supplierIds?.length ? supplierIds : [mainSupplierId || supplierId];
  return Array.from(new Set(source.filter(Boolean).map(String)));
};
