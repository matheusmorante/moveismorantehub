import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from "../types/inventoryMove.type";
import { mapFromDB as mapProductFromDB, updateProduct } from '@/pages/utils/productService';

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

const isEntryType = (t: string) => t === 'entry';
const isExitType = (t: string) => t === 'exit' || t === 'withdrawal';
const isAdjustmentType = (t: string) => t === 'adjustment' || t === 'balance';

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

export const getNextInventoryCode = async (): Promise<string> => {
    const { data, error } = await supabase.from(TABLE_NAME).select('observation').ilike('label', 'Inventário #%');
    if (error) throw error;
    const lastCode = (data || []).reduce((highest, move: any) => {
        try { return Math.max(highest, Number(JSON.parse(move.observation || '{}').inventoryCode) || 0); }
        catch { return highest; }
    }, 0);
    return String(lastCode + 1).padStart(6, '0');
};

export const saveInventoryMove = async (move: InventoryMove, currentProductStock: number): Promise<InventoryMove | undefined> => {
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
        const { data: p } = await supabase.from('products').select('*, product_variations(*)').eq('id', move.productId).single();
        if (!p) return data?.[0] ? mapFromDB(data[0]) : undefined;

        const product = mapProductFromDB(p);
        let newTotalStock = Number(product.stock || 0);
        let updatedVariations = product.variations ? [...product.variations] : [];

        // Saldo = Entradas - Saídas + Ajustes (ajustes podem ser positivos ou negativos)
        const qty = Number(move.quantity || 0);
        if (move.variationId && updatedVariations.length > 0) {
            const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
            if (vIdx !== -1) {
                let vStock = Number(updatedVariations[vIdx].stock || 0);
                if (isEntryType(move.type)) vStock += qty;
                else if (isExitType(move.type)) vStock -= qty;
                else if (isAdjustmentType(move.type)) vStock += qty;
                
                updatedVariations[vIdx].stock = vStock;
            }
            newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
        } else {
            if (isEntryType(move.type)) newTotalStock += qty;
            else if (isExitType(move.type)) newTotalStock -= qty;
            else if (isAdjustmentType(move.type)) newTotalStock += qty;
        }

        await updateProduct(move.productId, { 
            stock: newTotalStock,
            variations: updatedVariations.length > 0 ? updatedVariations : undefined
        });
        return data?.[0] ? mapFromDB(data[0]) : undefined;
    } catch (error) {
        console.error("Erro ao salvar lançamento de estoque: ", error);
        throw error;
    }
};

