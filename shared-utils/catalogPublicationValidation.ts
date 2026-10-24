import { isTestProduct } from './isTestProduct';
import { isQuantityCharacteristic } from './productCharacteristicDependencies';

export const TEST_PRODUCT_CATALOG_PUBLICATION_ERROR =
  'Produtos identificados como teste não podem ser publicados no Catálogo Digital.';

export interface EcomLegibilityResult {
  isLegible: boolean;
  errors: string[];
  missingCategoryCharacteristics: string[];
  checks: {
    marketplaceTitle: boolean;
    description: boolean;
    unitPrice: boolean;
    categories: boolean;
    images: boolean;
    dimensions: boolean;
    categoryCharacteristics: boolean;
  };
}

export interface CatalogCharacteristicRequirement {
  readonly name: string;
  readonly requiredForCategory?: boolean;
  readonly requiredCategoryIds?: readonly (string | number)[];
}

export interface CatalogCharacteristicCheckOptions {
  readonly categoryRequirementsVerified?: boolean;
}

const normalizeCharacteristicName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const normalizeCharacteristicKey = (value: unknown) =>
  normalizeCharacteristicName(value).replace(/[\s/]+/g, '');

const getCharacteristicNameAliases = (name: string) => {
  const normalized = normalizeCharacteristicKey(name);
  if (['modelo', 'linha', 'modelolinha', 'linhamodelo'].includes(normalized)) {
    return ['modelo', 'linha', 'modelolinha', 'linhamodelo'];
  }
  return [normalized];
};

const readCharacteristicValue = (record: Record<string, any>, name: string): unknown => {
  const aliases = new Set(getCharacteristicNameAliases(name));
  const valueMaps = [
    record.technicalValues,
    record.technical_values,
    record.technicalSpecs?.technicalValues,
    record.technical_specs?.technicalValues,
  ];

  for (const values of valueMaps) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    const entry = Object.entries(values).find(([key]) => aliases.has(normalizeCharacteristicKey(key)));
    if (entry && entry[1] !== undefined && entry[1] !== null) return entry[1];
  }

  if (Array.isArray(record.attributes)) {
    const attribute = record.attributes.find(
      (item: any) => item?.name && aliases.has(normalizeCharacteristicKey(item.name))
    );
    if (attribute && attribute.value !== undefined && attribute.value !== null) {
      return attribute.value;
    }
  } else if (record.attributes && typeof record.attributes === 'object') {
    const entry = Object.entries(record.attributes).find(([key]) =>
      aliases.has(normalizeCharacteristicKey(key))
    );
    if (entry && entry[1] !== undefined && entry[1] !== null) return entry[1];
  }

  const normalized = normalizeCharacteristicName(name);
  const directFieldByName: Record<string, string[]> = {
    marca: ['brand'],
    altura: ['height'],
    'altura total': ['height'],
    largura: ['width'],
    'largura total': ['width'],
    profundidade: ['depth'],
    'profundidade total': ['depth'],
    comprimento: ['depth'],
    'comprimento total': ['depth'],
    peso: ['weight'],
    modelo: ['model'],
    linha: ['line'],
  };
  const normalizedKey = normalizeCharacteristicKey(name);
  const directFields =
    normalizedKey === 'modelolinha' || normalizedKey === 'linhamodelo'
      ? ['model', 'line']
      : directFieldByName[normalized] || [];
  for (const key of directFields) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }

  return undefined;
};

const hasCatalogValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.some(hasCatalogValue);
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasCatalogValue(structured.value ?? structured.val);
    }
    return false;
  }
  if (typeof value === 'string') {
    const normalized = normalizeCharacteristicName(value);
    return Boolean(normalized && normalized !== 'nao se aplica' && normalized !== 'n/a' && normalized !== 'nao informar');
  }
  return true;
};

const hasCatalogQuantityValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'object') {
    const structured = value as { value?: unknown; val?: unknown };
    if (structured.value !== undefined || structured.val !== undefined) {
      return hasCatalogQuantityValue(structured.value ?? structured.val);
    }
    return false;
  }
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0;
  const match = String(value).trim().match(/^(\d+)(?:[.,]0+)?(?:\s+.*)?$/);
  return Boolean(match && Number.isSafeInteger(Number(match[1])));
};

