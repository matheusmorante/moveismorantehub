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
    unit: string;
    sku?: string;
    code?: string;
    barcode?: string;
    isActive?: boolean;
    countedLabelIds?: string[];
}

export interface AuditDraftState {
    id?: string;
    code?: string;
    markerMoveId?: string;
    date?: string;
}

export type AuditWorkflowView = 'scope' | 'operation' | 'review';

export interface FinalizeAdjustmentItem extends AuditItem {
    reconciledExpected: number;
    difference: number;
}
