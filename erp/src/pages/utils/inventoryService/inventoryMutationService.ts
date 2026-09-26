import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { INVENTORY_TABLE_NAME, isEntryType, isExitType, isAdjustmentType } from './inventoryTypeRules';
import { mapInventoryMoveToDB, mapInventoryMoveFromDB } from './inventoryMapper';
import { prependMoveToState, removeMoveFromState, updateMoveInState } from './inventorySubscriptionState';
import { recalculateProductStockOnMove, revertProductStockFromMove } from './inventoryStockCalculator';
import { recalculateInventoryAuditBalance } from "@/pages/utils/inventoryAuditBalance";
import { mapFromDB as mapProductFromDB, updateProduct } from '@/pages/utils/productService';

export const saveInventoryMove = async (
    move: InventoryMove, 
    _currentProductStock: number = 0
): Promise<InventoryMove | undefined> => {
    try {
        const payload = mapInventoryMoveToDB(move);
        if (move.sourceReceiptId && move.sourceItemIndex !== undefined) {
            const { data: existingMove, error: existingError } = await supabase
                .from(INVENTORY_TABLE_NAME)
                .select('*')
                .eq('source_receipt_id', move.sourceReceiptId)
                .eq('source_item_index', move.sourceItemIndex)
                .maybeSingle();

            if (existingError) throw existingError;
            if (existingMove) return mapInventoryMoveFromDB(existingMove);
        }
        const { data, error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .insert([payload])
            .select();

        if (error) {
            const isDuplicateReceiptItem = move.sourceReceiptId
                && move.sourceItemIndex !== undefined
                && (error as { code?: string }).code === '23505';
            if (!isDuplicateReceiptItem) throw error;

            const { data: existingMove, error: existingError } = await supabase
                .from(INVENTORY_TABLE_NAME)
                .select('*')
                .eq('source_receipt_id', move.sourceReceiptId)
                .eq('source_item_index', move.sourceItemIndex)
                .single();
            if (existingError) throw existingError;
            return mapInventoryMoveFromDB(existingMove);
        }

        if (data?.[0]) {
            prependMoveToState(mapInventoryMoveFromDB(data[0]));
        }

        if (await recalculateInventoryAuditBalance(move.productId)) {
            return data?.[0] ? mapInventoryMoveFromDB(data[0]) : undefined;
        }

        await recalculateProductStockOnMove(move);

        return data?.[0] ? mapInventoryMoveFromDB(data[0]) : undefined;
    } catch (error) {
        console.error("Erro ao salvar lançamento de estoque: ", error);
        throw error;
    }
};

export const deleteInventoryMove = async (
    id: string, 
    _allowLinkedOrderMove = false,
    allowDraftAuditDelete = false
): Promise<void> => {
    try {
        const { data: moveData } = await supabase.from(INVENTORY_TABLE_NAME).select('*').eq('id', id).single();
        if (!moveData) return;

        const move = mapInventoryMoveFromDB(moveData);
        let isDraftAudit = false;
        try { 
            isDraftAudit = JSON.parse(move.observation || '{}').status === 'in_progress'; 
        } catch  { /* no-op: intencionalmente silencioso */ }

        if (!allowDraftAuditDelete || !isDraftAudit || !move.label?.startsWith('Inventário #') || move.productId) {
            throw new Error('Movimentações efetivadas não podem ser excluídas. Faça o estorno vinculado à operação original.');
        }

        const { error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        removeMoveFromState(id);

        if (await recalculateInventoryAuditBalance(move.productId)) return;

        // Reverter saldo do estoque do produto
        await revertProductStockFromMove(move);
    } catch (error) {
        console.error("Erro ao excluir/estornar lançamento de estoque: ", error);
        throw error;
    }
};

export const updateInventoryMove = async (
    id: string, 
    updates: Partial<InventoryMove>
): Promise<void> => {
    try {
        const { data: oldMove } = await supabase.from(INVENTORY_TABLE_NAME).select('*').eq('id', id).single();
        if (!oldMove) throw new Error("Move not found");

        const dbUpdates: any = {};
        if (updates.type !== undefined) {
            dbUpdates.type = isExitType(updates.type) ? 'exit' : isAdjustmentType(updates.type) ? 'adjustment' : 'entry';
        }
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.unitCost !== undefined) dbUpdates.unit_cost = updates.unitCost;
        if (updates.observation !== undefined) dbUpdates.observation = updates.observation;
        if (updates.label !== undefined) dbUpdates.label = updates.label;
        if (updates.date !== undefined) dbUpdates.date = updates.date;

        const { error } = await supabase
            .from(INVENTORY_TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        updateMoveInState(id, updates);

        // Se a quantidade ou tipo mudou, recalcular estoque do produto
        const oldQty = Number(oldMove.quantity || 0);
        const newQty = updates.quantity !== undefined ? Number(updates.quantity) : oldQty;
        const oldType = oldMove.type;
        const newType = updates.type || oldType;

        if (newQty !== oldQty || newType !== oldType) {
            const { data: p } = await supabase.from('products').select('*, product_variations(*)').eq('id', oldMove.product_id).single();
            if (!p) return;

            // Reverter efeito anterior
            let delta = 0;
            if (isEntryType(oldType)) delta -= oldQty;
            else if (isExitType(oldType)) delta += oldQty;
            else if (isAdjustmentType(oldType)) delta -= oldQty;

            // Aplicar novo efeito
            if (isEntryType(newType)) delta += newQty;
            else if (isExitType(newType)) delta -= newQty;
            else if (isAdjustmentType(newType)) delta += newQty;

            const product = mapProductFromDB(p);
            let newTotalStock = Number(product.stock || 0) + delta;
            const updatedVariations = product.variations ? [...product.variations] : [];

            if (oldMove.variation_id && updatedVariations.length > 0) {
                const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(oldMove.variation_id));
                if (vIdx !== -1) {
                    const vStock = Number(updatedVariations[vIdx].stock || 0) + delta;
                    updatedVariations[vIdx].stock = vStock;
                }
                newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
            }

            await updateProduct(oldMove.product_id, { 
                stock: newTotalStock,
                variations: updatedVariations.length > 0 ? updatedVariations : undefined
            });
        }
    } catch (error) {
        console.error("Erro ao atualizar lançamento de estoque:", error);
        throw error;
    }
};
