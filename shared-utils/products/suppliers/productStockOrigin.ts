export type ProductStockKind = 'normal' | 'salvado' | 'usado';
export type StockOrigin = 'Convencional' | 'Salvados' | 'Usados';

export interface ProductKindCandidate {
  productKind?: unknown;
  product_kind?: unknown;
  condition?: unknown;
  is_salvado?: unknown;
  stock_origin?: unknown;
  stockOrigins?: unknown;
}

export interface ProductStockOriginCandidate extends ProductKindCandidate {
  opportunityId?: string | null;
  opportunity_id?: string | null;
  opportunityName?: string | null;
  opportunity?: { name?: string | null } | null;
}

export const getProductKind = (
  value?: ProductKindCandidate | null
): ProductStockKind => {
  const kind = value?.productKind ?? value?.product_kind ?? value?.condition;
  if (
    kind === 'salvado' ||
    kind === 'salvados' ||
    value?.is_salvado === true ||
    value?.stock_origin === 'salvados'
  ) {
    return 'salvado';
  }
  if (kind === 'usado' || kind === 'usados' || value?.stock_origin === 'usados') {
    return 'usado';
  }
  return 'normal';
};

/** Matches the ERP rule for hiding the ERP status badge on Salvados items. */
export const isSalvadoStockOrigin = (
  product?: ProductStockOriginCandidate | null,
  variation?: unknown,
  opportunityName?: string | null
): boolean => {
  if (
    getProductKind(product) === 'salvado' ||
    getProductKind(variation as ProductKindCandidate | null | undefined) === 'salvado'
  ) {
    return true;
  }

  const combinedOpp =
    opportunityName || product?.opportunityName || product?.opportunity?.name || '';
  return combinedOpp.toLowerCase().includes('salvado');
};

export const resolveStockOrigin = (
  product?: ProductStockOriginCandidate | null,
  singleVariation?: ProductKindCandidate | null,
  oppName?: string | null
): StockOrigin => {
  const kind = getProductKind(singleVariation || product);
  if (kind === 'salvado') return 'Salvados';
  if (kind === 'usado') return 'Usados';

  const combinedOpp = (
    product?.opportunityName ||
    product?.opportunity?.name ||
    oppName ||
    ''
  ).toLowerCase();

  if (combinedOpp.includes('salvado')) return 'Salvados';
  if (combinedOpp.includes('usado')) return 'Usados';

  return 'Convencional';
};
