export interface ProductDiscountFields {
  discountFixed: string;
  discountPercent: string;
}

export interface ProductDiscountFromPercent {
  discountFixed: string;
  promoPrice: number | undefined;
}

export interface ProductDiscountFromFixed {
  discountPercent: string;
  promoPrice: number | undefined;
}

export interface ProductDiscountValidationIssue {
  field: 'discountPercent' | 'discountFixed';
  message: string;
}

const parseDiscountInput = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const raw = value.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  if (!raw) return Number.NaN;
  if (!/^-?[\d.,]+$/.test(raw)) return Number.NaN;

  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  let normalized = raw;
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? ',' : '.';
    normalized = raw
      .replace(decimalSeparator === ',' ? /\./g : /,/g, '')
      .replace(decimalSeparator, '.');
  } else if (comma >= 0) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if ((raw.match(/\./g) || []).length > 1) {
    const lastDot = raw.lastIndexOf('.');
    normalized = raw.slice(0, lastDot).replace(/\./g, '') + raw.slice(lastDot);
  }

  return Number(normalized);
};

/** Keeps the ERP and mobile variation discount bounds on the same domain rule. */
export function getProductDiscountValidationIssues(
  discountPercent: string | number | null | undefined,
  discountFixed: string | number | null | undefined,
  unitPrice: number
): ProductDiscountValidationIssue[] {
  const issues: ProductDiscountValidationIssue[] = [];
  const percentRaw = String(discountPercent ?? '').trim();
  const fixedRaw = String(discountFixed ?? '').trim();

  if (percentRaw) {
    const percent = parseDiscountInput(percentRaw);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      issues.push({
        field: 'discountPercent',
        message: 'Informe um desconto percentual entre zero e 100.',
      });
    }
  }

  if (fixedRaw) {
    const fixed = parseDiscountInput(fixedRaw);
    if (!Number.isFinite(fixed) || fixed < 0 || fixed > unitPrice) {
      issues.push({
        field: 'discountFixed',
        message: 'O desconto em reais deve ficar entre zero e o preço de venda.',
      });
    }
  }

  return issues;
}

const toPositiveFiniteNumber = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export function calculateProductDiscountFromPercent(
  unitPrice: number,
  discountPercent: number
): ProductDiscountFromPercent {
  const original = toPositiveFiniteNumber(unitPrice);
  const percent = toPositiveFiniteNumber(discountPercent);
  if (original === 0 || percent === 0) return { discountFixed: '', promoPrice: undefined };

  const fixed = original * (percent / 100);
  const roundedPromo = Number((original - fixed).toFixed(2));
  return {
    discountFixed: fixed.toFixed(2),
    promoPrice: roundedPromo > 0 ? roundedPromo : undefined,
  };
}

export function calculateProductDiscountFromFixed(
  unitPrice: number,
  discountFixed: number
): ProductDiscountFromFixed {
  const original = toPositiveFiniteNumber(unitPrice);
  const fixed = toPositiveFiniteNumber(discountFixed);
  if (original === 0 || fixed === 0) return { discountPercent: '', promoPrice: undefined };

  const roundedPromo = Number((original - fixed).toFixed(2));
  return {
    discountPercent: ((fixed / original) * 100).toFixed(1),
    promoPrice: roundedPromo > 0 ? roundedPromo : undefined,
  };
}

export function calculateProductDiscountFromPromoPrice(
  unitPrice: number,
  promoPrice: number
): ProductDiscountFields & { promoPrice: number | undefined } {
  const original = toPositiveFiniteNumber(unitPrice);
  const promotional = toPositiveFiniteNumber(promoPrice);

  if (original > 0 && promotional > 0 && promotional < original) {
    const difference = original - promotional;
    return {
      discountFixed: difference.toFixed(2),
      discountPercent: ((difference / original) * 100).toFixed(1),
      promoPrice: promotional,
    };
  }

  return {
    discountFixed: '',
    discountPercent: '',
    promoPrice: promotional > 0 ? promotional : undefined,
  };
}

export function deriveProductDiscountFields(
  unitPrice?: number | null,
  promoPrice?: number | null
): ProductDiscountFields {
  const result = calculateProductDiscountFromPromoPrice(unitPrice || 0, promoPrice || 0);
  return { discountFixed: result.discountFixed, discountPercent: result.discountPercent };
}
