import { describe, expect, it, vi, beforeEach } from 'vitest';
import { metaCatalogService } from '../metaCatalogService';
import { metaHttpClient } from '../metaHttpClient';
import { getSettings } from '@/pages/utils/settingsService';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(),
}));

vi.mock('../metaHttpClient', () => ({
  metaHttpClient: { request: vi.fn() },
}));

const response = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
}) as Response;

describe('metaCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        catalogId: '3456789012',
      },
    } as any);

    vi.mocked(metaHttpClient.request).mockResolvedValue(response({
        data: [
          { id: '1', name: 'Mesa Madeira', price: '100,00', visibility: 'published', is_hidden: false },
          { id: '2', name: 'Item Staging', price: '200,00', visibility: 'staging', is_hidden: false },
          { id: '3', name: 'Item Oculto', price: '300,00', visibility: 'published', is_hidden: true },
        ],
      }));
  });

  describe('fetchCatalogProducts', () => {
    it('filtra produtos em staging e produtos com flag is_hidden', async () => {
      const products = await metaCatalogService.fetchCatalogProducts();
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Mesa Madeira');
      expect(metaHttpClient.request).toHaveBeenCalledWith('list_catalog_products');
      expect(JSON.stringify(vi.mocked(metaHttpClient.request).mock.calls)).not.toContain('accessToken');
    });

    it('retorna array vazio se catalogId não estiver configurado', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: '' },
      } as any);

      const products = await metaCatalogService.fetchCatalogProducts();
      expect(products).toEqual([]);
      expect(metaHttpClient.request).not.toHaveBeenCalled();
    });
  });

  describe('syncProductToCatalog', () => {
    it('envia requisição com dados formatados para a Meta API', async () => {
      vi.mocked(metaHttpClient.request).mockResolvedValue(response({ handles: ['h123'] }));

      const product = {
        id: 'prod-1',
        code: 'SKU-001',
        name: 'Guarda Roupa',
        price: 999.9,
        image_url: 'https://moveismorante.com.br/foto.png',
        active: true,
      };

      await metaCatalogService.syncProductToCatalog(product, 'UPDATE');
      expect(metaHttpClient.request).toHaveBeenCalledWith('sync_catalog_batch', expect.objectContaining({
        payload: expect.objectContaining({ requests: expect.arrayContaining([expect.objectContaining({ retailer_id: 'SKU-001' })]) }),
      }));
    });
  });

  describe('deleteProductFromCatalog', () => {
    it('executa syncProductToCatalog com a ação DELETE', async () => {
      vi.mocked(metaHttpClient.request).mockResolvedValue(response({ handles: ['h_del'] }));

      await metaCatalogService.deleteProductFromCatalog('SKU-001');
      expect(metaHttpClient.request).toHaveBeenCalledWith('sync_catalog_batch', expect.objectContaining({
        payload: expect.objectContaining({ requests: expect.arrayContaining([expect.objectContaining({ method: 'DELETE', retailer_id: 'SKU-001' })]) }),
      }));
    });
  });

  describe('checkBatchStatus', () => {
    it('consulta endpoint check_batch_request_status com o handle informado', async () => {
      vi.mocked(metaHttpClient.request).mockResolvedValue(response({ status: 'finished' }));

      const result = await metaCatalogService.checkBatchStatus('handle_abc123');
      expect(result.status).toBe('finished');
      expect(metaHttpClient.request).toHaveBeenCalledWith('check_catalog_batch', { handle: 'handle_abc123' });
    });
  });
});
