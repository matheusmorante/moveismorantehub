import Product, { Variation } from '../types/product.type';

export interface SelectedProductPricing {
  unitPrice: number;
  unitDiscount: number;
  discountType: 'fixed' | 'percentage';
  finalUnitPrice: number;
  hasDiscount: boolean;
  productDiscountAmount: number;
  promotionDiscountPercent?: number;
  promotionId?: string;
  promotionName?: string;
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
      hasDiscount: false,
      productDiscountAmount: 0,
    };
  }

  // Preço regular original (unitPrice)
  const rawUnitPrice = variation
    ? variation.syncUnitPrice
      ? (product?.unitPrice ?? variation.unitPrice)
      : (variation.unitPrice ?? product?.unitPrice)
    : (product?.unitPrice ?? 0);
  const unitPrice = Math.max(0, Math.round((Number(rawUnitPrice) || 0) * 100) / 100);

  // Preço promocional (promoPrice)
  let rawPromoPrice: number | undefined = undefined;
  if (variation) {
    if (
      variation.syncPromoPrice !== false &&
      product?.promoPrice !== undefined &&
      product?.promoPrice !== null
    ) {
      rawPromoPrice = Number(product.promoPrice);
    } else if (variation.promoPrice !== undefined && variation.promoPrice !== null) {
      rawPromoPrice = Number(variation.promoPrice);
    } else if (product?.promoPrice !== undefined && product?.promoPrice !== null) {
      rawPromoPrice = Number(product.promoPrice);
    }
  } else if (product?.promoPrice !== undefined && product?.promoPrice !== null) {
    rawPromoPrice = Number(product.promoPrice);
  }

  const promoPrice =
    rawPromoPrice !== undefined && !isNaN(rawPromoPrice)
      ? Math.max(0, Math.round(Number(rawPromoPrice) * 100) / 100)
      : 0;

  // A campanha é informativa. O atendente confere as condições e, se elegível,
  // lança o desconto manualmente no pedido; ela não altera o preço do produto.
  const productPrice = promoPrice > 0 && promoPrice < unitPrice ? promoPrice : unitPrice;
  const rawCampaignPercent = Number(
    variation?.promotionDiscountPercent ?? product?.promotionDiscountPercent ?? 0
  );
  const promotionDiscountPercent =
    Number.isFinite(rawCampaignPercent) && rawCampaignPercent > 0 && rawCampaignPercent <= 100
      ? rawCampaignPercent
      : 0;
  const finalUnitPrice = productPrice;
  const unitDiscount = Math.max(0, Math.round((unitPrice - finalUnitPrice + Number.EPSILON) * 100) / 100);
  const productDiscountAmount = Math.max(0, Math.round((unitPrice - productPrice + Number.EPSILON) * 100) / 100);
  return {
    unitPrice,
    unitDiscount,
    discountType: 'fixed',
    finalUnitPrice,
    hasDiscount: unitDiscount > 0,
    productDiscountAmount,
    promotionDiscountPercent: promotionDiscountPercent || undefined,
    promotionId: variation?.promotionId ?? product?.promotionId,
    promotionName: variation?.promotionName ?? product?.promotionName,
  };
};
