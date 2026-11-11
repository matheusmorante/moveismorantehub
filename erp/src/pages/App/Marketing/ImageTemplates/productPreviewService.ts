import { supabase } from '@/pages/utils/supabaseConfig';
import { extractProductImages } from '@/pages/utils/productService/productDimensionsExtractor';
import { mapDbVariations } from '@/pages/utils/productService/productVariationMapper';
import { getSelectedProductPricing } from '@/pages/utils/productPricing';
import type { Variation } from '@/pages/types/product.type';
import { toAbsoluteHttpsUrl } from '../Posts/services/postProductImageResolver';
import { resolveProductUnitPrice } from '../../../../../../shared-utils/productUnitPrice';
import { normalizeProductVariationSku } from '../../../../../../shared-utils/productVariationSku';
import { MAX_PARENT_PRODUCT_IMAGES, MAX_VARIATION_IMAGES } from '../../../../../../shared-utils/productImageLimits';
import { withAbortTimeout } from '../../../../../../shared-utils/withAbortTimeout';
import { buildProductParentSearchFilter, buildProductSearchTerms, buildProductVariationSearchFilter,
  createProductVariationSearchTooBroadError, PRODUCT_LIST_SEARCH_MIN_LENGTH, PRODUCT_VARIATION_SEARCH_MATCH_LIMIT } from '../../../../../../shared-utils/productListSearch';
import { resolveStockOrigin } from '../../../../../../shared-utils/productStockOrigin';
import { templateAttributeField, type TemplatePreviewProduct, type TemplateProductAttributes } from '../../../../../../shared-utils/catalogImageTemplate';

export const PREVIEW_PRODUCT_PAGE_SIZE = 15;
const TIMEOUT = 15_000;
export interface PreviewProductGroup { id: string; name: string }
const DETAILS = 'id,name,description,code,brand,category,unit_price,price,promo_price,stock,images,technical_values:technical_specs->technicalValues,variation_details:technical_specs->variationDetails,active,is_draft,status,item_type,product_kind,condition,is_salvado,opportunity_id,'
  + 'product_variations(id,product_id,name,sku,stock,price,promo_price,use_parent_price,use_parent_promo_price,use_parent_name,use_parent_description,description,active,status,image_url,attributes,merged_to_variation_id),'
  + 'product_images(image_url,is_main),category_details:categories!products_category_id_fkey(id,name),opportunity_details:opportunities!products_opportunity_id_fkey(id,name)';

export interface PreviewVariationOption { id: string; name: string; sku: string; active: boolean }
export interface PreviewProductOption {
  id: string; name: string; code: string; active: boolean; previewSource: PreviewProductSource;
  variationOptions: PreviewVariationOption[];
}
export type PreviewVariation = Variation & { priceKnown: boolean; stockKnown: boolean };
export interface PreviewProductSource {
  id: string; name: string; description: string; code: string; brand: string; category: string;
  unitPrice: number | undefined; promoPrice: number | undefined; stock: number | undefined;
  itemType: string; images: string[]; variations: PreviewVariation[]; attributes: TemplateProductAttributes;
  productKind?: string; condition?: string; isSalvado?: boolean; opportunityName?: string;
  technical_values?: Record<string, unknown>;
}

const numberOrUndefined = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
function displayAttributeValue(value: unknown): string | number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) return value.map(displayAttributeValue).filter((entry) => entry !== undefined).join(', ') || undefined;
  return undefined;
}

function mapTechnicalAttributes(values: unknown): TemplateProductAttributes {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  return Object.entries(values).reduce<TemplateProductAttributes>((attributes, [name, rawValue]) => {
    const field = templateAttributeField(name);
    const value = displayAttributeValue(rawValue);
    if (field) attributes[field] = { name, value: value ?? '' };
    return attributes;
  }, {});
}

function mergeVariationAttributes(attributes: TemplateProductAttributes, variation: PreviewVariation | undefined): TemplateProductAttributes {
  for (const attribute of variation?.attributes ?? []) {
    const field = templateAttributeField(attribute.name);
    const value = displayAttributeValue(attribute.value);
    if (field) attributes[field] = { name: attribute.name, value: value ?? '' };
  }
  Object.assign(attributes, mapTechnicalAttributes(variation?.technicalValues));
  return attributes;
}

