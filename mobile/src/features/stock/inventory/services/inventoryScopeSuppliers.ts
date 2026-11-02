import type { ScopeProduct, ScopeSupplier } from '../hooks/useInventoryScopeBuilder';

export const getInventoryScopeSupplierNames = (
  product: ScopeProduct,
  suppliers: readonly ScopeSupplier[]
) => {
  const ids = [
    ...new Set(
      [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])]
        .filter(Boolean)
        .map(String)
    ),
  ];
  const names = ids
    .map((id) => suppliers.find((supplier) => String(supplier.id) === id)?.full_name)
    .filter(Boolean);
  return (names as string[]).join(' / ') || 'Fábrica não informada';
};

export const getAssignedInventoryScopeSupplier = (
  product: ScopeProduct,
  suppliers: readonly ScopeSupplier[]
) => {
  const assignedSupplierId = [
    product.main_supplier_id,
    product.supplier_id,
    ...(product.supplier_ids || []),
  ].find(Boolean);
  return (
    (assignedSupplierId &&
      suppliers.find((supplier) => String(supplier.id) === String(assignedSupplierId))?.full_name) ||
    'Sem fornecedor'
  );
};
