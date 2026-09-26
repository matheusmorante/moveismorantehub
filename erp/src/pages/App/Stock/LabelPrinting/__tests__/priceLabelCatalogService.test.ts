import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchProductsForLabel, extractProductName } from '../services/priceLabelCatalogService';
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
  });

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
        { id: '1', name: 'Mesa de Jantar 6 Lugares', code: 'MJ-01', unitPrice: 1200, promoPrice: 999 },
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
      const mockLocal = [
        { id: '10', name: 'Poltrona Bege', code: 'POL-01', unitPrice: 600 },
      ];
      vi.mocked(productLocalCache.getLocalProducts).mockReturnValue(mockLocal as any);

      const mockDb = [
        { id: '10', name: 'Poltrona Bege Atualizada', code: 'POL-01', price: 650 },
      ];

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
});
