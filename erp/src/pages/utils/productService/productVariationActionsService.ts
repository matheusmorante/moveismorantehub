import { supabase } from '@/pages/utils/supabaseConfig';
import { MAX_VARIATION_IMAGES } from './productImageHelpers';
import { LOCAL_STORAGE_KEY, getLocalProducts, notifySubscribers } from './productLocalCache';
import { updateProduct } from './productMutationService';

export const saveVariation = async (productId: string, variation: any): Promise<void> => {
    try {
        if ((variation.images || []).length > MAX_VARIATION_IMAGES) {
            throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
        }
        const products = getLocalProducts();
        const index = products.findIndex(p => String(p.id).toLowerCase() === String(productId).toLowerCase());
        if (index === -1) throw new Error("Produto pai não encontrado.");

        const parent = products[index];
        const variations = parent.variations || [];
        const rawVarId = variation.variationId || variation.id;

        // Desfaz IDs sintéticos legados (formato `productId_skuSuffix`) para extrair o UUID real.
        const variationId = (rawVarId && String(rawVarId).includes('_') && String(rawVarId).startsWith(String(productId)))
            ? String(rawVarId).split('_').slice(1).join('_')
            : rawVarId;

        const isUuidPattern = (val?: string) =>
            Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

        const targetIdStr = variationId ? String(variationId).toLowerCase() : '';

        // REGRA DE IDENTIDADE: a variação é localizada EXCLUSIVAMENTE pelo UUID.
        let varIndex = variations.findIndex((v: any) => {
            const vIdStr = v.id ? String(v.id).toLowerCase() : '';
            return targetIdStr && vIdStr && targetIdStr === vIdStr;
        });

        if (varIndex === -1 && !isUuidPattern(variationId)) {
            const skuHint = variation.sku ? ` (sku="${variation.sku}")` : '';
            console.error(
                `[saveVariation] Falha de identidade: variação sem UUID válido${skuHint}.`,
                `productId=${productId}`,
                `rawVarId=${rawVarId}`,
                'Registre este caso para saneamento do cadastro legado.',
            );
        }

        const variationToSave = { 
            ...variation, 
            id: (isUuidPattern(variationId) ? variationId : null) || (varIndex !== -1 ? variations[varIndex].id : crypto.randomUUID()) 
        };
        delete (variationToSave as any).variationId;

        let newVariations = [...variations];
        if (varIndex === -1) {
            newVariations.push(variationToSave);
        } else {
            newVariations[varIndex] = {
                ...newVariations[varIndex],
                ...variationToSave
            };
        }

        const seenIds = new Set<string>();
        const deduplicatedVariations: any[] = [];
        for (const v of newVariations) {
            const idKey = String(v.id || '').toLowerCase();
            if (idKey && seenIds.has(idKey)) continue;
            if (idKey) seenIds.add(idKey);
            deduplicatedVariations.push(v);
        }

        await updateProduct(productId, { variations: deduplicatedVariations });
    } catch (error) {
        console.error("Erro ao salvar variação: ", error);
        throw error;
    }
};

export const moveVariationToFamily = async (
    variationId: string,
    targetFamilyId: string,
    attributes: { name: string; value: string; showName?: boolean }[],
    name: string,
    imageUrls: string[],
    sourceParentId?: string,
): Promise<{ newSku: string; sourceParentRemoved: boolean }> => {
    const variationImages = Array.from(new Set(imageUrls.filter(Boolean)));
    if (variationImages.length > MAX_VARIATION_IMAGES) {
        throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variationId);
    if (!isUuid) {
        throw new Error('A variação precisa ter um UUID válido para ser movida. Atualize o cadastro legado antes de continuar.');
    }

    // Chamada atômica à RPC PostgreSQL `move_variation_to_parent`.
    const { data, error } = await supabase.rpc('move_variation_to_parent', {
        p_variation_id: variationId,
        p_target_parent_id: targetFamilyId,
        p_attributes: attributes,
        p_name: name,
        p_images: variationImages,
        p_source_parent_id: sourceParentId || null,
    });

    if (error) {
        throw new Error(`Falha ao mover variação no banco: ${error.message}`);
    }

    // Invalidar o cache local por completo
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    notifySubscribers();

    return {
        newSku: String(data?.newSku || ''),
        sourceParentRemoved: Boolean(data?.sourceParentRemoved),
    };
};

export const mergeVariationIntoCanonical = async (
    nonCanonicalVariationId: string,
    canonicalVariationId: string,
): Promise<{ transferredSupplierIds: string[]; canonicalSupplierIds: string[] }> => {
    const { data, error } = await supabase.rpc('merge_product_variation_into_canonical', {
        p_non_canonical_variation_id: nonCanonicalVariationId,
        p_canonical_variation_id: canonicalVariationId,
    });

    if (error) {
        throw new Error(`Falha ao mesclar variações no banco: ${error.message}`);
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    notifySubscribers();

    return {
        transferredSupplierIds: Array.isArray(data?.transferredSupplierIds) ? data.transferredSupplierIds : [],
        canonicalSupplierIds: Array.isArray(data?.canonicalSupplierIds) ? data.canonicalSupplierIds : [],
    };
};
