export const processProductData = (data: any[]) => {
  const flattened: any[] = [];
  (data || []).forEach((product: any) => {
    const unitPrice = product.unitPrice ?? product.unit_price ?? product.price ?? 0;
    const costPrice = product.costPrice ?? product.cost_price ?? 0;
    const hasVariations = product.hasVariations ?? product.has_variations ?? false;
    const categoryIds = product.categoryIds ?? product.category_ids ?? [];
    const description = product.description || product.name || product.title || '';

    const normalizedProduct = {
      ...product,
      description,
      unitPrice,
      costPrice,
      hasVariations,
      categoryIds,
      isParent: hasVariations,
    };

    flattened.push(normalizedProduct);

    if (hasVariations && product.variations && Array.isArray(product.variations)) {
      product.variations.forEach((v: any) => {
        const varPrice = v.unitPrice ?? v.unit_price ?? v.price ?? unitPrice;
        const varCost = v.costPrice ?? v.cost_price ?? costPrice;
        const varName = v.name || v.description || '';

        flattened.push({
          ...normalizedProduct,
          id: v.id,
          variationId: v.id,
          sku: v.sku || product.sku || product.code,
          description: varName || description,
          variationName: varName,
          unitPrice: varPrice,
          costPrice: varCost,
          stock: v.stock ?? product.stock,
          active: v.active ?? product.active,
          images: v.images && v.images.length > 0 ? v.images : product.images || [],
          parentImages: product.images || [],
          isVariation: true,
          parentId: product.id,
          categoryIds,
          category: product.category,
          unit: product.unit,
        });
      });
    }
  });
  return flattened;
};
