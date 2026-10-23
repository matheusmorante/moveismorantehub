import React, { useState, useCallback } from 'react';
import type Product from '@/pages/types/product.type';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
  deriveProductDiscountFields,
} from '../../../../../../../shared-utils/productDiscountFields';
import { syncVariationsWithParent } from '../../domain/variationParentSync';

/**
 * Converte valor desconhecido (string ou number) para number positivo ou zero,
 * com suporte a separador decimal brasileiro e proteção contra NaN.
 */
export const parsePrice = (val: unknown): number => {
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = String(val)
    .replace(/[^\d.,]/g, '')
    .replace(',', '.');
  const parsed = parseFloat(clean);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function useProductFormPricing(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>
) {
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountFixed, setDiscountFixed] = useState('');

  const handlePriceChange = useCallback(
    (newPrice: string | number) => {
      const orig = parsePrice(newPrice);
      setFormData((prev) => {
        const next: Partial<Product> = { ...prev, unitPrice: orig };
        if (orig <= 0) {
          setDiscountPercent('');
          setDiscountFixed('');
          next.promoPrice = undefined;
        } else if (discountPercent) {
          const pct = Number(discountPercent.replace(',', '.'));
          const discount = calculateProductDiscountFromPercent(orig, pct);
          setDiscountFixed(discount.discountFixed);
          next.promoPrice = discount.promoPrice;
        } else {
          const discount = calculateProductDiscountFromPromoPrice(orig, parsePrice(prev.promoPrice));
          setDiscountFixed(discount.discountFixed);
          setDiscountPercent(discount.discountPercent);
          next.promoPrice = discount.promoPrice;
        }

        // Propagar para variações herdando preço do pai
        if (next.variations?.length) {
          next.variations = syncVariationsWithParent(next.variations, {
            unitPrice: next.unitPrice,
            promoPrice: next.promoPrice,
          });
        }

        return next;
      });
    },
    [discountPercent, setFormData]
  );

  const handleDiscountPercentChange = useCallback(
    (valStr: string) => {
      setDiscountPercent(valStr);
      setFormData((prev) => {
        const orig = prev.unitPrice || 0;
        const pct = valStr.trim() ? Number(valStr.replace(',', '.')) : 0;
        const discount = calculateProductDiscountFromPercent(orig, pct);
        setDiscountFixed(discount.discountFixed);
        const next: Partial<Product> = { ...prev, promoPrice: discount.promoPrice };
        if (next.variations?.length) {
          next.variations = syncVariationsWithParent(next.variations, {
            promoPrice: discount.promoPrice,
          });
        }
        return next;
      });
    },
    [setFormData]
  );

  const handleDiscountFixedChange = useCallback(
    (valStr: string | number) => {
      const fixed = parsePrice(valStr);
      setDiscountFixed(String(valStr));
      setFormData((prev) => {
        const orig = prev.unitPrice || 0;
        const discount = calculateProductDiscountFromFixed(orig, fixed);
        setDiscountPercent(discount.discountPercent);
        const next: Partial<Product> = { ...prev, promoPrice: discount.promoPrice };
        if (next.variations?.length) {
          next.variations = syncVariationsWithParent(next.variations, {
            promoPrice: discount.promoPrice,
          });
        }
        return next;
      });
    },
    [setFormData]
  );

  const handlePromoPriceFieldChange = useCallback(
    (valStr: string | number) => {
      const promo = parsePrice(valStr);
      setFormData((prev) => {
        const orig = prev.unitPrice || 0;
        const discount = calculateProductDiscountFromPromoPrice(orig, promo);
        setDiscountFixed(discount.discountFixed);
        setDiscountPercent(discount.discountPercent);
        const next: Partial<Product> = { ...prev, promoPrice: discount.promoPrice };
        if (next.variations?.length) {
          next.variations = syncVariationsWithParent(next.variations, {
            promoPrice: discount.promoPrice,
          });
        }
        return next;
      });
    },
    [setFormData]
  );

  const initializeDiscounts = useCallback((unitPrice?: number, promoPrice?: number) => {
    const fields = deriveProductDiscountFields(unitPrice, promoPrice);
    setDiscountFixed(fields.discountFixed);
    setDiscountPercent(fields.discountPercent);
  }, []);

  return {
    discountPercent,
    discountFixed,
    setDiscountPercent,
    setDiscountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
    initializeDiscounts,
  };
}