export function mapProductPreviewSource(row: Record<string, any>): PreviewProductSource {
  const images = extractProductImages(row);
  const records = Array.isArray(row.product_variations) ? row.product_variations : [];
  const facts = new Map<string, { price?: unknown; stock?: unknown; sku?: string | null }>();
  records.forEach((entry: { id?: string; price?: unknown; stock?: unknown; sku?: string | null }) => { if (entry.id) facts.set(entry.id, entry); });
  const technicalSpecs = row.technical_specs ?? { variationDetails: row.variation_details };
  const variations = mapDbVariations(records, { ...row, technical_specs: technicalSpecs }, text(row.code))
    .filter((variation) => !variation.mergedToVariationId).map((variation) => {
    return { ...variation, sku: normalizeProductVariationSku(facts.get(variation.id)?.sku) || variation.sku,
    priceKnown: variation.syncUnitPrice === false
      ? numberOrUndefined(facts.get(variation.id)?.price) !== undefined : numberOrUndefined(row.unit_price ?? row.price) !== undefined,
    stockKnown: numberOrUndefined(facts.get(variation.id)?.stock) !== undefined };
  });
  const opportunityName = text(row.opportunity_name) || text(row.opportunity?.name)
    || text(row.opportunities?.name) || text(row.opportunity_details?.name) || undefined;
  const technicalValues = (row.technical_values ?? row.technical_specs?.technicalValues ?? row.technical_specs?.technical_values) as Record<string, unknown> | undefined;
  return {
    id: String(row.id), name: text(row.name) || text(row.description) || 'Produto', description: text(row.description),
    code: text(row.code), brand: text(row.brand), category: text(row.category) || text(row.category_details?.name),
    unitPrice: row.unit_price == null && row.price == null ? undefined : resolveProductUnitPrice(row),
    promoPrice: numberOrUndefined(row.promo_price), stock: numberOrUndefined(row.stock),
    itemType: text(row.item_type), images, variations,
    attributes: mapTechnicalAttributes(technicalValues),
    productKind: text(row.product_kind) || undefined,
    condition: text(row.condition) || undefined,
    isSalvado: row.is_salvado === true,
    opportunityName,
    technical_values: technicalValues,
  };
}

function resolveProductColor(source: PreviewProductSource, variation?: PreviewVariation): string | undefined {
  if (variation?.attributes) {
    const corAttr = variation.attributes.find((attr) => attr.name.trim().toLowerCase() === 'cor');
    if (corAttr?.value != null && String(corAttr.value).trim()) {
      return String(corAttr.value).trim();
    }
  }
  if (variation?.technicalValues && typeof variation.technicalValues === 'object') {
    const techCor = (variation.technicalValues as Record<string, unknown>).Cor
      ?? (variation.technicalValues as Record<string, unknown>).cor;
    if (techCor != null && String(techCor).trim()) {
      return String(techCor).trim();
    }
  }
  const attrCor = source.attributes?.['attribute_cor']?.value;
  if (attrCor != null && String(attrCor).trim()) {
    return String(attrCor).trim();
  }
  if (source.technical_values && typeof source.technical_values === 'object') {
    const parentCor = source.technical_values.Cor ?? source.technical_values.cor;
    if (parentCor != null && String(parentCor).trim()) {
      return String(parentCor).trim();
    }
  }
  return undefined;
}

