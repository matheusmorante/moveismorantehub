import type Product from '@/pages/types/product.type';
import type {
  AuditItem,
  InventorySnapshotItem,
} from '../types/inventoryAudit.types';
import type {
  InventoryScopeSnapshotItem,
  InventoryScopeType,
} from '../types/inventoryScope.types';

export const restoreInventoryAuditItems = (
  items: readonly InventorySnapshotItem[],
  allProducts: readonly Product[],
  getSupplierNames: (product: Product) => string
): AuditItem[] =>
  items.map((source) => {
    const product = allProducts.find((item) => String(item.id) === String(source.productId));
    return {
      id: crypto.randomUUID(),
      key: `${source.productId}-${source.variationId || 'main'}`,
      productId: source.productId,
      variationId: source.variationId,
      name: source.name,
      supplierNames: product ? getSupplierNames(product) : 'Fábrica não informada',
      assignedSupplier: source.assignedSupplier || 'Sem fornecedor',
      systemStock: source.systemStock,
      physicalCount: source.physicalCount,
      supplierStageStarted: source.supplierStageStarted,
      supplierStageReset: source.supplierStageReset,
      scannedLabelIds: source.scannedLabelIds,
      unit: product?.unit || 'UN',
      countedAt: (source as AuditItem).countedAt,
      sku: source.sku || product?.sku || product?.code || '',
      code: source.code || product?.code || '',
      barcode: source.barcode || product?.barcode || '',
    } as AuditItem;
  });

export const createInventoryAuditItemsFromScope = (
  items: readonly InventoryScopeSnapshotItem[],
  scopeType: InventoryScopeType
): AuditItem[] => {
  const productStageStartedAt = scopeType === 'product' ? new Date().toISOString() : undefined;
  return items.map((snapshot) => ({
    id: crypto.randomUUID(),
    key: `${snapshot.productId}-${snapshot.variationId || 'main'}`,
    productId: snapshot.productId,
    variationId: snapshot.variationId,
    name: snapshot.name,
    supplierNames: snapshot.supplierNames,
    assignedSupplier: snapshot.assignedSupplier,
    systemStock: snapshot.systemStock,
    physicalCount: productStageStartedAt ? 0 : null,
    countedAt: productStageStartedAt,
    unit: snapshot.unit,
    sku: snapshot.sku,
    code: snapshot.code,
    barcode: snapshot.barcode,
    isActive: snapshot.isActive,
  }));
};
