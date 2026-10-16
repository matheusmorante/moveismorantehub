import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchProductsForLabel, searchProductsForLabelResult, extractProductName } from '../services/priceLabelCatalogService';
import { supabase } from '@/pages/utils/supabaseConfig';
import * as productLocalCache from '@/pages/utils/productService/productLocalCache';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/pages/utils/productService/productLocalCache', () => ({
  getLocalProducts: vi.fn(),
}));

describe('priceLabelCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productLocalCache.getLocalProducts).mockReset().mockReturnValue([]);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  describe('extractProductName', () => {
    it('normaliza o nome em caixa alta e remove quebras de linha', () => {
      const prod = { name: 'Colchão Casal D33\n138x188' };
      expect(extractProductName(prod)).toBe('COLCHÃO CASAL D33');
    });

    it('faz fallback para title, marketplaceTitle ou description', () => {
      expect(extractProductName({ title: 'Cama Box' })).toBe('CAMA BOX');
      expect(extractProductName({ marketplaceTitle: 'Guarda Roupa 6P' })).toBe('GUARDA ROUPA 6P');
      expect(extractProductName({ description: 'Mesa de Centro' })).toBe('MESA DE CENTRO');
      expect(extractProductName({})).toBe('PRODUTO SEM NOME');
    });
  });

  describe('searchProductsForLabel', () => {
    it('retorna produtos do cache local quando encontrados', async () => {
      const mockLocal = [
        {
          id: '1',
          name: 'Mesa de Jantar 6 Lugares',
          code: 'MJ-01',
          unitPrice: 1200,
          promoPrice: 999,
        },
        { id: '2', name: 'Cadeira Estofada', code: 'CAD-01', unitPrice: 250 },
      ];
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue(mockLocal as any);

      // Supabase retorna vazio
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null }),
      });

      const results = await searchProductsForLabel('Mesa');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('MESA DE JANTAR 6 LUGARES');
      expect(results[0].code).toBe('MJ-01');
      expect(results[0].promo_price).toBe(999);
    });

    it('complementa resultados com dados do Supabase', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([]);

      const mockDb = [
        {
          id: 'db-1',
          name: 'Sofá Retrátil 3 Lugares',
          code: 'SOF-03',
          price: 2500,
          promo_price: 1999,
          product_images: [{ image_url: 'https://example.com/sofa.jpg' }],
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: mockDb, error: null }),
      });

      const results = await searchProductsForLabel('Sofá');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('db-1');
      expect(results[0].name).toBe('SOFÁ RETRÁTIL 3 LUGARES');
      expect(results[0].images).toEqual(['https://example.com/sofa.jpg']);
    });

    it('mantém os resultados do cache local se o Supabase falhar ou estiver offline', async () => {
      const mockLocal = [
        { id: 'local-1', name: 'Painel para TV 65"', code: 'PAI-65', unitPrice: 450 },
      ];
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue(mockLocal as any);

      // Simula erro no Supabase
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: (_resolve: any, reject: any) => reject(new Error('Network error / offline')),
      });

      const results = await searchProductsForLabel('Painel');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('PAINEL PARA TV 65"');
    });

    it('evita duplicidade de produtos presentes tanto no cache quanto no Supabase', async () => {
      const mockLocal = [{ id: '10', name: 'Poltrona Bege', code: 'POL-01', unitPrice: 600 }];
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue(mockLocal as any);

      const mockDb = [{ id: '10', name: 'Poltrona Bege Atualizada', code: 'POL-01', price: 650 }];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: mockDb, error: null }),
      });

      const results = await searchProductsForLabel('Poltrona');
      // Deve ter apenas 1 item com o id '10' (sobrescrito com dados mais recentes do banco)
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('10');
      expect(results[0].name).toBe('POLTRONA BEGE ATUALIZADA');
    });
  });

  describe('resultado explícito e fronteira da consulta', () => {
    const queryWith = (response: Promise<unknown>) => {
      const query = {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(),
        then: response.then.bind(response),
      };
      vi.mocked(supabase.from).mockReturnValue(query as never);
      return query;
    };

    it('valida a consulta antes de ler cache ou chamar o transporte', async () => {
      const result = await searchProductsForLabelResult(null as unknown as string);
      expect(result.data).toEqual([]); expect(result.error).toBeInstanceOf(Error);
      expect(productLocalCache.getLocalProducts).not.toHaveBeenCalled(); expect(supabase.from).not.toHaveBeenCalled();
    });

    it('mantém busca vazia em recentes e usa o texto parseado sem arredondar preços', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([
        { id: 'local', name: 'Sofá', unitPrice: 0, price: 999, promoPrice: 0, promo_price: 55 },
      ] as never);
      const query = queryWith(Promise.resolve({ data: [
        { id: 7, name: 'Sofá fracionário', price: '12.35', promo_price: '0' },
      ], error: null }));
      const result = await searchProductsForLabelResult('  ');
      expect(result.error).toBeNull(); expect(query.or).not.toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('deleted', false); expect(query.limit).toHaveBeenCalledWith(40);
      expect(result.data).toEqual([
        expect.objectContaining({ id: 'local', unit_price: 0, promo_price: 0 }),
        expect.objectContaining({ id: '7', unit_price: 12.35, promo_price: 0 }),
      ]);
    });

    it('descarta excluídos locais/remotos e não restaura cópia local de exclusão remota', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([
        { id: 'local-deleted', name: 'Excluído local', unitPrice: 10, deleted: true },
        { id: 'remote-deleted', name: 'Cache desatualizado', unitPrice: 20 },
        { id: 'kept', name: 'Preservado', unitPrice: 0 },
      ] as never);
      queryWith(Promise.resolve({ data: [
        { id: 'remote-deleted', name: 'Excluído remoto', price: 30, deleted: true },
        { id: 'another-deleted', name: 'Outro excluído', price: 40, deleted: true },
      ], error: null }));
      expect((await searchProductsForLabelResult('')).data.map((product) => product.id)).toEqual(['kept']);
    });

    it('rejeita IDs inválidos e preços inválidos preservando registros válidos', async () => {
      queryWith(Promise.resolve({ data: [
        ...[null, undefined, false, {}, [], '', ' ', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map((id) => ({ id, name: 'Inválido', price: 1 })),
        ...[-1, Infinity, NaN, ''].map((price, index) => ({ id: `bad-price-${index}`, name: 'Inválido', price })),
        { id: ' valid ', name: 'Válido', price: 0.125, product_images: [{ image_url: 'image.jpg' }, null, { image_url: 12 }] },
      ], error: null }));
      const result = await searchProductsForLabelResult('');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toEqual([expect.objectContaining({ id: 'valid', unit_price: 0.125, images: ['image.jpg'] })]);
      expect(result.data.some((product) => ['null', 'undefined'].includes(product.id))).toBe(false);
    });

    it('expõe Supabase.error mesmo com data e conserva o cache válido', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([{ id: 'local', name: 'Produto local', unitPrice: 12.5 }] as never);
      queryWith(Promise.resolve({ data: [{ id: 'remote', name: 'Não confirmado', price: 1 }], error: { code: '42501', message: 'permission denied' } }));
      const result = await searchProductsForLabelResult('produto');
      expect(result.error?.message).toContain('nuvem'); expect(result.data.map((product) => product.id)).toEqual(['local']);
    });

    it('preserva busca local pela segunda linha da descrição e acentos', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([{ id: 'local', name: 'Colchão\n138x188', unitPrice: 10 }] as never);
      queryWith(Promise.resolve({ data: [], error: null }));
      expect((await searchProductsForLabelResult('  138x188  ')).data[0].name).toBe('COLCHÃO');
    });

    it('consulta remota ainda funciona quando o cache lança erro', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockImplementation(() => { throw new DOMException('Storage', 'SecurityError'); });
      queryWith(Promise.resolve({ data: [{ id: 'remote', name: 'Atual', price: 10 }], error: null }));
      const result = await searchProductsForLabelResult('');
      expect(result.data[0].id).toBe('remote'); expect(result.error?.message).toContain('computador');
    });

    it('libera consulta em 15s, preserva cache e ignora resultado tardio', async () => {
      vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([{ id: 'local', name: 'Local', unitPrice: 0 }] as never);
      let finish!: (value: unknown) => void; queryWith(new Promise((resolve) => { finish = resolve; }));
      const pending = searchProductsForLabelResult(''); await vi.advanceTimersByTimeAsync(15_000);
      const result = await pending; expect(result.data.map((product) => product.id)).toEqual(['local']); expect(result.error).toBeInstanceOf(Error);
      finish({ data: [{ id: 'late', name: 'Atrasado', price: 10 }], error: null }); await Promise.resolve();
      expect(result.data.map((product) => product.id)).toEqual(['local']); expect(vi.getTimerCount()).toBe(0);
    });

    it('mantém aspas, barras, vírgulas e curingas literais dentro de cinco filtros', async () => {
      const query = queryWith(Promise.resolve({ data: [], error: null }));
      await searchProductsForLabelResult('Sofá (A,B) "50%_\\z"');
      const filters = query.or.mock.calls[0][0] as string;
      const parts = filters.match(/(?:[^,"]|"(?:\\.|[^"\\])*")+/g)!;
      expect(parts).toHaveLength(5);
      expect(parts.every((part) => /^(name|description|code)\.(imatch|ilike)\."(?:\\.|[^"\\])*"$/.test(part))).toBe(true);
      const like = JSON.parse(parts[2].slice('name.ilike.'.length));
      expect(like).toBe('%sofa (a,b) "50\\%\\_\\\\z"%');
      const regex = JSON.parse(parts[0].slice('name.imatch.'.length));
      expect(new RegExp(regex).test('Sofá (A,B) "50%_\\z"'.toLowerCase())).toBe(true);
    });

    it('trata resposta sem lista como falha sem descartar o catálogo local', async () => {
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue([{ id: 'local', name: 'Local', unitPrice: 0 }] as never);
      queryWith(Promise.resolve({ data: { id: 'wrong' }, error: null }));
      const result = await searchProductsForLabelResult('');
      expect(result.error).toBeInstanceOf(Error); expect(result.data.map((product) => product.id)).toEqual(['local']);
    });

    it('não transforma asterisco literal em alias de curinga do PostgREST', async () => {
      const query = queryWith(Promise.resolve({ data: [], error: null }));
      await searchProductsForLabelResult('x*3');
      const filters = query.or.mock.calls[0][0] as string;
      const parts = filters.match(/(?:[^,"]|"(?:\\.|[^"\\])*")+/g)!;
      expect(parts).toHaveLength(3); expect(filters).not.toContain('.ilike.');
      for (const part of parts) {
        const pattern = JSON.parse(part.slice(part.indexOf('.imatch.') + '.imatch.'.length));
        expect(new RegExp(pattern).test('x*3')).toBe(true);
        expect(new RegExp(pattern).test('x123')).toBe(false);
      }
    });
  });
});
