import {
  getCompleteVariationName,
  normalizeCompleteVariationName,
} from './productVariationNameValidation';

const isSemGtin = (value: string) => value.trim().toLocaleUpperCase('pt-BR') === 'SEM GTIN';

/** Uses cEAN first and cEANTrib only when cEAN is empty or SEM GTIN. */
export const getInboundGtin = (cEAN?: string, cEANTrib?: string): string | undefined => {
  const primary = String(cEAN || '').trim();
  const selected = !primary || isSemGtin(primary) ? String(cEANTrib || '').trim() : primary;
  if (!selected || isSemGtin(selected)) return undefined;
  const digits = selected.replace(/\D/g, '');
  return [8, 12, 13, 14].includes(digits.length) ? digits : undefined;
};

export const normalizeNcm = (value?: string | null): string =>
  String(value || '').replace(/\D/g, '');

export const getCompleteQuickVariationName = (parentName: string, suffix: string): string => {
  const parent = parentName.trim();
  const normalizedSuffix = suffix.trim().replace(/^[\s\-_:]+/u, '');
  if (!parent) return normalizedSuffix;
  if (!normalizedSuffix) return parent;
  if (normalizedSuffix.toLocaleLowerCase('pt-BR').startsWith(parent.toLocaleLowerCase('pt-BR'))) {
    return normalizedSuffix;
  }
  return `${parent} ${normalizedSuffix}`;
};

export const hasSiblingVariationName = (
  variations: readonly Record<string, any>[],
  parentName: string,
  candidateName: string,
  excludeVariationId?: string,
): boolean => {
  const normalizedCandidate = normalizeCompleteVariationName(candidateName);
  return variations.some((variation) => {
    if (excludeVariationId && String(variation.id) === excludeVariationId) return false;
    const completeName = getCompleteVariationName(variation, parentName);
    return normalizeCompleteVariationName(completeName) === normalizedCandidate;
  });
};

/** Stores an inbound item's landed cost on the new variation instead of inheriting the parent's cost. */
export const withOwnInboundVariationCost = <T extends object>(variation: T, costPrice: number) => ({
  ...variation,
  costPrice,
  syncCostPrice: false as const,
});
