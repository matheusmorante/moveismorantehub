import { getSimpleProductVariationTechnicalValues } from '../../../../../shared-utils/simpleProductVariationTechnicalValues';

type ParentVariationFields = {
  id?: unknown;
  hasVariations?: unknown;
  technicalValues?: Record<string, unknown> | null;
  unitPrice?: unknown;
  unit_price?: unknown;
  price?: unknown;
  promoPrice?: unknown;
  promo_price?: unknown;
  costPrice?: unknown;
  cost_price?: unknown;
  description?: unknown;
  name?: unknown;
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  weight?: unknown;
  condition?: unknown;
  fiscal?: Record<string, unknown> | null;
  ipiPercent?: unknown;
  freightCost?: unknown;
  freightType?: unknown;
  images?: unknown;
};

/** Mirrors ERP's conversion of an unsaved single-variation product back to simple mode. */
export const inheritMobileSimpleVariationFromParent = <T extends Record<string, any>>(
  parent: ParentVariationFields & Record<string, any>,
  variation: T
): T => ({
  ...variation,
  name: parent.name || parent.title || parent.description || '',
  title: parent.title || parent.name || '',
  marketplaceTitle: parent.marketplaceTitle || parent.title || parent.name || '',
  stock: Number(parent.stock || 0),
  price: Number(parent.unitPrice || parent.unit_price || parent.price || 0),
  unitPrice: Number(parent.unitPrice || parent.unit_price || parent.price || 0),
  promoPrice: Number(parent.promoPrice || parent.promo_price || 0),
  costPrice: Number(parent.costPrice || parent.cost_price || 0),
  condition: parent.condition || 'novo',
  description: parent.description || '',
  fiscal: parent.fiscal ? { ...parent.fiscal } : undefined,
  width: Number(parent.width || 0),
  height: Number(parent.height || 0),
  depth: Number(parent.depth || 0),
  weight: Number(parent.weight || 0),
  ipiPercent: Number(parent.ipiPercent || 0),
  ipiType: parent.ipiType || 'percentage',
  freightCost: Number(parent.freightCost || 0),
  freightType: parent.freightType || 'fixed',
  finalPurchasePrice: Number(parent.finalPurchasePrice || 0),
  minStock: Number(parent.minStock || 0),
  attributes: [],
  images: [],
  syncUnitPrice: true,
  syncPromoPrice: true,
  syncCostPrice: true,
  syncCondition: true,
  syncDescription: true,
  syncFiscal: true,
  syncWithParent: true,
  syncDimensions: true,
  syncWidth: true,
  syncHeight: true,
  syncDepth: true,
  syncWeight: true,
  syncIpi: true,
  syncFreight: true,
});

const sameValue = (left: unknown, right: unknown) => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

/** Atualiza no mesmo snapshot os valores herdados pelas variações que seguem o produto pai. */
export const syncMobileVariationsWithParent = <T extends Record<string, any>>(
  variations: readonly T[] | undefined,
  parent: ParentVariationFields,
  previousParent?: ParentVariationFields
): T[] => {
  if (!variations?.length) return (variations || []) as T[];

  let changed = false;
  const updated = variations.map((variation) => {
    let next: Record<string, any> = variation;
    const inherit = (field: string, syncField: string, value: unknown) => {
      if (variation[syncField] === false || value === undefined || value === null) return;
      if (sameValue(variation[field], value)) return;
      if (next === variation) next = { ...variation };
      next[field] = value;
    };

    inherit('price', 'syncUnitPrice', parent.unitPrice ?? parent.unit_price ?? parent.price);
    inherit('promoPrice', 'syncPromoPrice', parent.promoPrice ?? parent.promo_price);
    inherit('costPrice', 'syncCostPrice', parent.costPrice ?? parent.cost_price);
    inherit('description', 'syncDescription', parent.description);
    inherit('width', 'syncWidth', parent.width);
    inherit('height', 'syncHeight', parent.height);
    inherit('depth', 'syncDepth', parent.depth);
    inherit('weight', 'syncWeight', parent.weight);
    inherit('condition', 'syncCondition', parent.condition);
    inherit('ipiPercent', 'syncIpi', parent.ipiPercent);
    inherit('freightCost', 'syncFreight', parent.freightCost);
    inherit('freightType', 'syncFreight', parent.freightType);

    if (variation.syncFiscal !== false && !sameValue(variation.fiscal, parent.fiscal)) {
      if (next === variation) next = { ...variation };
      next.fiscal = parent.fiscal ? { ...parent.fiscal } : undefined;
    }

    const technicalValues = getSimpleProductVariationTechnicalValues({
      isExistingProduct: Boolean(parent.id),
      hasVariations: Boolean(parent.hasVariations),
      variationCount: variations.length,
      parentTechnicalValues: parent.technicalValues,
      currentVariationTechnicalValues: variation.technicalValues,
    });
    if (!sameValue(variation.technicalValues, technicalValues)) {
      if (next === variation) next = { ...variation };
      next.technicalValues = technicalValues;
    }

    const parentImages = Array.isArray(parent.images) ? parent.images : undefined;
    const previousImages = Array.isArray(previousParent?.images)
      ? previousParent.images
      : undefined;
    if (
      variations.length === 1 &&
      parentImages &&
      previousImages &&
      !sameValue(parentImages, previousImages) &&
      !sameValue(variation.images, parentImages)
    ) {
      if (next === variation) next = { ...variation };
      next.images = [...parentImages];
    }

    const parentName = String(parent.name || parent.description || '').trim();
    const previousName = String(previousParent?.name || previousParent?.description || '').trim();
    if (
      previousName &&
      previousName !== parentName &&
      variation.syncName !== false &&
      variation.use_parent_name !== false
    ) {
      const currentName = String(variation.name || '').trim();
      const suffix = currentName
        .toLocaleLowerCase('pt-BR')
        .startsWith(previousName.toLocaleLowerCase('pt-BR'))
        ? currentName
            .slice(previousName.length)
            .replace(/^[\s\-–—_:]+/u, '')
            .trim()
        : currentName;
      const nextName = [parentName, suffix].filter(Boolean).join(' ');
      if (currentName !== nextName) {
        if (next === variation) next = { ...variation };
        next.name = nextName;
        if (
          variation.differentiateTitle !== true &&
          (!variation.title || variation.title === currentName)
        ) {
          next.title = nextName;
        }
        if (
          variation.differentiateTitle !== true &&
          (!variation.marketplaceTitle || variation.marketplaceTitle === currentName)
        ) {
          next.marketplaceTitle = nextName;
        }
      }
    }
    if (next !== variation) changed = true;
    return next as T;
  });

  return changed ? updated : (variations as T[]);
};
