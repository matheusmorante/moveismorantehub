import {
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
  getProductCharacteristicAttributes,
  getTechnicalValue,
} from './productCharacteristics';

export type MobileVariationRegistrationIssue = {
  message: string;
  tab: 'identificacao' | 'estoque' | 'tecnico';
};

const normalizeAttributePart = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');

const parseLocalizedNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const raw = String(value)
    .trim()
    .replace(/[^\d.,-]/g, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  let normalized = raw;
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? ',' : '.';
    normalized = raw
      .replace(decimalSeparator === ',' ? /\./g : /,/g, '')
      .replace(decimalSeparator, '.');
  } else if (comma >= 0) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if ((raw.match(/\./g) || []).length > 1) {
    const lastDot = raw.lastIndexOf('.');
    normalized = `${raw.slice(0, lastDot).replace(/\./g, '')}${raw.slice(lastDot)}`;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const getEffectiveVariationPromoPrice = (parent: any = {}, variation: any = {}) =>
  parseLocalizedNumber(
    variation.syncPromoPrice !== false && variation.syncUnitPrice !== false
      ? (parent.promoPrice ?? parent.promo_price)
      : (variation.promoPrice ?? variation.promo_price)
  );

const getEffectiveVariationDimensions = (parent: any, variation: any) => {
  const parentValues = getEffectiveProductTechnicalValues(parent);
  const technicalValues = getEffectiveVariationTechnicalValues(parentValues, variation);
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
      message: 'Já existe outra variação com a mesma combinação de atributos e valores.',
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

  const dimensions = getEffectiveVariationDimensions(parent, variation);
  const missingDimensions = (['width', 'height', 'depth'] as const)
    .filter((field) => dimensions[field] <= 0)
    .map((field) => ({ width: 'Largura', height: 'Altura', depth: 'Profundidade' })[field]);
  if (missingDimensions.length) {
    return {
      message: `Informe valores maiores que zero para as dimensões obrigatórias: ${missingDimensions.join(', ')}.`,
      tab: 'tecnico',
    };
  }

  const parentValues = getEffectiveProductTechnicalValues(parent);
  const missingCharacteristics = getMissingRequiredCharacteristics(
    getEffectiveVariationTechnicalValues(parentValues, variation)
  );
  if (missingCharacteristics.length) {
    return {
      message: `Preencha as características obrigatórias da variação: ${missingCharacteristics.join(', ')}.`,
      tab: 'tecnico',
    };
  }

  const variationName = String(variation?.name ?? parent?.description ?? '').trim();
  if (variationName.length < 2) {
    return { message: 'Nome do produto deve ter pelo menos 2 caracteres.', tab: 'identificacao' };
  }
  const categoryIds = Array.isArray(parent?.categoryIds)
    ? parent.categoryIds
    : parent?.categoryId || parent?.category_id
      ? [parent.categoryId || parent.category_id]
      : [];
  if (!categoryIds.length) {
    return { message: 'Pelo menos uma categoria deve ser selecionada.', tab: 'identificacao' };
  }
  if (
    !(
      parent?.mainSupplierId ||
      parent?.supplierId ||
      parent?.main_supplier_id ||
      parent?.supplier_id
    )
  ) {
    return { message: 'Selecione pelo menos um fornecedor.', tab: 'identificacao' };
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

const hasPositiveDimension = (
  product: any,
  field: 'width' | 'height' | 'depth',
  names: string[]
) => {
  if (parseLocalizedNumber(product?.[field]) > 0) return true;
  const values = getEffectiveProductTechnicalValues(product);
  return names.some((name) => parseLocalizedNumber(getTechnicalValue(values, name)) > 0);
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

  return (
    title.length >= 2 &&
    description.length >= 2 &&
    categoryIds.length > 0 &&
    Array.isArray(images) &&
    images.length > 0 &&
    (hasVariations ? variations.length > 0 : parentPrice > 0) &&
    (isService ||
      (hasPositiveDimension(product, 'width', ['Largura']) &&
        hasPositiveDimension(product, 'height', ['Altura']) &&
        hasPositiveDimension(product, 'depth', ['Profundidade', 'Comprimento']))) &&
    (promoPrice <= 0 || promoPrice < parentPrice)
  );
};
