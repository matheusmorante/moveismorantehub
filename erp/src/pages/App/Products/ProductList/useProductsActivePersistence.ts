import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../../../types/product.type';
import { updateProduct } from '@/pages/utils/productService';

/**
 * Sincroniza a coluna 'active' do produto pai com base no status de suas variações filhas
 */
export const syncParentActiveInDb = async (parentId: string): Promise<void> => {
    const { data: siblings } = await supabase
        .from('product_variations')
        .select('active')
        .eq('product_id', parentId);
    const hasActiveVariation = (siblings || []).some((s: any) => s.active !== false);
    await supabase.from('products').update({ active: hasActiveVariation }).eq('id', parentId);
};

/**
 * Persiste a alteração de status ativo/inativo no banco de dados (Supabase)
 */
export const persistProductActiveState = async (
    id: string,
    newActive: boolean,
    serverProducts: Product[],
    products: Product[]
): Promise<void> => {
    const isVariationUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isVariationUuid) {
        const { data: variation, error: variationLookupError } = await supabase
            .from('product_variations')
            .select('id, product_id')
            .eq('id', id)
            .maybeSingle();
        if (variationLookupError) throw variationLookupError;
        if (variation) {
            const { error: variationUpdateError } = await supabase
                .from('product_variations')
                .update({ active: newActive })
                .eq('id', id);
            if (variationUpdateError) throw variationUpdateError;
            if (variation.product_id) {
                await syncParentActiveInDb(variation.product_id);
            }
            return;
        }
    }

    // 1. Identificador visual legado (parentId_sku)
    if (id.includes('_')) {
        const [parentId, ...skuParts] = id.split('_');
        const targetSku = skuParts.join('_');
        const { data: updatedLegacyVariations, error: legacyVariationError } = await supabase
            .from('product_variations')
            .update({ active: newActive })
            .eq('product_id', parentId)
            .eq('sku', targetSku)
            .select('id');
        if (legacyVariationError) throw legacyVariationError;
        if ((updatedLegacyVariations || []).length > 0) {
            await syncParentActiveInDb(parentId);
            return;
        }
        throw new Error('A variação não foi encontrada para alterar o status.');
    }

    // 2. Variação interna encontrada na lista de produtos
    const targetProduct = serverProducts.find(p => String(p.id) === String(id));
    if (!targetProduct) {
        for (const parent of serverProducts) {
            if (Array.isArray(parent.variations)) {
                const vIndex = parent.variations.findIndex((v: any) => String(v.id) === String(id));
                if (vIndex !== -1) {
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                    if (isUUID) {
                        const { error } = await supabase.from('product_variations').update({ active: newActive }).eq('id', id);
                        if (error) throw error;
                        if (parent.id) {
                            await syncParentActiveInDb(parent.id);
                        }
                        return;
                    }
                    throw new Error('Esta variação legada não possui UUID e não pode ser localizada com segurança.');
                }
            }
        }
        return;
    }

    // 3. Produto pai ou produto regular
    const parentProduct = products.find(p => p.id === id) || targetProduct;
    if (parentProduct) {
        const isProductUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isProductUuid) {
            const { error: productUpdateError } = await supabase
                .from('products')
                .update({ active: newActive })
                .eq('id', id);
            if (productUpdateError) throw productUpdateError;

            const { error: variationUpdateError } = await supabase
                .from('product_variations')
                .update({ active: newActive })
                .eq('product_id', id);
            if (variationUpdateError) throw variationUpdateError;
        } else {
            await updateProduct(id, { active: newActive });
        }

        const independentChildren = serverProducts.filter(p => p.parentId === id);
        for (const child of independentChildren) {
            if (child.id) {
                await updateProduct(child.id, { active: newActive });
            }
        }
        return;
    }

    await updateProduct(id, { active: newActive });
};
