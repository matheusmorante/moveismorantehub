export interface OrderItemPresentationInput {
  itemType?: unknown;
  item_type?: unknown;
  condition?: unknown;
  stockOrigin?: unknown;
  stock_origin?: unknown;
  productKind?: unknown;
  product_kind?: unknown;
  is_salvado?: unknown;
  handlingType?: unknown;
  handling_type?: unknown;
  handling?: unknown;
  manuseio?: unknown;
}

const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const normalizeLabel = (value: string): string =>
  value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const resolveOrderItemTypeLabel = (
  item?: OrderItemPresentationInput | null
): 'Salvados' | 'Usado' | 'Normal' | null => {
  if (!item || item.itemType === 'service' || item.item_type === 'service') return null;

  const condition = normalizeLabel(asText(item.condition));
  const explicitNonStockOrigin = ['salvado', 'salvados', 'usado', 'usados'].includes(condition)
    ? condition
    : '';
  const rawOrigin = normalizeLabel(
    explicitNonStockOrigin ||
      asText(item.stockOrigin) ||
      asText(item.stock_origin) ||
      asText(item.productKind) ||
      asText(item.product_kind) ||
      (item.is_salvado ? 'salvado' : 'normal')
  );

  if (rawOrigin.includes('salvad')) return 'Salvados';
  if (rawOrigin.includes('usad')) return 'Usado';
  return 'Normal';
};

export const resolveOrderItemHandling = (
  item?: OrderItemPresentationInput | null
): string => {
  if (!item) return '';
  return (
    asText(item.handlingType) ||
    asText(item.handling) ||
    asText(item.manuseio) ||
    asText(item.handling_type)
  );
};

/** Compact presentation only; callers keep the original string for expanded details. */
export const summarizeOrderItemHandling = (handling: string): string => {
  const fullLabel = asText(handling);
  if (!fullLabel) return '';

  const steps = fullLabel.split(/\s*(?:>|→)\s*/u).filter(Boolean);
  const destination = steps[steps.length - 1] || fullLabel;
  const normalizedDestination = normalizeLabel(destination);

  if (normalizedDestination.startsWith('entregue montado')) return 'Entregar montado';
  if (normalizedDestination.startsWith('entregue desmontado')) return 'Entregar desmontado';

  return destination;
};