export function mapPreviewProduct(source: PreviewProductSource, variationId = ''): TemplatePreviewProduct {
  const variation = variationId ? source.variations.find((entry) => entry.id === variationId) : undefined;
  if (variationId && !variation) throw new Error('A variação selecionada mudou. Escolha novamente antes de gerar a imagem.');
  const pricing = getSelectedProductPricing({ unitPrice: source.unitPrice, promoPrice: source.promoPrice }, variation);
  const hasPrice = variation ? variation.priceKnown : source.unitPrice !== undefined;
  const usesVariationGallery = !!(variation && source.variations.length > 1 && variation.images?.length);
  const images = usesVariationGallery ? variation!.images!
    : source.images.length ? source.images : variation?.images ?? [];
  const urls = images.map((url) => toAbsoluteHttpsUrl(url)).filter(Boolean)
    .slice(0, usesVariationGallery ? MAX_VARIATION_IMAGES : MAX_PARENT_PRODUCT_IMAGES);
  const stock = variation ? variation.stockKnown ? variation.stock : undefined : source.stock;

  const regularPrice = hasPrice ? pricing.unitPrice : undefined;
  const promoPrice = hasPrice && pricing.hasDiscount ? pricing.finalUnitPrice : undefined;
  const currentPrice = hasPrice ? pricing.finalUnitPrice : undefined;

  const hasDiscount = !!(hasPrice && pricing.hasDiscount && regularPrice !== undefined && promoPrice !== undefined && regularPrice > promoPrice);
  const discountValue = hasDiscount ? Math.max(0, Math.round((regularPrice! - promoPrice! + Number.EPSILON) * 100) / 100) : undefined;
  const discountPercent = hasDiscount && regularPrice! > 0
    ? Math.max(0, Math.round(((regularPrice! - promoPrice!) / regularPrice!) * 100))
    : undefined;
  const discountFormatted = discountPercent !== undefined ? `${discountPercent}%` : undefined;

  const stockOrigin = resolveStockOrigin(source, variation, source.opportunityName);
  const color = resolveProductColor(source, variation);

  const formatDecimal = (val?: number) => val !== undefined ? val.toFixed(2).replace('.', ',') : undefined;
  const customLabel0 = source.category || undefined;
  const customLabel1 = currentPrice !== undefined ? formatDecimal(currentPrice) : undefined;
  const customLabel2 = hasDiscount && regularPrice !== undefined ? formatDecimal(regularPrice) : undefined;
  const customLabel3 = source.opportunityName || undefined;
  const customLabel4 = undefined;

  const mergedAttributes = mergeVariationAttributes({ ...source.attributes }, variation);
  if (color && !mergedAttributes.attribute_cor) {
    mergedAttributes.attribute_cor = { name: 'Cor', value: color };
  }

  return {
    id: source.id, currency: 'BRL', images: urls,
    attributes: mergedAttributes,
    fields: {
      name: variation?.name || source.name, description: variation?.syncDescription === false ? variation.description || '' : source.description,
      brand: source.brand || undefined, retailerId: variation?.sku || source.code || undefined,
      category: source.category || undefined,
      productType: source.category || undefined,
      availability: stock === undefined || source.itemType === 'composition' ? undefined : stock > 0 ? 'Em estoque' : 'Sem estoque',
      price: hasDiscount ? regularPrice : undefined,
      promoPrice,
      salePrice: promoPrice,
      currentPrice,
      discount: discountFormatted,
      discountPercent,
      discountValue,
      stockOrigin,
      color,
      custom_label_0: customLabel0,
      custom_label_1: customLabel1,
      custom_label_2: customLabel2,
      custom_label_3: customLabel3,
      custom_label_4: customLabel4,
    },
  };
}

