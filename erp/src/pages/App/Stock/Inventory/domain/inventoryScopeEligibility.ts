import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import { isStockInventorySupplierEligible } from '../../../../../../../shared-utils/inventorySupplierEligibility';

const getProductSupplierIds = (product: Product): string[] =>
  [
    ...new Set(
      [product.mainSupplierId, product.supplierId, ...(product.supplierIds || [])]
        .filter(Boolean)
        .map(String)
    ),
  ];

export const isInventorySupplierEligible = (supplier: Person): boolean =>
  isStockInventorySupplierEligible(supplier);

export const getInventorySupplierIds = (
  product: Product,
  suppliers: readonly Person[]
): string[] =>
  getProductSupplierIds(product).filter((supplierId) => {
    const supplier = suppliers.find((person) => String(person.id) === supplierId);
    return Boolean(supplier && isInventorySupplierEligible(supplier));
  });

export const isInventoryProductEligible = (
  product: Product,
  suppliers: readonly Person[]
): boolean => {
  if (product.productKind === 'salvado' || product.productKind === 'usado') return false;

  const supplierIds = getProductSupplierIds(product);
  return supplierIds.length === 0 || getInventorySupplierIds(product, suppliers).length > 0;
};
