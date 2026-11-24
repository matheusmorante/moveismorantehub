import { afterEach, expect, it, vi } from 'vitest';
import { META_ADS_CREATIVE_CATALOG_ID, META_WHATSAPP_CATALOG_ID } from '../../../../../../../shared-utils/metaCatalogIds';
import type { MetaCatalogReconciliationResult } from '../../../../../../../shared-utils/metaCatalogReconciliationResult';
import { handleCatalogOperation, handleMetaCatalogCron } from '../../../../../../api/_lib/metaCatalogReconciliation/handler';
import type { CatalogChange, MetaProduct } from '../../../../../../api/_lib/metaCatalogReconciliation/graph';

const productId = 'd7d357ee-ec6d-4234-ac7f-6b8c1675d0c0';
const whatsappCatalogId = META_WHATSAPP_CATALOG_ID;
const appId = '4242';
const catalogs = [whatsappCatalogId, META_ADS_CREATIVE_CATALOG_ID];
const manualItem = { id: '8000', retailer_id: 'MANUAL-ERP-LIFECYCLE' };

function restPage<T>(rows: T[], init?: RequestInit, total = rows.length) {
  return Response.json(rows, { headers: String(new Headers(init?.headers).get('prefer')).includes('count=exact')
    ? { 'Content-Range': rows.length ? `0-${rows.length - 1}/${total}` : `*/${total}` }
    : {} });
}

function matchesRest(value: string, filter: string | null) {
  if (!filter) return true;
  if (filter.startsWith('eq.')) return value === filter.slice(3);
  if (filter.startsWith('gt.')) return value > filter.slice(3);
  if (filter.startsWith('in.(')) return filter.slice(4, -1).split(',').includes(value);
  return false;
}

