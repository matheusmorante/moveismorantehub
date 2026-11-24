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
  'id,product_id,status,active,merged_to_variation_id,name,sku,image_url,price,promo_price,stock,attributes,use_parent_price,use_parent_promo_price';

interface Page<T> {
  data: T[] | null;
  error: { code?: string } | null;
  count?: number | null;
}

interface PageRequest<T> {
  from: number;
  to: number;
  options: { count?: 'exact' };
  previous?: T;
}

async function* completePages<T>(
  load: (request: PageRequest<T>) => PromiseLike<Page<T>>,
  entity: string,
  keyOf: (row: T) => string,
): AsyncGenerator<T[]> {
  const seen = new Set<string>();
  let total = 0;
  let previous: T | undefined;
  do {
    const from = seen.size;
    const { data, error, count } = await load({
      from, to: from + PAGE_SIZE - 1, options: from ? {} : { count: 'exact' }, previous,
    });
    if (error || !Array.isArray(data)) {
      throw new Error(`Supabase: falha ao carregar ${entity}${error?.code ? ` (${error.code})` : ''}.`);
    }
    if (from === 0) {
      if (count == null || !Number.isSafeInteger(count) || count < 0) {
        throw new Error(`Supabase: contagem indisponível para ${entity}.`);
      }
      total = count;
    }
    if (data.length > Math.min(PAGE_SIZE, total - from) || (!data.length && from < total)) {
      throw new Error(`Supabase: paginação incompleta de ${entity}.`);
    }
    for (const row of data) {
      const key = keyOf(row);
      if (!key || seen.has(key)) throw new Error(`Supabase: paginação inválida de ${entity}.`);
      seen.add(key);
    }
    previous = data.at(-1);
    yield data;
  } while (seen.size < total);
}

async function readPages<T>(
  load: (request: PageRequest<T>) => PromiseLike<Page<T>>,
  entity: string,
  keyOf: (row: T) => string,
): Promise<T[]> {
  const result: T[] = [];
  for await (const rows of completePages(load, entity, keyOf)) result.push(...rows);
  return result;
}

type ProductCategory = NonNullable<NonNullable<MetaCatalogProductSource['product_categories']>[number]['categories']>;

interface ProductRow extends Omit<MetaCatalogProductSource, 'product_categories'> {
  opportunities?: MetaCatalogOpportunitySource | MetaCatalogOpportunitySource[] | null;
  product_categories?: Array<{ categories: ProductCategory | ProductCategory[] | null }> | null;
}

interface CampaignRow {
  product_id: string;
  variation_id: string | null;
  promotion_id: string;
  promotion_name: string | null;
}

type VariationRow = MetaCatalogVariationSource & { merged_to_variation_id?: string | null };

export interface DesiredItem {
  productId: string;
  request: MetaCatalogBatchRequest;
}

export interface DesiredCatalog {
  items: Map<string, DesiredItem>;
  blocked: Map<string, string>;
  /** Candidate identifiers already derived from the loaded source of one product. */
  candidateRetailers: string[] | null;
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
  return readPages<VerifiedItem>(({ from, to, options }) => {
    const query = db.from('meta_catalog_verified_items')
      .select('catalog_id,retailer_id,meta_item_id,product_id', options).in('catalog_id', catalogIds);
    if (scope.productId) query.eq('product_id', scope.productId);
    if (scope.retailerIds) query.in('retailer_id', scope.retailerIds);
    return query.order('catalog_id').order('retailer_id').range(from, to);
  }, 'vínculos legados da Meta', (row) => `${row.catalog_id}:${row.retailer_id}`);
}

export async function loadRetailerOwners(db: SupabaseClient, retailerIds: string[]) {
  const owners = new Map<string, Set<string>>();
  function add(key: string | null | undefined, productId: string, requested: Set<string>) {
    if (!key || !requested.has(key)) return;
    const matches = owners.get(key) ?? new Set<string>();
    matches.add(productId);
    owners.set(key, matches);
  }

  // Bounded IN filters keep the PostgREST URLs small, including legacy SKUs.
  for (let offset = 0; offset < retailerIds.length; offset += 50) {
    const batch = retailerIds.slice(offset, offset + 50);
    const requested = new Set(batch);
    const uuids = batch.filter((id) => UUID.test(id));
    const products = (column: 'code' | 'id', values: string[]) =>
      readPages<Pick<MetaCatalogProductSource, 'id' | 'code'>>(({ from, to, options }) => db
        .from('products').select('id,code', options).in(column, values).order('id').range(from, to),
      'identificadores de produtos', (row) => row.id);
    const variations = (column: 'sku' | 'id', values: string[]) =>
      readPages<Pick<VariationRow, 'id' | 'product_id' | 'sku'>>(({ from, to, options }) => db
        .from('product_variations').select('id,product_id,sku', options).in(column, values).order('id').range(from, to),
      'identificadores de variações', (row) => row.id);
    const [codes, skus, productIds, variationIds] = await Promise.all([
      products('code', batch), variations('sku', batch),
      uuids.length ? products('id', uuids) : [], uuids.length ? variations('id', uuids) : [],
    ]);
    for (const row of [...codes, ...productIds]) {
      add(row.code, row.id, requested);
      add(row.id, row.id, requested);
    }
    for (const row of [...skus, ...variationIds]) {
      add(row.sku, row.product_id, requested);
      add(row.id, row.product_id, requested);
    }
  }
  return owners;
}

