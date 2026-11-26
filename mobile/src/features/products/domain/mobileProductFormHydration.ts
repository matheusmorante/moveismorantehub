import { deriveProductDiscountFields } from '../../../../../shared-utils/productDiscountFields';
import { INITIAL_FORM } from '../screens/productFormInitialState';
import { getMobileProductFormCompositionItems } from './mobileProductCompositionItems';
import { createMobileProductVariationId } from './mobileProductVariationGeneration';
import {
  initializeMobileProductCode,
  resolveMobileProductFormHasVariations,
} from './mobileProductVariationMode';
import { resolveMobileVariationImages } from './mobileVariationImages';
import {
  getPersistableProductTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
  hasTechnicalValue,
  resolveMobileVariableTechnicalFieldNames,
} from './productCharacteristics';
import { parseLocalizedNumber as parseLocalizedPrice } from './productNumbers';
import { resolveMobileProductFinalPurchasePrice } from './productPurchasePrice';
import { syncMobileVariationsWithParent } from './productVariationParentSync';

const parseVariationComboItems = (variation: any) => {
  if (typeof variation.combo_items !== 'string') {
    return variation.combo_items || variation.comboItems || [];
  }
  try {
    return JSON.parse(variation.combo_items);
  } catch {
    return [];
  }
};

