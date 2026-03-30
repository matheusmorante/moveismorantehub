import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from "../types/inventoryMove.type";
import { updateProduct } from '@/pages/utils/productService';

const TABLE_NAME = "inventory_moves";

export const subscribeToInventoryMoves = (callback: (moves: InventoryMove[]) => void) => {
    let currentMoves: InventoryMove[] = [];

    supabase.from(TABLE_NAME)
        .select('*')
        .order('date', { ascending: false })
        .then(({ data, error }: { data: any, error: any }) => {
            if (data && !error) {
                currentMoves = data.map(mapFromDB);
                callback(currentMoves);
            } else if (error) {
                console.error("Erro ao buscar lançamentos iniciais:", error);
                callback([]);
            }
        });

    const channel = supabase.channel('inventory_moves_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload: any) => {
            if (payload.eventType === 'INSERT') {
                const newMove = mapFromDB(payload.new);
                currentMoves = [newMove, ...currentMoves].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                callback(currentMoves);
            } else if (payload.eventType === 'UPDATE') {
                const updatedMove = mapFromDB(payload.new);
                currentMoves = currentMoves.map(m => m.id === updatedMove.id ? updatedMove : m);
                callback(currentMoves);
            } else if (payload.eventType === 'DELETE') {
                currentMoves = currentMoves.filter(m => m.id !== String(payload.old.id));
                callback(currentMoves);
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const saveInventoryMove = async (move: InventoryMove, currentProductStock: number): Promise<void> => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert([mapToDB(move)]);

        if (error) throw error;

        // Fetch latest product data to handle variations correctly
        const { data: p } = await supabase.from('products').select('*').eq('id', move.productId).single();
        if (!p) return;

        let newTotalStock = Number(p.stock || 0);
        let updatedVariations = p.variations ? [...p.variations] : [];

        if (move.variationId && updatedVariations.length > 0) {
            const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
            if (vIdx !== -1) {
                let vStock = Number(updatedVariations[vIdx].stock || 0);
                if (move.type === 'entry') vStock += move.quantity;
                else if (move.type === 'withdrawal') vStock -= move.quantity;
                else if (move.type === 'balance') vStock = move.quantity;
                
                updatedVariations[vIdx].stock = vStock;
            }
            // If it has variations, total stock is usually sum of variations
            newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
        } else {
            if (move.type === 'entry') newTotalStock += move.quantity;
            else if (move.type === 'withdrawal') newTotalStock -= move.quantity;
            else if (move.type === 'balance') newTotalStock = move.quantity;
        }

        await updateProduct(move.productId, { 
            stock: newTotalStock,
            variations: updatedVariations.length > 0 ? updatedVariations : undefined
        });
    } catch (error) {
        console.error("Erro ao salvar lançamento de estoque: ", error);
        throw error;
    }
};

export const deleteInventoryMove = async (id: string): Promise<void> => {
    try {
        const { data: move } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!move) return;

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Revert stock
        const { data: p } = await supabase.from('products').select('*').eq('id', move.product_id).single();
        if (!p) return;

        let newTotalStock = Number(p.stock || 0);
        let updatedVariations = p.variations ? [...p.variations] : [];

        if (move.variation_id && updatedVariations.length > 0) {
            const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variation_id));
            if (vIdx !== -1) {
                let vStock = Number(updatedVariations[vIdx].stock || 0);
                if (move.type === 'entry') vStock -= move.quantity;
                else if (move.type === 'withdrawal') vStock += move.quantity;
                updatedVariations[vIdx].stock = vStock;
            }
            newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
        } else {
            if (move.type === 'entry') newTotalStock -= move.quantity;
            else if (move.type === 'withdrawal') newTotalStock += move.quantity;
        }

        await updateProduct(move.product_id, { 
            stock: newTotalStock,
            variations: updatedVariations.length > 0 ? updatedVariations : undefined
        });
    } catch (error) {
        console.error("Erro ao deletar lançamento de estoque: ", error);
        throw error;
    }
};

