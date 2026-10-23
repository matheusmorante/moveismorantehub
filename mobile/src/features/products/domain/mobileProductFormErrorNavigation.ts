export type MobileProductFormTabId =
  | 'geral'
  | 'fotos'
  | 'technical'
  | 'description'
  | 'estoque'
  | 'variacoes'
  | 'fiscal';

export interface MobileProductFormErrorNavigation {
  tab: MobileProductFormTabId;
  variationIndex?: number;
  variationPanel?: 'estoque' | 'fotos';
}

const PRODUCT_FORM_TABS = new Set<MobileProductFormTabId>([
  'geral',
  'fotos',
  'technical',
  'description',
  'estoque',
  'variacoes',
  'fiscal',
]);

const VARIATION_PRICING_FIELDS = new Set([
  'price',
  'unitPrice',
  'promoPrice',
  'discountPercent',
  'discountFixed',
  'costPrice',
  'finalPurchasePrice',
]);
const VARIATION_PHOTO_FIELDS = new Set(['images', 'image_url']);

export const resolveMobileProductFormErrorNavigation = (
  fieldPath: string
): MobileProductFormErrorNavigation | undefined => {
  const variationMatch = /^variacoes_(\d+)(?:_(.*))?$/.exec(fieldPath);

  if (variationMatch) {
    const variationField = variationMatch[2];
    const variationPanel = variationField && VARIATION_PRICING_FIELDS.has(variationField)
      ? 'estoque'
      : variationField && VARIATION_PHOTO_FIELDS.has(variationField)
        ? 'fotos'
        : undefined;
    return {
      tab: 'variacoes',
      variationIndex: Number(variationMatch[1]),
      ...(variationPanel ? { variationPanel } : {}),
    };
  }

  if (PRODUCT_FORM_TABS.has(fieldPath as MobileProductFormTabId)) {
    return { tab: fieldPath as MobileProductFormTabId };
  }

  return undefined;
};
