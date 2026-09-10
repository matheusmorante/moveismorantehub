import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../../../types/product.type';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { updateProduct } from '@/pages/utils/productService';
import { updateProductCatalogState } from './productCatalogState';

/**
 * Resolve os objetos de variação e produto pai para ações de catálogo
 */
export const resolveCatalogEntities = async (
    id: string,
    serverProducts: Product[]
): Promise<{ parentProduct?: Product; variation?: any; isVariation: boolean }> => {
    const [possibleParentId, ...skuParts] = id.split('_');
    const targetSku = skuParts.join('_');
    const isCompoundId = skuParts.length > 0;

    let parentProduct: Product | undefined;
    let variation: any = undefined;

    // 1. Procurar em serverProducts por ID composto (possibleParentId)
    if (isCompoundId) {
        parentProduct = serverProducts.find(p => String(p.id) === String(possibleParentId));
        if (parentProduct && Array.isArray(parentProduct.variations)) {
            variation = parentProduct.variations.find((item: any, index: number) => {
                if (String(item.id) === targetSku) return true;
                if (String(index) === targetSku) return true;
                const rawSku = item.sku || '';
                const genSku = `${parentProduct!.sku || parentProduct!.code || ''}-${String(index + 1).padStart(2, '0')}`;
                if (rawSku && String(rawSku) === targetSku) return true;
                if (genSku === targetSku) return true;
                if (normalizeVariationSku(rawSku) === normalizeVariationSku(targetSku)) return true;
                if (normalizeVariationSku(genSku) === normalizeVariationSku(targetSku)) return true;
                return false;
            });
        }
    }

    // 2. Procurar em serverProducts se id for diretamente o ID ou SKU de uma variação
    if (!variation) {
        for (const p of serverProducts) {
            if (Array.isArray(p.variations)) {
                const found = p.variations.find((v: any) => 
                    String(v.id) === String(id) || 
                    String(v.id) === targetSku ||
                    String(v.sku) === String(id) ||
                    normalizeVariationSku(v.sku || '') === normalizeVariationSku(id)
                );
                if (found) {
                    parentProduct = p;
                    variation = found;
                    break;
                }
            }
        }
    }

    // 3. Fallback: procurar no Supabase se não estiver na página atual em memória
    if (isCompoundId && !variation) {
        const { data: dbProd } = await supabase.from('products').select('*, product_variations(*)').eq('id', possibleParentId).maybeSingle();
        if (dbProd) {
            parentProduct = dbProd;
            const vars = (dbProd as any).product_variations || (dbProd as any).variations || [];
            variation = vars.find((item: any, index: number) => {
                if (String(item.id) === targetSku) return true;
                const rawSku = item.sku || '';
                const genSku = `${dbProd.code || ''}-${String(index + 1).padStart(2, '0')}`;
                return normalizeVariationSku(rawSku) === normalizeVariationSku(targetSku) ||
                       normalizeVariationSku(genSku) === normalizeVariationSku(targetSku);
            });
        }
    } else if (!variation) {
        const { data: dbVar } = await supabase.from('product_variations').select('*, products(*)').eq('id', id).maybeSingle();
        if (dbVar) {
            variation = dbVar;
            parentProduct = (dbVar as any).products;
        }
    }

    // 4. Se ainda não for variação, verifica se é produto simples/pai
    if (!parentProduct) {
        parentProduct = serverProducts.find(p => String(p.id) === String(id));
    }

    return {
        parentProduct,
        variation,
        isVariation: Boolean(variation)
    };
};

/**
 * Valida se o produto ou variação pode ser publicado no catálogo digital
 */
export const validateCatalogPublication = (
    parentProduct?: Product,
    variation?: any,
    isVariation?: boolean
): { isValid: boolean; errorMessage?: string } => {
    const isDraft = Boolean(parentProduct?.is_draft) || parentProduct?.status === 'draft' || Boolean((parentProduct as any)?.isDraft);
    if (isDraft) {
        return {
            isValid: false,
            errorMessage: "Este produto é um rascunho. Termine o cadastramento para poder publicá-lo no Catálogo."
        };
    }

    if (isVariation) {
        const hasImages = (variation?.images && variation.images.length > 0) || 
                          (variation?.image_url && String(variation.image_url).trim().length > 0) ||
                          (parentProduct?.images && parentProduct.images.length > 0);
        const hasPrice = (variation?.syncUnitPrice || Number(variation?.unitPrice || 0) > 0 || Number(parentProduct?.unitPrice || 0) > 0);
        const isEligible = hasPrice && hasImages && (parentProduct?.description || (parentProduct as any)?.name || '').trim().length >= 2;

        if (!isEligible) {
            return {
                isValid: false,
                errorMessage: 'Preencha os requisitos do Catálogo (preço maior que zero e pelo menos uma imagem) antes de publicar esta variação.'
            };
        }
    } else if (parentProduct) {
        const hasImages = parentProduct.images && parentProduct.images.length > 0;
        const hasPrice = Number(parentProduct.unitPrice || 0) > 0;
        const isEligible = hasPrice && hasImages && (parentProduct.description || (parentProduct as any)?.name || '').trim().length >= 2;

        if (!isEligible) {
            return {
                isValid: false,
                errorMessage: 'Preencha os requisitos do Catálogo (preço maior que zero e pelo menos uma imagem) antes de publicar este produto.'
            };
        }
    }

    return { isValid: true };
};

/**
 * Persiste a alteração de status do catálogo no Supabase
 */
export const persistCatalogStatus = async (
    id: string,
    newStatus: string,
    parentProduct?: Product,
    variation?: any,
    serverProducts: Product[] = []
): Promise<void> => {
    const isVariation = Boolean(variation);

    if (isVariation && variation) {
        if (parentProduct?.id && Array.isArray(parentProduct.variations) && parentProduct.variations.length === 1) {
            const { error: parentStatusError } = await supabase
                .from('products')
                .update({ status: newStatus })
                .eq('id', parentProduct.id);
            if (parentStatusError) throw parentStatusError;
        }
        
        const isVarIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variation.id);
        if (isVarIdUUID) {
            const { error } = await supabase
                .from('product_variations')
                .update({ status: newStatus })
                .eq('id', variation.id);
            if (error) throw error;
        }
        return;
    }

    const isProdIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isProdIdUUID) {
        const { error: productError } = await supabase
            .from('products')
            .update({ status: newStatus })
            .eq('id', id);
        if (productError) throw productError;
    }

    await updateProduct(id, { status: newStatus });

    if (parentProduct?.variations?.length) {
        await updateProduct(id, {
            variations: parentProduct.variations.map((variation: any) => ({ ...variation, status: newStatus }))
        });
    }

    if (isProdIdUUID) {
        const { error: variationsError } = await supabase
            .from('product_variations')
            .update({ status: newStatus })
            .eq('product_id', id);
        if (variationsError) throw variationsError;
    }

    const independentChildren = serverProducts.filter(product => String(product.parentId) === String(id));
    await Promise.all(independentChildren
        .filter(child => child.id)
        .map(child => updateProduct(child.id!, { status: newStatus })));
};
