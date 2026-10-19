/**
 * Serviço de construção de lotes para sincronização completa do catálogo com a Meta.
 * Responsabilidade única: transformar produtos do banco em MetaBatchRequests.
 *
 * Separado do handler HTTP (route.ts) conforme Single Responsibility Principle.
 */
import {
  normalizeMetaImageUrl,
  stripHtml,
  formatDecimalPrice,
  type MetaBatchRequest,
} from '@/services/meta-catalog';
import { isSlugIdentifier } from '@/services/facebook-catalog-feed/feed-helpers';

export interface CatalogSyncSettings {
  globalDescPrefix: string;
  columnMappings: {
    brand: string;
    condition: string;
    gender: string;
    age_group: string;
    [key: string]: string;
  };
}

export const DEFAULT_SYNC_SETTINGS: CatalogSyncSettings = {
  globalDescPrefix: '',
  columnMappings: {
    brand: 'Móveis Morante',
    condition: 'new',
    gender: 'unisex',
    age_group: 'adult',
  },
};

/**
 * Resolve o tipo de produto (Ambiente > Categoria) para a Meta.
 */
export function resolveProductTypeTaxonomy(productCategories: any[]): string {
  const cats = productCategories || [];
  const parentCategories = cats
    .map((pc: any) => pc.categories)
    .filter((cat: any) => cat?.type === 'category')
    .map((cat: any) => cat.name)
    .filter(Boolean);
  const environments = cats
    .map((pc: any) => pc.categories)
    .filter((cat: any) => cat?.type === 'environment')
    .map((cat: any) => cat.name)
    .filter(Boolean);

  if (environments.length > 0 && parentCategories.length > 0) {
    return `${environments[0]} > ${parentCategories[0]}`;
  }
  if (parentCategories.length > 0) return parentCategories[0];
  if (environments.length > 0) return environments[0];
  return 'Móveis';
}

/**
 * Resolve imagens ordenadas de um produto (principal primeiro).
 */
export function resolveSortedImages(productImages: any[]): {
  mainImage: string;
  additionalImages: string;
} {
  const sorted = [...(productImages || [])].sort(
    (a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1)
  );
  const all = sorted.map((img: any) => img.image_url).filter(Boolean);
  return {
    mainImage: all[0] || '',
    additionalImages: all.slice(1).map(normalizeMetaImageUrl).filter(Boolean).join(','),
  };
}

/**
 * Extrai atributos cor e tamanho de uma variação.
 */
export function extractVariationColorSize(
  attributes: unknown
): { color: string; size: string } {
  let color = '';
  let size = '';

  if (Array.isArray(attributes)) {
    const corAttr = (attributes as any[]).find(
      (a) => a?.name?.toLowerCase() === 'cor' || a?.key?.toLowerCase() === 'cor'
    );
    if (corAttr) color = String(corAttr.value || corAttr.option || '').trim();

    const tamAttr = (attributes as any[]).find(
      (a) => a?.name?.toLowerCase() === 'tamanho' || a?.key?.toLowerCase() === 'tamanho'
    );
    if (tamAttr) size = String(tamAttr.value || tamAttr.option || '').trim();
  } else if (attributes && typeof attributes === 'object') {
    const obj = attributes as Record<string, unknown>;
    color = String(obj.Cor || obj.cor || '').trim();
    size = String(obj.Tamanho || obj.tamanho || '').trim();
  }

  return { color, size };
}

/**
 * Resolve o nome de exibição de uma variação.
 */
export function resolveVariationDisplayName(
  varName: string,
  color: string,
  size: string,
  productName: string
): string {
  let name = varName.trim();
  if (!name) {
    const parts = [color, size].filter(Boolean);
    name = parts.length > 0 ? `${productName} - ${parts.join(' / ')}` : productName.trim();
  }
  // Fallback de cor pelo nome
  if (!color && /branco/i.test(name)) {
    color = 'Branco';
  }
  return name;
}

/**
 * Constrói os DELETE requests para remover o produto pai e seus IDs legados.
 */
export function buildParentDeleteRequests(
  productId: string,
  productCode: string | null
): MetaBatchRequest[] {
  const requests: MetaBatchRequest[] = [];
  const parentCode = productCode ? String(productCode).trim() : '';
  if (parentCode) {
    requests.push({ method: 'DELETE', retailer_id: parentCode, data: { id: parentCode } });
  }
  requests.push({ method: 'DELETE', retailer_id: productId, data: { id: productId } });
  return requests;
}

