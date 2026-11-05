import type {
  ScopeConfiguration,
  ScopeProduct,
  ScopeSupplier,
} from '../hooks/useInventoryScopeBuilder';
import {
  getAssignedInventoryScopeSupplier,
  getInventoryScopeSupplierNames,
} from './inventoryScopeSuppliers';

export const createInventoryScopeItemSnapshot = (
  product: ScopeProduct,
  suppliers: readonly ScopeSupplier[]
): ScopeConfiguration['itemsSnapshot'][number] => {
  const supplierNames = getInventoryScopeSupplierNames(product, suppliers);
  const assignedSupplier = getAssignedInventoryScopeSupplier(product, suppliers);

  return {
    productId: String(product.id),
    variationId: product.variation_id ? String(product.variation_id) : undefined,
    name: product.name || product.description || 'Produto',
    supplierNames,
    assignedSupplier,
    systemStock: Number(product.stock ?? 0),
    unit: product.unit || 'UN',
    sku: product.sku || product.code || '',
    code: product.code || '',
    barcode: product.barcode || '',
    isActive: product.active !== false,
  };
};
