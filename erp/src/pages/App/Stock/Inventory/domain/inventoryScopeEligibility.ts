import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';

const getProductSupplierIds = (product: Product): string[] =>
  [
    ...new Set(
      [product.mainSupplierId, product.supplierId, ...(product.supplierIds || [])]
        .filter(Boolean)
        .map(String)
    ),
  ];

const normalizeSupplierLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const isInventorySupplierEligible = (supplier: Person): boolean => {
  const labels = [supplier.tradeName, supplier.fullName, supplier.nickname]
    .filter(Boolean)
    .map((label) => normalizeSupplierLabel(String(label)));
  const isSalvadosEUsadosSupplier = labels.some(
    (label) => /\bsalvados?\b/.test(label) && /\busados?\b/.test(label)
  );

  return !isSalvadosEUsadosSupplier &&
    (supplier.stockOrigins == null || supplier.stockOrigins.includes('normal'));
};

export const getInventorySupplierIds = (
  product: Product,
  suppliers: readonly Person[]
): string[] =>
  getProductSupplierIds(product).filter((supplierId) => {
    const supplier = suppliers.find((person) => String(person.id) === supplierId);
    return !supplier || isInventorySupplierEligible(supplier);
  });

export const isInventoryProductEligible = (
  product: Product,
  suppliers: readonly Person[]
): boolean => {
  if (product.productKind === 'salvado' || product.productKind === 'usado') return false;

  const supplierIds = getProductSupplierIds(product);
  return supplierIds.length === 0 || getInventorySupplierIds(product, suppliers).length > 0;
};
