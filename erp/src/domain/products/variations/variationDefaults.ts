import Product, { Variation } from '@/pages/types/product.type';
import { toTitleCase } from '@/pages/utils/textUtils';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
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
  if (product.variations?.length) return { ...product, hasVariations: true };
  const name = toTitleCase(product.name || product.title || product.description || '');
  const sku = product.code ? `${product.code}-01` : '';
  return {
    ...product,
    hasVariations: true,
    // A variação principal é um novo registro físico e recebe seu próprio UUID.
    variations: [
      {
        id: crypto.randomUUID(),
        sku,
        name,
        stock: Number(product.stock || 0),
        unitPrice: Number(product.unitPrice || 0),
        costPrice: Number(product.costPrice || 0),
        active: product.active !== false,
        status: product.status || 'hidden',
        attributes: [],
        images: (product.images || []).slice(0, MAX_VARIATION_IMAGES),
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
