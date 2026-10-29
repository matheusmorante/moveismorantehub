import {
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
  hasTechnicalValue,
  resolveMobileVariableTechnicalFieldNames,
} from './productCharacteristics';
import { parseLocalizedNumber } from './productNumbers';
import {
  checkProductErpLegibility,
  hasProductVariationPhotos,
  type ProductErpLegibilityResult,
} from '../../../../../shared-utils/productErpLegibility';
import {
  checkEcomLegibility,
  type CatalogCharacteristicRequirement,
  type EcomLegibilityResult,
  buildPublishedCatalogEditConfirmationMessage,
  getPublishedCatalogEditIssues,
  type PublishedCatalogEditIssue,
} from '../../../../../shared-utils/catalogPublicationValidation';
import { hasRequiredProductCategory } from '../../../../../shared-utils/productCategoryRequirement';
import { getActiveCompositionVariationRequirementIssue } from '../../../../../shared-utils/productCompositionRequirements';

export interface MobileProductReadiness {
  erp: ProductErpLegibilityResult;
  catalog: EcomLegibilityResult;
  variationPhotos: boolean;
}

export type MobileVariationRegistrationIssue = {
  message: string;
  tab: 'identificacao' | 'estoque' | 'tecnico' | 'compostos';
};

const normalizeAttributePart = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');

const getAttributeCombinationKey = (variation: any) =>
  getProductCharacteristicAttributes(variation?.attributes)
    .map(({ name, value }) => `${normalizeAttributePart(name)}=${normalizeAttributePart(value)}`)
    .filter((part) => part !== '=')
    .sort()
    .join('|');

export const getMobileEffectiveVariationPrice = (parent: any = {}, variation: any = {}) =>
  parseLocalizedNumber(
    variation.syncUnitPrice !== false
      ? (parent.unitPrice ?? parent.unit_price ?? parent.price)
      : (variation.price ?? variation.unitPrice ?? variation.unit_price)
  );

/** Mantém o estado de prontidão do App igual a checkERPLegibility do ERP. */
export const getMobileProductErpLegibility = (product: any = {}): ProductErpLegibilityResult => {
  const unitPrice = parseLocalizedNumber(product.unitPrice ?? product.unit_price ?? product.price);
  const promoPrice = parseLocalizedNumber(product.promoPrice ?? product.promo_price);
  return checkProductErpLegibility({
    ...product,
    hasVariations: product.hasVariations ?? product.has_variations,
    productKind: product.productKind ?? product.product_kind,
    unitPrice,
    promoPrice,
  });
};

export const isMobileProductErpLegible = (product: any = {}) =>
  getMobileProductErpLegibility(product).isLegible;

export const isMobileSalvadoProduct = (product: any = {}) => {
  const kind = product.productKind ?? product.product_kind ?? product.condition;
  return (
    kind === 'salvado' ||
    kind === 'salvados' ||
    product.is_salvado === true ||
    product.stock_origin === 'salvados'
  );
};

/** Dados detalhados dos dois badges do cabeçalho, sem alterar as regras de salvamento. */
export const getMobileProductReadiness = (product: any = {}): MobileProductReadiness => ({
  erp: getMobileProductErpLegibility(product),
  catalog: checkEcomLegibility({
    ...product,
    unitPrice: parseLocalizedNumber(product.unitPrice ?? product.unit_price ?? product.price),
    promoPrice: parseLocalizedNumber(product.promoPrice ?? product.promo_price),
    width: parseLocalizedNumber(product.width ?? product.width_cm),
    height: parseLocalizedNumber(product.height ?? product.height_cm),
    depth: parseLocalizedNumber(product.depth ?? product.depth_cm),
  }),
  variationPhotos: hasProductVariationPhotos(product),
});

/** Revalida os requisitos completos antes de salvar uma edição já publicada. */
export {
  buildPublishedCatalogEditConfirmationMessage,
  getPublishedCatalogEditIssues,
  type PublishedCatalogEditIssue,
};

export const getMobilePublishedCatalogEditLegibility = (
  product: any,
  candidate: any,
  categoryRequirements: readonly CatalogCharacteristicRequirement[]
): EcomLegibilityResult | null => {
  if ((product?.status || candidate?.status) !== 'published') return null;
  return checkEcomLegibility(
    {
      ...candidate,
      unitPrice: parseLocalizedNumber(
        candidate.unitPrice ?? candidate.unit_price ?? candidate.price
      ),
      promoPrice: parseLocalizedNumber(candidate.promoPrice ?? candidate.promo_price),
      width: parseLocalizedNumber(candidate.width ?? candidate.width_cm),
      height: parseLocalizedNumber(candidate.height ?? candidate.height_cm),
      depth: parseLocalizedNumber(candidate.depth ?? candidate.depth_cm),
    },
    categoryRequirements
  );
};

const getEffectiveVariationPromoPrice = (parent: any = {}, variation: any = {}) =>
  parseLocalizedNumber(
    variation.syncPromoPrice !== false && variation.syncUnitPrice !== false
      ? (parent.promoPrice ?? parent.promo_price)
      : (variation.promoPrice ?? variation.promo_price)
  );

