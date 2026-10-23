import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Product, Variation } from '@/pages/types/product.type';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
} from '../../../../../../../shared-utils/productDiscountFields';

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

  const getParentDiscountPercent = () => {
    const orig = parentProduct?.unitPrice || 0;
    const promo = parentProduct?.promoPrice || 0;
    if (orig > 0 && promo > 0 && promo < orig) {
      return (((orig - promo) / orig) * 100).toFixed(1);
    }
    return '';
  };

  const getParentDiscountFixed = () => {
    const orig = parentProduct?.unitPrice || 0;
    const promo = parentProduct?.promoPrice || 0;
    if (orig > 0 && promo > 0 && promo < orig) {
      return (orig - promo).toFixed(2);
    }
    return '';
  };

  const handlePriceChange = (valStr: string) => {
    if (!formData) return;
    const newPrice = parseFloat(valStr) || 0;
    setFormData((prev) => (prev ? { ...prev, unitPrice: newPrice, syncUnitPrice: false } : null));

    const orig = newPrice;
    if (orig <= 0) {
      setVarDiscountPercent('');
      setVarDiscountFixed('');
      setFormData((prev) => (prev ? { ...prev, promoPrice: undefined } : null));
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
      setFormData((prev) => (prev ? { ...prev, promoPrice: undefined } : null));
      return;
    }

    const pct = parseFloat(valStr);
    if (isNaN(pct) || pct < 0) {
      setVarDiscountFixed('');
      setFormData((prev) => (prev ? { ...prev, promoPrice: undefined } : null));
      return;
    }

    const discount = calculateProductDiscountFromPercent(orig, pct);
    setVarDiscountFixed(discount.discountFixed);
    setFormData((prev) =>
      prev ? { ...prev, promoPrice: discount.promoPrice, syncUnitPrice: false } : null
    );
  };

  const handleDiscountFixedChange = (valStr: string) => {
    if (!formData) return;
    setVarDiscountFixed(valStr);
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    if (orig <= 0 || valStr === '') {
      setVarDiscountPercent('');
      setFormData((prev) => (prev ? { ...prev, promoPrice: undefined } : null));
      return;
    }

    const fixed = parseFloat(valStr);
    if (isNaN(fixed) || fixed < 0) {
      setVarDiscountPercent('');
      setFormData((prev) => (prev ? { ...prev, promoPrice: undefined } : null));
      return;
    }

    const discount = calculateProductDiscountFromFixed(orig, fixed);
    setVarDiscountPercent(discount.discountPercent);
    setFormData((prev) =>
      prev ? { ...prev, promoPrice: discount.promoPrice, syncUnitPrice: false } : null
    );
  };

  const handlePromoPriceFieldChange = (valStr: string) => {
    if (!formData) return;
    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    const promo = parseFloat(valStr) || 0;
    const discount = calculateProductDiscountFromPromoPrice(orig, promo);
    setFormData((prev) =>
      prev ? { ...prev, promoPrice: discount.promoPrice, syncUnitPrice: false } : null
    );
    setVarDiscountFixed(discount.discountFixed);
    setVarDiscountPercent(discount.discountPercent);
  };

  return {
    varDiscountPercent,
    setVarDiscountPercent,
    varDiscountFixed,
    setVarDiscountFixed,
    getParentDiscountPercent,
    getParentDiscountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
  };
}
