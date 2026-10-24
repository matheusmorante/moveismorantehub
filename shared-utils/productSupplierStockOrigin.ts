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
