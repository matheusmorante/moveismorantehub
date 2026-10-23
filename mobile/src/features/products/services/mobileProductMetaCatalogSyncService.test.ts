import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: mocks.from,
  },
}));

import {
  syncMobileProductToMetaCatalog,
  triggerMobileProductMetaCatalogSync,
} from './mobileProductMetaCatalogSyncService';

const originalErpApiUrl = process.env.EXPO_PUBLIC_ERP_API_URL;
const originalNodeEnv = process.env.NODE_ENV;

const createQuery = (result: unknown) => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

const product = {
  id: 'product-1',
  code: 'PROD-01',
  name: 'Mesa de jantar',
  status: 'published',
  active: true,
  deleted: false,
  deleted_at: null,
  is_draft: false,
  opportunity_id: 'opportunity-1',
  unit_price: 1200,
  price: 1200,
  promo_price: 1100,
  stock: 3,
  images: ['https://cdn.example.test/mesa.jpg'],
};

describe('mobileProductMetaCatalogSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPO_PUBLIC_ERP_API_URL = 'https://erp.example.test/';
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'products') return createQuery({ data: product, error: null });
      if (table === 'product_variations') {
        return createQuery({
          data: [
            {
              id: 'variation-1',
              product_id: product.id,
              status: 'published',
              active: true,
              name: 'Mesa natural',
              sku: 'PROD-01-01',
              image_url: null,
              price: 1200,
              promo_price: 1100,
              stock: 2,
              attributes: [],
              use_parent_price: true,
              use_parent_promo_price: true,
            },
          ],
          error: null,
        });
      }
      return createQuery({
        data: [{ id: 'opportunity-1', name: 'Sala de jantar', observations: 'Entrega sob consulta.' }],
        error: null,
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (originalErpApiUrl === undefined) delete process.env.EXPO_PUBLIC_ERP_API_URL;
    else process.env.EXPO_PUBLIC_ERP_API_URL = originalErpApiUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('envia pai e variação pelo proxy autenticado usando o contrato do ERP', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _request?: RequestInit) => ({
      ok: true,
      json: async () => ({ handles: ['batch-1'] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncMobileProductToMetaCatalog(product.id);

    expect(result).toEqual({ success: true, count: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://erp.example.test/api/meta-graph');
    expect(request?.headers).toMatchObject({ Authorization: 'Bearer session-token' });
    const body = JSON.parse(String(request?.body));
    expect(body.operation).toBe('sync_catalog_batch');
    expect(body.payload.item_type).toBe('PRODUCT_ITEM');
    expect(body.payload.requests).toHaveLength(2);
    expect(body.payload.requests[0]).toMatchObject({
      method: 'DELETE',
      retailer_id: 'PROD-01',
    });
    expect(body.payload.requests[1]).toMatchObject({
      method: 'UPDATE',
      retailer_id: 'PROD-01-01',
      data: {
        title: 'Mesa natural',
        price: '1200.00 BRL',
        sale_price: '1100.00 BRL',
        custom_label_3: 'Sala de jantar',
      },
    });
  });

  it('não usa produção como fallback em desenvolvimento sem URL configurada', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.EXPO_PUBLIC_ERP_API_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncMobileProductToMetaCatalog(product.id);

    expect(result.success).toBe(false);
    expect(result.error).toContain('EXPO_PUBLIC_ERP_API_URL');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('agrupa alterações consecutivas do mesmo produto por 400 ms', async () => {
    process.env.NODE_ENV = 'development';
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _request?: RequestInit) => ({
      ok: true,
      json: async () => ({}),
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    triggerMobileProductMetaCatalogSync(product.id);
    triggerMobileProductMetaCatalogSync(product.id);
    await vi.advanceTimersByTimeAsync(450);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
