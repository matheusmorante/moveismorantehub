import {
  normalizeMetaImageUrl,
  stripHtml,
  formatDecimalPrice,
} from '../meta-catalog';
import { RawCatalogProduct, RawProductVariation } from './types';

export { normalizeMetaImageUrl, stripHtml, formatDecimalPrice };

/**
 * Resolve a taxonomia do produto para a Meta: "Ambiente > Categoria"
 */
export function resolveProductType(product: RawCatalogProduct): string {
  const relations = product.product_categories || [];

  const parentCategories = relations
    .map((pc) => pc.categories)
    .filter((cat): cat is { name: string; type: string } => Boolean(cat && cat.type === 'category'))
    .map((cat) => cat.name)
    .filter(Boolean);

  const environments = relations
    .map((pc) => pc.categories)
    .filter((cat): cat is { name: string; type: string } => Boolean(cat && cat.type === 'environment'))
    .map((cat) => cat.name)
    .filter(Boolean);

  if (environments.length > 0 && parentCategories.length > 0) {
    return `${environments[0]} > ${parentCategories[0]}`;
  }
  if (parentCategories.length > 0) {
    return parentCategories[0];
  }
  if (environments.length > 0) {
    return environments[0];
  }
  return 'Móveis';
}

/**
 * Extrai atributos de cor e tamanho a partir da estrutura flexível de atributos da variação
 */
export function extractVariationAttributes(attributes: unknown): { color: string; size: string } {
  let color = '';
  let size = '';

  if (Array.isArray(attributes)) {
    const corAttr = attributes.find(
      (a: any) =>
        a &&
        (a.name?.toLowerCase() === 'cor' ||
          a.key?.toLowerCase() === 'cor' ||
          a.attribute_name?.toLowerCase() === 'cor')
    );
    if (corAttr) {
      color = String(corAttr.value || corAttr.option || '').trim();
    }

    const tamAttr = attributes.find(
      (a: any) =>
        a &&
        (a.name?.toLowerCase() === 'tamanho' ||
          a.key?.toLowerCase() === 'tamanho' ||
          a.attribute_name?.toLowerCase() === 'tamanho')
    );
    if (tamAttr) {
      size = String(tamAttr.value || tamAttr.option || '').trim();
    }
  } else if (attributes && typeof attributes === 'object') {
    const obj = attributes as Record<string, unknown>;
    color = String(obj.Cor || obj.cor || '').trim();
    size = String(obj.Tamanho || obj.tamanho || '').trim();
  }

  return { color, size };
}

/**
 * Constrói a descrição combinando prefixo global, aviso de oportunidade e corpo do texto
 */
export function buildDescription(options: {
  globalPrefix?: string;
  opportunityName?: string;
  opportunityObservations?: string;
  body?: string | null;
}): string {
  const parts: string[] = [];

  if (options.globalPrefix) {
    parts.push(options.globalPrefix);
  }

  if (options.opportunityObservations) {
    const oppLabel = options.opportunityName ? ` (${options.opportunityName})` : '';
    parts.push(`***Aviso Importante${oppLabel}: ${options.opportunityObservations}***`);
  }

  if (options.body) {
    parts.push(options.body);
  }

  return stripHtml(parts.join('\n\n'));
}

export interface ResolvedPrice {
  regularPrice: number;
  promoPrice: number;
  hasPromo: boolean;
  currentPrice: number;
  oldPriceFormatted: string;
  isValid: boolean;
}

/**
 * Normaliza e valida preços para a especificação da Meta Catalog API
 */
export function resolveEffectivePrice(
  rawRegular: number | string | null | undefined,
  rawPromo: number | string | null | undefined
): ResolvedPrice {
  let regularPrice = Number(rawRegular || 0);
  let promoPrice = rawPromo ? Number(rawPromo) : 0;

  // Se o preço normal for zero mas houver promocional, usa o promocional como base
  if (regularPrice <= 0 && promoPrice > 0) {
    regularPrice = promoPrice;
    promoPrice = 0;
  }

  const isValid = regularPrice > 0;
  const hasPromo = promoPrice > 0 && promoPrice < regularPrice;
  const currentPrice = hasPromo ? promoPrice : regularPrice;
  const oldPriceFormatted = hasPromo ? formatDecimalPrice(regularPrice) : '';

  return {
    regularPrice,
    promoPrice,
    hasPromo,
    currentPrice,
    oldPriceFormatted,
    isValid,
  };
}

/**
 * Extrai a lista de imagens ordenadas (principal em primeiro) do produto
 */
export function extractProductImages(product: RawCatalogProduct): {
  parentImage: string;
  additionalImages: string;
} {
  const sortedImages = [...(product.product_images || [])].sort(
    (a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1)
  );

  const allImages = sortedImages.map((img) => img.image_url).filter(Boolean);
  const parentImage =
    allImages[0] || (Array.isArray(product.images) ? product.images[0] : '') || '';
  const additionalImages =
    allImages.slice(1).join(',') ||
    (Array.isArray(product.images) ? product.images.slice(1).join(',') : '');

  return { parentImage, additionalImages };
}

/**
 * Detecta se uma string é um slug em vez de um SKU oficial.
 * Exemplos de slug: "armario-aereo-florenca-3-portas-120-100-mdf-canary", "01-7bdb15", "base-box-adf-casal-138-preto"
 * SKUs oficiais: "000213-01", "000213", "UMX-000002-01", "SKU-18f29e44-110", "DEFAULT-..."
 */
export function isSlugIdentifier(val: string | null | undefined): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (s === '01-7bdb15') return true;
  // Slug com 2 ou mais hífens e contendo letras minúsculas sem ser prefixo técnico reconhecido
  if (/^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(s) && /[a-z]/.test(s)) {
    if (!/^(sku|default|cod)-/i.test(s)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve o SKU oficial de uma variação.
 * O identificador no Catálogo Meta deve ser estritamente o SKU e NUNCA o slug.
 */
export function resolveVariationSku(
  variation: RawProductVariation,
  productCode: string | null | undefined,
  variationIndex: number
): string {
  const cleanSku = String(variation.sku || '').trim();
  const cleanParentCode = String(productCode || '').trim();

  // Se o SKU for um slug ou estiver vazio, gera o SKU no padrão oficial a partir do código pai
  if (!cleanSku || isSlugIdentifier(cleanSku)) {
    if (cleanParentCode) {
      const suffix = String(variationIndex + 1).padStart(2, '0');
      return `${cleanParentCode}-${suffix}`;
    }
    return String(variation.id);
  }

  return cleanSku;
}

/**
 * Resolve o SKU oficial do produto pai / produto simples.
 * O identificador no Catálogo Meta deve ser estritamente o SKU e NUNCA o slug.
 */
export function resolveParentProductSku(product: RawCatalogProduct): string {
  const cleanCode = String(product.code || '').trim();
  if (cleanCode && !isSlugIdentifier(cleanCode)) {
    return cleanCode;
  }
  const cleanSku = String(product.sku || '').trim();
  if (cleanSku && !isSlugIdentifier(cleanSku)) {
    return cleanSku;
  }
  return cleanCode || String(product.id);
}
