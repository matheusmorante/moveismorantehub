import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  syncAllProductsToMetaCatalog,
  syncProductToMetaCatalog,
  triggerProductMetaCatalogSync,
} from './productMetaCatalogSync';
import { getSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  fetchMetaCatalogSyncSources,
} from '@/pages/App/Products/MetaCatalog/services/metaCatalogDataService';
import { buildMetaCatalogItems } from '@/pages/App/Products/MetaCatalog/services/metaCatalogPayload';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(),
}));

vi.mock('@/pages/utils/whatsappGraphService', () => ({
  whatsappGraphService: {
    syncBatchProductsToCatalog: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/pages/App/Products/MetaCatalog/services/metaCatalogDataService', () => ({
  fetchMetaCatalogSyncSources: vi.fn(),
}));

vi.mock('@/pages/App/Products/MetaCatalog/services/metaCatalogPayload', () => ({
  buildMetaCatalogItems: vi.fn(),
}));

describe('productMetaCatalogSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('syncAllProductsToMetaCatalog', () => {
    it('lança erro se as credenciais da Meta não estiverem configuradas', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: '', accessToken: '' },
      } as any);

      await expect(syncAllProductsToMetaCatalog()).rejects.toThrow(
        'Credenciais da Meta não configuradas'
      );
    });

    it('sincroniza todos os produtos com sucesso quando configurado', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: 'cat_123', accessToken: 'token_123' },
      } as any);

      vi.mocked(fetchMetaCatalogSyncSources).mockResolvedValue({
        products: [{ id: 'p1', name: 'Mesa' }] as any,
        variations: [],
        opportunities: [],
      });

      vi.mocked(buildMetaCatalogItems).mockReturnValue([
        { id: 'p1', code: '001', name: 'Mesa' } as any,
      ]);

      vi.mocked(whatsappGraphService.syncBatchProductsToCatalog).mockResolvedValue({
        success: true,
        count: 1,
        handles: ['h_1'],
      });

      const res = await syncAllProductsToMetaCatalog();
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(whatsappGraphService.syncBatchProductsToCatalog).toHaveBeenCalledWith(
        [{ id: 'p1', code: '001', name: 'Mesa' }],
        undefined
      );
    });
  });

  describe('syncProductToMetaCatalog', () => {
    it('retorna sucesso 0 silenciosamente se as credenciais não estiverem configuradas', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: '', accessToken: '' },
      } as any);

      const res = await syncProductToMetaCatalog('p1');
      expect(res.success).toBe(false);
      expect(res.count).toBe(0);
      expect(res.error).toContain('Credenciais');
    });

    it('envia comando DELETE para o catálogo quando o produto for inativo ou oculto', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: 'cat_123', accessToken: 'token_123' },
      } as any);

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'p1',
                code: '001',
                status: 'hidden',
                active: false,
                is_draft: false,
                deleted: false,
                deleted_at: null,
              },
              error: null,
            }),
          }),
        }),
      });

      // product_variations
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'p1',
                code: '001',
                status: 'hidden',
                active: false,
                is_draft: false,
                deleted: false,
                deleted_at: null,
              },
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(whatsappGraphService.syncBatchProductsToCatalog).mockResolvedValue({
        success: true,
        count: 1,
        handles: [],
      });

      const res = await syncProductToMetaCatalog('p1');
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(whatsappGraphService.syncBatchProductsToCatalog).toHaveBeenCalledWith([
        { id: 'p1', code: '001', deleted: true, status: 'hidden' },
      ]);
    });
  });

  describe('triggerProductMetaCatalogSync', () => {
    it('executa debounce agregando chamadas consecutivas para o mesmo produto', async () => {
      vi.mocked(getSettings).mockReturnValue({
        whatsappConfig: { catalogId: 'cat_123', accessToken: 'token_123' },
      } as any);

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'p1', code: '001', status: 'published', active: true },
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(buildMetaCatalogItems).mockReturnValue([
        { id: 'p1', code: '001', name: 'Item' } as any,
      ]);
      vi.mocked(whatsappGraphService.syncBatchProductsToCatalog).mockResolvedValue({
        success: true,
        count: 1,
        handles: [],
      });

      triggerProductMetaCatalogSync('p1');
      triggerProductMetaCatalogSync('p1');
      triggerProductMetaCatalogSync('p1');

      // Antes dos 400ms, não chamou
      expect(whatsappGraphService.syncBatchProductsToCatalog).not.toHaveBeenCalled();

      // Avança 400ms
      await vi.advanceTimersByTimeAsync(450);

      // Chamou apenas 1 vez para o produto 'p1'
      expect(whatsappGraphService.syncBatchProductsToCatalog).toHaveBeenCalledTimes(1);
    });
  });
});
