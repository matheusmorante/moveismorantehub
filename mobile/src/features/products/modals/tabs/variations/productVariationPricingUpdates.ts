import { parseLocalizedNumber as parseLocalizedPrice } from '../../../domain/productNumbers';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
  deriveProductDiscountFields,
  toOptionalProductDiscountNumber,
} from '../../../../../../../shared-utils/productDiscountFields';
import {
  resolveProductVariationPricing,
  type ProductVariationPricingValue,
} from '../../../../../../../shared-utils/productVariationPricing';

/** Calcula o próximo estado de preço e desconto de uma variação após alteração em um dos campos. */
export function applyMobileVariationPricingFieldUpdate(
  current: any,
  parentData: {
    unitPrice?: ProductVariationPricingValue;
    promoPrice?: ProductVariationPricingValue;
  },
  field: 'price' | 'discountPercent' | 'discountFixed' | 'promoPrice',
  value: number | null
) {
  const effectivePricing = resolveProductVariationPricing(
    {
      syncUnitPrice: current.syncUnitPrice,
      syncPromoPrice: current.syncPromoPrice,
      unitPrice: current.price,
      promoPrice: current.promoPrice,
    },
    { unitPrice: parentData.unitPrice, promoPrice: parentData.promoPrice }
  );
  const regularPrice = parseLocalizedPrice(effectivePricing.unitPrice);
  const currentPromoPrice = parseLocalizedPrice(effectivePricing.promoPrice);
  const inheritedDiscount = deriveProductDiscountFields(regularPrice, currentPromoPrice);
  let next = current;

  if (field === 'discountPercent') {
    const discount =
      value === null
        ? { discountFixed: '', promoPrice: undefined }
        : calculateProductDiscountFromPercent(regularPrice, value);
    next = {
      ...current,
      discountPercent: value ?? undefined,
      discountFixed: toOptionalProductDiscountNumber(discount.discountFixed) ?? undefined,
      promoPrice: discount.promoPrice,
    };
  } else if (field === 'discountFixed') {
    const fixed = value ?? 0;
    const discount = calculateProductDiscountFromFixed(regularPrice, fixed);
    next = {
      ...current,
      discountFixed: value ?? undefined,
      discountPercent: toOptionalProductDiscountNumber(discount.discountPercent) ?? undefined,
      promoPrice: discount.promoPrice,
    };
  } else if (field === 'promoPrice') {
    const discount = calculateProductDiscountFromPromoPrice(regularPrice, value ?? 0);
    next = {
      ...current,
      promoPrice: discount.promoPrice,
      discountPercent: toOptionalProductDiscountNumber(discount.discountPercent) ?? undefined,
      discountFixed: toOptionalProductDiscountNumber(discount.discountFixed) ?? undefined,
    };
  } else {
    const price = value ?? 0;
    const percent =
      toOptionalProductDiscountNumber(current.discountPercent) ??
      toOptionalProductDiscountNumber(inheritedDiscount.discountPercent);
    const fixed = toOptionalProductDiscountNumber(current.discountFixed);
    if (price <= 0) {
      next = {
        ...current,
        price,
        discountPercent: undefined,
        discountFixed: undefined,
        promoPrice: undefined,
      };
    } else if (percent !== null) {
      const discount = calculateProductDiscountFromPercent(price, percent);
      next = {
        ...current,
        price,
        discountPercent: percent,
        discountFixed: toOptionalProductDiscountNumber(discount.discountFixed) ?? undefined,
        promoPrice: discount.promoPrice,
      };
    } else if (fixed !== null) {
      next = { ...current, price };
    } else {
      const discount = calculateProductDiscountFromPromoPrice(price, currentPromoPrice);
      next = {
        ...current,
        price,
        discountPercent: toOptionalProductDiscountNumber(discount.discountPercent) ?? undefined,
        discountFixed: toOptionalProductDiscountNumber(discount.discountFixed) ?? undefined,
        promoPrice: discount.promoPrice,
      };
    }
  }

  return {
    ...next,
    syncUnitPrice: field === 'price' ? false : current.syncUnitPrice,
    syncPromoPrice: false,
  };
}
