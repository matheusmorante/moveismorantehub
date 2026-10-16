import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPriceLabelArtConfig,
  savePriceLabelArtConfig,
  fetchOpportunities,
  fetchPriceLabelArtConfigResult,
  fetchOpportunitiesResult,
} from '../services/priceLabelPersistenceService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { upsertRemoteLabelArtConfig } from '../services/labelLayoutService';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock('../services/labelLayoutService', () => ({ upsertRemoteLabelArtConfig: vi.fn() }));

describe('priceLabelPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(upsertRemoteLabelArtConfig).mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  describe('fetchPriceLabelArtConfig', () => {
    it('retorna art_config quando o layout existe no Supabase', async () => {
      const mockConfig = { globalSnapshot: { title: 'TESTE' } };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { layout_id: 'preco_2x5_restored', art_config: mockConfig },
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
      const success = await savePriceLabelArtConfig('layout_1', { version: 2 });
      expect(success).toBe(true);
      expect(upsertRemoteLabelArtConfig).toHaveBeenCalledWith({ layoutId: 'layout_1', category: 'precos', artConfig: { version: 2 } });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('retorna false quando houver erro no upsert', async () => {
      vi.mocked(upsertRemoteLabelArtConfig).mockResolvedValueOnce({ error: { message: 'Permission denied' } });
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

  describe('consultas confirmadas com contrato e prazo', () => {
    const artQuery = (response: Promise<unknown>) => {
      const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => response) };
      vi.mocked(supabase.from).mockReturnValue(query as never); return query;
    };
    const opportunitiesQuery = (response: Promise<unknown>) => {
      const query = { select: vi.fn(() => response) }; vi.mocked(supabase.from).mockReturnValue(query as never); return query;
    };

    it('valida seleção antes do I/O e usa layoutId parseado na consulta', async () => {
      expect((await fetchPriceLabelArtConfigResult(' ')).error).toBeTruthy();
      expect(supabase.from).not.toHaveBeenCalled();
      const config = { globalSnapshot: { title: 'ARTE', hidden: false, scale: 0, metadata: { nullable: null } } };
      const query = artQuery(Promise.resolve({ data: { layout_id: 'layout-1', art_config: config }, error: null }));
      expect(await fetchPriceLabelArtConfigResult(' layout-1 ')).toEqual({ data: config, error: null });
      expect(query.select).toHaveBeenCalledWith('layout_id,art_config'); expect(query.eq).toHaveBeenCalledWith('layout_id', 'layout-1');
    });

    it('distingue ausência confirmada de erro SQL e respostas inválidas', async () => {
      artQuery(Promise.resolve({ data: null, error: null }));
      expect(await fetchPriceLabelArtConfigResult('missing')).toEqual({ data: null, error: null });
      const sqlError = { code: '42501', message: 'Permission denied' };
      artQuery(Promise.resolve({ data: null, error: sqlError }));
      expect(await fetchPriceLabelArtConfigResult('missing')).toEqual({ data: null, error: sqlError });
      for (const data of [undefined, [], {}, { layout_id: 'other', art_config: {} }, { layout_id: 'layout-1', art_config: null }, { layout_id: 'layout-1', art_config: [] }]) {
        artQuery(Promise.resolve({ data, error: null }));
        const result = await fetchPriceLabelArtConfigResult('layout-1'); expect(result.data).toBeNull(); expect(result.error).toBeTruthy();
      }
    });

    it('conserva JSON válido e transforma opcionais SQL NULL sem inventar IDs', async () => {
      opportunitiesQuery(Promise.resolve({ data: [{ id: ' opp-1 ', name: ' Oferta ', slug: null, badge_color: null, border_color: null }], error: null }));
      expect(await fetchOpportunitiesResult()).toEqual({ data: [{ id: 'opp-1', name: 'Oferta', slug: undefined, badge_color: undefined, border_color: undefined }], error: null });
      for (const data of [null, {}, [{ id: null, name: 'Oferta' }], [{ id: ' ', name: 'Oferta' }], [{ id: 'opp-1', name: '' }]]) {
        opportunitiesQuery(Promise.resolve({ data, error: null }));
        const result = await fetchOpportunitiesResult(); expect(result.data).toEqual([]); expect(result.error).toBeTruthy();
      }
    });

    it('preserva falhas SQL/rede das oportunidades e wrappers legados devolvem vazio', async () => {
      const sqlError = { code: '42501' }; opportunitiesQuery(Promise.resolve({ data: [], error: sqlError }));
      expect(await fetchOpportunitiesResult()).toEqual({ data: [], error: sqlError }); expect(await fetchOpportunities()).toEqual([]);
      const network = new TypeError('Network'); opportunitiesQuery(Promise.reject(network));
      expect(await fetchOpportunitiesResult()).toEqual({ data: [], error: network });
      artQuery(Promise.resolve({ data: { layout_id: 'other', art_config: {} }, error: null }));
      expect(await fetchPriceLabelArtConfig('layout-1')).toBeNull();
    });

    it.each(['art', 'opportunities'])('limita consulta %s a 15s e ignora resposta tardia', async (kind) => {
      vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      let resolve!: (value: unknown) => void; const response = new Promise((done) => { resolve = done; });
      if (kind === 'art') artQuery(response); else opportunitiesQuery(response);
      const pending = kind === 'art' ? fetchPriceLabelArtConfigResult('layout-1') : fetchOpportunitiesResult();
      await vi.advanceTimersByTimeAsync(15_000); const result = await pending;
      expect(result.error).toBeTruthy(); expect(result.data).toEqual(kind === 'art' ? null : []);
      resolve({ data: kind === 'art' ? { layout_id: 'layout-1', art_config: {} } : [{ id: 'opp-1', name: 'Oferta' }], error: null });
      await Promise.resolve(); expect(result.error).toBeTruthy(); expect(vi.getTimerCount()).toBe(0);
    });

    it('wrapper de gravação exige confirmação explícita do helper e não duplica SQL', async () => {
      vi.mocked(upsertRemoteLabelArtConfig).mockResolvedValueOnce(undefined as never);
      expect(await savePriceLabelArtConfig('layout-1', {})).toBe(false);
      vi.mocked(upsertRemoteLabelArtConfig).mockResolvedValueOnce({} as never);
      expect(await savePriceLabelArtConfig('layout-1', {})).toBe(false);
      vi.mocked(upsertRemoteLabelArtConfig).mockRejectedValueOnce(new TypeError('Network'));
      expect(await savePriceLabelArtConfig('layout-1', {})).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
