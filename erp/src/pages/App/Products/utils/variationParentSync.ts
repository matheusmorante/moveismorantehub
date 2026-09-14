import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';

/**
 * Snapshot dos campos herdáveis do produto pai.
 * Define quais campos do pai são propagados para a variação quando a flag sync está ativa.
 */
export interface ParentFieldsSnapshot {
    unitPrice?: number;
    promoPrice?: number;
    costPrice?: number;
    description?: string;
    width?: number;
    height?: number;
    depth?: number;
    weight?: number;
    ipiPercent?: number;
    freightCost?: number;
    freightType?: 'fixed' | 'percentage' | 'none';
}

/**
 * Aplica os valores do pai sobre uma variação somente para os campos
 * onde a flag de sincronização correspondente está ativa.
 * Retorna a mesma referência se nenhum campo foi alterado (para evitar re-renders desnecessários).
 */
export const applyParentValuesToVariation = (
    variation: Variation,
    parent: ParentFieldsSnapshot
): Variation => {
    const updated: Variation = { ...variation };
    let changed = false;

    if (variation.syncUnitPrice && parent.unitPrice !== undefined && updated.unitPrice !== parent.unitPrice) {
        updated.unitPrice = parent.unitPrice;
        changed = true;
    }

    if (variation.syncPromoPrice !== false && updated.promoPrice !== parent.promoPrice) {
        updated.promoPrice = parent.promoPrice;
        changed = true;
    }

    if (variation.syncCostPrice && parent.costPrice !== undefined && updated.costPrice !== parent.costPrice) {
        updated.costPrice = parent.costPrice;
        changed = true;
    }

    if (variation.syncDescription && parent.description !== undefined && updated.description !== parent.description) {
        updated.description = parent.description;
        changed = true;
    }

    if (variation.syncWidth && parent.width !== undefined && updated.width !== parent.width) {
        updated.width = parent.width;
        changed = true;
    }

    if (variation.syncHeight && parent.height !== undefined && updated.height !== parent.height) {
        updated.height = parent.height;
        changed = true;
    }

    if (variation.syncDepth && parent.depth !== undefined && updated.depth !== parent.depth) {
        updated.depth = parent.depth;
        changed = true;
    }

    if (variation.syncWeight && parent.weight !== undefined && updated.weight !== parent.weight) {
        updated.weight = parent.weight;
        changed = true;
    }

    if (variation.syncIpi && parent.ipiPercent !== undefined && updated.ipiPercent !== parent.ipiPercent) {
        updated.ipiPercent = parent.ipiPercent;
        changed = true;
    }

    if (variation.syncFreight && parent.freightCost !== undefined && updated.freightCost !== parent.freightCost) {
        updated.freightCost = parent.freightCost;
        changed = true;
    }

    if (variation.syncFreight && parent.freightType !== undefined && updated.freightType !== parent.freightType) {
        updated.freightType = parent.freightType;
        changed = true;
    }

    return changed ? updated : variation;
};

/**
 * Aplica os valores do pai a todas as variações do produto que possuem
 * as respectivas flags de sincronização ativas.
 * Retorna a mesma referência do array se nenhuma variação foi alterada.
 */
export const syncVariationsWithParent = (
    variations: Variation[] | undefined,
    parent: ParentFieldsSnapshot
): Variation[] => {
    if (!variations || variations.length === 0) return variations || [];

    let anyChanged = false;
    const updated = variations.map(v => {
        const next = applyParentValuesToVariation(v, parent);
        if (next !== v) anyChanged = true;
        return next;
    });

    return anyChanged ? updated : variations;
};

/**
 * Extrai o snapshot dos campos herdáveis do produto pai a partir do formData.
 */
export const extractParentSnapshot = (formData: Partial<Product>): ParentFieldsSnapshot => ({
    unitPrice: formData.unitPrice,
    promoPrice: formData.promoPrice,
    costPrice: formData.costPrice,
    description: formData.description,
    width: formData.width,
    height: formData.height,
    depth: formData.depth,
    weight: formData.weight,
    ipiPercent: formData.ipiPercent,
    freightCost: formData.freightCost,
    freightType: formData.freightType as 'fixed' | 'percentage' | 'none' | undefined,
});
