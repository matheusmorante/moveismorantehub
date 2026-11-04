import { resolveProductCatalogParentStatus } from '../../../../../shared-utils/productCatalogStatus';

export const applyMobileProductCatalogStatusToList = (
  products: any[],
  productId: string,
  next: string,
  isVar: boolean,
  varId?: string
): any[] =>
  products.map((product: any) => {
    if (product.id !== productId) return product;

    if (isVar && varId) {
      const nextVariations = (product.allVariations || []).map((variation: any) =>
        variation.id === varId ? { ...variation, status: next } : variation
      );
      const parentStatus = resolveProductCatalogParentStatus(nextVariations);
      return {
        ...product,
        status: parentStatus,
        allVariations: nextVariations,
        variations: nextVariations,
      };
    }

    const nextVariations = (product.allVariations || []).map((variation: any) =>
      variation.isVirtual ? { ...variation, status: next } : variation
    );
    return {
      ...product,
      status: next,
      allVariations: nextVariations,
      variations: nextVariations,
    };
  });
