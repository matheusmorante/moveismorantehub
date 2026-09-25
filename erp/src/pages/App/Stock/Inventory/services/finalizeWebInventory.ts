import { supabase } from '@/pages/utils/supabaseConfig';
import { deleteWebInventoryDraft } from './inventoryLocalDrafts';

interface Adjustment {
    productId: string;
    variationId?: string;
    name: string;
    physicalCount: number | null;
    reconciledExpected: number;
}

export const finalizeWebInventory = async (
    auditId: string,
    code: string,
    observation: Record<string, unknown>,
    adjustments: Adjustment[],
): Promise<void> => {
    if (adjustments.some(item => !item.variationId)) {
        throw new Error('Selecione a variação dos produtos com ajuste antes de concluir o inventário.');
    }
    const { data, error } = await supabase.rpc('finalize_inventory_transaction', {
        p_audit_id: auditId,
        p_code: code,
        p_observation: observation,
        p_items: adjustments.map(item => ({
            productId: item.productId,
            variationId: item.variationId || null,
            name: item.name,
            physicalCount: item.physicalCount,
            previousStock: item.reconciledExpected,
        })),
        p_responsible_name: String(observation.responsibleName || ''),
    });
    if (error) throw error;
    if (data?.auditId !== auditId || !['processed', 'already_processed'].includes(data?.status)) {
        throw new Error('O servidor não confirmou a conclusão do inventário.');
    }
    await deleteWebInventoryDraft(auditId);
};
