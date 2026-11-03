import { restoreProductDraftSnapshot } from '../../../../../shared-utils/productDraftSnapshot';
import { resolveProductUnitPrice } from '../../../../../shared-utils/productUnitPrice';
import { parseVariationImages } from '../../../../../shared-utils/productVariationImages';
import { toTitleCase } from '../../../../../shared-utils/productText';
import { parseProductVariationAttributes } from '../../../../../shared-utils/productVariationAttributes';
import { resolveProductVariationSku } from '../../../../../shared-utils/productVariationSku';
import { getMobileProductVariationRecords } from '../domain/mobileProductVariationVisibility';
import { resolveMobileProductHasVariations } from '../domain/mobileProductVariationMode';
import { parseLocalizedNumber } from '../domain/productNumbers';
import { getMobileProductListCategoryLabel } from '../domain/mobileProductListPresentation';

const mapMobileVariationAttributes = (rawAttributes: unknown) =>
  parseProductVariationAttributes(rawAttributes, { preserveStructuredShowName: true }).map(
    (attribute) => ({
      ...attribute,
      name: toTitleCase(attribute.name),
      value: typeof attribute.value === 'string' ? toTitleCase(attribute.value) : attribute.value,
    })
  );

export const mapMobileProductRow = (
  p: any,
  productIndex: number,
  categoryNames: Map<string, string>,
  includeMerged: boolean
) => {
  const parentCode = p.sku || p.code || String(productIndex + 1).padStart(6, '0');
  const orderedImageRows = Array.isArray(p.product_images)
    ? [...p.product_images].sort(
        (a: any, b: any) => Number(Boolean(b.is_main)) - Number(Boolean(a.is_main))
      )
    : [];
  const relationImages = orderedImageRows.map((image: any) => image.image_url).filter(Boolean);
  const productImages =
    relationImages.length > 0
      ? relationImages
      : parseVariationImages(undefined, p.images);

  const storedVariations = p.product_variations || [];
  const productVariationRecords = getMobileProductVariationRecords(p, true);
  const variationDetailsById = new Map<string, any>(
    (Array.isArray(p.technical_specs?.variationDetails)
      ? p.technical_specs.variationDetails
      : [])
      .filter((variation: any) => variation?.id)
      .map((variation: any): [string, any] => [String(variation.id), variation])
  );
  const visibleStoredVariations = getMobileProductVariationRecords(
    p,
    includeMerged
  );
  const isParentMerged =
    productVariationRecords.length > 0 &&
    productVariationRecords.every((v: any) => Boolean(v.merged_to_variation_id || v.mergedToVariationId));

  let allVars: any[] = visibleStoredVariations.map((v: any, vIdx: number) => {
      const {
        discountPercent: _legacyDiscountPercent,
        discountFixed: _legacyDiscountFixed,
        ...details
      } = variationDetailsById.get(String(v.id)) || {};
      const varImages = parseVariationImages(v.image_url, v.images);

      const resolvedSku = resolveProductVariationSku(v.sku, parentCode, vIdx);

      const syncUnitPrice = v.use_parent_price !== false;
      const syncPromoPrice = v.use_parent_promo_price !== false;
      const syncDescription = v.use_parent_description !== false;
      const syncWidth = details.syncWidth ?? v.use_parent_dimensions !== false;
      const syncHeight = details.syncHeight ?? v.use_parent_dimensions !== false;
      const syncDepth = details.syncDepth ?? v.use_parent_dimensions !== false;
      const syncWeight = details.syncWeight ?? v.use_parent_dimensions !== false;
      const syncCostPrice = details.syncCostPrice !== false;
      const syncFiscal = details.syncFiscal !== false;
      const syncIpi = details.syncIpi !== false;
      const syncFreight = details.syncFreight !== false;
      const variationPrice = syncUnitPrice
        ? resolveProductUnitPrice(p)
        : Number(v.price ?? 0);
      const variationPromoPrice = syncPromoPrice
        ? p.promo_price === null || p.promo_price === undefined
          ? undefined
          : Number(p.promo_price)
        : v.promo_price === null || v.promo_price === undefined
          ? undefined
          : Number(v.promo_price);

      return {
        ...details,
        ...v,
        sku: resolvedSku,
        name: visibleStoredVariations.length <= 1 && v.use_parent_name === true ? p.name : v.name || p.name,
        stock: Number(v.stock ?? 0),
        price: variationPrice,
        promo_price: variationPromoPrice,
        unitPrice: variationPrice,
        promoPrice: variationPromoPrice,
        costPrice: syncCostPrice
          ? Number(p.cost_price ?? 0)
          : Number(v.cost_price ?? details.costPrice ?? 0),
        condition: details.syncCondition === false ? details.condition || p.condition || 'novo' : p.condition || 'novo',
        description: syncDescription ? p.description || '' : v.description || details.description || '',
        fiscal: syncFiscal ? p.fiscal : details.fiscal,
        ipiPercent: syncIpi ? Number(p.ipi_percent ?? 0) : Number(details.ipiPercent ?? 0),
        freightCost: syncFreight ? Number(p.freight_cost ?? 0) : Number(details.freightCost ?? 0),
        freightType: syncFreight ? p.freight_type || 'fixed' : details.freightType || 'fixed',
        syncUnitPrice,
        syncPromoPrice,
        syncCostPrice,
        syncDescription,
        syncName: details.syncName ?? v.use_parent_name !== false,
        syncCondition: details.syncCondition !== false,
        syncFiscal,
        syncIpi,
        syncFreight,
        syncWidth,
        syncHeight,
        syncDepth,
        syncWeight,
        width: syncWidth ? Number(p.width || 0) : v.width ? Number(v.width) : details.width,
        height: syncHeight ? Number(p.height || 0) : v.height ? Number(v.height) : details.height,
        depth: syncDepth ? Number(p.depth || 0) : v.depth ? Number(v.depth) : details.depth,
        weight: syncWeight ? Number(p.weight || 0) : Number(details.weight || 0),
        status: v.status || p.status || 'published',
        active: v.active !== false,
        images: varImages,
        comboItems: Array.isArray(v.combo_items) ? v.combo_items : [],
        attributes: mapMobileVariationAttributes(v.attributes),
        isMerged: Boolean(v.merged_to_variation_id || v.mergedToVariationId),
        mergedToVariationId: v.merged_to_variation_id || v.mergedToVariationId || null,
      };
    });

  // LÓGICA OFICIAL DO ERP (productService.ts):
  // Todo produto do tipo 'product' que não possui variações na tabela product_variations
  // gera a variação padrão filha com o código parentCode-01 e as fotos/preços do produto!
  const isProductItem = !p.item_type || p.item_type === 'product';
  if (storedVariations.length === 0 && allVars.length === 0 && isProductItem) {
    allVars = [
      {
        id: `${p.id}_${parentCode}-01`,
        isVirtual: true,
        sku: `${parentCode}-01`,
        name: p.name || 'Padrão',
        stock: Number(p.stock ?? 0),
        price: resolveProductUnitPrice(p),
        promo_price:
          p.promo_price !== null && p.promo_price !== undefined
            ? Number(p.promo_price)
            : undefined,
        cost_price: Number(p.cost_price ?? 0),
        active: Boolean(p.active),
        status: p.status || 'published',
        attributes: {},
        images: [],
      },
    ];
  }

  const activeVariationsCount = allVars.filter(
    (variation: any) => variation.active !== false
  ).length;
  const totalVariationsCount = allVars.length || 1;
  const parentActive = allVars.length > 0 ? activeVariationsCount > 0 : Boolean(p.active);
  const isParent = isProductItem || Boolean(p.has_variations || allVars.length > 0);

  const baseProduct = {
    ...p,
    category: getMobileProductListCategoryLabel(
      p,
      categoryNames,
      p.category || p.category_name || ''
    ),
    allVariations: allVars,
    images: productImages,
    comboItems: Array.isArray(p.combo_items) ? p.combo_items : [],
    variableTechnicalFields: Array.isArray(p.technical_specs?.variableTechnicalFields)
      ? p.technical_specs.variableTechnicalFields
      : undefined,
    unitPrice: resolveProductUnitPrice(p),
    promoPrice: Number(p.promo_price ?? 0),
    costPrice: Number(p.cost_price ?? 0),
    stock: Number(p.stock ?? 0),
    active: parentActive,
    activeVariationsCount,
    totalVariationsCount,
    isParent,
    isCombo: Boolean(p.is_combo),
    itemType: p.item_type || 'product',
    isDraft: Boolean(p.is_draft || p.status === 'draft'),
    variations: allVars,
    technicalSpecs: p.technical_specs || {},
    mainSupplierId: p.main_supplier_id || p.supplier_id || null,
    supplierId: p.supplier_id || p.main_supplier_id || null,
    supplierIds: Array.isArray(p.supplier_ids)
      ? p.supplier_ids
      : p.supplier_id
        ? [p.supplier_id]
        : p.main_supplier_id
          ? [p.main_supplier_id]
          : [],
  };
  const restoredProduct = restoreProductDraftSnapshot(baseProduct);
  const restoredVariations = Array.isArray(restoredProduct.variations)
    ? restoredProduct.variations.map((variation: any, variationIndex: number) => {
        const fallbackSku = `${parentCode}-${String(variationIndex + 1).padStart(2, '0')}`;
        const price = parseLocalizedNumber(
          variation.price ??
            variation.unit_price ??
            variation.unitPrice ??
            restoredProduct.unitPrice ??
            resolveProductUnitPrice(p)
        );
        const promoPrice = variation.promo_price ?? variation.promoPrice;
        return {
          ...variation,
          sku: variation.sku || fallbackSku,
          price,
          unitPrice: parseLocalizedNumber(variation.unitPrice ?? price),
          promo_price: promoPrice,
          promoPrice:
            promoPrice === null || promoPrice === undefined
              ? undefined
              : parseLocalizedNumber(promoPrice),
          stock: parseLocalizedNumber(variation.stock ?? 0),
          active: variation.active !== false,
          status: variation.status || restoredProduct.status || 'published',
          images: Array.isArray(variation.images) ? variation.images : [],
        };
      })
    : [];
  const normalizedRestoredVariations = !restoredProduct.isDraft && restoredVariations.length === 1
    ? [{ ...restoredVariations[0], images: [...productImages] }]
    : restoredVariations;
  const restoredActiveVariationsCount = normalizedRestoredVariations.filter(
    (variation: any) => variation.active !== false
  ).length;
  const itemType = restoredProduct.itemType || p.item_type || 'product';
  const isDraft = Boolean(restoredProduct.isDraft || p.is_draft || p.status === 'draft');
  const hasVariations = resolveMobileProductHasVariations({
    itemType,
    isDraft,
    hasVariations: restoredProduct.hasVariations ?? p.has_variations,
    variations: normalizedRestoredVariations,
  });

  return {
    ...restoredProduct,
    deleted: Boolean(restoredProduct.deleted ?? p.deleted),
    allVariations: normalizedRestoredVariations,
    variations: normalizedRestoredVariations,
    hasVariations,
    comboItems: Array.isArray(restoredProduct.comboItems)
      ? restoredProduct.comboItems
      : Array.isArray(p.combo_items)
        ? p.combo_items
        : [],
    variableTechnicalFields:
      restoredProduct.variableTechnicalFields ?? baseProduct.variableTechnicalFields,
    unitPrice: parseLocalizedNumber(restoredProduct.unitPrice ?? resolveProductUnitPrice(p)),
    promoPrice: parseLocalizedNumber(restoredProduct.promoPrice ?? p.promo_price ?? 0),
    costPrice: parseLocalizedNumber(restoredProduct.costPrice ?? p.cost_price ?? 0),
    stock: parseLocalizedNumber(restoredProduct.stock ?? p.stock ?? 0),
    active: restoredProduct.isDraft
      ? false
      : normalizedRestoredVariations.length > 0
        ? restoredActiveVariationsCount > 0
        : Boolean(p.active),
    activeVariationsCount: restoredActiveVariationsCount,
    totalVariationsCount: normalizedRestoredVariations.length || 1,
    isParent: Boolean(
      restoredProduct.isParent || isProductItem || hasVariations
    ),
    itemType,
    isDraft,
    isMerged: isParentMerged,
    hasAnyMergedVariation: storedVariations.some((v: any) =>
      Boolean(v.merged_to_variation_id || v.mergedToVariationId)
    ),
    mainSupplierId:
      restoredProduct.mainSupplierId || p.main_supplier_id || p.supplier_id || null,
    supplierId: restoredProduct.supplierId || p.supplier_id || p.main_supplier_id || null,
    supplierIds: restoredProduct.supplierIds || baseProduct.supplierIds,
  };
};