export async function listPreviewProducts(page: number, search: string, signal: AbortSignal, categoryId?: string) {
  if (search && search.replace(/[^\p{L}\p{N}]/gu, '').length < PRODUCT_LIST_SEARCH_MIN_LENGTH) return { rows: [], total: 0 };
  const offset = (page - 1) * PREVIEW_PRODUCT_PAGE_SIZE;
  let query = supabase.from('products').select('id,name,description,code,brand,category,unit_price,price,promo_price,stock,'
    + 'item_type,product_kind,condition,is_salvado,technical_values:technical_specs->technicalValues,active,'
    + 'product_images(image_url,is_main),category_details:categories!products_category_id_fkey(name),'
    + 'opportunity_details:opportunities!products_opportunity_id_fkey(name),'
    + 'product_variations(id,product_id,name,sku,active,merged_to_variation_id)',
  { count: 'exact' })
    .eq('deleted', false).not('is_draft', 'is', true).eq('status', 'published').is('deleted_at', null)
    .filter('item_type', 'isdistinct', 'service');
  if (categoryId) query = query.eq('category_id', categoryId);
  if (search) {
    const terms = buildProductSearchTerms(search);
    if (!terms.searchTerms.length) return { rows: [], total: 0 };
    const matches = await withAbortTimeout(supabase.from('product_variations').select('product_id')
      .is('merged_to_variation_id', null).or(buildProductVariationSearchFilter(terms.searchTerms)).limit(PRODUCT_VARIATION_SEARCH_MATCH_LIMIT + 1),
    'modelos-de-imagem:buscar-variacoes', TIMEOUT, signal);
    if (matches.error) throw matches.error;
    if ((matches.data?.length ?? 0) > PRODUCT_VARIATION_SEARCH_MATCH_LIMIT) throw createProductVariationSearchTooBroadError();
    const ids = [...new Set((matches.data ?? []).map((row: { product_id: string | null }) => row.product_id).filter(Boolean))] as string[];
    query = query.or(buildProductParentSearchFilter(terms, ids));
  }
  const result = await withAbortTimeout(query.order('name', { ascending: true, nullsFirst: false }).order('id')
    .order('is_main', { referencedTable: 'product_images', ascending: false, nullsFirst: false })
    .order('id', { referencedTable: 'product_images', ascending: true })
    .order('sku', { referencedTable: 'product_variations', ascending: true })
    .limit(1, { referencedTable: 'product_images' })
    .range(offset, offset + PREVIEW_PRODUCT_PAGE_SIZE - 1), 'modelos-de-imagem:produtos', TIMEOUT, signal);
  if (result.error) throw result.error;
  return { rows: (result.data ?? []).map((row: Record<string, any>) => {
    const previewSource = mapProductPreviewSource({ ...row, product_variations: undefined });
    const variationOptions: PreviewVariationOption[] = (Array.isArray(row.product_variations) ? row.product_variations : [])
      .filter((variation: Record<string, unknown>) => variation.id && !variation.merged_to_variation_id)
      .map((variation: Record<string, unknown>) => ({
        id: String(variation.id), name: text(variation.name), sku: normalizeProductVariationSku(text(variation.sku)) || text(variation.sku),
        active: variation.active !== false,
      }));
    return { id: previewSource.id, name: previewSource.name, code: previewSource.code,
      active: row.active === true, previewSource, variationOptions };
  }), total: result.count ?? 0 };
}

export async function readPreviewProduct(id: string, signal: AbortSignal, requiredImageCount = 1) {
  const imageLimit = Math.min(MAX_PARENT_PRODUCT_IMAGES, Math.max(1, Math.floor(requiredImageCount)));
  const result = await withAbortTimeout(supabase.from('products').select(DETAILS).eq('id', id).eq('deleted', false)
    .not('is_draft', 'is', true).eq('status', 'published').is('deleted_at', null).filter('item_type', 'isdistinct', 'service')
    .order('is_main', { referencedTable: 'product_images', ascending: false, nullsFirst: false })
    .order('id', { referencedTable: 'product_images', ascending: true })
    .limit(imageLimit, { referencedTable: 'product_images' })
    .order('sku', { referencedTable: 'product_variations', ascending: true }).maybeSingle(),
  'modelos-de-imagem:produto', TIMEOUT, signal);
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O produto não está disponível. Atualize a seleção.');
  return mapProductPreviewSource(result.data);
}

export async function listPreviewProductGroups(signal: AbortSignal): Promise<PreviewProductGroup[]> {
  const result = await withAbortTimeout(supabase.from('categories').select('id,name').eq('type', 'category')
    .order('name', { ascending: true, nullsFirst: false }).order('id'), 'modelos-de-imagem:categorias', TIMEOUT, signal);
  if (result.error) throw result.error;
  return (result.data ?? []).flatMap((row: { id: string; name: string | null }) =>
    row.name?.trim() ? [{ id: row.id, name: row.name.trim() }] : []);
}
