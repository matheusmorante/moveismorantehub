import type { PersonStockOrigin } from './personStockOrigins';

export type ProductSupplierStockOrigin = PersonStockOrigin;
export type ProductStockKind = 'normal' | 'salvado' | 'usado';

/** Returns no selection for an empty or invalid kind, as the ERP product form does. */
export const getSelectedProductStockKind = (productKind?: unknown): ProductStockKind | undefined => {
  if (productKind === 'normal' || productKind === 'salvado' || productKind === 'usado') {
    return productKind;
  }
  return undefined;
};

/** Maps the product's canonical kind to the supplier stock origin used by ERP and mobile. */
export const getProductSupplierStockOrigin = (productKind?: unknown): ProductSupplierStockOrigin => {
  const selectedKind = getSelectedProductStockKind(productKind);
  if (selectedKind === 'salvado') return 'salvados';
  if (selectedKind === 'usado') return 'usados';
  return 'normal';
};

/** Suppliers without a configured origin are treated as conventional, matching the ERP. */
export const supplierProvidesStockOrigin = (
  stockOrigins: readonly string[] | null | undefined,
  requiredOrigin: ProductSupplierStockOrigin
): boolean => (stockOrigins ?? ['normal']).includes(requiredOrigin);

/** Salvados-only suppliers do not use product links or regular stock receipts. */
export const isSalvadosOnlySupplier = (
  stockOrigins: readonly string[] | null | undefined
): boolean => {
  const origins = stockOrigins ?? [];
  return origins.includes('salvados') && !origins.includes('normal');
};

/** Normalizes the supplier relation shape returned by PostgREST. */
export const getSupplierStockOriginsFromRelation = (supplierRelation: unknown): string[] | undefined => {
  const supplier = Array.isArray(supplierRelation) ? supplierRelation[0] : supplierRelation;
  if (!supplier || typeof supplier !== 'object') return undefined;
  const origins = (supplier as { stock_origins?: unknown }).stock_origins;
  return Array.isArray(origins)
    ? origins.filter((origin): origin is string => typeof origin === 'string')
    : undefined;
};
