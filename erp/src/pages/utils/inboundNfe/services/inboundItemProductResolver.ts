import type { InboundInvoiceItem } from '../types/inboundNfeTypes';
import { getFullProduct } from '@/pages/utils/productService';

export interface LinkedProductDetails {
    productErpName: string;
    linkedProductCode: string;
    sellingPrice: number;
}

const GENERIC_NAME_PATTERNS = [
    /^produto vinculado$/i,
    /^produto já vinculado/i,
    /^variação vinculada/i,
];

export const isGenericOrEmptyProductName = (name?: string): boolean => {
    if (!name || !name.trim() || name.trim() === '—' || name.trim() === '-') return true;
    const clean = name.trim();
    return GENERIC_NAME_PATTERNS.some((pattern) => pattern.test(clean));
};

export const resolveLinkedProductDetails = async (
    productId: string,
    variationId?: string
): Promise<LinkedProductDetails | null> => {
    if (!productId) return null;

    try {
        const product = await getFullProduct(productId);
        if (!product) return null;

        const variation = variationId
            ? product.variations?.find((v) => v.id === variationId)
            : undefined;

        const linkedProductCode = (
            variation?.sku ||
            product.code ||
            product.sku ||
            product.variations?.[0]?.sku ||
            ''
        ).trim();

        const productErpName = (
            variation?.name ||
            variation?.title ||
            product.name ||
            product.title ||
            product.variations?.[0]?.name ||
            product.variations?.[0]?.title ||
            ''
        ).trim();

        const sellingPrice = Number(variation?.unitPrice || product.unitPrice || product.variations?.[0]?.unitPrice || 0);

        return {
            linkedProductCode,
            productErpName,
            sellingPrice,
        };
    } catch (error) {
        console.warn(`[inboundItemProductResolver] Não foi possível obter produto ${productId}:`, error);
        return null;
    }
};

export const enrichInboundItemsWithProductDetails = async (
    items: InboundInvoiceItem[]
): Promise<InboundInvoiceItem[]> => {
    const productCache = new Map<string, Promise<LinkedProductDetails | null>>();

    const getCachedDetails = (productId: string, variationId?: string) => {
        const cacheKey = `${productId}__${variationId || 'main'}`;
        if (!productCache.has(cacheKey)) {
            productCache.set(cacheKey, resolveLinkedProductDetails(productId, variationId));
        }
        return productCache.get(cacheKey)!;
    };

    return Promise.all(
        items.map(async (item) => {
            if (!item.matchedProductId) return item;

            const needsCode = !item.linkedProductCode || item.linkedProductCode.trim() === '—' || item.linkedProductCode.trim() === '-';
            const needsName = isGenericOrEmptyProductName(item.productErpName);
            // A variação é a fonte de verdade de SKU e nome. Recarregamos seus dados
            // mesmo que o snapshot da NF já tenha texto, pois ele pode pertencer a
            // outra variação do mesmo produto-pai.
            const hasLinkedVariation = Boolean(item.matchedVariationId);

            if (!hasLinkedVariation && !needsCode && !needsName) return item;

            const details = await getCachedDetails(item.matchedProductId, item.matchedVariationId);
            if (!details) return item;

            return {
                ...item,
                linkedProductCode: details.linkedProductCode || item.linkedProductCode,
                productErpName: details.productErpName || item.productErpName,
                sellingPrice: details.sellingPrice > 0 ? details.sellingPrice : item.sellingPrice,
            };
        })
    );
};
