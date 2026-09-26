import { useRef, useCallback } from 'react';
import { 
    saveLocalInventoryDraft,
} from '../../../../services/sqlite/inventoryDrafts';
import type { AuditItem, AuditDraftState } from '../types/inventoryWorkflow.types';

interface ScopeConfigSnapshot {
    name: string;
    hasStages: boolean;
    responsibleId: string;
    scopeType?: string;
    supplierId?: string;
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
    const lastErrorRef = useRef<unknown>(null);

    const persistToSQLite = useCallback((itemsToPersist: AuditItem[], scopeOverride?: ScopeConfigSnapshot): Promise<void> => {
        const auditId = draftRef.current.id;
        const code = draftRef.current.code;
        if (!auditId || !code) return Promise.reject(new Error('Inventário local sem identificador.'));
        const savedScope = scopeOverride || scopeConfig;

        const write = saveQueueRef.current.then(async () => {
            await saveLocalInventoryDraft({
                id: auditId,
                code,
                scopeType: savedScope?.scopeType,
                supplierId: savedScope?.supplierId,
                name: savedScope?.name || `Inventário #${code}`,
                responsibleId: savedScope?.responsibleId || userProfileId,
                hasStages: savedScope?.hasStages ?? false,
                status: 'in_progress',
                items: itemsToPersist,
            });
        });
        saveQueueRef.current = write.then(() => { lastErrorRef.current = null; }, error => {
            lastErrorRef.current = error;
            console.error('[SQLite] Falha ao persistir inventário:', error);
        });
        return write;
    }, [draftRef, scopeConfig, userProfileId]);

    return {
        persistToSQLite,
        flush: async () => {
            await saveQueueRef.current;
            if (lastErrorRef.current) throw lastErrorRef.current;
        },
    };
};