export function hydrateExistingMobileProductFormData(product: any) {
  const productCategories = Array.isArray(product.product_categories)
    ? product.product_categories
        .map((relation: any) => relation.category_id || relation.categories?.id || relation.id)
        .filter(Boolean)
    : [];
  const rawVariations = Array.isArray(product.allVariations) ? product.allVariations : [];
  const hasVariations = resolveMobileProductFormHasVariations(product);
  const isComposition = (product.item_type || product.itemType) === 'composition';
  const technicalValues = getPersistableProductTechnicalValues(product);

  for (const [attribute, value] of [
    ['Altura', product.height],
    ['Largura', product.width],
    [
      product.depth_use_length || product.depthUseLength ? 'Comprimento' : 'Profundidade',
      product.depth,
    ],
    ['Peso', product.weight],
  ]) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() &&
      (!hasTechnicalValue(technicalValues, attribute) ||
        !String(getTechnicalValue(technicalValues, attribute) ?? '').trim())
    ) {
      technicalValues[attribute] = value;
    }
  }

  const comboItems = getMobileProductFormCompositionItems(
    product,
    isComposition && !hasVariations
  );
  const unitPrice = product.unitPrice ?? product.unit_price ?? '';
  const promoPrice = product.promoPrice ?? product.promo_price ?? '';
  const finalPurchasePrice = resolveMobileProductFinalPurchasePrice(product);
  const discountFields = deriveProductDiscountFields(
    parseLocalizedPrice(unitPrice),
    parseLocalizedPrice(promoPrice)
  );

  return {
    ...INITIAL_FORM,
    ...product,
    id: product.id,
    name: product.name || '',
    slug: product.slug || '',
    title: product.title || product.marketplaceTitle || product.name || '',
    marketplaceTitle: product.marketplaceTitle || product.title || product.name || '',
    metaTitle: product.meta_title || product.metaTitle || '',
    metaDescription: product.meta_description || product.metaDescription || '',
    seoDescription: product.seo_description || product.seoDescription || '',
    code: product.code || '',
    itemType: product.item_type || product.itemType || 'product',
    environment: product.environment || '',
    includeEnvironment: product.include_environment !== false,
    includeBrand: product.include_brand !== false,
    titleOrder: Array.isArray(product.title_order)
      ? product.title_order
      : INITIAL_FORM.titleOrder,
    featured: Boolean(product.featured),
    productKind:
      product.product_kind ||
      product.productKind ||
      (product.condition === 'salvado' || product.is_salvado
        ? 'salvado'
        : product.condition === 'usado'
          ? 'usado'
          : 'normal'),
    condition: product.condition || (product.is_salvado ? 'salvado' : 'novo'),
    category: product.category || '',
    categoryId: product.category_id || product.categoryId || '',
    categoryIds:
      product.categoryIds ||
      (productCategories.length
        ? productCategories
        : product.category_id || product.categoryId
          ? [product.category_id || product.categoryId]
          : []),
    mainSupplierId: product.main_supplier_id || product.mainSupplierId || '',
    description: product.description || '',
    observations: product.observations || '',
    unitPrice,
    promoPrice,
    ...discountFields,
    costPrice: product.costPrice ?? product.cost_price ?? '',
    ipiPercent: product.ipi_percent ?? product.ipiPercent ?? '',
    freightType: product.freight_type || product.freightType || 'fixed',
    freightCost: product.freight_cost ?? product.freightCost ?? '',
    finalPurchasePrice,
    stock: product.stock ?? '',
    minStock: product.min_stock ?? product.minStock ?? '',
    width: product.width ?? '',
    height: product.height ?? '',
    depth: product.depth ?? '',
    weight: product.weight ?? '',
    images: Array.isArray(product.images) ? product.images : [],
    variations: syncMobileVariationsWithParent(
      rawVariations.map((variation: any) => ({
        ...variation,
        images: resolveMobileVariationImages(
          variation.image_url ?? variation.imageUrl,
          variation.images,
          hasVariations
        ),
        syncName: variation.syncName ?? variation.use_parent_name !== false,
        differentiateTitle: Boolean(
          variation.differentiateTitle ||
            (variation.title && variation.title !== variation.name) ||
            (variation.marketplaceTitle && variation.marketplaceTitle !== variation.name)
        ),
        attributes: (() => {
          const normalizedAttributes = getProductCharacteristicAttributes(variation.attributes);
          return normalizedAttributes.length
            ? normalizedAttributes
            : variation.attributes || {};
        })(),
        price: variation.price ?? variation.unit_price ?? '',
        costPrice: variation.costPrice ?? variation.cost_price ?? '',
        promoPrice: variation.promoPrice ?? variation.promo_price ?? '',
        syncUnitPrice: variation.syncUnitPrice ?? variation.use_parent_price !== false,
        syncPromoPrice: variation.syncPromoPrice ?? variation.use_parent_promo_price !== false,
        syncCostPrice: variation.syncCostPrice ?? variation.use_parent_cost_price !== false,
        syncDescription: variation.syncDescription ?? variation.use_parent_description !== false,
        syncCondition: variation.syncCondition ?? variation.use_parent_condition !== false,
        syncFiscal: variation.syncFiscal ?? variation.use_parent_fiscal !== false,
        syncIpi: variation.syncIpi ?? variation.use_parent_ipi !== false,
        syncFreight: variation.syncFreight ?? variation.use_parent_freight !== false,
        syncWidth: variation.syncWidth ?? variation.use_parent_dimensions !== false,
        syncHeight: variation.syncHeight ?? variation.use_parent_dimensions !== false,
        syncDepth: variation.syncDepth ?? variation.use_parent_dimensions !== false,
        syncWeight: variation.syncWeight ?? variation.use_parent_dimensions !== false,
        comboItems: parseVariationComboItems(variation),
      })),
      product,
      product
    ),
    comboItems,
    hasVariations,
    active: product.active ?? true,
    isDraft: Boolean(product.is_draft || product.isDraft || product.status === 'draft'),
    status: product.status || (product.is_draft || product.isDraft ? 'draft' : 'hidden'),
    // Disponibilidade calculada de uma composição não é estoque inicial.
    initialStock: isComposition
      ? undefined
      : product.initial_stock ?? product.initialStock ?? product.stock ?? 0,
    unit: product.unit || 'UN',
    depthUseLength: product.depth_use_length ?? product.depthUseLength ?? false,
    technicalValues,
    ecommerceDescription: product.ecommerce_description || product.ecommerceDescription || '',
    whatsappDescription: product.whatsapp_description || product.whatsappDescription || '',
    fiscal: product.fiscal || {},
    variableTechnicalFields: resolveMobileVariableTechnicalFieldNames({
      ...product,
      variations: rawVariations,
    }),
  };
}

export function applyInitialMobileProductCode(prev: any, productCode: string) {
  const defaultVariation = {
    id: createMobileProductVariationId(),
    sku: `${productCode}-01`,
    name: prev.name || '',
    price: '',
    costPrice: '',
    stock: 0,
    attributes: [],
    images: [],
    comboItems: [],
    syncUnitPrice: true,
    syncPromoPrice: true,
    syncCostPrice: true,
    syncFiscal: true,
    syncCondition: true,
    syncDescription: true,
    syncIpi: true,
    syncFreight: true,
    syncWidth: true,
    syncHeight: true,
    syncDepth: true,
    syncWeight: true,
    active: false,
    status: 'hidden',
  };
  const variationFallback =
    prev.itemType === 'composition' ? defaultVariation : { ...defaultVariation, attributes: {} };
  const nextFormData = initializeMobileProductCode(prev, productCode, variationFallback);
  return {
    ...nextFormData,
    variations: syncMobileVariationsWithParent(nextFormData.variations, nextFormData, prev),
  };
}
