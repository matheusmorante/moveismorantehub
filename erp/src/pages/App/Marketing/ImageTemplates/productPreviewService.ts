import { supabase } from '@/pages/utils/supabaseConfig';
import { extractProductImages } from '@/pages/utils/productService/productDimensionsExtractor';
import { mapDbVariations } from '@/pages/utils/productService/productVariationMapper';
import { getSelectedProductPricing } from '@/pages/utils/productPricing';
import type { Variation } from '@/pages/types/product.type';
import { toAbsoluteHttpsUrl } from '../Posts/services/postProductImageResolver';
import { resolveProductUnitPrice } from '../../../../../../shared-utils/productUnitPrice';
import { normalizeProductVariationSku } from '../../../../../../shared-utils/productVariationSku';
import { withAbortTimeout } from '../../../../../../shared-utils/withAbortTimeout';
import { buildProductParentSearchFilter, buildProductSearchTerms, buildProductVariationSearchFilter,
  createProductVariationSearchTooBroadError, PRODUCT_LIST_SEARCH_MIN_LENGTH, PRODUCT_VARIATION_SEARCH_MATCH_LIMIT } from '../../../../../../shared-utils/productListSearch';
import type { TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';

export const PREVIEW_PRODUCT_PAGE_SIZE = 15;
const TIMEOUT = 15_000;
const DETAILS = 'id,name,description,code,brand,category,unit_price,price,promo_price,stock,images,active,is_draft,status,item_type,'
  + 'product_variations(id,product_id,name,sku,stock,price,promo_price,use_parent_price,use_parent_promo_price,use_parent_name,use_parent_description,description,active,status,image_url,attributes,merged_to_variation_id),'
  + 'product_images(image_url,is_main),category_details:categories!products_category_id_fkey(id,name)';

export interface PreviewProductOption { id: string; name: string; code: string; active: boolean }
export type PreviewVariation = Variation & { priceKnown: boolean; stockKnown: boolean };
export interface PreviewProductSource {
  id: string; name: string; description: string; code: string; brand: string; category: string;
  unitPrice: number | undefined; promoPrice: number | undefined; stock: number | undefined;
  itemType: string; images: string[]; variations: PreviewVariation[];
}

const numberOrUndefined = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function mapProductPreviewSource(row: Record<string, any>): PreviewProductSource {
  const images = extractProductImages(row);
  const records = Array.isArray(row.product_variations) ? row.product_variations : [];
  const facts = new Map<string, { price?: unknown; stock?: unknown; sku?: string | null }>();
  records.forEach((entry: { id?: string; price?: unknown; stock?: unknown; sku?: string | null }) => { if (entry.id) facts.set(entry.id, entry); });
  const variations = mapDbVariations(records, row, text(row.code)).filter((variation) => !variation.mergedToVariationId).map((variation) => {
    return { ...variation, sku: normalizeProductVariationSku(facts.get(variation.id)?.sku) || variation.sku,
    priceKnown: variation.syncUnitPrice === false
      ? numberOrUndefined(facts.get(variation.id)?.price) !== undefined : numberOrUndefined(row.unit_price ?? row.price) !== undefined,
    stockKnown: numberOrUndefined(facts.get(variation.id)?.stock) !== undefined };
  });
  return {
    id: String(row.id), name: text(row.name) || text(row.description) || 'Produto', description: text(row.description),
    code: text(row.code), brand: text(row.brand), category: text(row.category) || text(row.category_details?.name),
    unitPrice: row.unit_price == null && row.price == null ? undefined : resolveProductUnitPrice(row),
    promoPrice: numberOrUndefined(row.promo_price), stock: numberOrUndefined(row.stock),
    itemType: text(row.item_type), images, variations,
  };
}

export function mapPreviewProduct(source: PreviewProductSource, variationId = ''): TemplatePreviewProduct {
  const variation = variationId ? source.variations.find((entry) => entry.id === variationId) : undefined;
  if (variationId && !variation) throw new Error('A variação selecionada mudou. Escolha novamente antes de gerar a imagem.');
  const pricing = getSelectedProductPricing({ unitPrice: source.unitPrice, promoPrice: source.promoPrice }, variation);
  const hasPrice = variation ? variation.priceKnown : source.unitPrice !== undefined;
  const images = variation && source.variations.length > 1 && variation.images?.length ? variation.images
    : source.images.length ? source.images : variation?.images ?? [];
  const urls = images.map((url) => toAbsoluteHttpsUrl(url)).filter(Boolean).slice(0, 4);
  const stock = variation ? variation.stockKnown ? variation.stock : undefined : source.stock;
  return {
    id: source.id, currency: 'BRL', images: urls,
    fields: {
      name: variation?.name || source.name, description: variation?.syncDescription === false ? variation.description || '' : source.description,
      brand: source.brand || undefined, retailerId: variation?.sku || source.code || undefined,
      productType: source.category || undefined,
      availability: stock === undefined || source.itemType === 'composition' ? undefined : stock > 0 ? 'Em estoque' : 'Sem estoque',
      price: hasPrice ? pricing.unitPrice : undefined, salePrice: hasPrice && pricing.hasDiscount ? pricing.finalUnitPrice : undefined,
      currentPrice: hasPrice ? pricing.finalUnitPrice : undefined,
    },
  };
}

export async function listPreviewProducts(page: number, search: string, signal: AbortSignal) {
  if (search && search.replace(/[^\p{L}\p{N}]/gu, '').length < PRODUCT_LIST_SEARCH_MIN_LENGTH) return { rows: [], total: 0 };
  const offset = (page - 1) * PREVIEW_PRODUCT_PAGE_SIZE;
  let query = supabase.from('products').select('id,name,description,code,active', { count: 'exact' })
    .eq('deleted', false).not('is_draft', 'is', true).filter('status', 'isdistinct', 'draft')
    .filter('item_type', 'isdistinct', 'service');
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
    .range(offset, offset + PREVIEW_PRODUCT_PAGE_SIZE - 1), 'modelos-de-imagem:produtos', TIMEOUT, signal);
  if (result.error) throw result.error;
  return { rows: (result.data ?? []).map((row: { id: string; name: string | null; description: string | null; code: string | null; active: boolean | null }) => ({
    id: row.id, name: text(row.name) || text(row.description) || 'Produto', code: text(row.code), active: row.active === true,
  })), total: result.count ?? 0 };
}

export async function readPreviewProduct(id: string, signal: AbortSignal) {
  const result = await withAbortTimeout(supabase.from('products').select(DETAILS).eq('id', id).eq('deleted', false)
    .not('is_draft', 'is', true).filter('status', 'isdistinct', 'draft').filter('item_type', 'isdistinct', 'service')
    .order('is_main', { referencedTable: 'product_images', ascending: false, nullsFirst: false })
    .order('id', { referencedTable: 'product_images', ascending: true }).limit(4, { referencedTable: 'product_images' })
    .order('sku', { referencedTable: 'product_variations', ascending: true }).maybeSingle(),
  'modelos-de-imagem:produto', TIMEOUT, signal);
  if (result.error) throw result.error;
  if (!result.data) throw new Error('O produto não está disponível. Atualize a seleção.');
  return mapProductPreviewSource(result.data);
}
