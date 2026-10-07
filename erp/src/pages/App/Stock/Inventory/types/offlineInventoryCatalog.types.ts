export interface OfflineInventoryCatalogRow {
  [column: string]: unknown;
  id?: string | number;
  name?: string;
  description?: string;
  code?: string;
  unit?: string;
  active?: boolean;
  deleted?: boolean;
  deleted_at?: string;
  is_draft?: boolean;
  item_type?: string;
  product_kind?: string;
  supplier_id?: string | number;
  main_supplier_id?: string | number;
  supplier_ids?: Array<string | number>;
  product_id?: string | number;
  variation_id?: string | number;
  sku?: string;
  barcode?: string;
  stock?: number | string;
  status?: string;
  merged_to_variation_id?: string | number;
  updated_at?: string;
  person_type?: string;
  full_name?: string;
  social_name?: string;
  nickname?: string;
  sequence_id?: number | string;
  entity_type?: string;
  entity_id?: string | number;
}

export interface OfflineInventoryCatalog {
  formatVersion?: 2;
  products: Record<string, OfflineInventoryCatalogRow>;
  variations: Record<string, OfflineInventoryCatalogRow>;
  labels: Record<string, OfflineInventoryCatalogRow>;
  suppliers: Record<string, OfflineInventoryCatalogRow>;
  cursors: Record<string, string>;
  syncedAt: string | null;
  deletionCursor?: number;
}

export interface OfflineInventoryMatch {
  productId: string;
  variationId: string;
  name: string;
  sku: string;
  code: string;
  barcode: string;
  systemStock: number;
  unit: string;
  supplierIds: string[];
  supplierNames: string[];
  assignedSupplier: string;
  isActive: boolean;
  labelStatus?: string;
}
