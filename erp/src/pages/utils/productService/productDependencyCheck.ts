import { supabase } from '@/pages/utils/supabaseConfig';
import { getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';
import { updateProduct } from './productMutationService';

export const checkProductLinkedToSales = async (id: string | number): Promise<string | null> => {
    const realId = String(id).split('_')[0];

    try {
        const normalizedItems = await supabase
            .from('order_items')
            .select('id, order_id')
            .eq('product_id', realId)
            .limit(1);

        if (!normalizedItems.error && normalizedItems.data?.[0]?.order_id) {
            return String(normalizedItems.data[0].order_id);
        }

        if (normalizedItems.error) throw normalizedItems.error;

        return null;
    } catch (error) {
        // Falha fechada: sem confirmar a ausência de vínculo na fonte
        // normalizada, nenhuma rotina de exclusão em massa deve continuar.
        console.error('Erro ao verificar vínculo do produto com vendas:', error);
        throw error;
    }
};

export const checkProductHasMoves = async (productId: string, variationId?: string): Promise<boolean> => {
    try {
        const realId = String(productId).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        if (!isUUID) return false;

        let query = supabase
            .from('inventory_moves')
            .select('id')
            .eq('product_id', realId)
            .limit(1);

        if (variationId) {
            query = query.eq('variation_id', variationId);
        }

        const { data: movesData, error: movesErr } = await query;
        if (movesErr) throw movesErr;
        if (movesData && movesData.length > 0) {
            return true;
        }

        let orderItemsQuery = supabase
            .from('order_items')
            .select('id')
            .eq('product_id', realId)
            .limit(1);

        if (variationId) {
            orderItemsQuery = orderItemsQuery.eq('variation_id', variationId);
        }

        const { data: orderItemsData, error: orderItemsErr } = await orderItemsQuery;
        if (orderItemsErr) throw orderItemsErr;
        if (orderItemsData && orderItemsData.length > 0) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Erro ao verificar movimentações do produto:", error);
        return true;
    }
};

export const checkProductIsUsed = async (productId: string): Promise<boolean> => {
    try {
        const realId = String(productId).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        if (!isUUID) return false;

        const [movesRes, orderItemsRes, receiptsRes, inboundRes] = await Promise.all([
            supabase.from('inventory_moves').select('id').eq('product_id', realId).limit(1),
            supabase.from('order_items').select('id').eq('product_id', realId).limit(1),
            supabase.from('goods_receipt_items').select('id').eq('product_id', realId).limit(1),
            supabase.from('inbound_invoices').select('id').filter('items', 'cs', `[{"productId": "${realId}"}]`).limit(1)
        ]);

        if (movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error) {
            throw movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error;
        }

        return (
            (movesRes.data && movesRes.data.length > 0) ||
            (orderItemsRes.data && orderItemsRes.data.length > 0) ||
            (receiptsRes.data && receiptsRes.data.length > 0) ||
            (inboundRes.data && inboundRes.data.length > 0)
        ) as boolean;
    } catch (error) {
        console.error("Erro ao verificar uso do produto:", error);
        return true; 
    }
};

export const deactivateProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { active: false, deleted: false });
    const realId = String(id).split('_')[0];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
    if (isUUID) {
        await supabase.from('product_variations').update({ active: false }).eq('product_id', realId);
    }
};

export const activateProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { active: true, deleted: false });
    const realId = String(id).split('_')[0];
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
    if (isUUID) {
        await supabase.from('product_variations').update({ active: true }).eq('product_id', realId);
    }
};

export const moveToTrash = async (id: string): Promise<void> => {
    await deactivateProduct(id);
};

