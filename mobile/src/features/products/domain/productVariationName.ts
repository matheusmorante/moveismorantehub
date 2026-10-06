import { getProductCharacteristicAttributes } from './productCharacteristics';

export interface ProductVariationNameInput {
  attributes?: unknown;
  name?: string | null;
  productName?: string | null;
}

/**
 * A coluna product_variations.name é obrigatória no banco. A variação pode
 * herdar o nome do produto-pai, mas nunca deve chegar sem um nome persistível.
 */
export const resolveProductVariationName = ({
  attributes,
  name,
  productName,
}: ProductVariationNameInput): string => {
  const explicitName = name?.trim();
  if (explicitName) return explicitName;

  const attributeValues = getProductCharacteristicAttributes(attributes)
    .filter(({ showName, value }) => showName && String(value).trim())
    .map(({ value }) => String(value).trim());
  const legacyText =
    attributeValues.length === 0 && typeof attributes === 'string' ? attributes.trim() : '';

  const parentName = productName?.trim() || 'Variação';
  const variationSuffix = [...attributeValues, legacyText].filter(Boolean).join(' ');
  return variationSuffix ? `${parentName} ${variationSuffix}` : parentName;
};

/**
 * A identidade operacional de estoque é sempre uma variação. Produtos e
 * composições não podem chegar ao persistidor sem pelo menos uma variação;
 * serviços são a única exceção porque não movimentam estoque.
 */
export const ensureAtLeastOneOperationalVariation = (
  productData: any,
  productCode?: string
): any[] => {
  const existing = Array.isArray(productData?.variations) ? productData.variations : [];
  if (
    productData?.itemType === 'service' ||
    productData?.item_type === 'service' ||
    existing.length > 0
  ) {
    return existing;
  }

  const productName = String(
    productData?.name || productData?.title || productData?.description || 'Produto'
  ).trim();
  return [
    {
      name: productName,
      sku: productCode ? `${productCode}-01` : undefined,
      price: Number(productData?.unitPrice || 0),
      costPrice: Number(productData?.costPrice || 0),
      stock: Number(productData?.stock || 0),
      active: productData?.active !== false,
      status: productData?.status || 'hidden',
      attributes: [],
      images: [],
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncCostPrice: true,
      syncDescription: true,
      syncWidth: true,
      syncHeight: true,
      syncDepth: true,
      syncWeight: true,
    },
  ];
};
