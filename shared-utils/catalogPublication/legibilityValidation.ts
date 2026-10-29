import type {
  CatalogCharacteristicRequirement,
  CatalogCharacteristicCheckOptions,
  EcomLegibilityResult,
} from './types';
import {
  isPositiveNumber,
  normalizeCharacteristicName,
} from './characteristicValues';
import { getMissingCategoryRequiredCharacteristics } from './categoryCharacteristics';

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
    categoryRequirements,
    options.characteristicGroups
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
  const getDimensionState = (
    prop: 'width' | 'height' | 'depth',
    names: string[],
    allowDirectValue = true
  ) => {
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
        return !['não se aplica', 'nao se aplica', 'n/a', 'não informar', 'nao informar'].includes(value);
      });
      return {
        enabled: enabledNames.length > 0,
        hasPositiveValue:
          enabledNames.length > 0 &&
          enabledNames.some((name) => {
            const raw = values[name];
            const valStr =
              typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
            const value = String(valStr ?? '').replace(',', '.');
            const numericValue = Number(value);
            return Number.isFinite(numericValue) && numericValue > 0;
          }),
      };
    }
    const hasPositiveDirectValue = allowDirectValue && isPositiveNumber(data[prop]);
    return { enabled: hasPositiveDirectValue, hasPositiveValue: hasPositiveDirectValue };
  };
  const getCharacteristicDimensionState = (names: string[]) => {
    const values = data.technicalValues || data.technical_values || {};
    const configuredNames = names.filter((name) =>
      Object.prototype.hasOwnProperty.call(values, name)
    );
    const enabledNames = configuredNames.filter((name) => {
      const raw = values[name];
      const valStr =
        typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
      const value = String(valStr ?? '').trim().toLocaleLowerCase('pt-BR');
      return !['', 'não se aplica', 'nao se aplica', 'n/a', 'não informar'].includes(value);
    });
    return {
      enabled: enabledNames.length > 0,
      hasPositiveValue:
        enabledNames.length > 0 &&
        enabledNames.every((name) => {
          const raw = values[name];
          const valStr =
            typeof raw === 'object' && raw !== null ? (raw.value ?? raw.val ?? '') : raw;
          const numericValue = Number(String(valStr ?? '').replace(',', '.'));
          return Number.isFinite(numericValue) && numericValue > 0;
        }),
    };
  };

  const depthUsesLegacyLength = data.depthUseLength === true || data.depth_use_length === true;
  const dimensionStates = [
    getDimensionState('width', ['Largura', 'Largura total']),
    getDimensionState('height', ['Altura', 'Altura total']),
    getDimensionState(
      'depth',
      ['Profundidade', 'Profundidade total'],
      !depthUsesLegacyLength
    ),
    getCharacteristicDimensionState(['Comprimento', 'Comprimento total']),
    ...(depthUsesLegacyLength && isPositiveNumber(data.depth)
      ? [{ enabled: true, hasPositiveValue: true }]
      : []),
  ];
  const selectedCategoryIds = new Set(categoryIds.map(String));
  const hasCategoryDimensionRules = categoryRequirements.some((field) =>
    /^(altura|largura|profundidade|comprimento|espessura)(?:\s|$)/.test(
      normalizeCharacteristicName(field.name)
    ) &&
    field.categoryApplications?.some((application) =>
      selectedCategoryIds.has(String(application.categoryId))
    )
  );
  const hasValidDimensions =
    isService ||
    ((hasCategoryDimensionRules || dimensionStates.some((dimension) => dimension.enabled)) &&
      dimensionStates.every(
        (dimension) => !dimension.enabled || dimension.hasPositiveValue
      ));

  if (!isService && !hasValidDimensions) {
    errors.push(
      'Ative pelo menos uma dimensão física (altura, largura, profundidade ou comprimento) e preencha com valor maior que zero todas as dimensões ativadas.'
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
