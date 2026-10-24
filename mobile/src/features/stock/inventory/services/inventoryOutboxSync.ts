import { supabase } from '../../../../services/supabaseClient';
import { deleteLocalInventoryDraft } from '../../../../services/sqlite/inventoryDrafts';
import {
  deleteInventorySubmission,
  listInventorySubmissions,
  recordInventorySubmissionFailure,
} from '../../../../services/sqlite/inventoryOutbox';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  buildInventorySubmissionClaimRpcParams,
  buildInventorySubmissionRpcParams,
  getInventoryFinalizationRpcName,
  isInventorySubmissionClaimAcknowledged,
} from '../../../../../../shared-utils/inventorySubmissionProtocol';
import { getOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { findInventoryDraftConflicts } from './inventoryDraftConflicts';
import {
  INVENTORY_FINALIZATION_RPC_TIMEOUT_ERROR,
  INVENTORY_FINALIZATION_RPC_TIMEOUT_MS,
} from './inventoryFinalizerValidation';
import type { AuditItem } from '../types/inventoryWorkflow.types';

export const syncPendingInventorySubmissions = async (
  _activeUserId?: string | null
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

  let currentUserId: string | null = null;
  try {
    const auth = (supabase as any)?.auth;
    if (typeof auth?.getSession === 'function') {
      const sessionResult = await withTimeout(
        auth.getSession(),
        10_000,
        null,
        'inventario:outbox-auth-session'
      );
      currentUserId = sessionResult?.data?.session?.user?.id || null;
    }
  } catch {}
  if (!currentUserId) return 0;

  let catalog = null;
  try {
    catalog = await getOfflineInventoryCatalog();
  } catch {}

  let syncedCount = 0;
  for (const submission of submissions) {
    if (!connectivityService.connected) break;

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
        (async () => {
          const claim = await supabase.rpc(
            'claim_inventory_audit_submission',
            buildInventorySubmissionClaimRpcParams(submission)
          );
          if (claim.error) throw claim.error;
          if (!isInventorySubmissionClaimAcknowledged(claim.data, submission.auditId)) {
            throw new Error('O servidor não confirmou a reserva desta submissão de inventário.');
          }
          if (claim.data.status === 'already_processed') {
            return { data: claim.data, error: null };
          }
          return supabase.rpc(
            getInventoryFinalizationRpcName(submission.contractVersion),
            buildInventorySubmissionRpcParams(submission)
          );
        })(),
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
