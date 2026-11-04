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

const toOptionalPrice = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return parsePrice(value);
};

export function useProductFormPricing(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>
) {
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [discountFixed, setDiscountFixed] = useState<number | null>(null);

  const handlePriceChange = useCallback(
    (newPrice: string | number) => {
      const orig = parsePrice(newPrice);
      setFormData((prev) => {
        const next: Partial<Product> = { ...prev, unitPrice: orig };
        if (orig <= 0) {
          setDiscountPercent(null);
          setDiscountFixed(null);
          next.promoPrice = undefined;
        } else if (discountPercent !== null) {
          const discount = calculateProductDiscountFromPercent(orig, discountPercent);
          setDiscountFixed(toOptionalPrice(discount.discountFixed));
          next.promoPrice = discount.promoPrice;
        } else {
          const discount = calculateProductDiscountFromPromoPrice(orig, parsePrice(prev.promoPrice));
          setDiscountFixed(toOptionalPrice(discount.discountFixed));
          setDiscountPercent(toOptionalPrice(discount.discountPercent));
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
    (value: number | null) => {
      setDiscountPercent(value);
      setFormData((prev) => {
        const orig = prev.unitPrice || 0;
        const discount = calculateProductDiscountFromPercent(orig, value ?? 0);
        setDiscountFixed(toOptionalPrice(discount.discountFixed));
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
    (value: number) => {
      const fixed = value;
      setDiscountFixed(fixed);
      setFormData((prev) => {
        const orig = prev.unitPrice || 0;
        const discount = calculateProductDiscountFromFixed(orig, fixed);
        setDiscountPercent(toOptionalPrice(discount.discountPercent));
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
        setDiscountFixed(toOptionalPrice(discount.discountFixed));
        setDiscountPercent(toOptionalPrice(discount.discountPercent));
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
    setDiscountFixed(toOptionalPrice(fields.discountFixed));
    setDiscountPercent(toOptionalPrice(fields.discountPercent));
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
