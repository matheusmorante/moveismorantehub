export type InventoryScopeType = 'full' | 'general' | 'supplier' | 'product' | 'custom';

export interface InventoryScopeSnapshotItem {
  productId: string;
  variationId?: string;
  name: string;
  supplierNames: string;
  assignedSupplier: string;
  systemStock: number;
  unit: string;
  sku?: string;
  code?: string;
  barcode?: string;
  isActive?: boolean;
}

export interface ScopeConfiguration {
  type: InventoryScopeType;
  name: string;
  productId?: string;
  supplierId?: string;
  responsibleId: string;
  customProductIds?: string[];
  hasStages?: boolean;
  itemsSnapshot: InventoryScopeSnapshotItem[];
}
