import type { AuditItem } from '../types/inventoryAudit.types';

interface InventoryAuditObservationInput {
  readonly code: string;
  readonly items: readonly AuditItem[];
  readonly responsibleName: string;
  readonly scopeConfig: {
    readonly name: string;
    readonly hasStages?: boolean;
    readonly responsibleId: string;
    readonly scopeType?: string;
    readonly supplierId?: string;
  };
}

export const buildInventoryAuditObservation = ({
  code,
  items,
  responsibleName,
  scopeConfig,
}: InventoryAuditObservationInput) => ({
  inventoryAudit: true,
  inventoryCode: code,
  status: 'completed',
  name: scopeConfig.name,
  hasStages: scopeConfig.hasStages,
  responsibleId: scopeConfig.responsibleId,
  scopeType: scopeConfig.scopeType,
  supplierId: scopeConfig.supplierId,
  responsibleName,
  items: items.map(
    ({
      productId,
      variationId,
      name,
      systemStock,
      physicalCount,
      assignedSupplier,
      countedAt,
    }) => ({
      productId,
      variationId,
      name,
      systemStock,
      physicalCount,
      assignedSupplier,
      countedAt,
    })
  ),
});
