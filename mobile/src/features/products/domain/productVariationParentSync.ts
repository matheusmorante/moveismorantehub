type ParentVariationFields = {
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
};

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
