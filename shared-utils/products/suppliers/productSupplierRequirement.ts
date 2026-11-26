export interface ProductSupplierRequirementInput {
  merchandiseOrigin?: unknown;
  isOwnProduction?: unknown;
  mainSupplierId?: unknown;
  supplierId?: unknown;
  fiscal?: unknown;
}

export const PRODUCT_SUPPLIER_REQUIRED_MESSAGE = 'Selecione um fornecedor.';

export const hasRequiredProductSupplier = (
  product: ProductSupplierRequirementInput
): boolean => {
  const fiscalOrigin =
    product.fiscal && typeof product.fiscal === 'object'
      ? (product.fiscal as { merchandiseOrigin?: unknown }).merchandiseOrigin
      : undefined;
  const isOwnProduction =
    product.merchandiseOrigin === 'own_production' ||
    product.isOwnProduction === true ||
    fiscalOrigin === 'own_production';

  return isOwnProduction || Boolean(product.mainSupplierId || product.supplierId);
};
