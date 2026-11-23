import type { SupabaseClient } from '@supabase/supabase-js';
import { isTestProduct } from '../../../../shared-utils/isTestProduct.js';
import {
  buildMetaCatalogBatchPayload,
  type MetaCatalogBatchRequest,
} from '../../../../shared-utils/metaCatalogBatchPayload.js';
import type {
  MetaCatalogOpportunitySource,
  MetaCatalogProductSource,
  MetaCatalogVariationSource,
} from '../../../../shared-utils/metaCatalogPayload.js';
import { buildProductMetaCatalogSyncItems } from '../../../../shared-utils/productMetaCatalogSyncItems.js';

export const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 200;
const PRODUCT_FIELDS =
  'id,name,description,status,active,deleted,deleted_at,opportunity_id,unit_price,price,promo_price,stock,images,brand,code,is_draft,slug,is_salvado,product_kind,material,condition,observations,testArtifact:technical_specs->testArtifact,product_categories(categories(name,type)),opportunities(id,name,observations)';
const VARIATION_FIELDS =
  'id,product_id,status,active,name,sku,image_url,price,promo_price,stock,attributes,use_parent_price,use_parent_promo_price';

interface Page<T> {
  data: T[] | null;
  error: { code?: string } | null;
}

async function readPage<T>(page: PromiseLike<Page<T>>, entity: string): Promise<T[]> {
  const { data, error } = await page;
  if (error || !Array.isArray(data)) {
    throw new Error(`Supabase: falha ao carregar ${entity}${error?.code ? ` (${error.code})` : ''}.`);
  }
  return data;
}

async function readPages<T>(
  load: (from: number, to: number) => PromiseLike<Page<T>>,
  entity: string,
): Promise<T[]> {
  const result: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = await readPage(load(from, from + PAGE_SIZE - 1), entity);
    result.push(...rows);
    if (rows.length < PAGE_SIZE) return result;
  }
}

type ProductCategory = NonNullable<NonNullable<MetaCatalogProductSource['product_categories']>[number]['categories']>;

interface ProductRow extends Omit<MetaCatalogProductSource, 'product_categories'> {
  opportunities?: MetaCatalogOpportunitySource | MetaCatalogOpportunitySource[] | null;
  product_categories?: Array<{ categories: ProductCategory | ProductCategory[] | null }> | null;
}

interface CampaignRow {
  product_id: string;
  variation_id: string | null;
  promotion_name: string | null;
}

export interface DesiredItem {
  productId: string;
  request: MetaCatalogBatchRequest;
}

export interface DesiredCatalog {
  items: Map<string, DesiredItem>;
  blocked: Map<string, string>;
}

export interface VerifiedItem {
  catalog_id: string;
  retailer_id: string;
  meta_item_id: string;
  product_id: string;
}

export function loadVerifiedItems(
  db: SupabaseClient,
  catalogIds: string[],
  scope: { productId?: string; retailerIds?: string[] },
) {
  return readPages<VerifiedItem>((from, to) => {
    const query = db.from('meta_catalog_verified_items')
      .select('catalog_id,retailer_id,meta_item_id,product_id').in('catalog_id', catalogIds);
    if (scope.productId) query.eq('product_id', scope.productId);
    if (scope.retailerIds) query.in('retailer_id', scope.retailerIds);
    return query.order('catalog_id').order('retailer_id').range(from, to);
  }, 'vínculos legados da Meta');
}

export async function resolveErpProductIds(db: SupabaseClient, retailerIds: string[]): Promise<string[]> {
  const uuids = retailerIds.filter((id) => UUID.test(id));
  const [codes, skus, ids, variationIds] = await Promise.all([
    readPage(db.from('products').select('id').in('code', retailerIds), 'códigos de produto'),
    readPage(db.from('product_variations').select('product_id').in('sku', retailerIds), 'SKUs de variação'),
    uuids.length ? readPage(db.from('products').select('id').in('id', uuids), 'IDs de produto') : [],
    uuids.length ? readPage(db.from('product_variations').select('product_id').in('id', uuids), 'IDs de variação') : [],
  ]);
  return [...new Set([
    ...codes.map(({ id }) => id),
    ...ids.map(({ id }) => id),
    ...skus.map(({ product_id }) => product_id),
    ...variationIds.map(({ product_id }) => product_id),
  ])];
}

