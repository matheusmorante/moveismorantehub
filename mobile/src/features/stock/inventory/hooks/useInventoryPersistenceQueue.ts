import { useRef, useCallback } from 'react';
import { useZodForm } from '../../../../hooks/useZodForm';
import { inventoryAuditDraftSchema } from '../../../../../../shared-utils/inventoryAuditFormSchemas';
import { z } from 'zod';

const mobileInventoryDraftSchema = inventoryAuditDraftSchema
  .omit({ date: true, updatedAt: true })
  .extend({ responsibleId: z.string().optional(), userId: z.string().min(1) });
import { saveLocalInventoryDraft } from '../../../../services/sqlite/inventoryDrafts';
import type { AuditItem, AuditDraftState } from '../types/inventoryWorkflow.types';

interface ScopeConfigSnapshot {
  name: string;
  hasStages: boolean;
  responsibleId: string;
  responsibleName?: string;
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
  const { validateAndRun: validateDraft } = useZodForm(mobileInventoryDraftSchema, {
    id: '',
    userId: '',
    code: '',
    name: '',
    hasStages: false,
    status: 'in_progress',
    items: [],
  });

  const persistToSQLite = useCallback(
    (itemsToPersist: AuditItem[], scopeOverride?: ScopeConfigSnapshot): Promise<void> => {
      const auditId = draftRef.current.id;
      const code = draftRef.current.code;
      if (!auditId || !code)
        return Promise.reject(new Error('Inventário local sem identificador.'));
      const savedScope = scopeOverride || scopeConfig;

      const write = saveQueueRef.current.then(async () => {
        const saved = await validateDraft(
          {
            id: auditId,
            userId: userProfileId || '',
            code,
            scopeType: savedScope?.scopeType,
            supplierId: savedScope?.supplierId,
            name: savedScope?.name || `Inventário #${code}`,
            responsibleId: savedScope?.responsibleId || userProfileId,
            responsibleName: savedScope?.responsibleName,
            hasStages: savedScope?.hasStages ?? false,
            status: 'in_progress',
            items: itemsToPersist.map((item) => ({ ...item })),
          },
          async (values) => {
            const items = values.items.map((item, index): AuditItem => ({
              ...itemsToPersist[index],
              ...item,
              physicalCount: item.physicalCount ?? itemsToPersist[index].physicalCount,
            }));
            await saveLocalInventoryDraft({ ...values, items });
            return true;
          }
        );
        if (!saved) throw new Error('Revise as quantidades e os dados do inventário local.');
      });
      saveQueueRef.current = write.then(
        () => {
          lastErrorRef.current = null;
        },
        (error) => {
          lastErrorRef.current = error;
          console.error('[SQLite] Falha ao persistir inventário:', error);
        }
      );
      return write;
    },
    [draftRef, scopeConfig, userProfileId, validateDraft]
  );

  return {
    persistToSQLite,
    flush: async () => {
      await saveQueueRef.current;
      if (lastErrorRef.current) throw lastErrorRef.current;
    },
  };
};
