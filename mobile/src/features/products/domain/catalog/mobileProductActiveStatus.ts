export const applyMobileProductActiveStatusToList = (
  products: any[],
  targetProductId: string,
  nextActive: boolean,
  isVariation: boolean,
  targetVariation: any,
): any[] =>
  products.map((product: any) => {
    if (product.id !== targetProductId) return product;
    if (targetVariation?.isVirtual) {
      const nextVariations = (product.allVariations || []).map((variation: any) =>
        String(variation.id) === String(targetVariation.id)
          ? { ...variation, active: nextActive }
          : variation
      );
      return {
        ...product,
        allVariations: nextVariations,
        variations: nextVariations,
        active: nextActive,
      };
    }
    if (isVariation) {
      const nextVariations = (product.allVariations || []).map((variation: any) =>
        String(variation.id) === String(targetVariation.id)
          ? { ...variation, active: nextActive }
          : variation
      );
      return {
        ...product,
        allVariations: nextVariations,
        active: nextVariations.some((variation: any) => variation.active !== false),
      };
    }
    const nextVariations = (product.allVariations || []).map((variation: any) =>
      variation.isVirtual ? { ...variation, active: nextActive } : variation
    );
    return {
      ...product,
      active: nextActive,
      allVariations: nextVariations,
      variations: nextVariations,
    };
  });
