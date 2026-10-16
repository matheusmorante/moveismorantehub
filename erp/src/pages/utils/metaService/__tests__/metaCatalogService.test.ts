import { describe, expect, it, vi, beforeEach } from 'vitest';
import { metaCatalogService } from '../metaCatalogService';
import { getSettings } from '@/pages/utils/settingsService';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(),
}));

describe('metaCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB_VALID_TOKEN',
        catalogId: 'cat_123456',
      },
    } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: '1', name: 'Mesa Madeira', price: '100,00', visibility: 'published', is_hidden: false },
          { id: '2', name: 'Item Staging', price: '200,00', visibility: 'staging', is_hidden: false },
          { id: '3', name: 'Item Oculto', price: '300,00', visibility: 'published', is_hidden: true },
        ],
      }),
    } as any);
  });

  describe('fetchCatalogProducts', () => {
    it('filtra produtos em staging e produtos com flag is_hidden', async () => {
      const products = await metaCatalogService.fetchCatalogProducts();
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Mesa Madeira');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cat_123456/products'),
        expect.any(Object)
      );
    });

    it('retorna array vazio se catalogId não estiver configurado', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: '' },
      } as any);

      const products = await metaCatalogService.fetchCatalogProducts();
      expect(products).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('syncProductToCatalog', () => {
    it('envia requisição com dados formatados para a Meta API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ handles: ['h123'] }),
      } as any);

      const product = {
        id: 'prod-1',
        code: 'SKU-001',
        name: 'Guarda Roupa',
        price: 999.9,
        image_url: 'https://moveismorante.com.br/foto.png',
        active: true,
      };

      await metaCatalogService.syncProductToCatalog(product, 'UPDATE');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cat_123456/items_batch'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('SKU-001'),
        })
      );
    });
  });

  describe('deleteProductFromCatalog', () => {
    it('executa syncProductToCatalog com a ação DELETE', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ handles: ['h_del'] }),
      } as any);

      await metaCatalogService.deleteProductFromCatalog('SKU-001');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cat_123456/items_batch'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"DELETE"'),
        })
      );
    });
  });

  describe('checkBatchStatus', () => {
    it('consulta endpoint check_batch_request_status com o handle informado', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'finished' }),
      } as any);

      const result = await metaCatalogService.checkBatchStatus('handle_abc123');
      expect(result.status).toBe('finished');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('check_batch_request_status?handle=handle_abc123'),
        expect.any(Object)
      );
    });
  });
});