export async function loadCandidateRetailers(db: SupabaseClient, productId: string): Promise<string[]> {
  const [products, variations] = await Promise.all([
    readPage<MetaCatalogProductSource>(db.from('products').select('id,code').eq('id', productId), 'código do produto'),
    readPages<MetaCatalogVariationSource>((from, to) => db.from('product_variations')
      .select('id,product_id,sku').eq('product_id', productId).order('id').range(from, to), 'SKUs das variações'),
  ]);
  const product = products[0] ?? { id: productId };
  const legacyItems = buildProductMetaCatalogSyncItems({ ...product, status: 'hidden' }, variations, []);
  return [...new Set(legacyItems.map(({ code }) => code))].filter((code) => code.length <= 100);
}

function addDesiredItems(
  desired: DesiredCatalog,
  products: ProductRow[],
  variations: MetaCatalogVariationSource[],
  campaignRows: CampaignRow[],
  description: string | null,
) {
  const variationsByProduct = new Map<string, MetaCatalogVariationSource[]>();
  const campaignNames = new Map<string, Set<string>>();
  for (const row of campaignRows) {
    const key = row.variation_id ?? row.product_id;
    const name = row.promotion_name?.trim();
    if (!name) continue;
    const names = campaignNames.get(key) ?? new Set<string>();
    names.add(name);
    campaignNames.set(key, names);
  }
  for (const variation of variations) {
    const family = variationsByProduct.get(variation.product_id) ?? [];
    family.push({
      ...variation,
      status: isTestProduct(variation) ? 'hidden' : variation.status,
      activeCampaignNames: [...(campaignNames.get(variation.id) ?? [])].sort(),
    });
    variationsByProduct.set(variation.product_id, family);
  }
  for (const { opportunities, product_categories, ...product } of products) {
    const categoryLinks = (product_categories ?? []).flatMap(({ categories }) =>
      Array.isArray(categories) ? categories.map((category) => ({ categories: category })) : [{ categories }]);
    const items = buildProductMetaCatalogSyncItems(
      { ...product, product_categories: categoryLinks, activeCampaignNames: [...(campaignNames.get(product.id) ?? [])].sort() },
      variationsByProduct.get(product.id) ?? [],
      Array.isArray(opportunities) ? opportunities : opportunities ? [opportunities] : [],
    );
    for (const item of items) {
      if ('deleted' in item || desired.blocked.has(item.code)) continue;
      const request = buildMetaCatalogBatchPayload([item], description).requests[0];
      const price = Number(item.sales_price);
      if (request.method === 'DELETE' || !Number.isFinite(price) || item.code.length > 100) {
        desired.blocked.set(item.code, 'Produto publicado com preço, imagem ou identificador inválido.');
      } else if (desired.items.has(item.code)) {
        desired.blocked.set(item.code, 'Identificador compartilhado por mais de um item do ERP.');
      } else {
        desired.items.set(item.code, { productId: product.id, request });
        continue;
      }
      desired.items.delete(item.code);
    }
  }
}

export async function loadDesiredCatalog(
  db: SupabaseClient,
  description: string | null,
  productIds?: string[],
): Promise<DesiredCatalog> {
  const desired: DesiredCatalog = { items: new Map(), blocked: new Map() };
  let after: string | undefined;
  for (;;) {
    const query = db.from('products').select(PRODUCT_FIELDS)
      .eq('status', 'published').is('deleted_at', null)
      .not('deleted', 'is', true).not('is_draft', 'is', true)
      .or('active.is.null,active.eq.true,is_salvado.eq.true,product_kind.eq.salvado');
    if (productIds) query.in('id', productIds);
    if (after) query.gt('id', after);
    const page = await readPage<ProductRow>(query.order('id').limit(PAGE_SIZE), 'produtos publicados');
    const products = page.filter((product) => !isTestProduct(product));
    if (products.length) {
      const ids = products.map(({ id }) => id);
      const [variations, campaigns] = await Promise.all([
        readPages<MetaCatalogVariationSource>((from, to) => db.from('product_variations')
          .select(VARIATION_FIELDS).in('product_id', ids).order('id').range(from, to), 'variações'),
        readPages<CampaignRow>((from, to) => db.from('active_campaign_prices')
          .select('product_id,variation_id,promotion_name')
          .in('product_id', ids).order('product_id').order('variation_id').order('promotion_id').range(from, to),
        'campanhas vigentes'),
      ]);
      addDesiredItems(desired, products, variations, campaigns, description);
    }
    if (page.length < PAGE_SIZE) return desired;
    after = page[page.length - 1].id;
  }
}
