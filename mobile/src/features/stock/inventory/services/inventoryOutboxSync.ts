import { supabase } from '../../../../services/supabaseClient';
import { deleteLocalInventoryDraft } from '../../../../services/sqlite/inventoryDrafts';
import {
  deleteInventorySubmission,
  listInventorySubmissions,
  recordInventorySubmissionFailure,
} from '../../../../services/sqlite/inventoryOutbox';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { getOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { findInventoryDraftConflicts } from './inventoryDraftConflicts';
import {
  INVENTORY_FINALIZATION_RPC_TIMEOUT_ERROR,
  INVENTORY_FINALIZATION_RPC_TIMEOUT_MS,
} from './inventoryFinalizerValidation';
import type { AuditItem } from '../types/inventoryWorkflow.types';

export const syncPendingInventorySubmissions = async (
  activeUserId?: string | null
): Promise<number> => {
  const isOnline =
    connectivityService.connected &&
    (typeof navigator === 'undefined' || navigator.onLine !== false);
  if (!isOnline) return 0;

  let submissions = [];
  try {
    submissions = await listInventorySubmissions();
  } catch {
    return 0;
  }
  if (submissions.length === 0) return 0;

  let currentUserId = activeUserId ?? null;
  if (!currentUserId) {
    try {
      const auth = (supabase as any)?.auth;
      if (typeof auth?.getSession === 'function') {
        const { data } = await auth.getSession();
        currentUserId = data?.session?.user?.id || null;
      }
    } catch {}
  }

  let catalog = null;
  try {
    catalog = await getOfflineInventoryCatalog();
  } catch {}

  let syncedCount = 0;
  for (const submission of submissions) {
    if (!connectivityService.connected) break;

    // Isolamento multi-usuário: impede enviar submissão congelada por outro operador no mesmo aparelho
    const ownerId =
      submission.userId ||
      (typeof submission.observation?.responsibleId === 'string'
        ? submission.observation.responsibleId
        : null);
    if (ownerId && currentUserId && ownerId !== currentUserId) {
      continue;
    }

    try {
      // Verifica se alguma variação da submissão sofreu mesclagem/exclusão concorrente no catálogo
      if (catalog && Array.isArray(submission.observation?.items)) {
        const obsItems = (submission.observation.items as any[]).filter(
          (i) => i && i.variationId
        );
        if (obsItems.length > 0) {
          const conflicts = findInventoryDraftConflicts(catalog, obsItems as AuditItem[]);
          if (conflicts.length > 0) {
            await recordInventorySubmissionFailure(
              submission.auditId,
              new Error(`CONFLICT_VARIATION_CHANGED:${conflicts.length}`)
            ).catch(() => {});
            continue;
          }
        }
      }

      const response = await withTimeout(
        supabase.rpc(
          submission.contractVersion === 2
            ? 'finalize_inventory_transaction_v2'
            : 'finalize_inventory_transaction',
          {
            p_audit_id: submission.auditId,
            p_code: submission.code,
            p_observation: submission.observation,
            p_items: submission.items,
            p_responsible_name: submission.responsibleName,
          }
        ),
        INVENTORY_FINALIZATION_RPC_TIMEOUT_MS,
        null,
        'inventario:outbox-sync-rpc'
      );
      if (!response) throw new Error(INVENTORY_FINALIZATION_RPC_TIMEOUT_ERROR);
      const { data, error } = response;
      if (error) throw error;
      if (
        data?.auditId === submission.auditId &&
        ['processed', 'already_processed'].includes(data?.status)
      ) {
        await deleteLocalInventoryDraft(submission.auditId).catch(() => {});
        await deleteInventorySubmission(submission.auditId).catch(() => {});
        syncedCount++;
      } else {
        await recordInventorySubmissionFailure(
          submission.auditId,
          new Error(data?.status || 'UNEXPECTED_SERVER_RESPONSE')
        ).catch(() => {});
      }
    } catch (error) {
      await recordInventorySubmissionFailure(submission.auditId, error).catch(() => {});
    }
  }
  return syncedCount;
};
