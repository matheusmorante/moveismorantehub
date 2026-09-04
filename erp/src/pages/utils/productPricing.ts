import Product, { Variation } from '../types/product.type';

export interface SelectedProductPricing {
    unitPrice: number;
    unitDiscount: number;
    discountType: 'fixed' | 'percentage';
    finalUnitPrice: number;
    hasDiscount: boolean;
}

/**
 * Extrai os preços de venda e promocional de um produto ou variação,
 * calculando o preço unitário regular, o desconto concedido (se houver preço promocional)
 * e o preço unitário final (líquido).
 */
export const getSelectedProductPricing = (
    product?: Partial<Product> | null,
    variation?: Partial<Variation> | null
): SelectedProductPricing => {
    if (!product && !variation) {
        return {
            unitPrice: 0,
            unitDiscount: 0,
            discountType: 'fixed',
            finalUnitPrice: 0,
            hasDiscount: false
        };
    }

    // Preço regular original (unitPrice)
    const rawUnitPrice = variation
        ? (variation.syncUnitPrice ? (product?.unitPrice ?? variation.unitPrice) : (variation.unitPrice ?? product?.unitPrice))
        : (product?.unitPrice ?? 0);
    const unitPrice = Math.max(0, Math.round((Number(rawUnitPrice) || 0) * 100) / 100);

    // Preço promocional (promoPrice)
    let rawPromoPrice: number | undefined = undefined;
    if (variation) {
        if (variation.syncPromoPrice !== false && product?.promoPrice !== undefined && product?.promoPrice !== null) {
            rawPromoPrice = Number(product.promoPrice);
        } else if (variation.promoPrice !== undefined && variation.promoPrice !== null) {
            rawPromoPrice = Number(variation.promoPrice);
        } else if (product?.promoPrice !== undefined && product?.promoPrice !== null) {
            rawPromoPrice = Number(product.promoPrice);
        }
    } else if (product?.promoPrice !== undefined && product?.promoPrice !== null) {
        rawPromoPrice = Number(product.promoPrice);
    }

    const promoPrice = rawPromoPrice !== undefined && !isNaN(rawPromoPrice)
        ? Math.max(0, Math.round(Number(rawPromoPrice) * 100) / 100)
        : 0;

    // Há desconto se o preço promocional for maior que zero e estritamente menor que o preço de tabela
    if (promoPrice > 0 && promoPrice < unitPrice) {
        const discountValue = Math.round((unitPrice - promoPrice) * 100) / 100;
        return {
            unitPrice,
            unitDiscount: discountValue,
            discountType: 'fixed',
            finalUnitPrice: promoPrice,
            hasDiscount: true
        };
    }

    return {
        unitPrice,
        unitDiscount: 0,
        discountType: 'fixed',
        finalUnitPrice: unitPrice,
        hasDiscount: false
    };
};
