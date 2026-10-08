import Product from '@/pages/types/product.type';
import {
  checkProductErpLegibility,
  type ProductErpLegibilityResult,
} from '../../../../../../shared-utils/productErpLegibility';

export type ERPLegibilityResult = ProductErpLegibilityResult;

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
  return checkProductErpLegibility(data);
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
  const getDimensionState = (prop: 'width' | 'height' | 'depth', names: string[]) => {
    const values = data.technicalValues || {};
    const configuredNames = names.filter((name) =>
      Object.prototype.hasOwnProperty.call(values, name)
    );
    if (configuredNames.length > 0) {
      const enabledNames = configuredNames.filter((name) => {
        const value = String(values[name] ?? '').trim().toLocaleLowerCase('pt-BR');
        return !['não se aplica', 'nao se aplica', 'n/a'].includes(value);
      });
      return {
        enabled: enabledNames.length > 0,
        hasPositiveValue:
          enabledNames.length > 0 &&
          enabledNames.every((name) => {
            const value = String(values[name] ?? '').replace(',', '.');
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
