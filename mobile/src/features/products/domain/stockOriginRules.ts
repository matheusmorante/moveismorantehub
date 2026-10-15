export type StockOrigin = 'Convencional' | 'Salvados' | 'Usados';

const normalizeText = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Resolve o rótulo canônico da origem do estoque ('Convencional', 'Salvados' ou 'Usados')
 */
export function resolveStockOrigin(
  product?: any,
  singleVariation?: any,
  oppName?: string | null
): StockOrigin {
  const target = singleVariation || product;
  const kind = target?.productKind || target?.product_kind || target?.condition;
  if (kind === 'salvado' || target?.is_salvado || target?.isSalvado) return 'Salvados';
  if (kind === 'usado') return 'Usados';

  const combinedOpp = normalizeText(
    product?.opportunityName ||
    product?.opportunity_name ||
    product?.opportunity?.name ||
    oppName ||
    ''
  );

  if (combinedOpp.includes('salvad')) return 'Salvados';
  if (combinedOpp.includes('usado')) return 'Usados';

  return 'Convencional';
}
