import { isTestProduct } from './isTestProduct';

export const TEST_PRODUCT_CATALOG_PUBLICATION_ERROR =
  'Produtos identificados como teste não podem ser publicados no Catálogo Digital.';

export interface EcomLegibilityResult {
  isLegible: boolean;
  errors: string[];
  checks: {
    marketplaceTitle: boolean;
    description: boolean;
    unitPrice: boolean;
    categories: boolean;
    images: boolean;
    dimensions: boolean;
  };
}

export function isPositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

/**
 * Avalia se os dados do produto atendem aos requisitos obrigatórios para exibição no Catálogo Digital.
 */
export function checkEcomLegibility(data: Readonly<Record<string, any>>): EcomLegibilityResult {
  const errors: string[] = [];
  const hasVars = Boolean(
    data.hasVariations ||
      data.has_variations ||
      (Array.isArray(data.variations) && data.variations.length > 0) ||
      (Array.isArray(data.product_variations) && data.product_variations.length > 0) ||
      (Array.isArray(data.allVariations) && data.allVariations.length > 0)
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
    const vars =
      data.variations || data.product_variations || data.allVariations || [];
    hasValidPrice = Boolean(Array.isArray(vars) && vars.length > 0);
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
    checks: {
      marketplaceTitle: hasValidTitle,
      description: hasValidDesc,
      unitPrice: hasValidPrice,
      categories: hasValidCategories,
      images: hasValidImages,
      dimensions: hasValidDimensions,
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
  isVariation?: boolean
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

  const ecomResult = checkEcomLegibility(effectiveProduct);
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
