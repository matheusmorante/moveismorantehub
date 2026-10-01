export interface MetaCatalogStats {
  publishedSimple: number;
  publishedVariations: number;
  notPublished: number;
}

export interface MetaCatalogStatsProductSource {
  id: string;
  status?: string | null;
  active?: boolean | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
}

export interface MetaCatalogStatsVariationSource {
  id: string;
  product_id: string;
  status?: string | null;
  active?: boolean | null;
}

export function calculateMetaCatalogStats(
  products: readonly MetaCatalogStatsProductSource[],
  variations: readonly MetaCatalogStatsVariationSource[]
): MetaCatalogStats {
  const variationsByParent: Record<string, MetaCatalogStatsVariationSource[]> = {};
  variations.forEach((variation) => {
    if (!variationsByParent[variation.product_id]) {
      variationsByParent[variation.product_id] = [];
    }
    variationsByParent[variation.product_id].push(variation);
  });

  let publishedSimple = 0;
  let publishedVariations = 0;
  let notPublished = 0;

  products.forEach((parent) => {
    const isParentDeleted = parent.deleted || parent.deleted_at !== null;
    const isParentActive = parent.active !== false;
    const isParentVisible = parent.status !== 'hidden';
    const parentVariations = variationsByParent[parent.id] || [];

    if (isParentDeleted) return;

    if (!isParentActive || !isParentVisible) {
      notPublished += parentVariations.length > 0 ? parentVariations.length : 1;
      return;
    }

    if (parentVariations.length > 0) {
      parentVariations.forEach((variation) => {
        if (variation.active !== false && variation.status !== 'hidden') {
          publishedVariations += 1;
        } else {
          notPublished += 1;
        }
      });
    } else {
      publishedSimple += 1;
    }
  });

  return { publishedSimple, publishedVariations, notPublished };
}