export const updateInventoryMove = async (id: string, updates: Partial<InventoryMove>): Promise<void> => {
    try {
        const { data: oldMove } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!oldMove) throw new Error("Move not found");

        const dbUpdates: any = {};
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.unitCost !== undefined) dbUpdates.unit_cost = updates.unitCost;
        if (updates.observation !== undefined) dbUpdates.observation = updates.observation;
        if (updates.label !== undefined) dbUpdates.label = updates.label;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.parentMoveId !== undefined) dbUpdates.parent_move_id = updates.parentMoveId;
        if (updates.relatedEntityId !== undefined) dbUpdates.related_entity_id = updates.relatedEntityId;
        if (updates.relatedEntityType !== undefined) dbUpdates.related_entity_type = updates.relatedEntityType;

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // If quantity changed, update product stock
        if (updates.quantity !== undefined && Number(updates.quantity) !== Number(oldMove.quantity)) {
            const { data: p } = await supabase.from('products').select('*').eq('id', oldMove.product_id).single();
            if (!p) return;

            const diff = Number(updates.quantity) - Number(oldMove.quantity);
            let newTotalStock = Number(p.stock || 0);
            let updatedVariations = p.variations ? [...p.variations] : [];

            if (oldMove.variation_id && updatedVariations.length > 0) {
                const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(oldMove.variation_id));
                if (vIdx !== -1) {
                    let vStock = Number(updatedVariations[vIdx].stock || 0);
                    if (oldMove.type === 'entry') vStock += diff;
                    else if (oldMove.type === 'withdrawal') vStock -= diff;
                    else if (oldMove.type === 'balance') vStock = Number(updates.quantity);
                    
                    updatedVariations[vIdx].stock = vStock;
                }
                newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
            } else {
                if (oldMove.type === 'entry') newTotalStock += diff;
                else if (oldMove.type === 'withdrawal') newTotalStock -= diff;
                else if (oldMove.type === 'balance') newTotalStock = Number(updates.quantity);
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

export const cancelInventoryMovesByRelatedEntity = async (relatedEntityId: string, relatedEntityType: string): Promise<void> => {
    try {
        const { data: moves, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('related_entity_id', relatedEntityId)
            .eq('related_entity_type', relatedEntityType)
            .eq('status', 'active');

        if (error) throw error;
        if (!moves || moves.length === 0) return;

        for (const move of moves) {
            // Update status to cancelled
            const { error: updateError } = await supabase
                .from(TABLE_NAME)
                .update({ status: 'cancelled' })
                .eq('id', move.id);

            if (updateError) throw updateError;

            // Revert stock impact
            const { data: p } = await supabase.from('products').select('*').eq('id', move.product_id).single();
            if (!p) continue;

            let newTotalStock = Number(p.stock || 0);
            let updatedVariations = p.variations ? [...p.variations] : [];

            if (move.variation_id && updatedVariations.length > 0) {
                const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variation_id));
                if (vIdx !== -1) {
                    let vStock = Number(updatedVariations[vIdx].stock || 0);
                    // Reversion of entry = withdrawal, reversion of withdrawal = entry
                    if (move.type === 'entry') vStock -= Number(move.quantity);
                    else if (move.type === 'withdrawal') vStock += Number(move.quantity);
                    updatedVariations[vIdx].stock = vStock;
                }
                newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
            } else {
                if (move.type === 'entry') newTotalStock -= Number(move.quantity);
                else if (move.type === 'withdrawal') newTotalStock += Number(move.quantity);
            }

            await updateProduct(move.product_id, { 
                stock: newTotalStock,
                variations: updatedVariations.length > 0 ? updatedVariations : undefined
            });
        }
    } catch (error) {
        console.error(`Erro ao cancelar movimentações para ${relatedEntityType} ${relatedEntityId}:`, error);
        throw error;
    }
};

