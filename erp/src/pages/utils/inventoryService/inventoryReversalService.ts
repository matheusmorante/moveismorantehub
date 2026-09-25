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

        if (existingMeta.source === 'inventory_audit' && (existingMeta.previousStock == null || !Number.isFinite(Number(existingMeta.previousStock)))) {
            const { data: markers, error: markerError } = await supabase
                .from(INVENTORY_TABLE_NAME)
                .select('date, observation')
                .eq('order_id', moveData.order_id)
                .ilike('label', 'Inventário #%')
                .limit(1);
            if (markerError) throw markerError;
            const marker = markers?.[0];
            if (!marker) throw new Error('Não foi possível localizar o snapshot original deste inventário para recompor o saldo.');
            try {
                const snapshot = JSON.parse(marker.observation || '{}');
                const item = Array.isArray(snapshot.items) ? snapshot.items.find((candidate: any) =>
                    String(candidate.productId) === String(move.productId)
                    && String(candidate.variationId || '') === String(move.variationId || '')
                ) : null;
                if (item && Number.isFinite(Number(item.systemStock))) {
                    const { data: interveningMoves, error: timelineError } = await supabase
                        .from(INVENTORY_TABLE_NAME)
                        .select('type, quantity, variation_id, observation, status, date')
                        .eq('product_id', move.productId)
                        .gte('date', marker.date)
                        .lte('date', moveData.date)
                        .order('date', { ascending: true });
                    if (timelineError) throw timelineError;
                    let delta = 0;
                    for (const intervening of interveningMoves || []) {
                        if (String(intervening.variation_id || '') !== String(move.variationId || '')) continue;
                        let meta: any = {};
                        try { meta = JSON.parse(intervening.observation || '{}'); } catch { /* legacy observation */ }
                        if (intervening.status === 'reversed' || intervening.status === 'cancelled' || meta.status === 'reversed' || meta.status === 'cancelled') continue;
                        if (intervening.type === 'entry') delta += Number(intervening.quantity || 0);
                        else if (intervening.type === 'exit') delta -= Number(intervening.quantity || 0);
                    }
                    existingMeta.previousStock = Number(item.systemStock) + delta;
                } else {
                    throw new Error('O snapshot original não contém o item necessário para recompor o saldo.');
                }
            } catch (snapshotError) {
                console.warn('[Inventory reversal] Could not derive the pre-audit stock baseline:', snapshotError);
                throw snapshotError;
            }
            if (existingMeta.previousStock == null || !Number.isFinite(Number(existingMeta.previousStock))) {
                throw new Error('Não foi possível determinar o saldo anterior do ajuste de inventário.');
            }
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
