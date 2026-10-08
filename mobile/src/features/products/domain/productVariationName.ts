import {
  getEffectiveVariationTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
} from './productCharacteristics';

export interface ProductVariationCharacteristicNameRecord {
  name?: string | null;
  title?: string | null;
  marketplaceTitle?: string | null;
  attributes?: unknown;
  technicalValues?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProductVariationNameInput {
  attributes?: unknown;
  name?: string | null;
  productName?: string | null;
}

const normalizeProductVariationNameTokens = (value: unknown): string[] =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];

export const containsProductVariationNamePhrase = (name: string, phrase: string): boolean => {
  const nameTokens = normalizeProductVariationNameTokens(name);
  const phraseTokens = normalizeProductVariationNameTokens(phrase);
  if (phraseTokens.length === 0) return true;

  return nameTokens.some((_, start) =>
    phraseTokens.every((token, offset) => nameTokens[start + offset] === token)
  );
};

const normalizeVariationNameSearch = (value: unknown) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const getCharacteristicText = (value: unknown): string => {
  const rawValue =
    value && typeof value === 'object'
      ? ((value as { value?: unknown; val?: unknown }).value ??
        (value as { val?: unknown }).val ??
        '')
      : value;
  return String(rawValue ?? '').trim();
};

export const getProductVariationNameComplement = (
  variationName: string,
  parentName: string
): string => {
  if (
    !parentName ||
    !variationName.toLocaleLowerCase('pt-BR').startsWith(parentName.toLocaleLowerCase('pt-BR'))
  ) {
    return variationName.trim();
  }
  return variationName
    .slice(parentName.length)
    .replace(/^[\s\-–—_:]+/u, '')
    .trim();
};

export const getProductVariationCharacteristicText = (
  variation: ProductVariationCharacteristicNameRecord,
  characteristicName: string,
  fallbackValue: unknown = ''
): string => {
  const normalizedName = characteristicName.trim().toLocaleLowerCase('pt-BR');
  const attribute = getProductCharacteristicAttributes(variation.attributes).find(
    ({ name }) => name.trim().toLocaleLowerCase('pt-BR') === normalizedName
  );
  const technicalValues = getEffectiveVariationTechnicalValues({}, variation);
  return (
    getCharacteristicText(attribute?.value) ||
    getCharacteristicText(getTechnicalValue(technicalValues, characteristicName)) ||
    getCharacteristicText(fallbackValue)
  );
};

export const canUseProductCharacteristicInVariationName = (
  variations: readonly ProductVariationCharacteristicNameRecord[],
  characteristicName: string,
  fallbackValue: unknown = ''
): boolean =>
  variations.some((variation) =>
    Boolean(getProductVariationCharacteristicText(variation, characteristicName, fallbackValue))
  );

export const isProductCharacteristicIncludedInVariationNames = (
  variations: readonly ProductVariationCharacteristicNameRecord[],
  parentName: string,
  characteristicName: string,
  fallbackValue: unknown = ''
): boolean =>
  variations.length > 0 &&
  variations.every((variation) => {
    const value = getProductVariationCharacteristicText(
      variation,
      characteristicName,
      fallbackValue
    );
    const complement = getProductVariationNameComplement(variation.name || '', parentName);
    return (
      Boolean(value) &&
      normalizeVariationNameSearch(complement).includes(normalizeVariationNameSearch(value))
    );
  });

/**
 * Mantém atributo e nome das variações alinhados com a ação “Usar no nome” do ERP.
 * Só sincroniza title/marketplaceTitle quando ainda acompanham o nome anterior.
 */
export const applyProductCharacteristicToVariationNames = <
  T extends ProductVariationCharacteristicNameRecord,
>(
  variations: readonly T[],
  parentName: string,
  characteristicName: string,
  fallbackValue: unknown = ''
): T[] => {
  let changed = false;
  const normalizedName = characteristicName.trim().toLocaleLowerCase('pt-BR');
  const normalizedFallback = getCharacteristicText(fallbackValue);
  const nextVariations = variations.map((variation) => {
    const attributes = getProductCharacteristicAttributes(variation.attributes);
    const attributeIndex = attributes.findIndex(
      ({ name }) => name.trim().toLocaleLowerCase('pt-BR') === normalizedName
    );
    const existingAttribute = attributeIndex >= 0 ? attributes[attributeIndex] : undefined;
    const value =
      getCharacteristicText(existingAttribute?.value) ||
      getCharacteristicText(
        getTechnicalValue(getEffectiveVariationTechnicalValues({}, variation), characteristicName)
      ) ||
      normalizedFallback;
    if (!value) return variation;

    const nextAttribute = {
      name: existingAttribute?.name || characteristicName,
      value,
      showName: true,
    };
    if (attributeIndex >= 0) attributes[attributeIndex] = nextAttribute;
    else attributes.push(nextAttribute);

    const currentName = variation.name || '';
    const currentComplement = getProductVariationNameComplement(currentName, parentName);
    const colorAlreadyIncluded = normalizeVariationNameSearch(currentComplement).includes(
      normalizeVariationNameSearch(value)
    );
    const nextComplement = colorAlreadyIncluded
      ? currentComplement
      : [currentComplement, value].filter(Boolean).join(' ');
    const nextName = [parentName.trim(), nextComplement.trim()].filter(Boolean).join(' ');
    const attributeChanged =
      !existingAttribute ||
      existingAttribute.value !== value ||
      existingAttribute.showName === false;
    const nameChanged = nextName !== currentName;
    if (!attributeChanged && !nameChanged) return variation;

    changed = true;
    return {
      ...variation,
      attributes,
      name: nextName,
      ...(variation.title === currentName ? { title: nextName } : {}),
      ...(variation.marketplaceTitle === currentName ? { marketplaceTitle: nextName } : {}),
    };
  });

  return changed ? nextVariations : (variations as T[]);
};

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
