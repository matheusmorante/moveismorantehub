import { MAX_VARIATION_IMAGES } from '../../../../../shared-utils/productImageLimits';
import { generateVariationSku } from './productSku';

export const buildMobileProductDuplicationDraft = (
  source: any,
  code: string,
  images: any[]
) => {
  const sourceVariations = source.allVariations || source.variations || [];
  const variationImages =
    sourceVariations.length === 1 ? images : images.slice(0, MAX_VARIATION_IMAGES);
  const variations = sourceVariations.map((variation: any, index: number) => {
    const copy = {
      ...variation,
      id: crypto.randomUUID(),
      isVirtual: false,
      mergedToVariationId: undefined,
      sku: generateVariationSku(code, index),
      images: [...variationImages],
      status: 'draft',
      active: false,
    };
    delete (copy as any).image_url;
    delete (copy as any).imageUrl;
    return copy;
  });

  return {
    ...source,
    id: undefined,
    code,
    sku: code,
    createdAt: undefined,
    created_at: undefined,
    updatedAt: undefined,
    updated_at: undefined,
    parentId: undefined,
    selectedVariationId: undefined,
    isDraft: true,
    is_draft: true,
    active: false,
    status: 'draft',
    images,
    allVariations: variations,
    variations,
  };
};