/**
 * Constrói o retailer_id canônico de uma variação (nunca slug, sempre SKU oficial).
 */
export function resolveVariationRetailerId(
  varSku: string,
  varIndex: number,
  productCode: string | null,
  varId: string
): string {
  const cleanSku = String(varSku || '').trim();
  if (cleanSku && !isSlugIdentifier(cleanSku)) return cleanSku;
  if (productCode) {
    return `${productCode}-${String(varIndex + 1).padStart(2, '0')}`;
  }
  return varId;
}

/**
 * Constrói o retailer_id canônico de um produto pai simples.
 */
export function resolveParentRetailerId(
  code: string | null,
  sku: string | null,
  id: string
): string {
  const rawCode = String(code || '').trim();
  const rawSku = String(sku || '').trim();
  return (
    (!isSlugIdentifier(rawCode) && rawCode ? rawCode : '') ||
    (!isSlugIdentifier(rawSku) && rawSku ? rawSku : '') ||
    id
  );
}

/**
 * Constrói os requests de UPDATE/DELETE para todas as variações de um produto.
 */
export function buildVariationBatchRequests(options: {
  product: any;
  variations: any[];
  visibleVariations: any[];
  origin: string;
  productType: string;
  mainImage: string;
  additionalImages: string;
  settings: CatalogSyncSettings;
  opportunityName: string;
  opp: any;
  globalDescPrefix: string;
}): MetaBatchRequest[] {
  const {
    product,
    variations,
    visibleVariations,
    origin,
    productType,
    mainImage,
    additionalImages,
    settings,
    opportunityName,
    opp,
    globalDescPrefix,
  } = options;
  const requests: MetaBatchRequest[] = [];

  for (let idx = 0; idx < variations.length; idx++) {
    const v = variations[idx];
    const isVarVisible = visibleVariations.includes(v);

    const retailerId = resolveVariationRetailerId(v.sku, idx, product.code, v.id);

    if (!isVarVisible) {
      requests.push({ method: 'DELETE', retailer_id: retailerId, data: { id: retailerId } });
      if (v.id) {
        requests.push({ method: 'DELETE', retailer_id: String(v.id), data: { id: String(v.id) } });
      }
      continue;
    }

    // Preços
    const isParentPrice = v.use_parent_price !== false;
    const isParentPromo = v.use_parent_promo_price !== false;
    const varPrice = isParentPrice ? product.price || product.unit_price : v.price || product.price;
    const varPromo = isParentPromo ? product.promo_price : v.promo_price;

    let regularVarPrice = Number(varPrice || 0);
    let promoVarPrice = varPromo ? Number(varPromo) : 0;
    if (regularVarPrice <= 0 && promoVarPrice > 0) {
      regularVarPrice = promoVarPrice;
      promoVarPrice = 0;
    }

    // Atributos
    const { color: attrColor, size: attrSize } = extractVariationColorSize(v.attributes);
    let color = attrColor;
    const size = attrSize;
    const varDesc = v.use_parent_description !== false
      ? product.description
      : v.description || product.description;

    // Nome
    const rawVarName = String(v.name || '').trim();
    let varName = resolveVariationDisplayName(rawVarName, color, size, product.name);
    if (!color && /branco/i.test(varName)) color = 'Branco';

    // Descrição
    const descParts: string[] = [];
    if (globalDescPrefix) descParts.push(globalDescPrefix);
    if (opp?.observations) {
      descParts.push(`***Aviso Importante (${opportunityName || opp.name}): ${opp.observations}***`);
    }
    if (varDesc) descParts.push(varDesc);
    const descWithPrefix = stripHtml(descParts.join('\n\n'));

    // Imagem
    let varImageLink = normalizeMetaImageUrl(mainImage);
    let varAdditional = additionalImages;

    if (v.image_url) {
      const varImages = String(v.image_url).split(',').map((u: string) => u.trim()).filter(Boolean);
      if (varImages.length > 0) {
        varImageLink = normalizeMetaImageUrl(varImages[0]);
        varAdditional = varImages.slice(1).map(normalizeMetaImageUrl).filter(Boolean).join(',');
      }
    }

    // Ignora se não há preço ou imagem válidos
    if (regularVarPrice <= 0 || !varImageLink) {
      requests.push({ method: 'DELETE', retailer_id: retailerId, data: { id: retailerId } });
      continue;
    }

    const hasVarPromo = promoVarPrice > 0 && promoVarPrice < regularVarPrice;
    const currentVarPrice = hasVarPromo ? promoVarPrice : regularVarPrice;
    const isStockAvailable = v.stock === null || v.stock === undefined || Number(v.stock) > 0;
    const quantityToSell = v.stock != null ? Math.max(0, Number(v.stock)) : 1;

    requests.push({
      method: 'UPDATE',
      retailer_id: retailerId,
      data: {
        id: retailerId,
        title: varName,
        description: descWithPrefix,
        link: `${origin}/produto/${product.slug}?var=${v.id}`,
        image_link: varImageLink,
        additional_image_link: varAdditional || undefined,
        availability: isStockAvailable ? 'in stock' : 'out of stock',
        price: `${regularVarPrice.toFixed(2)} BRL`,
        sale_price: hasVarPromo ? `${promoVarPrice.toFixed(2)} BRL` : undefined,
        brand: settings.columnMappings.brand || 'Móveis Morante',
        condition: product.is_salvado ? 'refurbished' : 'new',
        color: color || undefined,
        gender: settings.columnMappings.gender || 'unisex',
        material: product.material || undefined,
        size: size || undefined,
        item_group_id: '',
        identifier_exists: 'no',
        quantity_to_sell_on_facebook: quantityToSell,
        product_type: productType,
        custom_label_0: productType,
        custom_label_1: formatDecimalPrice(currentVarPrice),
        custom_label_2: hasVarPromo ? formatDecimalPrice(regularVarPrice) : undefined,
        custom_label_3: opportunityName || undefined,
      },
    });
  }

  return requests;
}

