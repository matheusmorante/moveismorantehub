import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPriceLabelArtConfig,
  savePriceLabelArtConfig,
  fetchOpportunities,
} from '../services/priceLabelPersistenceService';
import { supabase } from '@/pages/utils/supabaseConfig';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('priceLabelPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPriceLabelArtConfig', () => {
    it('retorna art_config quando o layout existe no Supabase', async () => {
      const mockConfig = { globalSnapshot: { title: 'TESTE' } };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { art_config: mockConfig },
          error: null,
        }),
      });

      const result = await fetchPriceLabelArtConfig('preco_2x5_restored');
      expect(result).toEqual(mockConfig);
    });

    it('retorna null se o layout não existir ou ocorrer erro no Supabase', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row not found' },
        }),
      });

      const result = await fetchPriceLabelArtConfig('inexistente');
      expect(result).toBeNull();
    });

    it('retorna null silenciosamente se ocorrer exceção de rede', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Connection timeout')),
      });

      const result = await fetchPriceLabelArtConfig('layout_timeout');
      expect(result).toBeNull();
    });
  });

  describe('savePriceLabelArtConfig', () => {
    it('retorna true quando a gravação for concluída com sucesso', async () => {
      (supabase.from as any).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      const success = await savePriceLabelArtConfig('layout_1', { version: 2 });
      expect(success).toBe(true);
    });

    it('retorna false quando houver erro no upsert', async () => {
      (supabase.from as any).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Permission denied' } }),
      });

      const success = await savePriceLabelArtConfig('layout_1', { version: 2 });
      expect(success).toBe(false);
    });
  });

  describe('fetchOpportunities', () => {
    it('retorna lista de oportunidades formatada', async () => {
      const mockOpps = [
        { id: 'opp-1', name: 'Black Friday', slug: 'black_friday' },
        { id: 'opp-2', name: 'Queima de Estoque', slug: 'queima' },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockOpps, error: null }),
      });

      const result = await fetchOpportunities();
      expect(result).toEqual(mockOpps);
    });

    it('retorna array vazio quando houver erro na consulta', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
      });

      const result = await fetchOpportunities();
      expect(result).toEqual([]);
    });
  });
});