const hasRequiredCatalogValue = (name: string, value: unknown): boolean =>
  isQuantityCharacteristic(name) ? hasCatalogQuantityValue(value) : hasCatalogValue(value);

const getProductCategoryIds = (data: Readonly<Record<string, any>>): string[] => {
  const ids = Array.isArray(data.categoryIds)
    ? data.categoryIds
    : data.categoryId || data.category_id
      ? [data.categoryId || data.category_id]
      : [];
  return ids.map((id: unknown) => String(id));
};

/** Returns category-required characteristics that have no usable value on the product or its variants. */
export const getMissingCategoryRequiredCharacteristics = (
  data: Readonly<Record<string, any>>,
  requirements: readonly CatalogCharacteristicRequirement[]
): string[] => {
  const activeCategories = new Set(getProductCategoryIds(data));
  const requiredNames = requirements
    .filter(
      (requirement) =>
        requirement.requiredForCategory === true ||
        requirement.requiredCategoryIds?.some((id) => activeCategories.has(String(id)))
    )
    .map((requirement) => requirement.name.trim())
    .filter(Boolean);

  const variations = [data.variations, data.product_variations, data.allVariations]
    .find((items) => Array.isArray(items) && items.length > 0) || [];
  const activeVariations = variations.filter(
    (variation: any) => variation && variation.active !== false && variation.isDeleted !== true
  );
  const configuredVariableNames =
    data.variableTechnicalFields ??
    data.variable_technical_fields ??
    data.technicalSpecs?.variableTechnicalFields ??
    data.technical_specs?.variableTechnicalFields;
  const declaredVariableNames = Array.isArray(configuredVariableNames)
    ? configuredVariableNames.map((name: unknown) => normalizeCharacteristicKey(name))
    : null;

  return [...new Set(requiredNames)].filter((name) => {
    const aliases = getCharacteristicNameAliases(name);
    const isDeclaredVariable = Boolean(declaredVariableNames?.some((fieldName) => aliases.includes(fieldName)));
    if (activeVariations.length === 0) {
      if (isDeclaredVariable) return true;
      return !hasRequiredCatalogValue(name, readCharacteristicValue(data, name));
    }

    const isLegacyVariable =
      declaredVariableNames === null &&
      activeVariations.some((variation: any) =>
        hasRequiredCatalogValue(name, readCharacteristicValue(variation, name))
      );
    const isPerVariation = isDeclaredVariable || isLegacyVariable;

    if (!isPerVariation && hasRequiredCatalogValue(name, readCharacteristicValue(data, name))) {
      return false;
    }

    return activeVariations.some((variation: any) => {
      const variationValue = readCharacteristicValue(variation, name);
      return !hasRequiredCatalogValue(name, variationValue);
    });
  });
};

export function isPositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

/**
 * Avalia se os dados do produto atendem aos requisitos obrigatórios para exibição no Catálogo Digital.
 */