export const physicalDeleteProduct = async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const realId = String(id).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        
        if (isUUID) {
            const isUsed = await checkProductIsUsed(realId);
            if (isUsed) {
                return { success: false, message: "Produto em uso. Não pode ser excluído." };
            }
            
            const { error } = await supabase.from('products').delete().eq('id', realId);
            if (error) throw error;
            
            let products = getLocalProducts();
            products = products.filter(p => String(p.id).split('_')[0] !== realId);
            saveLocalProducts(products);
            notifySubscribers();
        }

        return { success: true, message: "Produto excluído definitivamente." };
    } catch (error: any) {
        console.error("Erro ao excluir produto fisicamente:", error);
        return { success: false, message: error.message || "Erro ao excluir o produto." };
    }
};

export const restoreProduct = async (id: string): Promise<void> => {
    await activateProduct(id);
};

export const deleteProduct = async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const realId = String(id).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        
        if (isUUID) {
            await deactivateProduct(realId);
        }

        return { 
            success: true, 
            message: "Produto desativado com sucesso. Deleções físicas não são permitidas para preservar o histórico do sistema."
        };
    } catch (error: any) {
        console.error("Erro ao desativar produto:", error);
        return {
            success: false,
            message: error.message || "Erro ao desativar o produto."
        };
    }
};

export const checkVariationIsUsed = async (variationId: string): Promise<boolean> => {
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variationId);
        if (!isUUID) return false;

        const [movesRes, orderItemsRes, receiptsRes, inboundRes] = await Promise.all([
            supabase.from('inventory_moves').select('id').eq('variation_id', variationId).limit(1),
            supabase.from('order_items').select('id').eq('variation_id', variationId).limit(1),
            supabase.from('goods_receipt_items').select('id').eq('variation_id', variationId).limit(1),
            supabase.from('inbound_invoices').select('id').filter('items', 'cs', `[{"variationId": "${variationId}"}]`).limit(1)
        ]);

        if (movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error) {
            throw movesRes.error || orderItemsRes.error || receiptsRes.error || inboundRes.error;
        }

        return (
            (movesRes.data && movesRes.data.length > 0) ||
            (orderItemsRes.data && orderItemsRes.data.length > 0) ||
            (receiptsRes.data && receiptsRes.data.length > 0) ||
            (inboundRes.data && inboundRes.data.length > 0)
        ) as boolean;
    } catch (error) {
        console.error("Erro ao verificar uso da variação:", error);
        return true; 
    }
};

export const physicalDeleteVariation = async (productId: string, variationId: string): Promise<{ success: boolean; message?: string; parentDeleted?: boolean }> => {
    try {
        const realProductId = String(productId).split('_')[0];
        const isVarUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variationId);
        
        if (!isVarUUID) {
             return { success: false, message: "ID de variação inválido." };
        }

        const isUsed = await checkVariationIsUsed(variationId);
        if (isUsed) {
            return { success: false, message: "Esta variação possui histórico de movimentação ou pedidos e não pode ser excluída fisicamente." };
        }
        
        // Count variations
        const { data: variations, error: countError } = await supabase
            .from('product_variations')
            .select('id')
            .eq('product_id', realProductId);

        if (countError) throw countError;

        if (variations && variations.length <= 1) {
            // It's the last variation. Delete the parent instead.
            return { ...(await physicalDeleteProduct(realProductId)), parentDeleted: true };
        } else {
            // Delete only this variation
            const { error: delError } = await supabase.from('product_variations').delete().eq('id', variationId);
            if (delError) throw delError;

            // Update cache
            const products = getLocalProducts();
            const parentIdx = products.findIndex(p => String(p.id).split('_')[0] === realProductId);
            if (parentIdx >= 0) {
                const parent = products[parentIdx];
                if (Array.isArray(parent.variations)) {
                    parent.variations = parent.variations.filter(v => v.id !== variationId);
                    products[parentIdx] = parent;
                    saveLocalProducts(products);
                }
            }
            notifySubscribers();

            return { success: true, message: "Variação excluída com sucesso." };
        }
    } catch (error: any) {
        console.error("Erro ao excluir variação fisicamente:", error);
        return { success: false, message: error.message || "Erro ao excluir a variação." };
    }
};
