import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'token-test' } },
        error: null,
      })),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({
    whatsappConfig: {
      catalogId: '949184464866249',
      accessToken: 'token-test-123',
    },
  }),
}));

import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';

const readProxyRequest = (init?: RequestInit) => JSON.parse(String(init?.body || '{}'));

describe('whatsappGraphService - Meta Catalog items_batch sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sincroniza itens com endpoint items_batch e item_type PRODUCT_ITEM', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = readProxyRequest(init);
      expect(body.operation).toBe('sync_catalog_batch');
      expect(body.payload.item_type).toBe('PRODUCT_ITEM');
      expect(Array.isArray(body.payload.requests)).toBe(true);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          handles: ['handle-test-12345'],
        }),
      } as any;
    });

    vi.stubGlobal('fetch', fetchMock);

    const testProducts = [
      {
        id: 'prod-1',
        code: 'SKU-001',
        name: 'Guarda-Roupa Casal 6 Portas',
        description: 'Amplo espaço interno com gavetas telescópicas',
        sales_price: 899.9,
        images: ['https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto1.jpg'],
        status: 'published',
        active: true,
      },
    ];

    const result = await whatsappGraphService.syncBatchProductsToCatalog(testProducts);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.handles).toContain('handle-test-12345');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe('/api/meta-graph');

    const calledBody = readProxyRequest(fetchMock.mock.calls[0][1]).payload;
    expect(calledBody.requests[0]).toMatchObject({
      method: 'UPDATE',
      retailer_id: 'SKU-001',
      data: expect.objectContaining({
        id: 'SKU-001',
        title: 'Guarda-Roupa Casal 6 Portas',
        price: '899.90 BRL',
        availability: 'in stock',
        brand: 'Móveis Morante',
        product_type: 'Móveis',
        custom_label_0: 'Móveis',
        custom_label_1: '899,90',
        item_group_id: '',
        condition: 'new',
      }),
    });
    expect(calledBody.requests[0].data.product_type).not.toBe('Furniture');
    expect(calledBody.requests[0].data.custom_label_0).not.toBe('Furniture');
    expect(calledBody.requests[0].data.custom_label_2).toBeUndefined();
  });

  it('divide os lotes no limite de 50 aceito pelo proxy seguro', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({ handles: [] }),
    } as any));
    vi.stubGlobal('fetch', fetchMock);

    const products = Array.from({ length: 51 }, (_, index) => ({
      id: `product-${index}`,
      code: `SKU-${index}`,
      status: 'hidden',
    }));

    const result = await whatsappGraphService.syncBatchProductsToCatalog(products);

    expect(result.success).toBe(true);
    expect(result.count).toBe(51);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const payloadSizes = fetchMock.mock.calls.map(([, init]) =>
      readProxyRequest(init).payload.requests.length
    );
    expect(payloadSizes).toEqual([50, 1]);
  });

  it('envia a categoria real no product_type e custom_label_0, e condition refurbished para salvados', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ handles: ['handle-cat-123'] }),
    } as any));

    vi.stubGlobal('fetch', fetchMock);

    const productWithCategory = [
      {
        id: 'prod-cat',
        code: 'SKU-COZ-01',
        name: 'Balcão de Cozinha 2 Portas',
        sales_price: 450.0,
        productType: 'Cozinha > Balcões',
        is_salvado: true,
        material: 'MDP',
        color: 'Nogueira',
        size: '80cm',
        slug: 'balcao-cozinha-2-portas',
        images: ['https://example.com/balcao.jpg'],
        status: 'published',
        active: true,
      },
    ];

    const result = await whatsappGraphService.syncBatchProductsToCatalog(productWithCategory);
    expect(result.success).toBe(true);

    const calledBody = readProxyRequest(fetchMock.mock.calls[0][1]).payload;
    expect(calledBody.requests[0].data).toMatchObject({
      product_type: 'Cozinha > Balcões',
      custom_label_0: 'Cozinha > Balcões',
      condition: 'refurbished',
      material: 'MDP',
      color: 'Nogueira',
      size: '80cm',
      item_group_id: '',
      link: 'https://moveismorante.com.br/produto/balcao-cozinha-2-portas',
    });
    expect(calledBody.requests[0].data.product_type).not.toBe('Furniture');
    expect(calledBody.requests[0].data.custom_label_0).not.toBe('Furniture');
  });

  it('mapeia custom_label_1 com preco promocional e custom_label_2 com preco antigo quando houver promocao', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ handles: ['handle-promo-123'] }),
      } as any;
    });

    vi.stubGlobal('fetch', fetchMock);

    const promoProducts = [
      {
        id: 'prod-promo',
        code: 'SKU-PROMO-1',
        name: 'Sofá Retrátil 3 Lugares',
        sales_price: 1500.0,
        promo_price: 1199.9,
        opportunityName: 'Queima dos Salvados',
        images: ['https://pub-389127050a434f568c29dc66bdce2567.r2.dev/sofa.jpg'],
        status: 'published',
        active: true,
      },
    ];

    const result = await whatsappGraphService.syncBatchProductsToCatalog(promoProducts);
    expect(result.success).toBe(true);

    const calledBody = readProxyRequest(fetchMock.mock.calls[0][1]).payload;
    expect(calledBody.requests[0].data).toMatchObject({
      price: '1500.00 BRL',
      sale_price: '1199.90 BRL',
      custom_label_1: '1199,90',
      custom_label_2: '1500,00',
      custom_label_3: 'Queima dos Salvados',
    });
  });

  it('envia DELETE quando o item está inativo ou deletado', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = readProxyRequest(init);
      expect(body.operation).toBe('sync_catalog_batch');
      expect(body.payload.requests[0].method).toBe('DELETE');
      expect(body.payload.requests[0].retailer_id).toBe('SKU-DELETADO');
      return {
        ok: true,
        status: 200,
        json: async () => ({ handles: ['handle-del-999'] }),
      } as any;
    });

    vi.stubGlobal('fetch', fetchMock);

    const deletedProducts = [
      {
        id: 'prod-del',
        code: 'SKU-DELETADO',
        name: 'Item Removido',
        deleted: true,
      },
    ];

    const result = await whatsappGraphService.syncBatchProductsToCatalog(deletedProducts);
    expect(result.success).toBe(true);
    expect(result.handles).toContain('handle-del-999');
  });

  it('permite consultar o status assíncrono do lote via checkBatchStatus', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('/api/meta-graph');
      expect(readProxyRequest(init)).toMatchObject({
        operation: 'check_catalog_batch',
        handle: 'handle-test-12345',
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              handle: 'handle-test-12345',
              status: 'finished',
              errors_total_count: 0,
            },
          ],
        }),
      } as any;
    });

    vi.stubGlobal('fetch', fetchMock);

    const status = await whatsappGraphService.checkBatchStatus('handle-test-12345');
    expect(status.data[0].status).toBe('finished');
    expect(status.data[0].errors_total_count).toBe(0);
  });
});
