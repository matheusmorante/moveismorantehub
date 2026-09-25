import { useRef, useCallback } from 'react';
import { 
    saveLocalInventoryDraft, 
    deleteLocalInventoryDraft 
} from '../../../../services/sqlite/inventoryDrafts';
import type { AuditItem, AuditDraftState } from '../types/inventoryWorkflow.types';

interface ScopeConfigSnapshot {
    name: string;
    hasStages: boolean;
    responsibleId: string;
    scopeType?: string;
}

/**
 * Hook dedicado a sequenciar gravações no SQLite local através de uma Promise Queue.
 * Garante concorrência segura, atomicidade e zero descompasso com a UI.
 */
export const useInventoryPersistenceQueue = (
    draftRef: React.MutableRefObject<AuditDraftState>,
    scopeConfig: ScopeConfigSnapshot | null,
    userProfileId?: string
) => {
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

    const persistToSQLite = useCallback((itemsToPersist: AuditItem[]) => {
        const auditId = draftRef.current.id;
        const code = draftRef.current.code;
        if (!auditId || !code) return;

        const hasAnyCount = itemsToPersist.some(i => i.physicalCount !== null);

        saveQueueRef.current = saveQueueRef.current.then(async () => {
            if (!hasAnyCount) {
                await deleteLocalInventoryDraft(auditId).catch(() => {});
                return;
            }

            await saveLocalInventoryDraft({
                id: auditId,
                code,
                scopeType: scopeConfig?.scopeType,
                name: scopeConfig?.name || `Inventário #${code}`,
                responsibleId: scopeConfig?.responsibleId || userProfileId,
                hasStages: scopeConfig?.hasStages ?? false,
                status: 'in_progress',
                items: itemsToPersist,
            });
        }).catch(err => {
            console.warn('[SQLite] Erro ao persistir contagem no SQLite:', err);
        });
    }, [draftRef, scopeConfig, userProfileId]);

    return {
        persistToSQLite,
        saveQueueRef,
    };
};