/**
 * Constrói o request de UPDATE para um produto simples (sem variações).
 */
export function buildSimpleProductRequest(options: {
  product: any;
  origin: string;
  productType: string;
  mainImage: string;
  additionalImages: string;
  settings: CatalogSyncSettings;
  opportunityName: string;
  opp: any;
  globalDescPrefix: string;
}): MetaBatchRequest | null {
  const { product, origin, productType, mainImage, additionalImages, settings, opportunityName, opp, globalDescPrefix } = options;

  const retailerId = resolveParentRetailerId(product.code, product.sku, product.id);

  let regularParentPrice = Number(product.price || product.unit_price || 0);
  let promoParentPrice = product.promo_price ? Number(product.promo_price) : 0;
  if (regularParentPrice <= 0 && promoParentPrice > 0) {
    regularParentPrice = promoParentPrice;
    promoParentPrice = 0;
  }

  const finalImage = normalizeMetaImageUrl(mainImage);
  if (regularParentPrice <= 0 || !finalImage) {
    return { method: 'DELETE', retailer_id: retailerId, data: { id: retailerId } };
  }

  const hasParentPromo = promoParentPrice > 0 && promoParentPrice < regularParentPrice;
  const currentParentPrice = hasParentPromo ? promoParentPrice : regularParentPrice;
  const isStockAvailable = product.stock === null || product.stock === undefined || Number(product.stock) > 0;
  const quantityToSell = product.stock != null ? Math.max(0, Number(product.stock)) : 1;

  const descParts: string[] = [];
  if (globalDescPrefix) descParts.push(globalDescPrefix);
  if (opp?.observations) {
    descParts.push(`***Aviso Importante (${opportunityName || opp.name}): ${opp.observations}***`);
  }
  if (product.description) descParts.push(product.description);
  const descWithPrefix = stripHtml(descParts.join('\n\n'));

  return {
    method: 'UPDATE',
    retailer_id: retailerId,
    data: {
      id: retailerId,
      title: product.name,
      description: descWithPrefix,
      link: `${origin}/produto/${product.slug}`,
      image_link: finalImage,
      additional_image_link: additionalImages || undefined,
      availability: isStockAvailable ? 'in stock' : 'out of stock',
      price: `${regularParentPrice.toFixed(2)} BRL`,
      sale_price: hasParentPromo ? `${promoParentPrice.toFixed(2)} BRL` : undefined,
      brand: settings.columnMappings.brand || 'Móveis Morante',
      condition: product.is_salvado ? 'refurbished' : 'new',
      gender: settings.columnMappings.gender || 'unisex',
      material: product.material || undefined,
      item_group_id: '',
      identifier_exists: 'no',
      quantity_to_sell_on_facebook: quantityToSell,
      product_type: productType,
      custom_label_0: productType,
      custom_label_1: formatDecimalPrice(currentParentPrice),
      custom_label_2: hasParentPromo ? formatDecimalPrice(regularParentPrice) : undefined,
      custom_label_3: opportunityName || undefined,
    },
  };
}
