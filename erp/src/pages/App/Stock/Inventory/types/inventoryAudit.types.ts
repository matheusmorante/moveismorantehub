export interface InventorySnapshotItem {
    readonly productId: string;
    readonly variationId?: string;
    readonly name: string;
    readonly systemStock: number;
    readonly physicalCount: number | null;
    readonly assignedSupplier?: string;
    readonly sku?: string;
    readonly code?: string;
    readonly barcode?: string;
    readonly isActive?: boolean;
}

export interface InventoryAuditSession {
    readonly id: string;
    readonly inventoryCode: string;
    readonly name?: string;
    readonly date: string;
    readonly status: 'in_progress' | 'pending' | 'completed';
    readonly hasStages?: boolean;
    readonly productsCount: number;
    readonly adjustmentsCount: number;
    readonly reversedCount: number;
    readonly items: readonly InventorySnapshotItem[];
    readonly responsibleId?: string;
    readonly responsibleName?: string;
    readonly markerMoveId?: string;
}

export interface AuditItem {
    id: string;
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    assignedSupplier: string;
    systemStock: number;
    physicalCount: number | null;
    countedAt?: string;
    unit: string;
    sku?: string;
    code?: string;
    barcode?: string;
    isActive?: boolean;
}
