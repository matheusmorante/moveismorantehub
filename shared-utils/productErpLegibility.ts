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

const isPositiveNumber = (value: unknown): boolean => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
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
