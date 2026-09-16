import { supabase } from '@/pages/utils/supabaseConfig';
import { getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';
import { updateProduct } from './productMutationService';

export const checkProductLinkedToSales = async (id: string | number): Promise<string | null> => {
    return null;
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
        if (!movesErr && movesData && movesData.length > 0) {
            return true;
        }

        const { data: ordersData, error: ordersErr } = await supabase
            .from('orders')
            .select('id')
            .filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${realId}\\"}]}"`)
            .limit(1);

        if (!ordersErr && ordersData && ordersData.length > 0) {
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

        const [movesRes, ordersRes, receiptsRes, inboundRes] = await Promise.all([
            supabase.from('inventory_moves').select('id').eq('product_id', realId).limit(1),
            supabase.from('orders').select('id').filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${realId}\\"}]}"`).limit(1),
            supabase.from('goods_receipt_items').select('id').eq('product_id', realId).limit(1),
            supabase.from('inbound_invoices').select('id').filter('items', 'cs', `[{"productId": "${realId}"}]`).limit(1)
        ]);

        return (
            (movesRes.data && movesRes.data.length > 0) ||
            (ordersRes.data && ordersRes.data.length > 0) ||
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
