import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Product, Variation } from '@/pages/types/product.type';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
  deriveProductDiscountFields,
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
  const [varDiscountPercent, setVarDiscountPercent] = useState('');
  const [varDiscountFixed, setVarDiscountFixed] = useState('');

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

  const getEffectiveDiscountPercent = () => getEffectiveDiscountFields().discountPercent;
  const getEffectiveDiscountFixed = () => getEffectiveDiscountFields().discountFixed;

  const handlePriceChange = (valStr: string) => {
    if (!formData) return;
    const newPrice = parseFloat(valStr) || 0;
    updateOwnPricing({ unitPrice: newPrice });

    const orig = newPrice;
    if (orig <= 0) {
      setVarDiscountPercent('');
      setVarDiscountFixed('');
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    if (varDiscountPercent) {
      const pct = parseFloat(varDiscountPercent);
      if (!isNaN(pct)) {
        const discount = calculateProductDiscountFromPercent(orig, pct);
        setVarDiscountFixed(discount.discountFixed);
        setFormData((prev) => (prev ? { ...prev, promoPrice: discount.promoPrice } : null));
      }
    }
  };

  const handleDiscountPercentChange = (valStr: string) => {
    if (!formData) return;
    setVarDiscountPercent(valStr);
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    if (orig <= 0 || valStr === '') {
      setVarDiscountFixed('');
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    const pct = parseFloat(valStr);
    if (isNaN(pct) || pct < 0) {
      setVarDiscountFixed('');
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    const discount = calculateProductDiscountFromPercent(orig, pct);
    setVarDiscountFixed(discount.discountFixed);
    updateOwnPromoPricing({ promoPrice: discount.promoPrice });
  };

  const handleDiscountFixedChange = (valStr: string) => {
    if (!formData) return;
    setVarDiscountFixed(valStr);
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    if (orig <= 0 || valStr === '') {
      setVarDiscountPercent('');
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    const fixed = parseFloat(valStr);
    if (isNaN(fixed) || fixed < 0) {
      setVarDiscountPercent('');
      updateOwnPromoPricing({ promoPrice: undefined });
      return;
    }

    const discount = calculateProductDiscountFromFixed(orig, fixed);
    setVarDiscountPercent(discount.discountPercent);
    updateOwnPromoPricing({ promoPrice: discount.promoPrice });
  };

  const handlePromoPriceFieldChange = (valStr: string) => {
    if (!formData) return;
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    const promo = parseFloat(valStr) || 0;
    const discount = calculateProductDiscountFromPromoPrice(orig, promo);
    updateOwnPromoPricing({ promoPrice: discount.promoPrice });
    setVarDiscountFixed(discount.discountFixed);
    setVarDiscountPercent(discount.discountPercent);
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
