import type Product from '../../../pages/types/product.type';
import { toTitleCase } from '../../../pages/utils/textUtils';
import { hasVariationAttribute } from './variationAttributes';
import { isSingleProductVariationFormMode } from '../../../../../shared-utils/productVariationMode';
import { normalizeProductVariationSku } from '../../../../../shared-utils/productVariationSku';

/**
 * Remove somente o identificador interno que versões antigas ou colisões temporárias anexavam ao SKU.
 * Exemplo: 000123-01-a1b2c3 -> 000123-01
 */
export const normalizeVariationSku = normalizeProductVariationSku;

/**
 * Determina se a variação é a variação padrão/simples (sem atributos específicos adicionados).
 */
export const isDefaultVariation = (variation: any, index?: number): boolean => {
  if (index !== undefined && index !== 0) return false;
  const hasAttrs = hasVariationAttribute(variation);
  return !hasAttrs;
};

/**
 * Garante que produtos físicos possuam ao menos uma variação padrão inicial com UUID próprio.
 */
export const ensureDefaultVariation = <T extends Partial<Product>>(product: T): T => {
  if (product.itemType === 'service') return product;
  const isDraft = Boolean(product.isDraft ?? (product as any).is_draft) || product.status === 'draft';
  const storedDraftMode = product.hasVariations ?? (product as any).has_variations;
  if (product.variations?.length) {
    const isSingleVariation = isSingleProductVariationFormMode(
      product,
      product.variations.length,
      false
    );
    return {
      ...product,
      hasVariations: isDraft && typeof storedDraftMode === 'boolean'
        ? storedDraftMode
        : product.variations.length > 1,
      ...(isSingleVariation
        ? { variations: [{ ...product.variations[0], images: [...(product.images || [])] }] }
        : {}),
    };
  }
  const name = toTitleCase(product.name || product.title || product.description || '');
  const sku = product.code ? `${product.code}-01` : '';
  const inheritDefaultVariationGallery = isSingleProductVariationFormMode(product, 0, true);
  return {
    ...product,
    hasVariations: isDraft && typeof storedDraftMode === 'boolean' ? storedDraftMode : false,
    // A variação principal é um novo registro físico e recebe seu próprio UUID.
    variations: [
      {
        id: crypto.randomUUID(),
        sku,
        name,
        stock: Number(product.stock || 0),
        unitPrice: Number(product.unitPrice || 0),
        promoPrice: Number(product.promoPrice || 0),
        costPrice: Number(product.costPrice || 0),
        condition: product.condition || 'novo',
        description: product.description || '',
        fiscal: product.fiscal ? { ...product.fiscal } : undefined,
        width: Number(product.width || 0),
        height: Number(product.height || 0),
        depth: Number(product.depth || 0),
        weight: Number(product.weight || 0),
        ipiPercent: Number(product.ipiPercent || 0),
        ipiType: product.ipiType || 'percentage',
        freightCost: Number(product.freightCost || 0),
        freightType: product.freightType || 'fixed',
        finalPurchasePrice: Number(product.finalPurchasePrice || 0),
        minStock: Number(product.minStock || 0),
        active: product.active !== false,
        status: product.status || 'hidden',
        attributes: [],
        images: inheritDefaultVariationGallery ? [...(product.images || [])] : [],
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
        syncCondition: true,
        syncDescription: true,
        syncFiscal: true,
        syncWithParent: true,
        syncDimensions: true,
        syncWidth: true,
        syncHeight: true,
        syncDepth: true,
        syncWeight: true,
        syncIpi: true,
        syncFreight: true,
      },
    ],
  };
};
