import type { AuditItem } from '../types/inventoryAudit.types';

type InventoryAuditDraftMetadata = {
  id?: string;
  code?: string;
  date?: string;
};

type InventoryAuditDraftScope = {
  name: string;
  responsibleId: string;
  responsibleName?: string;
  hasStages?: boolean;
  scopeType?: string;
  supplierId?: string;
};

export const buildInventoryAuditDraftSnapshot = (
  draft: InventoryAuditDraftMetadata,
  scope: InventoryAuditDraftScope | null,
  nextItems: AuditItem[],
  scannedLabelIds: ReadonlySet<string>,
) => {
  if (!draft.id || !draft.code || !scope) return;

  return {
    id: draft.id,
    code: draft.code,
    date: draft.date || new Date().toISOString(),
    name: scope.name,
    responsibleId: scope.responsibleId,
    responsibleName: scope.responsibleName,
    hasStages: Boolean(scope.hasStages),
    scopeType: scope.scopeType,
    supplierId: scope.supplierId,
    status: 'in_progress' as const,
    items: nextItems.map((item) => ({ ...item })),
    scannedLabelIds: [...scannedLabelIds],
    updatedAt: new Date().toISOString(),
  };
};