function fixture({ exclusive = false, missingProductPage = false } = {}) {
  let exists = true;
  let sequence = 0;
  let lastFullRun: MetaCatalogReconciliationResult | null = null;
  const product = {
    id: productId, code: 'POL-900', name: 'Poltrona', status: 'draft', active: true,
    deleted: false, deleted_at: null, is_draft: true, stock: 2,
    unit_price: 550, images: ['https://images.example.test/poltrona.jpg'],
  };
  const variations = [
    {
      id: 'f9ebbc48-f6d7-4625-9fd6-8ee510c29ab8', product_id: productId, sku: 'POL-900-A',
      name: 'Poltrona azul', status: 'published', active: true, price: 550,
    },
    {
      id: 'f9ebbc48-f6d7-4625-9fd6-8ee510c29ab9', product_id: productId, sku: 'POL-900-B',
      name: 'Poltrona verde', status: 'hidden', active: true, price: 580,
    },
  ];
  const remote = new Map(catalogs.map((id) => [id, new Map<string, MetaProduct>([[manualItem.retailer_id, manualItem]])]));
  const writes: Array<{ catalog: string; changes: Pick<CatalogChange, 'method' | 'data'>[] }> = [];
  const history: Array<{ run_id: string; catalog_id: string; retailer_id: string; confirmed_at?: string }> = [];

  function mockRest(url: URL, init?: RequestInit) {
    switch (url.pathname) {
      case '/rest/v1/settings':
        return Response.json({ catalogId: whatsappCatalogId, description: null });
      case '/rest/v1/products': {
        const status = url.searchParams.get('status');
        const active = url.searchParams.get('active');
        const matching = exists && (!status || status === 'eq.' + product.status)
          && (!active || product.active)
          && matchesRest(product.id, url.searchParams.get('id'))
          && matchesRest(product.code, url.searchParams.get('code'));
        const rows = matching ? [product] : [];
        return restPage(rows, init, missingProductPage ? 2 : rows.length);
      }
      case '/rest/v1/product_variations':
        return restPage(exists ? variations.filter((row) =>
          matchesRest(row.id, url.searchParams.get('id')) &&
          matchesRest(row.product_id, url.searchParams.get('product_id')) &&
          matchesRest(row.sku, url.searchParams.get('sku'))) : [], init);
      case '/rest/v1/active_campaign_prices':
      case '/rest/v1/meta_catalog_verified_items':
        return restPage([], init);
      case '/rest/v1/meta_catalog_sync_deletions': {
        const body = JSON.parse(String(init?.body));
        if (init?.method === 'POST') {
          history.push(...body);
          return new Response(null, { status: 201 });
        }
        const matches = history.filter((item) =>
          matchesRest(item.run_id, url.searchParams.get('run_id'))
          && matchesRest(item.catalog_id, url.searchParams.get('catalog_id'))
          && matchesRest(item.retailer_id, url.searchParams.get('retailer_id')));
        matches.forEach((item) => { item.confirmed_at = body.confirmed_at; });
        return new Response(null, { status: 204, headers: { 'Content-Range': `*/${matches.length}` } });
      }
      case '/rest/v1/rpc/claim_meta_catalog_sync':
        return Response.json(true);
      case '/rest/v1/rpc/finish_meta_catalog_sync': {
        const body = JSON.parse(String(init?.body));
        if (body.p_full) lastFullRun = body.p_run;
        return Response.json(true);
      }
      default:
        throw new Error('Rota Supabase inesperada: ' + url.pathname);
    }
  }

  function mockGraph(url: URL, init?: RequestInit) {
    const [, , catalogId, edge] = url.pathname.split('/');
    const items = remote.get(catalogId);
    if (!items) throw new Error('Catálogo inesperado: ' + catalogId);
    if (edge === 'data_sources') {
      return Response.json({ data: [{ id: '4444', name: exclusive ? `App ${appId}` : 'Parceiro externo' }] });
    }
    if (edge === 'products') {
      const filter = JSON.parse(url.searchParams.get('filter') || '{}');
      const ids: string[] | undefined = filter.retailer_id?.is_any;
      const label: string | undefined = filter.custom_label_4?.eq;
      return Response.json({ data: [...items.values()].filter((item) =>
        (!ids || ids.includes(item.retailer_id)) && (!label || item.custom_label_4 === label)) });
    }
    if (edge === 'items_batch') {
      const batch = JSON.parse(String(init?.body));
      expect(batch).toMatchObject({ item_type: 'PRODUCT_ITEM', allow_upsert: false });
      writes.push({ catalog: catalogId, changes: batch.requests });
      for (const { method, data } of batch.requests as CatalogChange[]) {
        const id = String(data.id);
        const previous = items.get(id);
        if (method === 'DELETE') {
          if (!exclusive) expect(previous?.custom_label_4).toContain(productId);
          expect(history.some((entry) => entry.catalog_id === catalogId && entry.retailer_id === id)).toBe(true);
          items.delete(id);
          continue;
        }
        expect(Boolean(previous)).toBe(method === 'UPDATE');
        items.set(id, {
          ...data,
          id: previous?.id ?? String(9000 + ++sequence),
          retailer_id: id,
          name: data.title,
          url: data.link,
          image_url: data.image_link,
          additional_image_urls: String(data.additional_image_link || '').split(',').filter(Boolean),
          retailer_product_group_id: data.item_group_id,
          currency: 'BRL',
        });
      }
      return Response.json({ handles: ['lifecycle-batch'] });
    }
    if (edge === 'check_batch_request_status') {
      return Response.json({ data: [{ handle: 'lifecycle-batch', status: 'finished', errors_total_count: 0 }] });
    }
    throw new Error('Rota Graph inesperada: ' + url.pathname);
  }

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === 'supabase.example.test') return mockRest(url, init);
    if (url.hostname === 'graph.facebook.com') return mockGraph(url, init);
    throw new Error('Host inesperado: ' + url.hostname);
  }));
  return {
    product, variations, remote, writes, history,
    removeProduct() { exists = false; },
    getLastRun() { return lastFullRun; },
  };
}

