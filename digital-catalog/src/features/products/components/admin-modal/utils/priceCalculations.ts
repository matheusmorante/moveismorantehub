import { parseStorefrontPrice } from '@/shared-utils/storefrontProductFormSchemas';

export { parseStorefrontPrice };

export function calculateFromPriceChange(
  newPrice: string,
  discountPercent: string,
  currentPromoPrice: string
) {
  const orig = parseStorefrontPrice(newPrice);
  if (isNaN(orig) || orig <= 0) {
    return { promoPrice: '', discountPercent: '', discountFixed: '' };
  }

  if (discountPercent) {
    const pct = parseFloat(discountPercent);
    if (!isNaN(pct)) {
      const fixed = orig * (pct / 100);
      const promo = orig - fixed;
      return {
        promoPrice: promo > 0 ? promo.toFixed(2) : '0',
        discountPercent,
        discountFixed: fixed.toFixed(2),
      };
    }
  } else if (currentPromoPrice) {
    const promo = parseStorefrontPrice(currentPromoPrice);
    if (!isNaN(promo) && promo < orig) {
      const fixed = orig - promo;
      const pct = (fixed / orig) * 100;
      return {
        promoPrice: currentPromoPrice,
        discountPercent: pct.toFixed(1),
        discountFixed: fixed.toFixed(2),
      };
    }
  }

  return { promoPrice: '', discountPercent: '', discountFixed: '' };
}

export function calculateFromDiscountPercent(basePrice: string, valStr: string) {
  const orig = parseStorefrontPrice(basePrice);
  if (isNaN(orig) || orig <= 0 || valStr === '') {
    return { promoPrice: '', discountPercent: valStr, discountFixed: '' };
  }

  const pct = parseFloat(valStr);
  if (isNaN(pct) || pct < 0) {
    return { promoPrice: '', discountPercent: valStr, discountFixed: '' };
  }

  const fixed = orig * (pct / 100);
  const promo = orig - fixed;
  return {
    promoPrice: promo > 0 ? promo.toFixed(2) : '0',
    discountPercent: valStr,
    discountFixed: fixed.toFixed(2),
  };
}

export function calculateFromDiscountFixed(basePrice: string, valStr: string) {
  const orig = parseStorefrontPrice(basePrice);
  if (isNaN(orig) || orig <= 0 || valStr === '') {
    return { promoPrice: '', discountPercent: '', discountFixed: valStr };
  }

  const fixed = parseStorefrontPrice(valStr);
  if (isNaN(fixed) || fixed < 0) {
    return { promoPrice: '', discountPercent: '', discountFixed: valStr };
  }

  const pct = (fixed / orig) * 100;
  const promo = orig - fixed;
  return {
    promoPrice: promo > 0 ? promo.toFixed(2) : '0',
    discountPercent: pct.toFixed(1),
    discountFixed: valStr,
  };
}

export function calculateFromPromoPrice(basePrice: string, valStr: string) {
  const orig = parseStorefrontPrice(basePrice);
  if (isNaN(orig) || orig <= 0 || valStr === '') {
    return { promoPrice: valStr, discountPercent: '', discountFixed: '' };
  }

  const promo = parseStorefrontPrice(valStr);
  if (isNaN(promo) || promo < 0 || promo >= orig) {
    return { promoPrice: valStr, discountPercent: '', discountFixed: '' };
  }

  const fixed = orig - promo;
  const pct = (fixed / orig) * 100;
  return {
    promoPrice: valStr,
    discountPercent: pct.toFixed(1),
    discountFixed: fixed.toFixed(2),
  };
}

export function calculateInitialDiscounts(
  origPrice?: number | string | null,
  promoPrice?: number | string | null
) {
  if (!origPrice || !promoPrice) {
    return { discountPercent: '', discountFixed: '' };
  }
  const orig = typeof origPrice === 'number' ? origPrice : parseStorefrontPrice(origPrice);
  const promo = typeof promoPrice === 'number' ? promoPrice : parseStorefrontPrice(promoPrice);
  if (orig > 0 && promo > 0 && promo < orig) {
    const fixed = orig - promo;
    const pct = (fixed / orig) * 100;
    return {
      discountPercent: pct.toFixed(1),
      discountFixed: fixed.toFixed(2),
    };
  }
  return { discountPercent: '', discountFixed: '' };
}
