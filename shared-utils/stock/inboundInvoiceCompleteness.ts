const COMMERCIAL_VALUE_KEYS = [
  'quantity',
  'quantidade',
  'qCom',
  'unitCost',
  'unit_cost',
  'valor_unitario',
  'vUnCom',
  'totalCost',
  'total_cost',
  'valor_total',
  'vProd',
] as const;

export function hasInboundItemCommercialData(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;

  return items.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return COMMERCIAL_VALUE_KEYS.some((key) => {
      const value = Number(record[key] ?? 0);
      return Number.isFinite(value) && value !== 0;
    });
  });
}
