import Product from '@/pages/types/product.type';

export interface ERPLegibilityResult {
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

function isPositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export function checkERPLegibility(data: Readonly<Partial<Product>>): ERPLegibilityResult {
  const errors: string[] = [];
  const hasVars = Boolean(data.hasVariations);

  // Cadastros antigos podem ter apenas description; o nome editado tem prioridade.
  const internalName = data.name ?? data.description ?? '';
  const hasValidDescription = internalName.trim().length >= 2;
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
      const up = Number(data.unitPrice) || 0;
      if (Number(data.promoPrice) >= up) {
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
}

export function checkEcomLegibility(data: Readonly<Partial<Product>>): EcomLegibilityResult {
  const errors: string[] = [];
  const hasVars = Boolean(data.hasVariations);
  const catalogTitle = data.title || data.marketplaceTitle;
  const catalogDescription = data.ecommerceDescription || data.description;

  const hasValidTitle = Boolean(catalogTitle && catalogTitle.trim().length >= 2);
  if (!hasValidTitle) {
    errors.push('Título do Produto (E-commerce) deve ter pelo menos 2 caracteres.');
  }

  const hasValidDesc = Boolean(catalogDescription && catalogDescription.trim().length >= 2);
  if (!hasValidDesc) {
    errors.push('Descrição do catálogo deve ser preenchida antes da publicação.');
  }

  let hasValidPrice: boolean;
  if (!hasVars) {
    hasValidPrice = isPositiveNumber(data.unitPrice);
    if (!hasValidPrice) {
      errors.push('Preço de Venda deve ser maior que zero.');
    }
  } else {
    hasValidPrice = Boolean(data.variations && data.variations.length > 0);
  }

  const hasValidCategories = Boolean(data.categoryIds && data.categoryIds.length > 0);
  if (!hasValidCategories) {
    errors.push('Pelo menos uma categoria deve ser selecionada.');
  }

  const hasValidImages = Boolean(data.images && data.images.length > 0);
  if (!hasValidImages) {
    errors.push('Pelo menos uma foto deve ser adicionada.');
  }

  const isService = data.itemType === 'service';
  const getDim = (prop: 'width' | 'height' | 'depth', names: string[]) => {
    if (isPositiveNumber(data[prop])) return true;
    const values = data.technicalValues || {};
    for (const name of names) {
      const rawValue = values[name];
      const val = String(rawValue ?? '').replace(',', '.');
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) return true;
    }
    const isApplicable = names.some((name) => {
      if (!Object.prototype.hasOwnProperty.call(values, name)) return false;
      const value = String(values[name] ?? '').trim().toLocaleLowerCase('pt-BR');
      return !['não se aplica', 'nao se aplica', 'n/a'].includes(value);
    });
    return !isApplicable;
  };

  const hasValidDimensions =
    isService ||
    (getDim('width', ['Largura']) &&
      getDim('height', ['Altura']) &&
      getDim('depth', ['Profundidade', 'Comprimento']));

  if (!isService && !hasValidDimensions) {
    errors.push(
      'Informe largura, altura e profundidade maiores que zero para publicar o produto no catálogo.'
    );
  }

  if (
    data.promoPrice !== undefined &&
    data.promoPrice !== null &&
    !isNaN(Number(data.promoPrice)) &&
    Number(data.promoPrice) > 0
  ) {
    const up = Number(data.unitPrice) || 0;
    if (Number(data.promoPrice) >= up) {
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
