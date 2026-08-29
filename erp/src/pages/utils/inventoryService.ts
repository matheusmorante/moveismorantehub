import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from "../types/inventoryMove.type";
import { updateProduct } from '@/pages/utils/productService';

const TABLE_NAME = "inventory_moves";

let currentMoves: InventoryMove[] = [];
let listeners: Array<(moves: InventoryMove[]) => void> = [];

const notifyListeners = () => {
    listeners.forEach(listener => {
        try {
            listener([...currentMoves]);
        } catch (e) {
            console.error("Erro ao notificar listener de movimentações:", e);
        }
    });
};

export const subscribeToInventoryMoves = (callback: (moves: InventoryMove[]) => void) => {
    listeners.push(callback);

    const fetchAll = () => {
        supabase.from(TABLE_NAME)
            .select('*')
            .order('date', { ascending: false })
            .then(({ data, error }: { data: any, error: any }) => {
                if (data && !error) {
                    currentMoves = data.map(mapFromDB);
                    notifyListeners();
                } else if (error) {
                    console.error("Erro ao buscar lançamentos iniciais:", error);
                    callback([]);
                }
            });
    };

    if (currentMoves.length > 0) {
        callback([...currentMoves]);
    }
    fetchAll();

    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
};

export const saveInventoryMove = async (move: InventoryMove, currentProductStock: number): Promise<void> => {
    try {
        const payload = mapToDB(move);
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([payload])
            .select();

        if (error) throw error;

        if (data?.[0]) {
            currentMoves = [mapFromDB(data[0]), ...currentMoves];
            notifyListeners();
        }

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
        const { data: moveData } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!moveData) return;

        const move = mapFromDB(moveData);

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        currentMoves = currentMoves.filter(m => m.id !== id);
        notifyListeners();

        // Reverter saldo do estoque do produto
        const { data: p } = await supabase.from('products').select('*').eq('id', move.productId).single();
        if (!p) return;

        let newTotalStock = Number(p.stock || 0);
        let updatedVariations = p.variations ? [...p.variations] : [];

        if (move.variationId && updatedVariations.length > 0) {
            const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
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

        await updateProduct(move.productId, { 
            stock: newTotalStock,
            variations: updatedVariations.length > 0 ? updatedVariations : undefined
        });
    } catch (error) {
        console.error("Erro ao excluir/estornar lançamento de estoque: ", error);
        throw error;
    }
};

export const cancelInventoryMove = async (id: string): Promise<void> => {
    return deleteInventoryMove(id);
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

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        currentMoves = currentMoves.map(m => m.id === id ? { ...m, ...updates } : m);
        notifyListeners();

        // Se a quantidade mudou, recalcular estoque do produto
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
        const searchPattern = `%${relatedEntityId}%`;
        const { data: moves, error } = await supabase
            .from(TABLE_NAME)
            .select('id')
            .or(`order_id.eq.${relatedEntityId},observation.ilike.${searchPattern},label.ilike.${searchPattern}`);

        if (error) throw error;

        if (moves && moves.length > 0) {
            for (const move of moves) {
                await deleteInventoryMove(move.id);
            }
        }
    } catch (error) {
        console.error(`Erro ao estornar movimentações vinculadas a ${relatedEntityType} ${relatedEntityId}:`, error);
        throw error;
    }
};

export const deleteInventoryMovesByRelatedEntity = async (relatedEntityId: string, relatedEntityType: string): Promise<void> => {
    return cancelInventoryMovesByRelatedEntity(relatedEntityId, relatedEntityType);
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

export const getAvailableLots = async (productId: string, variationId?: string): Promise<(InventoryMove & { balance: number })[]> => {
    try {
        let query = supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('product_id', productId)
            .eq('type', 'entry')
            .order('date', { ascending: true });

        if (variationId) query = query.eq('variation_id', variationId);
        else query = query.is('variation_id', null);

        const { data: entries, error: entryError } = await query;
        if (entryError) throw entryError;

        const availableLots = (entries || [])
            .map((e: any) => {
                const move = mapFromDB(e);
                return { ...move, balance: move.quantity };
            });

        return availableLots;
    } catch (error) {
        console.error("Erro ao buscar lotes disponíveis:", error);
        return [];
    }
};

const mapToDB = (move: InventoryMove) => ({
    product_id: move.productId,
    variation_id: move.variationId || null,
    product_description: move.productDescription,
    type: move.type,
    quantity: move.quantity,
    date: move.date,
    label: move.label || null,
    unit_cost: move.unitCost || 0,
    unit_price: move.unitPrice || 0,
    observation: move.observation || null,
    order_id: move.relatedEntityId || null
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
    unitPrice: data.unit_price ? Number(data.unit_price) : undefined,
    observation: data.observation,
    relatedEntityId: data.order_id,
    relatedEntityType: data.label?.startsWith('Entrada a partir do Pedido')
        ? 'purchase_order'
        : data.type === 'withdrawal' && (/^Saída - Pedido/i.test(data.label || '') || /^Pedido #/i.test(data.label || ''))
            ? 'sales_order'
            : undefined,
    createdAt: data.created_at
});