function response() {
  return {
    statusCode: 0, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

async function syncProduct() {
  const res = response();
  await handleCatalogOperation({ operation: 'reconcile_catalog', productId }, { roles: ['administrator'] } as never, res as never);
  expect(res.statusCode).toBe(200);
  return res.body;
}

async function runHourly(statusCode = 200) {
  const res = response();
  await handleMetaCatalogCron({ method: 'GET', headers: { authorization: 'Bearer unit-catalog-cron' } } as never, res as never);
  expect(res.statusCode).toBe(statusCode);
  return res.body;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stubCatalogEnv() {
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'unit-catalog-supabase');
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'unit-catalog-meta');
  vi.stubEnv('WHATSAPP_APP_ID', appId);
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('CRON_SECRET', 'unit-catalog-cron');
}

it('reconcilia publicação, edição, ocultação e divergências horárias nos dois destinos', async () => {
  stubCatalogEnv();
  const { product, variations: [blue, green], remote, writes, removeProduct, getLastRun } = fixture();

  expect(await syncProduct()).toMatchObject({ success: true, count: 0 });
  expect(writes).toHaveLength(0);

  Object.assign(product, { status: 'published', is_draft: false });
  expect(await syncProduct()).toMatchObject({ success: true, created: 2, count: 2 });
  expect([...remote.values()].every((items) => items.has(blue.sku) && !items.has(green.sku))).toBe(true);

  Object.assign(blue, { name: 'Poltrona azul revisada', price: 615 });
  expect(await syncProduct()).toMatchObject({ success: true, updated: 2, count: 2 });
  for (const items of remote.values()) {
    expect(items.get(blue.sku)).toMatchObject({ name: blue.name, price: '615.00 BRL' });
  }

  green.status = 'published';
  expect(await syncProduct()).toMatchObject({ success: true, created: 2, unchanged: 2 });
  blue.status = 'hidden';
  expect(await syncProduct()).toMatchObject({ success: true, deleted: 2, unchanged: 2 });
  expect([...remote.values()].every((items) => !items.has(blue.sku) && items.has(green.sku))).toBe(true);

  product.status = 'hidden';
  expect(await syncProduct()).toMatchObject({ success: true, deleted: 2 });
  expect(product).toMatchObject({ id: productId, status: 'hidden', deleted: false });

  product.status = 'published';
  expect(await syncProduct()).toMatchObject({ success: true, created: 2 });
  remote.get(whatsappCatalogId)!.delete(green.sku);
  remote.get(META_ADS_CREATIVE_CATALOG_ID)!.get(green.sku)!.name = 'Alterada fora do ERP';
  expect(await runHourly()).toMatchObject({ success: true, created: 1, updated: 1 });
  expect(getLastRun()).toMatchObject({ trigger: 'hourly', success: true, count: 2 });

  const sentBatches = writes.length;
  expect(await runHourly()).toMatchObject({ success: true, unchanged: 2, count: 0 });
  expect(writes).toHaveLength(sentBatches);

  removeProduct();
  expect(await runHourly()).toMatchObject({ success: true, deleted: 2 });
  expect([...remote.values()].map((items) => [...items.keys()])).toEqual([[manualItem.retailer_id], [manualItem.retailer_id]]);
});

it('remove variações inativas ou mescladas sem rótulo e registra a confirmação em cada catálogo exclusivo', async () => {
  stubCatalogEnv();
  const { product, variations: [blue, green], remote, history } = fixture({ exclusive: true });
  Object.assign(product, { status: 'published', is_draft: false });
  blue.active = false;
  Object.assign(green, { status: 'published', merged_to_variation_id: blue.id });
  for (const items of remote.values()) {
    items.set(blue.sku, { id: '8111', retailer_id: blue.sku });
    items.set(green.sku, { id: '8112', retailer_id: green.sku });
  }

  expect(await syncProduct()).toMatchObject({ success: true, deleted: 4, count: 4 });
  expect(history).toHaveLength(4);
  expect(history.every((row) => Boolean(row.confirmed_at))).toBe(true);
  expect([...remote.values()].every((items) => !items.has(blue.sku) && !items.has(green.sku))).toBe(true);
});

it('reconcilia um SKU ativo sem estoque e remove o SKU ausente na execução horária exclusiva', async () => {
  stubCatalogEnv();
  const { product, variations: [blue], remote, history } = fixture({ exclusive: true });
  Object.assign(product, { status: 'published', is_draft: false });
  Object.assign(blue, { stock: 0 });
  for (const items of remote.values()) items.set(blue.sku, { id: '8111', retailer_id: blue.sku, availability: 'in stock' });

  expect(await runHourly()).toMatchObject({ success: true, updated: 2, deleted: 2, count: 4 });
  expect(history.every((row) => row.retailer_id === manualItem.retailer_id && row.confirmed_at)).toBe(true);
  expect([...remote.values()].every((items) => items.get(blue.sku)?.availability === 'out of stock'
    && !items.has(manualItem.retailer_id))).toBe(true);
});

it('bloqueia exclusões nos dois destinos quando falta uma página do Supabase', async () => {
  stubCatalogEnv();
  const { product, writes, history } = fixture({ exclusive: true, missingProductPage: true });
  Object.assign(product, { status: 'published', is_draft: false });
  expect(await runHourly(502)).toMatchObject({
    success: false, deleted: 0, error: expect.stringContaining('paginação incompleta'),
  });
  expect(writes).toHaveLength(0);
  expect(history).toHaveLength(0);
});
