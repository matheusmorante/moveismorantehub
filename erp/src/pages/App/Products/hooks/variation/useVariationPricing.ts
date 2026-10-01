import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Product, Variation } from '@/pages/types/product.type';

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
        const fixed = orig * (pct / 100);
        setVarDiscountFixed(fixed.toFixed(2));
        const promo = orig - fixed;
        setFormData((prev) =>
          prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 } : null
        );
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

    const fixed = orig * (pct / 100);
    setVarDiscountFixed(fixed.toFixed(2));
    const promo = orig - fixed;
    setFormData((prev) =>
      prev
        ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncUnitPrice: false }
        : null
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

    const pct = (fixed / orig) * 100;
    setVarDiscountPercent(pct.toFixed(1));
    const promo = orig - fixed;
    setFormData((prev) =>
      prev
        ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncUnitPrice: false }
        : null
    );
  };

  const handlePromoPriceFieldChange = (valStr: string) => {
    if (!formData) return;
    const promo = parseFloat(valStr) || 0;
    setFormData((prev) =>
      prev ? { ...prev, promoPrice: promo > 0 ? promo : undefined, syncUnitPrice: false } : null
    );

    const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
    if (orig <= 0 || valStr === '' || promo >= orig) {
      setVarDiscountPercent('');
      setVarDiscountFixed('');
      return;
    }

    const fixed = orig - promo;
    const pct = (fixed / orig) * 100;
    setVarDiscountFixed(fixed.toFixed(2));
    setVarDiscountPercent(pct.toFixed(1));
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
