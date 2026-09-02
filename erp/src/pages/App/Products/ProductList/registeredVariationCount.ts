const VARIATION_SKU_PATTERN = /^\d{6}-\d{2}$/;

export type ProductWithVariations = {
    id?: string;
    status?: string | null;
    active?: boolean | null;
    is_draft?: boolean | null;
    deleted?: boolean | null;
    product_variations?: Array<{
        id?: string;
        sku?: string | null;
        status?: string | null;
        active?: boolean | null;
    }> | null;
};

const hasVariationSku = (variation: { sku?: string | null }) =>
    VARIATION_SKU_PATTERN.test(String(variation.sku || '').trim());

/**
 * Conta exclusivamente as variações filhas cadastradas (ignorando o produto pai, que é apenas referência).
 */
export const getRegisteredVariationCount = (products: ProductWithVariations[]) =>
    products.reduce((total, product) => {
        const variations = Array.isArray(product.product_variations) ? product.product_variations : [];
        const variationCount = variations.filter(hasVariationSku).length;

        return total + variationCount;
    }, 0);

/**
 * Calcula todas as métricas do resumo da sidebar contando EXCLUSIVAMENTE as variações filhas:
 * - total: total de variações filhas cadastradas (não rascunho e não deletadas)
 * - published: variações filhas ativas e publicadas (pai ativo e não rascunho)
 * - disabled: variações filhas desativadas (inativas ou pai inativo)
 * - drafts: variações filhas em rascunho (ou pertencentes a rascunhos)
 */
export const calculateVariationCatalogStats = (products: ProductWithVariations[]) => {
    let total = 0;
    let published = 0;
    let disabled = 0;
    let drafts = 0;

    (products || []).forEach(product => {
        if (product.deleted) return;

        const isParentDraft = Boolean(product.is_draft) || product.status === 'draft';
        const isParentActive = product.active !== false;
        const variations = Array.isArray(product.product_variations) ? product.product_variations : [];

        variations.forEach(v => {
            // Ignora se não for variação com SKU estruturado
            if (!hasVariationSku(v)) return;

            if (isParentDraft) {
                drafts += 1;
            } else {
                total += 1;
                const isVarActive = isParentActive && v.active !== false;
                const isVarPublished = product.status === 'published' && v.status !== 'hidden';

                if (isVarActive && isVarPublished) {
                    published += 1;
                } else if (!isVarActive) {
                    disabled += 1;
                }
            }
        });
    });

    return { total, published, disabled, drafts };
};

