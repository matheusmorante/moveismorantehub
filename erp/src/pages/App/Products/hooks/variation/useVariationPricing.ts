import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Product, Variation } from '@/pages/types/product.type';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
  deriveProductDiscountFields,
  toOptionalProductDiscountNumber,
} from '../../../../../../../shared-utils/productDiscountFields';
import { resolveProductVariationPricing } from '../../../../../../../shared-utils/productVariationPricing';

interface UseVariationPricingOptions {
  readonly formData: Variation | null;
  readonly setFormData: Dispatch<SetStateAction<Variation | null>>;
  readonly parentProduct: Pick<Product, 'unitPrice' | 'promoPrice'>;
}

export function useVariationPricing({
  formData,
  setFormData,
  parentProduct,
}: UseVariationPricingOptions) {
  const [varDiscountPercent, setVarDiscountPercent] = useState<number | null>(null);
  const [varDiscountFixed, setVarDiscountFixed] = useState<number | null>(null);

  const updateOwnPricing = (fields: Partial<Variation>) => {
    setFormData((previous) =>
      previous
        ? { ...previous, ...fields, syncUnitPrice: false, syncPromoPrice: false }
        : null
    );
  };

  const updateOwnPromoPricing = (fields: Partial<Variation>) => {
    setFormData((previous) =>
      previous ? { ...previous, ...fields, syncPromoPrice: false } : null
    );
  };

  const getEffectiveDiscountFields = () => {
    const pricing = resolveProductVariationPricing(formData || {}, parentProduct);
    return deriveProductDiscountFields(
      Number(pricing.unitPrice || 0),
      Number(pricing.promoPrice || 0)
    );
  };

  const getEffectiveDiscountPercent = () =>
    toOptionalProductDiscountNumber(getEffectiveDiscountFields().discountPercent);
  const getEffectiveDiscountFixed = () =>
    toOptionalProductDiscountNumber(getEffectiveDiscountFields().discountFixed);

  const handlePriceChange = (newPrice: number) => {
    if (!formData) return;
    updateOwnPricing({ unitPrice: newPrice });

    const orig = newPrice;
    if (orig <= 0) {
      setVarDiscountPercent(null);
      setVarDiscountFixed(null);
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    if (varDiscountPercent !== null && Number.isFinite(varDiscountPercent)) {
      const discount = calculateProductDiscountFromPercent(orig, varDiscountPercent);
      setVarDiscountFixed(toOptionalProductDiscountNumber(discount.discountFixed));
      setFormData((prev) => (prev ? { ...prev, promoPrice: discount.promoPrice } : null));
    }
  };

  const handleDiscountPercentChange = (percent: number | null) => {
    if (!formData) return;
    setVarDiscountPercent(percent);
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    if (orig <= 0 || percent === null) {
      setVarDiscountFixed(null);
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    if (!Number.isFinite(percent) || percent < 0) {
      setVarDiscountFixed(null);
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    const discount = calculateProductDiscountFromPercent(orig, percent);
    setVarDiscountFixed(toOptionalProductDiscountNumber(discount.discountFixed));
    updateOwnPromoPricing({ promoPrice: discount.promoPrice });
  };

  const handleDiscountFixedChange = (fixed: number) => {
    if (!formData) return;
    setVarDiscountFixed(fixed);
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    if (orig <= 0) {
      setVarDiscountPercent(null);
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    if (!Number.isFinite(fixed) || fixed < 0) {
      setVarDiscountPercent(null);
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    const discount = calculateProductDiscountFromFixed(orig, fixed);
    setVarDiscountPercent(toOptionalProductDiscountNumber(discount.discountPercent));
    updateOwnPromoPricing({ promoPrice: discount.promoPrice });
  };

  const handlePromoPriceFieldChange = (promoPrice: number) => {
    if (!formData) return;
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    const discount = calculateProductDiscountFromPromoPrice(orig, promoPrice);
    updateOwnPromoPricing({ promoPrice: discount.promoPrice });
    setVarDiscountFixed(toOptionalProductDiscountNumber(discount.discountFixed));
    setVarDiscountPercent(toOptionalProductDiscountNumber(discount.discountPercent));
  };

  return {
    varDiscountPercent,
    setVarDiscountPercent,
    varDiscountFixed,
    setVarDiscountFixed,
    getEffectiveDiscountPercent,
    getEffectiveDiscountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
  };
}
