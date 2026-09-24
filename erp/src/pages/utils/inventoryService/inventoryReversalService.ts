import { supabase } from '@/pages/utils/supabaseConfig';
import { INVENTORY_TABLE_NAME } from './inventoryTypeRules';
import { mapInventoryMoveFromDB } from './inventoryMapper';
import { updateMoveInState } from './inventorySubscriptionState';
import { recalculateInventoryAuditBalance } from "@/pages/utils/inventoryAuditBalance";
import { revertProductStockFromMove, reapplyProductStockFromMove } from './inventoryStockCalculator';

export const reverseInventoryMove = async (
    id: string, 
    reason: string = 'Estorno de movimentação', 
    allowLinkedOrderMove = false
): Promise<void> => {
    try {
        const { data: moveData } = await supabase.from(INVENTORY_TABLE_NAME).select('*').eq('id', id).single();
        if (!moveData) return;

        const move = mapInventoryMoveFromDB(moveData);
        if (move.status === 'reversed' || move.status === 'cancelled') {
            return;
        }

        if (!allowLinkedOrderMove && move.relatedEntityId && (
            move.relatedEntityType === 'sales_order' || move.relatedEntityType === 'purchase_order'
        )) {
            throw new Error('Movimentações vinculadas a pedidos não podem ser estornadas manualmente. O estorno ocorre pelo status do pedido.');
        }

        const reversedAt = new Date().toISOString();
        let existingMeta: any = {};
        try {
            existingMeta = JSON.parse(moveData.observation || '{}');
            if (typeof existingMeta !== 'object' || existingMeta === null) {
                existingMeta = { note: moveData.observation };
            }
        } catch {
            existingMeta = { note: moveData.observation };
        }

        const updatedObservation = JSON.stringify({
            ...existingMeta,
            status: 'reversed',
            reversalReason: reason,
            reversedAt: reversedAt
        });

        const basePayload: any = {
            reason: reason,
            observation: updatedObservation
        };

        let { error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .update({ ...basePayload, status: 'reversed' })
            .eq('id', id);

        if (error && ((error as any).code === 'PGRST204' || (error as any).message?.includes('status'))) {
            const retry = await supabase
                .from(INVENTORY_TABLE_NAME)
                .update(basePayload)
                .eq('id', id);
            error = retry.error;
        }

        if (error) throw error;

        // Atualizar estado em memória
        updateMoveInState(id, {
            status: 'reversed',
            reversalReason: reason,
            reversedAt: reversedAt
        });

        if (await recalculateInventoryAuditBalance(move.productId)) return;

        // Recompor o saldo de estoque do produto/variação (inverso da movimentação)
        await revertProductStockFromMove(move);
    } catch (error) {
        console.error("Erro ao estornar lançamento de estoque: ", error);
        throw error;
    }
};

export const cancelInventoryMove = async (id: string, reason?: string): Promise<void> => {
    return reverseInventoryMove(id, reason || 'Estorno manual');
};

export const cancelInventoryMovesByRelatedEntity = async (
    relatedEntityId: string, 
    relatedEntityType: string,
    reason: string = `Cancelamento de ${relatedEntityType} #${relatedEntityId}`
): Promise<void> => {
    try {
        const searchPattern = `%${relatedEntityId}%`;
        const { data: moves, error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .select('id, type, observation, reason, label, order_id')
            .or(`order_id.eq.${relatedEntityId},observation.ilike.${searchPattern},label.ilike.${searchPattern}`);

        if (error) throw error;

        if (moves && moves.length > 0) {
            for (const move of moves) {
                const parsedMove = mapInventoryMoveFromDB(move);
                if (parsedMove.status !== 'reversed' && parsedMove.status !== 'cancelled') {
                    await reverseInventoryMove(move.id, reason, true);
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao estornar movimentações vinculadas a ${relatedEntityType} ${relatedEntityId}:`, error);
        throw error;
    }
};

export const deleteInventoryMovesByRelatedEntity = async (
    relatedEntityId: string, 
    relatedEntityType: string,
    reason?: string
): Promise<void> => {
    return cancelInventoryMovesByRelatedEntity(relatedEntityId, relatedEntityType, reason);
};

export const unreverseInventoryMove = async (
    id: string, 
    allowLinkedOrderMove = false
): Promise<void> => {
    try {
        const { data: moveData } = await supabase.from(INVENTORY_TABLE_NAME).select('*').eq('id', id).single();
        if (!moveData) return;

        const move = mapInventoryMoveFromDB(moveData);
        if (move.status !== 'reversed' && move.status !== 'cancelled') {
            return;
        }

        if (!allowLinkedOrderMove && move.relatedEntityId && (
            move.relatedEntityType === 'sales_order' || move.relatedEntityType === 'purchase_order'
        )) {
            throw new Error('Movimentações vinculadas a pedidos não podem ser reativadas manualmente. A reativação ocorre pelo pedido ou recebimento.');
        }

        let existingMeta: any = {};
        try {
            existingMeta = JSON.parse(moveData.observation || '{}');
            if (typeof existingMeta !== 'object' || existingMeta === null) {
                existingMeta = { note: moveData.observation };
            }
        } catch {
            existingMeta = { note: moveData.observation };
        }

        const { reversalReason: _r, reversedAt: _ra, ...cleanMeta } = existingMeta;
        const updatedObservation = JSON.stringify({
            ...cleanMeta,
            status: 'effective'
        });

        const basePayload: any = {
            reason: null,
            observation: updatedObservation
        };

        let { error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .update({ ...basePayload, status: 'effective' })
            .eq('id', id);

        if (error && ((error as any).code === 'PGRST204' || (error as any).message?.includes('status'))) {
            const retry = await supabase
                .from(INVENTORY_TABLE_NAME)
                .update(basePayload)
                .eq('id', id);
            error = retry.error;
        }

        if (error) throw error;

        // Atualizar estado em memória
        updateMoveInState(id, {
            status: 'effective',
            reversalReason: undefined,
            reversedAt: undefined
        });

        if (await recalculateInventoryAuditBalance(move.productId)) return;

        // Recompor o saldo de estoque do produto/variação (reativando a movimentação original)
        await reapplyProductStockFromMove(move);
    } catch (error) {
        console.error("Erro ao desfazer estorno do lançamento de estoque: ", error);
        throw error;
    }
};

export const unreverseInventoryMovesByRelatedEntity = async (
    relatedEntityId: string, 
    relatedEntityType: string
): Promise<void> => {
    try {
        const searchPattern = `%${relatedEntityId}%`;
        const { data: moves, error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .select('id, observation, reason, status')
            .or(`order_id.eq.${relatedEntityId},observation.ilike.${searchPattern},label.ilike.${searchPattern}`);

        if (error) throw error;

        if (moves && moves.length > 0) {
            for (const move of moves) {
                const parsedMove = mapInventoryMoveFromDB(move);
                if (parsedMove.status === 'reversed' || parsedMove.status === 'cancelled') {
                    await unreverseInventoryMove(move.id, true);
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao desfazer estorno de movimentações vinculadas a ${relatedEntityType} ${relatedEntityId}:`, error);
        throw error;
    }
};
