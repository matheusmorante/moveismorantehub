export interface ProductErpLegibilityResult {
  isLegible: boolean;
  errors: string[];
  checks: {
    description: boolean;
    unitPrice: boolean;
    categories: boolean;
    supplier: boolean;
    origin: boolean;
  };
}

/**
 * Builds the effective parent/variation record used by the ERP variation
 * readiness header. The mobile editor consumes the same projection so its
 * read-only checklist follows the exact inheritance behavior.
 */
export const getEffectiveProductForVariationReadiness = (
  parentProduct: Record<string, any> = {},
  variation: Record<string, any> = {}
): Record<string, any> => ({
  ...parentProduct,
  mainSupplierId: parentProduct.mainSupplierId || parentProduct.supplierId || 'inherited',
  description: variation.name || parentProduct.name || parentProduct.description,
  unitPrice: variation.syncUnitPrice
    ? parentProduct.unitPrice
    : variation.unitPrice || parentProduct.unitPrice,
  images:
    variation.images && variation.images.length > 0
      ? variation.images
      : parentProduct.images || [],
});

const isPositiveNumber = (value: unknown): boolean => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
};

/**
 * Requisito informativo do checklist de ativação do ERP: cada variação precisa
 * ter ao menos uma foto própria. Isso não compõe `isLegible`.
 */
export const hasProductVariationPhotos = (source: object = {}): boolean => {
  const variations = (source as Record<string, any>).variations;
  return Boolean(
    Array.isArray(variations) &&
      variations.length > 0 &&
      variations.every((variation) => {
        const images = Array.isArray(variation?.images)
          ? variation.images.filter(Boolean)
          : typeof variation?.image_url === 'string' && variation.image_url.trim()
            ? variation.image_url.split(',').filter(Boolean)
            : [];
        return images.length > 0;
      })
  );
};

/** Canonical product readiness rule used by both the ERP and Mobile App. */
export const checkProductErpLegibility = (source: object = {}): ProductErpLegibilityResult => {
  const data = source as Record<string, any>;
  const errors: string[] = [];
  const hasVars = Boolean(data.hasVariations);

  const internalName = data.name ?? data.description ?? '';
  const hasValidDescription = String(internalName).trim().length >= 2;
  if (!hasValidDescription) {
    errors.push('Nome do Produto (Interno) deve ter pelo menos 2 caracteres.');
  }

  const hasValidCategories = Boolean(data.categoryIds && data.categoryIds.length > 0);
  if (!hasValidCategories) {
    errors.push('Pelo menos uma categoria deve ser selecionada.');
  }

  const isOwnProduction =
    data.merchandiseOrigin === 'own_production' ||
    data.isOwnProduction === true ||
    data.fiscal?.merchandiseOrigin === 'own_production';
  const hasValidSupplier = isOwnProduction || Boolean(data.mainSupplierId || data.supplierId);
  if (!hasValidSupplier) {
    errors.push('Selecione pelo menos um fornecedor.');
  }

  let hasValidPrice: boolean;
  if (!hasVars) {
    hasValidPrice = isPositiveNumber(data.unitPrice);
    if (!hasValidPrice) {
      errors.push('Preço de Venda deve ser maior que zero.');
    }
    if (
      data.promoPrice !== undefined &&
      data.promoPrice !== null &&
      !isNaN(Number(data.promoPrice)) &&
      Number(data.promoPrice) > 0
    ) {
      const unitPrice = Number(data.unitPrice) || 0;
      if (Number(data.promoPrice) >= unitPrice) {
        errors.push('O preço promocional deve ser menor que o preço de venda.');
      }
    }
  } else {
    hasValidPrice = Boolean(data.variations && data.variations.length > 0);
    if (!hasValidPrice) {
      errors.push('Adicione pelo menos uma variação para o produto.');
    }
  }

  const isNormalOrigin = data.productKind === 'normal' || !data.productKind;
  if (!isNormalOrigin) {
    errors.push(
      'Origem do estoque deve ser Convencional (produtos com origem diferente de Convencional não podem ser ativados no ERP).'
    );
  }

  return {
    isLegible: errors.length === 0,
    errors,
    checks: {
      description: hasValidDescription,
      unitPrice: hasValidPrice,
      categories: hasValidCategories,
      supplier: hasValidSupplier,
      origin: isNormalOrigin,
    },
  };
};
