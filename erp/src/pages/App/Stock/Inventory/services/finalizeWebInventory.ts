import { supabase } from '@/pages/utils/supabaseConfig';
import { deleteWebInventoryDraft, getWebInventoryDraft, saveWebInventoryDraft } from './inventoryLocalDrafts';
import { deleteInventorySubmission, freezeInventorySubmission, getInventorySubmission, recordInventorySubmissionFailure } from './inventoryOutbox';
import { getOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { findInventoryDraftConflicts } from './inventoryDraftConflicts';

interface Adjustment {
    productId: string;
    variationId?: string;
    name: string;
    physicalCount: number | null;
    reconciledExpected: number;
    countedAt?: string;
}

export const finalizeWebInventory = async (
    auditId: string,
    code: string,
    observation: Record<string, unknown>,
    adjustments: Adjustment[],
): Promise<void> => {
    const existing = await getInventorySubmission(auditId);
    if (!existing && adjustments.some(item => !item.variationId)) {
        throw new Error('Selecione a variação dos produtos com ajuste antes de concluir o inventário.');
    }
    if (!existing) {
        const conflicts = findInventoryDraftConflicts(await getOfflineInventoryCatalog(), adjustments);
        if (conflicts.length) throw new Error(`${conflicts.length} variação(ões) da contagem foram mescladas ou removidas. Revise os itens antes de concluir.`);
    }
    const useV2 = import.meta.env.VITE_INVENTORY_RPC_V2 === 'true';
    if (!existing && useV2 && adjustments.some(item => !item.countedAt)) {
        throw new Error('Alguns itens não têm horário de contagem. Refaça essas contagens antes de concluir.');
    }
    const submission = existing || await freezeInventorySubmission({
        contractVersion: useV2 ? 2 : 1, auditId, code, observation,
        items: (useV2 ? adjustments : adjustments.filter(item => item.physicalCount !== item.reconciledExpected)).map(item => ({
            productId: item.productId,
            variationId: item.variationId || null,
            name: item.name,
            physicalCount: item.physicalCount,
            previousStock: item.reconciledExpected,
            ...(useV2 ? { countedAt: item.countedAt } : {}),
        })),
        responsibleName: String(observation.responsibleName || ''),
    });
    try {
        const { data, error } = await supabase.rpc(submission.contractVersion === 2 ? 'finalize_inventory_transaction_v2' : 'finalize_inventory_transaction', {
            p_audit_id: submission.auditId,
            p_code: submission.code,
            p_observation: submission.observation,
            p_items: submission.items,
            p_responsible_name: submission.responsibleName,
        });
        if (error) throw error;
        if (data?.auditId !== auditId || !['processed', 'already_processed'].includes(data?.status)) {
            throw new Error('O servidor não confirmou a conclusão do inventário.');
        }
    } catch (error) {
        await recordInventorySubmissionFailure(auditId, error);
        const draft = await getWebInventoryDraft(auditId);
        if (draft) await saveWebInventoryDraft({ ...draft, status: 'pending_sync', updatedAt: new Date().toISOString() });
        throw error;
    }
    await deleteWebInventoryDraft(auditId);
    await deleteInventorySubmission(auditId);
};
