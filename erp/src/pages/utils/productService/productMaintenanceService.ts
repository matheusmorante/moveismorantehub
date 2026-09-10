import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from '../../types/product.type';
import { getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';

export const bulkConvertToVariations = async (): Promise<{ success: number, fails: number }> => {
    try {
        const products = getLocalProducts();
        const simpleProducts = products.filter(p => !p.hasVariations && !p.deleted);

        if (simpleProducts.length === 0) return { success: 0, fails: 0 };

        let success = 0;
        let fails = 0;

        for (const p of simpleProducts) {
            try {
                const variationId = crypto.randomUUID();
                const defaultVariation: Variation = {
                    id: variationId,
                    name: "COR: BRANCO",
                    sku: p.code || `SKU-${variationId.substring(0, 8)}`,
                    stock: Number(p.stock || 0),
                    unitPrice: Number(p.unitPrice || 0),
                    costPrice: Number(p.costPrice || 0),
                    active: true,
                    condition: p.condition || 'novo',
                    attributes: [{ name: 'COR', value: 'BRANCO' }],
                    syncWithParent: true,
                    syncUnitPrice: true,
                    syncCostPrice: true,
                    syncCondition: true
                };

                const idx = products.findIndex(prod => String(prod.id) === String(p.id));
                if (idx !== -1) {
                    products[idx] = {
                        ...products[idx],
                        hasVariations: true,
                        variations: [defaultVariation],
                        code: '',
                        stock: 0,
                        updatedAt: new Date().toISOString()
                    };
                    success++;
                } else {
                    fails++;
                }
            } catch (err) {
                console.error(`Falha ao converter produto ${p.id}:`, err);
                fails++;
            }
        }

        saveLocalProducts(products);
        notifySubscribers();

        return { success, fails };
    } catch (error) {
        console.error("Erro crítico na conversão em massa:", error);
        throw error;
    }
};

export const cleanupOldDrafts = async () => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        let products = getLocalProducts();
        const initialCount = products.length;
        
        products = products.filter(p => {
            if (p.isDraft) {
                const updatedTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
                return updatedTime >= sevenDaysAgo.getTime();
            }
            return true;
        });

        if (products.length !== initialCount) {
            saveLocalProducts(products);
            notifySubscribers();
        }
    } catch (error) {
        console.error("Erro ao limpar rascunhos antigos:", error);
    }
};

export const migrateProductReferences = async (oldId: string, newId: string): Promise<void> => {
    try {
        const { error } = await supabase.rpc('migrate_product_data', { 
            old_id: parseInt(oldId), 
            new_id: parseInt(newId) 
        });
        if (error) throw error;
    } catch (error) {
        console.error("Erro ao migrar referências de produto:", error);
        throw error;
    }
};