export function checkEcomLegibility(
  data: Readonly<Record<string, any>>,
  categoryRequirements: readonly CatalogCharacteristicRequirement[] = [],
  options: CatalogCharacteristicCheckOptions = {}
): EcomLegibilityResult {
  const errors: string[] = [];
  const categoryRequirementsVerified = options.categoryRequirementsVerified !== false;
  const missingCategoryCharacteristics = getMissingCategoryRequiredCharacteristics(
    data,
    categoryRequirements
  );
  const variations = [data.variations, data.product_variations, data.allVariations]
    .find((items) => Array.isArray(items) && items.length > 0) || [];

  if (!categoryRequirementsVerified) {
    errors.push('Não foi possível verificar as características obrigatórias da categoria.');
  } else if (missingCategoryCharacteristics.length > 0) {
    errors.push(
      `Preencha as características obrigatórias da categoria para publicar: ${missingCategoryCharacteristics.join(', ')}.`
    );
  }
  const hasVars = Boolean(
    data.hasVariations ||
      data.has_variations ||
      variations.length > 0
  );
  const catalogTitle = String(
    data.name ||
      data.title ||
      data.marketplaceTitle ||
      (data.description ? String(data.description).split('\n')[0].trim() : '')
  ).trim();
  const catalogDescription =
    data.ecommerceDescription || data.ecommerce_description || data.description;

  const hasValidTitle = Boolean(catalogTitle && catalogTitle.length >= 2);
  if (!hasValidTitle) {
    errors.push('Nome do Produto deve ter pelo menos 2 caracteres.');
  }

  const hasValidDesc = Boolean(catalogDescription && String(catalogDescription).trim().length >= 2);
  if (!hasValidDesc) {
    errors.push('Descrição do catálogo deve ser preenchida antes da publicação.');
  }

  let hasValidPrice: boolean;
  if (!hasVars) {
    hasValidPrice = isPositiveNumber(data.unitPrice ?? data.unit_price ?? data.price);
    if (!hasValidPrice) {
      errors.push('Preço de Venda deve ser maior que zero.');
    }
  } else {
    hasValidPrice = variations.length > 0;
  }

  const categoryIds = Array.isArray(data.categoryIds)
    ? data.categoryIds
    : data.categoryId || data.category_id
      ? [data.categoryId || data.category_id]
      : [];
  const hasValidCategories = Boolean(categoryIds.length > 0);
  if (!hasValidCategories) {
    errors.push('Pelo menos uma categoria deve ser selecionada.');
  }

  const rawImages = data.images;
  const imageList = Array.isArray(rawImages)
    ? rawImages
    : typeof rawImages === 'string' && rawImages.trim()
      ? rawImages.split(',').filter(Boolean)
      : typeof data.image_url === 'string' && data.image_url.trim()
        ? data.image_url.split(',').filter(Boolean)
        : [];
  const hasValidImages = Boolean(imageList.length > 0);
  if (!hasValidImages) {
    errors.push('Pelo menos uma foto deve ser adicionada.');
  }

  const isService = data.itemType === 'service' || data.item_type === 'service';
  const getDimensionState = (prop: 'width' | 'height' | 'depth', names: string[]) => {
    const values = data.technicalValues || data.technical_values || {};
    const configuredNames = names.filter((name) =>
      Object.prototype.hasOwnProperty.call(values, name)
    );
    if (configuredNames.length > 0) {
      const enabledNames = configuredNames.filter((name) => {
        const raw = values[name];
        const valStr =
          typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
        const value = String(valStr ?? '').trim().toLocaleLowerCase('pt-BR');
        return !['não se aplica', 'nao se aplica', 'n/a'].includes(value);
      });
      return {
        enabled: enabledNames.length > 0,
        hasPositiveValue:
          enabledNames.length > 0 &&
          enabledNames.every((name) => {
            const raw = values[name];
            const valStr =
              typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
            const value = String(valStr ?? '').replace(',', '.');
            const numericValue = Number(value);
            return Number.isFinite(numericValue) && numericValue > 0;
          }),
      };
    }
    const hasPositiveDirectValue = isPositiveNumber(data[prop]);
    return { enabled: hasPositiveDirectValue, hasPositiveValue: hasPositiveDirectValue };
  };

  const dimensionStates = [
    getDimensionState('width', ['Largura']),
    getDimensionState('height', ['Altura']),
    getDimensionState('depth', ['Profundidade', 'Comprimento']),
  ];
  const hasValidDimensions =
    isService ||
    (dimensionStates.some((dimension) => dimension.enabled) &&
      dimensionStates.every(
        (dimension) => !dimension.enabled || dimension.hasPositiveValue
      ));

  if (!isService && !hasValidDimensions) {
    errors.push(
      'Ative pelo menos uma dimensão física (altura, largura ou profundidade/comprimento) e preencha com valor maior que zero todas as dimensões ativadas.'
    );
  }

  const promoPrice = data.promoPrice ?? data.promo_price;
  if (
    promoPrice !== undefined &&
    promoPrice !== null &&
    !isNaN(Number(promoPrice)) &&
    Number(promoPrice) > 0
  ) {
    const up = Number(data.unitPrice ?? data.unit_price ?? data.price) || 0;
    if (Number(promoPrice) >= up) {
      errors.push('O preço promocional deve ser menor que o preço de venda.');
    }
  }

  return {
    isLegible: errors.length === 0,
    errors,
    missingCategoryCharacteristics,
    checks: {
      marketplaceTitle: hasValidTitle,
      description: hasValidDesc,
      unitPrice: hasValidPrice,
      categories: hasValidCategories,
      images: hasValidImages,
      dimensions: hasValidDimensions,
      categoryCharacteristics:
        categoryRequirementsVerified && missingCategoryCharacteristics.length === 0,
    },
  };
}