export const deleteInventoryMove = async (id: string, allowLinkedOrderMove = false, allowDraftAuditDelete = false): Promise<void> => {
    try {
        const { data: moveData } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!moveData) return;

        const move = mapFromDB(moveData);
        let isDraftAudit = false;
        try { isDraftAudit = JSON.parse(move.observation || '{}').status === 'in_progress'; } catch { }
        if ((move.label?.startsWith('Inventário #') || move.label?.startsWith('Ajuste lançado pelo inventário #')) && !(allowDraftAuditDelete && isDraftAudit)) {
            throw new Error('Movimentações de inventário confirmado são imutáveis. Crie um novo inventário para gerar outro ajuste.');
        }
        if (!allowLinkedOrderMove && move.relatedEntityId && (
            move.relatedEntityType === 'sales_order' || move.relatedEntityType === 'purchase_order'
        )) {
            throw new Error('Movimentações vinculadas a pedidos não podem ser excluídas por aqui. Faça o estorno pelo pedido vinculado.');
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        currentMoves = currentMoves.filter(m => m.id !== id);
        notifyListeners();

        // Reverter saldo do estoque do produto
        const { data: p } = await supabase.from('products').select('*, product_variations(*)').eq('id', move.productId).single();
        if (!p) return;

        const qty = Number(move.quantity || 0);
        const product = mapProductFromDB(p);
        let newTotalStock = Number(product.stock || 0);
        let updatedVariations = product.variations ? [...product.variations] : [];

        if (move.variationId && updatedVariations.length > 0) {
            const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
            if (vIdx !== -1) {
                let vStock = Number(updatedVariations[vIdx].stock || 0);
                if (isEntryType(move.type)) vStock -= qty;
                else if (isExitType(move.type)) vStock += qty;
                else if (isAdjustmentType(move.type)) vStock -= qty;
                updatedVariations[vIdx].stock = vStock;
            }
            newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
        } else {
            if (isEntryType(move.type)) newTotalStock -= qty;
            else if (isExitType(move.type)) newTotalStock += qty;
            else if (isAdjustmentType(move.type)) newTotalStock -= qty;
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

export const reverseInventoryMove = async (
    id: string, 
    reason: string = 'Estorno de movimentação', 
    allowLinkedOrderMove = false
): Promise<void> => {
    try {
        const { data: moveData } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!moveData) return;

        const move = mapFromDB(moveData);
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

        // Atualizar no banco usando reason e observation (compatibilidade universal)
        const updatePayload: any = {
            reason: reason,
            observation: updatedObservation
        };

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(updatePayload)
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        currentMoves = currentMoves.map(m => m.id === id ? { 
            ...m, 
            status: 'reversed', 
            reversalReason: reason, 
            reversedAt: reversedAt 
        } : m);
        notifyListeners();

        // Recompor o saldo de estoque do produto/variação (inverso da movimentação)
        const { data: p } = await supabase.from('products').select('*, product_variations(*)').eq('id', move.productId).single();
        if (!p) return;

        const qty = Number(move.quantity || 0);
        const product = mapProductFromDB(p);
        let newTotalStock = Number(product.stock || 0);
        let updatedVariations = product.variations ? [...product.variations] : [];

        if (move.variationId && updatedVariations.length > 0) {
            const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
            if (vIdx !== -1) {
                let vStock = Number(updatedVariations[vIdx].stock || 0);
                if (isEntryType(move.type)) vStock -= qty;
                else if (isExitType(move.type)) vStock += qty;
                else if (isAdjustmentType(move.type)) vStock -= qty;
                updatedVariations[vIdx].stock = vStock;
            }
            newTotalStock = updatedVariations.reduce((acc: number, v: any) => acc + Number(v.stock || 0), 0);
        } else {
            if (isEntryType(move.type)) newTotalStock -= qty;
            else if (isExitType(move.type)) newTotalStock += qty;
            else if (isAdjustmentType(move.type)) newTotalStock += qty;
        }

        await updateProduct(move.productId, { 
            stock: newTotalStock,
            variations: updatedVariations.length > 0 ? updatedVariations : undefined
        });
    } catch (error) {
        console.error("Erro ao estornar lançamento de estoque: ", error);
        throw error;
    }
};

export const cancelInventoryMove = async (id: string, reason?: string): Promise<void> => {
    return reverseInventoryMove(id, reason || 'Estorno manual');
};

export const updateInventoryMove = async (id: string, updates: Partial<InventoryMove>): Promise<void> => {
    try {
        const { data: oldMove } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
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
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Atualizar estado em memória
        currentMoves = currentMoves.map(m => m.id === id ? { ...m, ...updates } : m);
        notifyListeners();

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
            let updatedVariations = product.variations ? [...product.variations] : [];

            if (oldMove.variation_id && updatedVariations.length > 0) {
                const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(oldMove.variation_id));
                if (vIdx !== -1) {
                    let vStock = Number(updatedVariations[vIdx].stock || 0) + delta;
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

export const cancelInventoryMovesByRelatedEntity = async (
    relatedEntityId: string, 
    relatedEntityType: string,
    reason: string = `Cancelamento de ${relatedEntityType} #${relatedEntityId}`
): Promise<void> => {
    try {
        const searchPattern = `%${relatedEntityId}%`;
        const { data: moves, error } = await supabase
            .from(TABLE_NAME)
            .select('id, observation, reason')
            .or(`order_id.eq.${relatedEntityId},observation.ilike.${searchPattern},label.ilike.${searchPattern}`);

        if (error) throw error;

        if (moves && moves.length > 0) {
            for (const move of moves) {
                const parsedMove = mapFromDB(move);
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
            .map((e: any) => mapFromDB(e))
            .filter((move) => move.status !== 'reversed' && move.status !== 'cancelled')
            .map((move) => ({ ...move, balance: move.quantity }));

        return availableLots;
    } catch (error) {
        console.error("Erro ao buscar lotes disponíveis:", error);
        return [];
    }
};

const mapToDB = (move: InventoryMove) => {
    // Validação estrita dos tipos aceitos pela constraint do banco: 'entry' | 'exit' | 'adjustment'
    const dbType = isExitType(move.type) ? 'exit' : isAdjustmentType(move.type) ? 'adjustment' : 'entry';
    const resolvedStatus = move.status === 'reversed' || move.status === 'cancelled' ? 'reversed' : 'effective';

    let observationPayload: string | null = null;
    if (move.observation && (move.observation.startsWith('{') || move.observation.startsWith('['))) {
        try {
            const parsed = JSON.parse(move.observation);
            observationPayload = JSON.stringify({
                ...parsed,
                status: resolvedStatus,
                reversalReason: move.reversalReason || parsed.reversalReason || null,
                reversedAt: move.reversedAt || parsed.reversedAt || null
            });
        } catch {
            observationPayload = move.observation;
        }
    } else if (move.observation || resolvedStatus === 'reversed' || move.reversalReason) {
        observationPayload = JSON.stringify({
            note: move.observation || '',
            status: resolvedStatus,
            reversalReason: move.reversalReason || null,
            reversedAt: move.reversedAt || null
        });
    }

    return {
        product_id: move.productId,
        variation_id: move.variationId || null,
        product_description: move.productDescription,
        type: dbType,
        quantity: move.quantity,
        date: move.date,
        label: move.label || null,
        unit_cost: move.unitCost || 0,
        unit_price: move.unitPrice || 0,
        observation: observationPayload,
        order_id: move.relatedEntityId || null,
        reason: move.reversalReason || move.label || null
    };
};

const mapFromDB = (data: any): InventoryMove => {
    // Normalizar tipos retornados do banco para compatibilidade da UI
    const normalizedType = isExitType(data.type) ? 'withdrawal' : isAdjustmentType(data.type) ? 'balance' : 'entry';

    let meta: any = {};
    let cleanObservation = data.observation;
    if (data.observation && (data.observation.startsWith('{') || data.observation.startsWith('['))) {
        try {
            meta = JSON.parse(data.observation);
            cleanObservation = meta.note || meta.observation || data.observation;
        } catch { }
    }

    const isReversed = 
        data.status === 'reversed' || 
        data.status === 'cancelled' ||
        meta.status === 'reversed' ||
        meta.status === 'cancelled' ||
        (typeof data.reason === 'string' && data.reason.startsWith('Cancelamento da venda'));

    const normalizedStatus = isReversed ? 'reversed' : 'effective';
    const reversalReason = data.reversal_reason || meta.reversalReason || (isReversed ? data.reason : undefined);
    const reversedAt = data.reversed_at || meta.reversedAt;

    return {
        id: String(data.id),
        productId: data.product_id,
        variationId: data.variation_id,
        productDescription: data.product_description,
        type: normalizedType,
        quantity: Number(data.quantity),
        date: data.date,
        label: data.label,
        unitCost: data.unit_cost ? Number(data.unit_cost) : undefined,
        unitPrice: data.unit_price ? Number(data.unit_price) : undefined,
        observation: cleanObservation,
        relatedEntityId: data.order_id,
        relatedEntityType: (data.order_id && (
            /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(data.label || '') ||
            /Pedido de Compra\s*#/i.test(data.observation || '')
        ))
            ? 'purchase_order'
            : (data.order_id && isExitType(data.type) && (/^Saída - Pedido/i.test(data.label || '') || /^Pedido #/i.test(data.label || '')))
                ? 'sales_order'
                : undefined,
        status: normalizedStatus,
        reversalReason: reversalReason,
        reversedAt: reversedAt,
        createdAt: data.created_at
    };
};
