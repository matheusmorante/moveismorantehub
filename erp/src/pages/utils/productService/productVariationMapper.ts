import { Variation } from '../../types/product.type';
import { parseVariationImages } from './productImageHelpers';
import { toTitleCase } from '../textUtils';
import { getVariationDetails } from './productDraftSnapshot';

/**
 * Converte um atributo cru de variação em lista estruturada
 */
export const parseVariationAttributes = (
  rawAttrs: any
): { name: string; value: string; showName?: boolean }[] => {
  if (Array.isArray(rawAttrs)) {
    return rawAttrs
      .map((a: any) => ({
        name: a.name || a.attribute_name || a.key || '',
        value: String(a.value || a.option || ''),
        showName: a.showName ?? true,
      }))
      .filter((a) => a.name && a.value);
  }

  if (rawAttrs && typeof rawAttrs === 'object') {
    return Object.entries(rawAttrs)
      .map(([name, value]) => ({
        name,
        value:
          typeof value === 'object' && value !== null
            ? String((value as any).value || (value as any).name || JSON.stringify(value))
            : String(value),
        showName: true,
      }))
      .filter((a) => a.name && a.value);
  }

  if (typeof rawAttrs === 'string') {
    try {
      return parseVariationAttributes(JSON.parse(rawAttrs));
    } catch (e) {
      // Se não for JSON válido, ignora
    }
  }

  return [];
};

/**
 * Mapeia os registros de variação vindos do banco de dados para a interface Variation do domínio
 */
export const mapDbVariations = (
  variationRecords: any[],
  data: any,
  parentCode: string
): Variation[] => {
  return variationRecords.map((v: any, vIdx: number) => {
    const details = getVariationDetails(data, String(v.id));
    const varImages = parseVariationImages(v.image_url, v.images);
    const suffix = String(vIdx + 1).padStart(2, '0');
    const expectedPrefix = parentCode ? `${parentCode}-` : '';
    const isAlreadyFormatted =
      expectedPrefix && v.sku && typeof v.sku === 'string' && v.sku.startsWith(expectedPrefix);
    const resolvedSku = isAlreadyFormatted
      ? v.sku
      : parentCode
        ? `${parentCode}-${suffix}`
        : v.sku || '';

    // Registros antigos podem ter sido gravados em maiúsculas. A interface
    // usa a mesma regra de formatação para todas as variações do produto.
    const attributesList = parseVariationAttributes(v.attributes).map((attribute) => ({
      ...attribute,
      name: toTitleCase(attribute.name),
      value: toTitleCase(attribute.value),
    }));
    const syncWidth = details.syncWidth ?? v.use_parent_dimensions !== false;
    const syncHeight = details.syncHeight ?? v.use_parent_dimensions !== false;
    const syncDepth = details.syncDepth ?? v.use_parent_dimensions !== false;
    const syncWeight = details.syncWeight ?? v.use_parent_dimensions !== false;
    const syncFiscal = details.syncFiscal !== false;
    const syncIpi = details.syncIpi !== false;
    const syncFreight = details.syncFreight !== false;
    const formattedName = toTitleCase(
      (v.use_parent_name === true ? data.name || data.title : v.name) || data.name || data.title || ''
    );

    if (v.product_id) {
      return {
        ...details,
        id: String(v.id),
        mergedToVariationId: v.merged_to_variation_id || undefined,
        sku: resolvedSku,
        name: formattedName,
        stock: Number(v.stock || 0),
        unitPrice: v.use_parent_price ? Number(data.unit_price || 0) : Number(v.price || 0),
        promoPrice: v.use_parent_promo_price
          ? Number(data.promo_price || 0)
          : Number(v.promo_price || 0),
        costPrice: details.syncCostPrice === false
          ? Number(v.cost_price ?? details.costPrice ?? 0)
          : Number(data.cost_price || 0),
        ipiPercent: syncIpi ? Number(data.ipi_percent || 0) : Number(details.ipiPercent || 0),
        freightCost: syncFreight ? Number(data.freight_cost || 0) : Number(details.freightCost || 0),
        freightType: syncFreight ? data.freight_type || 'fixed' : details.freightType || 'fixed',
        active:
          v.active !== undefined && v.active !== null ? Boolean(v.active) : Boolean(data.active),
        status: (v.status || data.status || 'hidden') as 'draft' | 'published' | 'hidden',
        condition: details.syncCondition === false ? details.condition || data.condition || 'novo' : data.condition || 'novo',
        fiscal: syncFiscal ? data.fiscal : details.fiscal,
        attributes: attributesList,
        images: varImages,
        comboItems: Array.isArray(v.combo_items) ? v.combo_items : [],
        syncUnitPrice: v.use_parent_price !== false,
        syncPromoPrice: v.use_parent_promo_price !== false,
        syncDescription: v.use_parent_description !== false,
        description: v.use_parent_description !== false ? data.description || '' : v.description || details.description || '',
        syncWidth,
        syncHeight,
        syncDepth,
        syncWeight,
        syncFiscal,
        syncIpi,
        syncFreight,
        width: syncWidth ? Number(data.width || 0) : (v.width ? Number(v.width) : undefined),
        depth: syncDepth ? Number(data.depth || 0) : (v.depth ? Number(v.depth) : undefined),
        height: syncHeight ? Number(data.height || 0) : (v.height ? Number(v.height) : undefined),
        weight: syncWeight ? Number(data.weight || 0) : (v.weight ? Number(v.weight) : details.weight),
      };
    }
    return {
      ...v,
      name: formattedName,
      images: varImages,
      attributes: attributesList,
      unitPrice: v.unitPrice || 0,
      costPrice: v.costPrice || 0,
      stock: v.stock || 0,
      sku: resolvedSku,
    };
  });
};

/**
 * Cria a variação padrão para produtos simples
 */
export const createDefaultVariation = (
  data: any,
  parentCode: string,
  rawName: string,
  productImages: string[]
): Variation[] => {
  return [
    {
      id: `${data.id}_${parentCode ? `${parentCode}-01` : '01'}`,
      isVirtual: true,
      sku: parentCode ? `${parentCode}-01` : '01',
      name: rawName || 'Padrão',
      stock: Number(data.stock || 0),
      unitPrice: Number(
        data.price !== undefined && data.price !== null ? data.price : data.unit_price || 0
      ),
      promoPrice:
        data.promo_price !== null && data.promo_price !== undefined
          ? Number(data.promo_price)
          : undefined,
      costPrice: Number(data.cost_price || 0),
      active: Boolean(data.active),
      status: (data.status || 'hidden') as 'draft' | 'published' | 'hidden',
      condition: data.condition || (data.is_salvado ? 'salvado' : 'novo'),
      attributes: [],
      images: productImages,
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncCostPrice: true,
      syncDescription: true,
      syncWidth: true,
      syncHeight: true,
      syncDepth: true,
      syncWeight: true,
    },
  ];
};