/**
 * Valida se um produto ou variação pode ser publicado no Catálogo Digital,
 * retornando lista detalhada de pendências e aviso de rascunho se aplicável.
 */
export const validateCatalogPublication = (
  parentProduct?: any,
  variation?: any,
  isVariation?: boolean,
  categoryRequirements: readonly CatalogCharacteristicRequirement[] = [],
  options: CatalogCharacteristicCheckOptions = {}
): { isValid: boolean; errorMessage?: string } => {
  const catalogProduct = {
    ...parentProduct,
    variations: isVariation && variation ? [variation] : parentProduct?.variations,
  };
  if (isTestProduct(catalogProduct)) {
    return { isValid: false, errorMessage: TEST_PRODUCT_CATALOG_PUBLICATION_ERROR };
  }

  const isDraft =
    Boolean(parentProduct?.isDraft) ||
    Boolean(parentProduct?.is_draft) ||
    parentProduct?.status === 'draft';

  const varImages =
    variation?.images && variation.images.length > 0
      ? variation.images
      : variation?.image_url
        ? String(variation.image_url).split(',').filter(Boolean)
        : parentProduct?.images || [];

  const effectiveProduct: Record<string, any> = {
    ...parentProduct,
    ...(
      isVariation && variation
        ? { variations: [variation] }
        : parentProduct?.variations?.length
          ? {}
          : parentProduct?.product_variations?.length
            ? { variations: parentProduct.product_variations }
            : parentProduct?.allVariations?.length
              ? { variations: parentProduct.allVariations }
              : {}
    ),
    name:
      parentProduct?.name ||
      parentProduct?.title ||
      (parentProduct?.description
        ? String(parentProduct.description).split('\n')[0].trim()
        : undefined),
    description:
      parentProduct?.ecommerceDescription ||
      parentProduct?.ecommerce_description ||
      parentProduct?.description,
    ...(isVariation && variation
      ? {
          name:
            variation.name ||
            parentProduct?.name ||
            parentProduct?.title ||
            (parentProduct?.description
              ? String(parentProduct.description).split('\n')[0].trim()
              : undefined),
          description:
            variation.description ||
            parentProduct?.ecommerceDescription ||
            parentProduct?.ecommerce_description ||
            parentProduct?.description,
          ecommerceDescription:
            variation.description ||
            parentProduct?.ecommerceDescription ||
            parentProduct?.ecommerce_description ||
            parentProduct?.description,
          unitPrice:
            variation.syncUnitPrice !== false
              ? (parentProduct?.unitPrice ?? parentProduct?.unit_price ?? parentProduct?.price)
              : (variation.unitPrice ??
                variation.price ??
                parentProduct?.unitPrice ??
                parentProduct?.unit_price ??
                parentProduct?.price),
          images: varImages,
          width:
            variation.syncWidth !== false
              ? parentProduct?.width
              : (variation.width ?? parentProduct?.width),
          height:
            variation.syncHeight !== false
              ? parentProduct?.height
              : (variation.height ?? parentProduct?.height),
          depth:
            variation.syncDepth !== false
              ? parentProduct?.depth
              : (variation.depth ?? parentProduct?.depth),
        }
      : {}),
  };

  const ecomResult = checkEcomLegibility(effectiveProduct, categoryRequirements, options);
  if (!ecomResult.isLegible) {
    const errorList = ecomResult.errors;
    let message = '';
    if (errorList.length === 1) {
      message = `Não foi possível publicar no Catálogo Digital.\nCampo obrigatório pendente:\n• ${errorList[0]}`;
    } else {
      message = `Não foi possível publicar no Catálogo Digital.\nCampos obrigatórios pendentes:\n• ${errorList.join('\n• ')}`;
    }
    if (isDraft) {
      message +=
        '\n\nO produto é um rascunho. Conclua o cadastro do produto para salvá-lo como finalizado.';
    }
    return {
      isValid: false,
      errorMessage: message,
    };
  }

  if (isDraft) {
    return {
      isValid: false,
      errorMessage:
        'Não foi possível publicar no Catálogo Digital: o produto é um rascunho. Conclua o cadastro salvando-o como finalizado para poder publicá-lo.',
    };
  }

  return { isValid: true };
};