const getEffectiveVariationDimensions = (parent: any, variation: any) => {
  const parentValues = getEffectiveProductTechnicalValues(parent);
  const technicalValues = getEffectiveVariationTechnicalValues(
    parentValues,
    variation,
    resolveMobileVariableTechnicalFieldNames(parent)
  );
  const resolve = (field: 'width' | 'height' | 'depth', sync: unknown, names: string[]) => {
    const directValue = parseLocalizedNumber(
      sync !== false
        ? (parent[field] ?? parent[`${field}_cm`])
        : (variation[field] ?? variation[`${field}_cm`])
    );
    if (directValue > 0) return directValue;
    for (const name of names) {
      const technicalValue = parseLocalizedNumber(getTechnicalValue(technicalValues, name));
      if (technicalValue > 0) return technicalValue;
    }
    return 0;
  };

  return {
    width: resolve('width', variation.syncWidth, ['Largura']),
    height: resolve('height', variation.syncHeight, ['Altura']),
    depth: resolve('depth', variation.syncDepth, ['Profundidade', 'Comprimento']),
  };
};

export const getMobileVariationRegistrationIssue = (
  parent: any,
  variation: any,
  variations: any[] = Array.isArray(parent?.variations) ? parent.variations : []
): MobileVariationRegistrationIssue | null => {
  const compositionIssue = getActiveCompositionVariationRequirementIssue(
    { ...parent, variations },
    variation
  );
  if (compositionIssue) return compositionIssue;

  const combination = getAttributeCombinationKey(variation);
  if (
    combination &&
    variations.some(
      (other) =>
        other !== variation &&
        !(other?.id && variation?.id && String(other.id) === String(variation.id)) &&
        getAttributeCombinationKey(other) === combination
    )
  ) {
    return {
      message: 'Já existe outra variação com a mesma combinação de características e valores.',
      tab: 'identificacao',
    };
  }

  const sku = String(variation?.sku || '')
    .trim()
    .toLocaleUpperCase('pt-BR');
  if (
    sku &&
    variations.some(
      (other) =>
        other !== variation &&
        !(other?.id && variation?.id && String(other.id) === String(variation.id)) &&
        String(other?.sku || '')
          .trim()
          .toLocaleUpperCase('pt-BR') === sku
    )
  ) {
    return {
      message: `O SKU "${variation.sku}" já está em uso em outra variação.`,
      tab: 'identificacao',
    };
  }



  const variationName = String(variation?.name ?? parent?.description ?? '').trim();
  if (variationName.length < 2) {
    return { message: 'Nome do produto deve ter pelo menos 2 caracteres.', tab: 'identificacao' };
  }
  if (
    !hasRequiredProductCategory(
      parent?.categoryIds,
      parent?.categoryId || parent?.category_id
    )
  ) {
    return { message: 'Pelo menos uma categoria deve ser selecionada.', tab: 'identificacao' };
  }

  const price = getMobileEffectiveVariationPrice(parent, variation);
  if (price <= 0) {
    return { message: 'Preço de Venda deve ser maior que zero.', tab: 'estoque' };
  }
  const promoPrice = getEffectiveVariationPromoPrice(parent, variation);
  if (promoPrice > 0 && promoPrice >= price) {
    return { message: 'O preço promocional deve ser menor que o preço de venda.', tab: 'estoque' };
  }

  return null;
};

const getDimensionState = (
  product: any,
  field: 'width' | 'height' | 'depth',
  names: string[]
) => {
  const values = getEffectiveProductTechnicalValues(product);
  const configuredNames = names.filter((name) => hasTechnicalValue(values, name));
  if (configuredNames.length > 0) {
    const enabledNames = configuredNames.filter((name) => {
      const value = String(getTechnicalValue(values, name) ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR');
      return !['não se aplica', 'nao se aplica', 'n/a'].includes(value);
    });
    return {
      enabled: enabledNames.length > 0,
      hasPositiveValue:
        enabledNames.length > 0 &&
        enabledNames.every((name) => parseLocalizedNumber(getTechnicalValue(values, name)) > 0),
    };
  }
  const hasPositiveDirectValue = parseLocalizedNumber(product?.[field]) > 0;
  return { enabled: hasPositiveDirectValue, hasPositiveValue: hasPositiveDirectValue };
};

/** Requisitos que o ERP preserva enquanto o produto já está publicado. */
export const isMobileEcommerceLegible = (product: any = {}) => {
  const title = String(product.title || product.marketplaceTitle || '').trim();
  const description = String(
    product.ecommerceDescription || product.ecommerce_description || product.description || ''
  ).trim();
  const categoryIds = Array.isArray(product.categoryIds)
    ? product.categoryIds
    : product.categoryId || product.category_id
      ? [product.categoryId || product.category_id]
      : [];
  const images = product.images || [];
  const hasVariations = Boolean(
    product.hasVariations ||
      product.has_variations ||
      (Array.isArray(product.variations) && product.variations.length)
  );
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const parentPrice = parseLocalizedNumber(
    product.unitPrice ?? product.unit_price ?? product.price
  );
  const promoPrice = parseLocalizedNumber(product.promoPrice ?? product.promo_price);
  const isService = product.itemType === 'service' || product.item_type === 'service';
  const dimensionStates = [
    getDimensionState(product, 'width', ['Largura']),
    getDimensionState(product, 'height', ['Altura']),
    getDimensionState(product, 'depth', ['Profundidade', 'Comprimento']),
  ];
  const hasValidDimensions =
    isService ||
    (dimensionStates.some((dimension) => dimension.enabled) &&
      dimensionStates.every(
        (dimension) => !dimension.enabled || dimension.hasPositiveValue
      ));

  return (
    title.length >= 2 &&
    description.length >= 2 &&
    categoryIds.length > 0 &&
    Array.isArray(images) &&
    images.length > 0 &&
    (hasVariations ? variations.length > 0 : parentPrice > 0) &&
    hasValidDimensions &&
    (promoPrice <= 0 || promoPrice < parentPrice)
  );
};
