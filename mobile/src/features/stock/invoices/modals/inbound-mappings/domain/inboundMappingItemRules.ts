import { amount } from '../inboundCostUtils';
import type { CompositionLink, MappingItem, Product } from '../types';

export const extractLinkedProductRefs = (
  items: MappingItem[],
  mappings: Map<string, any>
): Array<{ productId?: string; variationId?: string }> =>
  items.flatMap((item: MappingItem) => {
    const normalizedCode = item.productCode.trim().toLocaleUpperCase('pt-BR');
    return [
      ...(item.matchedProductId
        ? [{ productId: item.matchedProductId, variationId: item.matchedVariationId }]
        : []),
      ...(item.compositionLinks || []).map((link: CompositionLink) => ({
        productId: link.productId,
        variationId: link.variationId,
      })),
      ...(mappings.has(normalizedCode) ? [mappings.get(normalizedCode)] : []),
    ];
  });

export const hydrateMappingItemsWithDetails = (
  items: MappingItem[],
  mappings: Map<string, any>,
  productDetails: Map<string, any>
): MappingItem[] =>
  items.map((item: MappingItem) => {
    const knownMapping = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
    const itemReference = item.matchedProductId
      ? productDetails.get(`${item.matchedProductId}:${item.matchedVariationId || ''}`)
      : undefined;
    const savedMapping =
      knownMapping &&
      productDetails.get(`${knownMapping.productId}:${knownMapping.variationId || ''}`);
    const compositionLinks = (item.compositionLinks || []).map((link: CompositionLink) => ({
      ...link,
      ...(productDetails.get(`${link.productId}:${link.variationId || ''}`) || {}),
    }));
    if (itemReference || savedMapping || (!item.matchedProductId && knownMapping)) {
      const detail = itemReference || savedMapping || knownMapping;
      return {
        ...item,
        ...(item.matchedProductId
          ? {}
          : { matchedProductId: detail.productId, matchedVariationId: detail.variationId }),
        productErpName: detail.name || item.productErpName,
        linkedProductCode: detail.sku || item.linkedProductCode,
        sellingPrice: detail.sellingPrice ?? item.sellingPrice,
        compositionLinks,
      };
    }
    return { ...item, compositionLinks };
  });

export const clearAllMappingItemLinks = (items: MappingItem[]): MappingItem[] =>
  items.map((item) => ({
    ...item,
    matchedProductId: undefined,
    matchedVariationId: undefined,
    productErpName: undefined,
    linkedProductCode: undefined,
    sellingPrice: undefined,
    compositionLinks: [],
    linkMode: 'single' as const,
  }));

export const applyProductLinkToMappingItems = (
  items: MappingItem[],
  targetItem: MappingItem,
  product: Product
): MappingItem[] =>
  items.map((current) => {
    if (current.itemNumber !== targetItem.itemNumber) return current;
    if (current.linkMode === 'composition') {
      const links: CompositionLink[] = current.compositionLinks || [];
      if (
        links.some(
          (link) =>
            link.productId === product.productId && link.variationId === product.variationId
        )
      ) {
        return current;
      }
      return {
        ...current,
        compositionLinks: [
          ...links,
          {
            id: `${Date.now()}-${product.id}`,
            productId: product.productId,
            variationId: product.variationId,
            productErpName: product.name,
            linkedProductCode: product.sku || '',
            sellingPrice: Number(product.sellingPrice || 0),
            quantityMultiplier: 1,
          },
        ],
      };
    }
    return {
      ...current,
      matchedProductId: product.productId,
      matchedVariationId: product.variationId,
      productErpName: product.name,
      linkedProductCode: product.sku || '',
      sellingPrice: Number(product.sellingPrice || 0),
    };
  });

export const buildCompositionMigratedItems = (
  items: MappingItem[],
  item: MappingItem
): MappingItem[] => {
  const links: CompositionLink[] = item.compositionLinks || [];
  const migrated =
    item.matchedProductId && !links.some((link) => link.productId === item.matchedProductId)
      ? [
          {
            id: `${Date.now()}-${item.matchedProductId}`,
            productId: item.matchedProductId,
            variationId: item.matchedVariationId,
            productErpName: item.productErpName || 'Produto vinculado',
            linkedProductCode: item.linkedProductCode || '',
            sellingPrice: amount(item.sellingPrice),
            quantityMultiplier: 1,
          },
          ...links,
        ]
      : links;
  return items.map((current) =>
    current.itemNumber === item.itemNumber
      ? { ...current, linkMode: 'composition' as const, compositionLinks: migrated }
      : current
  );
};

export const buildSingleModeItems = (
  items: MappingItem[],
  item: MappingItem,
  firstLink?: CompositionLink
): MappingItem[] =>
  items.map((current) =>
    current.itemNumber === item.itemNumber
      ? {
          ...current,
          linkMode: 'single' as const,
          compositionLinks: [],
          matchedProductId: firstLink?.productId || current.matchedProductId,
          matchedVariationId: firstLink?.variationId || current.matchedVariationId,
          productErpName: firstLink?.productErpName || current.productErpName,
          linkedProductCode: firstLink?.linkedProductCode || current.linkedProductCode,
          sellingPrice: firstLink?.sellingPrice || current.sellingPrice,
        }
      : current
  );

export const removeCompositionLinkFromItems = (
  items: MappingItem[],
  item: MappingItem,
  linkId: string
): MappingItem[] =>
  items.map((current) =>
    current.itemNumber === item.itemNumber
      ? {
          ...current,
          compositionLinks: (current.compositionLinks || []).filter(
            (link: CompositionLink) => link.id !== linkId
          ),
        }
      : current
  );

export const updateCompositionMultiplierInItems = (
  items: MappingItem[],
  item: MappingItem,
  linkId: string,
  parsedMultiplier: number
): MappingItem[] =>
  items.map((current) =>
    current.itemNumber === item.itemNumber
      ? {
          ...current,
          compositionLinks: (current.compositionLinks || []).map((link: CompositionLink) =>
            link.id === linkId ? { ...link, quantityMultiplier: parsedMultiplier } : link
          ),
        }
      : current
  );

export const clearSingleItemLinkFromItems = (
  items: MappingItem[],
  item: MappingItem
): MappingItem[] =>
  items.map((current) =>
    current.itemNumber === item.itemNumber
      ? {
          ...current,
          matchedProductId: undefined,
          matchedVariationId: undefined,
          productErpName: undefined,
          linkedProductCode: undefined,
          sellingPrice: undefined,
          compositionLinks: [],
        }
      : current
  );