export async function loadCandidateRetailers(db: SupabaseClient, productId: string): Promise<string[]> {
  const [products, variations] = await Promise.all([
    readPages<MetaCatalogProductSource>(({ options }) => db.from('products').select('id,code', options)
      .eq('id', productId), 'código do produto', (row) => row.id),
    readPages<MetaCatalogVariationSource>(({ from, to, options }) => db.from('product_variations')
      .select('id,product_id,sku', options).eq('product_id', productId).order('id').range(from, to),
    'SKUs das variações', (row) => row.id),
  ]);
  const product = products[0] ?? { id: productId };
  const legacyItems = buildProductMetaCatalogSyncItems({ ...product, status: 'hidden' }, variations, []);
  return [...new Set(legacyItems.map(({ code }) => code))].filter((code) => code.length <= 100);
}

function addDesiredItems(
  desired: DesiredCatalog,
  products: ProductRow[],
  variations: VariationRow[],
  campaignRows: CampaignRow[],
  description: string | null,
  candidateProductId?: string,
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
      status: variation.active === false || variation.merged_to_variation_id || isTestProduct(variation)
        ? 'hidden'
        : variation.status,
      activeCampaignNames: [...(campaignNames.get(variation.id) ?? [])].sort(),
    });
    variationsByProduct.set(variation.product_id, family);
  }
  for (const { opportunities, product_categories, ...product } of products) {
    const categoryLinks = (product_categories ?? []).flatMap(({ categories }) =>
      Array.isArray(categories) ? categories.map((category) => ({ categories: category })) : [{ categories }]);
    const productVariations = variationsByProduct.get(product.id) ?? [];
    if (product.id === candidateProductId) {
      desired.candidateRetailers = [...new Set(
        buildProductMetaCatalogSyncItems({ ...product, status: 'hidden' }, productVariations, [])
          .map(({ code }) => code)
          .filter((code) => code.length <= 100),
      )];
    }
    const items = buildProductMetaCatalogSyncItems(
      { ...product, product_categories: categoryLinks, activeCampaignNames: [...(campaignNames.get(product.id) ?? [])].sort() },
      productVariations,
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
  candidateProductId?: string,
): Promise<DesiredCatalog> {
  const desired: DesiredCatalog = { items: new Map(), blocked: new Map(), candidateRetailers: null };
  if (productIds?.length === 0) return desired;
  const productPages = completePages<ProductRow>(({ options, previous }) => {
    const query = db.from('products').select(PRODUCT_FIELDS, options)
      .eq('status', 'published').is('deleted_at', null)
      .not('deleted', 'is', true).not('is_draft', 'is', true)
      .not('active', 'is', false);
    if (productIds) query.in('id', productIds);
    if (previous) query.gt('id', previous.id);
    return query.order('id').limit(PAGE_SIZE);
  }, 'produtos publicados', (row) => row.id);

  for await (const page of productPages) {
    const products = page.filter((product) => !isTestProduct(product));
    if (products.length) {
      const ids = products.map(({ id }) => id);
      const [variations, campaigns] = await Promise.all([
        readPages<VariationRow>(({ from, to, options }) => db.from('product_variations')
          .select(VARIATION_FIELDS, options).in('product_id', ids).order('id').range(from, to),
        'variações', (row) => row.id),
        readPages<CampaignRow>(({ from, to, options }) => db.from('active_campaign_prices')
          .select('product_id,variation_id,promotion_id,promotion_name', options)
          .in('product_id', ids).order('product_id').order('variation_id').order('promotion_id').range(from, to),
        'campanhas vigentes', (row) => JSON.stringify([row.product_id, row.variation_id, row.promotion_id])),
      ]);
      addDesiredItems(desired, products, variations, campaigns, description, candidateProductId);
    }
  }
  return desired;
}
