import { fetchInventorySessionDetails } from '../../../../services/stockService';
import { getLocalInventoryDraft } from '../../../../services/sqlite/inventoryDrafts';
import type { AuditItem, AuditDraftState } from '../types/inventoryWorkflow.types';
import type { InventorySession } from '../../types/stock.types';

export interface InitializedInventoryData {
  draft: AuditDraftState;
  items: AuditItem[];
  scopeConfig: {
    name: string;
    hasStages: boolean;
    responsibleId: string;
    responsibleName?: string;
    scopeType?: string;
    supplierId?: string;
  };
}

export const generateInventoryUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  try {
    const { v4 } = require('uuid');
    if (v4) return v4();
  } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
export const createInventoryItemId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Restaura uma sessão existente:
 * 1. Tenta carregar do SQLite local primeiro (Zero Egress).
 * 2. Se não existir no cache local, busca no Supabase como fallback.
 */
export const restoreInventorySession = async (
  initialSession: InventorySession,
  userProfileId?: string
): Promise<InitializedInventoryData | null> => {
  // 1. Tenta carregar do SQLite local primeiro
  const localDraft = await getLocalInventoryDraft(initialSession.id, userProfileId);
  if (localDraft) {
    return {
      draft: {
        id: localDraft.id,
        code: localDraft.code,
        markerMoveId: initialSession.id,
        date: localDraft.updatedAt,
      },
      items: localDraft.items,
      scopeConfig: {
        name: localDraft.name,
        hasStages: localDraft.hasStages,
        responsibleId: localDraft.responsibleId || userProfileId || '',
        responsibleName: localDraft.responsibleName,
        scopeType: localDraft.scopeType || 'custom',
        supplierId: localDraft.supplierId,
      },
    };
  }

  // 2. Fallback remoto
  const details = await fetchInventorySessionDetails(initialSession.id, userProfileId);
  const code = initialSession.inventoryCode || initialSession.id.split('-')[0];

  const restoredItems: AuditItem[] = (details?.items || []).map((it: any) => ({
    id: createInventoryItemId(),
    key: `${it.productId}-${it.variationId || 'main'}`,
    productId: it.productId,
    variationId: it.variationId,
    name: it.name,
    supplierNames: it.assignedSupplier || 'Fábrica não informada',
    assignedSupplier: it.assignedSupplier || 'Sem fornecedor',
    systemStock: it.systemStock || 0,
    physicalCount: it.physicalCount !== undefined ? it.physicalCount : null,
    countedAt: it.countedAt,
    unit: it.unit || 'UN',
    sku: it.sku || it.code || '',
    code: it.code || '',
    barcode: it.barcode || '',
  }));

  return {
    draft: {
      id: initialSession.id,
      code,
      markerMoveId: initialSession.id,
      date: initialSession.created_at,
    },
    items: restoredItems,
    scopeConfig: {
      name: details?.name || `Inventário #${code}`,
      hasStages: Boolean(details?.hasStages),
      responsibleId: details?.responsibleId || userProfileId || '',
      responsibleName: details?.responsibleName,
      scopeType: details?.scopeType || 'custom',
      supplierId: details?.supplierId,
    },
  };
};
