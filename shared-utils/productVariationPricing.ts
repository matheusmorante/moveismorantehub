export type ProductVariationPricingValue = number | string | null | undefined;

export interface ProductVariationPricingFields {
  unitPrice?: ProductVariationPricingValue;
  promoPrice?: ProductVariationPricingValue;
  syncUnitPrice?: boolean | null;
  syncPromoPrice?: boolean | null;
}

export interface ProductParentPricingFields {
  unitPrice?: ProductVariationPricingValue;
  promoPrice?: ProductVariationPricingValue;
}

export interface EffectiveProductVariationPricing {
  unitPrice: ProductVariationPricingValue;
  promoPrice: ProductVariationPricingValue;
  inheritsUnitPrice: boolean;
  inheritsPromoPrice: boolean;
  hasMixedInheritance: boolean;
}

/** Resolves parent/variation values independently because persisted ownership has two flags. */
export const resolveProductVariationPricing = (
  variation: ProductVariationPricingFields,
  parent: ProductParentPricingFields
): EffectiveProductVariationPricing => {
  const inheritsUnitPrice = variation.syncUnitPrice !== false;
  const inheritsPromoPrice = variation.syncPromoPrice !== false;

  return {
    unitPrice: inheritsUnitPrice ? parent.unitPrice : variation.unitPrice,
    promoPrice: inheritsPromoPrice ? parent.promoPrice : variation.promoPrice,
    inheritsUnitPrice,
    inheritsPromoPrice,
    hasMixedInheritance: inheritsUnitPrice !== inheritsPromoPrice,
  };
};