export const deleteInventoryMovesByRelatedEntity = async (relatedEntityId: string, relatedEntityType: string): Promise<void> => {
    try {
        const { data: moves, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('related_entity_id', relatedEntityId)
            .eq('related_entity_type', relatedEntityType);

        if (error) throw error;
        if (!moves || moves.length === 0) return;

        for (const move of moves) {
            // Revert stock impact IF active
            if (move.status === 'active' || !move.status) {
                const { data: p } = await supabase.from('products').select('*').eq('id', move.product_id).single();
                if (p) {
                    let newTotalStock = Number(p.stock || 0);
                    let updatedVariations = p.variations ? [...p.variations] : [];

                    if (move.variation_id && updatedVariations.length > 0) {
                        const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variation_id));
                        if (vIdx !== -1) {
                            let vStock = Number(updatedVariations[vIdx].stock || 0);
                            if (move.type === 'entry') vStock -= Number(move.quantity);
                            else if (move.type === 'withdrawal') vStock += Number(move.quantity);
                            updatedVariations[vIdx].stock = vStock;
                        }
                        newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
                    } else {
                        if (move.type === 'entry') newTotalStock -= Number(move.quantity);
                        else if (move.type === 'withdrawal') newTotalStock += Number(move.quantity);
                    }

                    await updateProduct(move.product_id, { 
                        stock: newTotalStock,
                        variations: updatedVariations.length > 0 ? updatedVariations : undefined
                    });
                }
            }

            // Permanently delete the move
            const { error: deleteError } = await supabase
                .from(TABLE_NAME)
                .delete()
                .eq('id', move.id);

            if (deleteError) throw deleteError;
        }
    } catch (error) {
        console.error(`Erro ao deletar permanentemente movimentações para ${relatedEntityType} ${relatedEntityId}:`, error);
        throw error;
    }
};

export const getInventoryMoveById = async (id: string): Promise<InventoryMove | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ? mapFromDB(data) : null;
    } catch (error) {
        console.error("Erro ao buscar lançamento de estoque:", error);
        return null;
    }
};

/**
 * Fetches entry lots for a product/variation that still have positive balance (FIFO).
 */
export const getAvailableLots = async (productId: string, variationId?: string): Promise<(InventoryMove & { balance: number })[]> => {
    try {
        // 1. Get all entries
        let query = supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('product_id', productId)
            .eq('type', 'entry')
            .order('date', { ascending: true }); // Important: FIFO

        if (variationId) query = query.eq('variation_id', variationId);
        else query = query.is('variation_id', null);

        const { data: entries, error: entryError } = await query;
        if (entryError) throw entryError;

        // 2. Get all withdrawals linked to lots
        let withdrawalQuery = supabase
            .from(TABLE_NAME)
            .select('parent_move_id, quantity')
            .eq('type', 'withdrawal')
            .neq('parent_move_id', null);
        
        const { data: withdrawals, error: withdrawalError } = await withdrawalQuery;
        if (withdrawalError) throw withdrawalError;

        // 3. Calculate balance per entry
        const usedByLot: Record<string, number> = {};
        withdrawals?.forEach((w: any) => {
            usedByLot[w.parent_move_id] = (usedByLot[w.parent_move_id] || 0) + Number(w.quantity);
        });

        const availableLots = (entries || [])
            .map((e: any) => {
                const move = mapFromDB(e);
                const used = usedByLot[e.id] || 0;
                return { ...move, balance: move.quantity - used };
            })
            .filter((lot: any) => lot.balance > 0);

        return availableLots;
    } catch (error) {
        console.error("Erro ao buscar lotes disponíveis:", error);
        return [];
    }
};

const mapToDB = (move: InventoryMove) => ({
    product_id: move.productId,
    variation_id: move.variationId,
    product_description: move.productDescription,
    type: move.type,
    quantity: move.quantity,
    date: move.date,
    label: move.label,
    unit_cost: move.unitCost,
    parent_move_id: move.parentMoveId,
    related_entity_id: move.relatedEntityId,
    related_entity_type: move.relatedEntityType,
    observation: move.observation,
    status: move.status || 'active'
});

const mapFromDB = (data: any): InventoryMove => ({
    id: String(data.id),
    productId: data.product_id,
    variationId: data.variation_id,
    productDescription: data.product_description,
    type: data.type,
    quantity: Number(data.quantity),
    date: data.date,
    label: data.label,
    unitCost: data.unit_cost ? Number(data.unit_cost) : undefined,
    parentMoveId: data.parent_move_id,
    relatedEntityId: data.related_entity_id,
    relatedEntityType: data.related_entity_type,
    observation: data.observation,
    status: data.status || 'active',
    createdAt: data.created_at
});
