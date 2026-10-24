import type Product from '../../../pages/types/product.type';
import { toTitleCase } from '../../../pages/utils/textUtils';
import { hasVariationAttribute } from './variationAttributes';

/**
 * Remove somente o identificador interno que versões antigas ou colisões temporárias anexavam ao SKU.
 * Exemplo: 000123-01-a1b2c3 -> 000123-01
 */
export const normalizeVariationSku = (sku?: string): string => {
  const value = String(sku || '').trim();
  return value.replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');
};

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
  if (product.variations?.length) {
    return {
      ...product,
      hasVariations: isDraft && typeof product.hasVariations === 'boolean'
        ? product.hasVariations
        : product.variations.length > 1,
      ...(product.variations.length === 1
        ? { variations: [{ ...product.variations[0], images: [...(product.images || [])] }] }
        : {}),
    };
  }
  const name = toTitleCase(product.name || product.title || product.description || '');
  const sku = product.code ? `${product.code}-01` : '';
  return {
    ...product,
    hasVariations: isDraft && typeof product.hasVariations === 'boolean' ? product.hasVariations : false,
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
        images: [...(product.images || [])],
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
