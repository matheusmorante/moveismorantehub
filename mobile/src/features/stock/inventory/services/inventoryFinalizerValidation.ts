import { getOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { findInventoryDraftConflicts } from './inventoryDraftConflicts';
import type {
  AuditItem,
  FinalizeAdjustmentItem,
} from '../types/inventoryWorkflow.types';

export const INVENTORY_FINALIZATION_RPC_TIMEOUT_MS = 30_000;
export const INVENTORY_FINALIZATION_RPC_TIMEOUT_ERROR =
  'A confirmação da finalização do inventário excedeu o tempo limite.';

export interface InventoryFinalizerScopeConfig {
  name: string;
  hasStages: boolean;
  responsibleId: string;
  responsibleName?: string;
  scopeType?: string;
  supplierId?: string;
}

export interface InventoryFinalizationValidationResult {
  valid: boolean;
  alertTitle?: string;
  alertMessage?: string;
}

export const validateInventoryBeforeFinalization = async ({
  items,
  itemsWithAdjustment,
  scopeConfig,
  useV2,
}: {
  items: AuditItem[];
  itemsWithAdjustment: FinalizeAdjustmentItem[];
  scopeConfig: InventoryFinalizerScopeConfig;
  useV2: boolean;
}): Promise<InventoryFinalizationValidationResult> => {
  const uncountedCount = items.filter((i) => i.physicalCount === null).length;
  if (scopeConfig.hasStages && uncountedCount > 0) {
    return {
      valid: false,
      alertTitle: 'Etapas pendentes',
      alertMessage: 'Todos os produtos devem ser contados antes de concluir o inventário por etapas.',
    };
  }

  if (!items.some((i) => i.physicalCount !== null)) {
    return {
      valid: false,
      alertTitle: 'Nenhuma contagem',
      alertMessage: 'É necessário realizar pelo menos uma contagem para finalizar o inventário.',
    };
  }

  if (itemsWithAdjustment.some((item) => !item.variationId)) {
    return {
      valid: false,
      alertTitle: 'Variação pendente',
      alertMessage: 'Selecione a variação dos produtos com ajuste antes de concluir o inventário.',
    };
  }

  if (
    useV2 &&
    items.filter((item) => item.physicalCount !== null).some((item) => !item.countedAt)
  ) {
    return {
      valid: false,
      alertTitle: 'Horário da contagem ausente',
      alertMessage:
        'Alguns itens foram contados antes da atualização. Refaça essas contagens para concluir com segurança.',
    };
  }

  const conflicts = findInventoryDraftConflicts(await getOfflineInventoryCatalog(), items);
  if (conflicts.length) {
    return {
      valid: false,
      alertTitle: 'Conflito no inventário',
      alertMessage: `${conflicts.length} variação(ões) da contagem foram mescladas ou removidas. Revise os itens antes de concluir.`,
    };
  }

  return { valid: true };
};

export const buildInventorySubmissionDraft = ({
  auditId,
  code,
  items,
  itemsWithAdjustment,
  scopeConfig,
  userProfile,
  useV2,
}: {
  auditId: string;
  code: string;
  items: AuditItem[];
  itemsWithAdjustment: FinalizeAdjustmentItem[];
  scopeConfig: InventoryFinalizerScopeConfig;
  userProfile: { id: string; full_name?: string; fullName?: string } | null;
  useV2: boolean;
}) => {
  const responsibleName =
    scopeConfig.responsibleName || userProfile?.fullName || userProfile?.full_name || 'Usuário';
  const auditObservation = {
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
  };

  const payloadItems = (
    useV2
      ? itemsWithAdjustment
      : itemsWithAdjustment.filter((item) => item.physicalCount !== item.reconciledExpected)
  ).map((item) => ({
    productId: item.productId,
    variationId: item.variationId || null,
    name: item.name,
    physicalCount: item.physicalCount,
    previousStock: item.reconciledExpected,
    ...(useV2 ? { countedAt: item.countedAt } : {}),
  }));

  return {
    contractVersion: (useV2 ? 2 : 1) as 1 | 2,
    auditId,
    code,
    observation: auditObservation,
    items: payloadItems,
    responsibleName,
    userId: userProfile?.id || scopeConfig.responsibleId || undefined,
  };
};
