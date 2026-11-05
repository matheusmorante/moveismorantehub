import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveMobileEnvironment,
  deleteMobileEnvironment,
  unlinkMobileCategoryFromEnvironment,
  fetchMobileCategories,
} from './mobileCategoryService';
import { supabase } from '../../../services/supabaseClient';

vi.mock('../../../services/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('Roteiro 1 & 2: Serviços de Persistência e Integridade — Ambientes, Categorias e Características', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantém ambientes fora das categorias disponíveis para produtos', async () => {
    const categoriesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'cat-1', name: 'Cozinha', type: 'category' },
          { id: 'env-1', name: 'Casa', type: 'environment' },
          { id: 'cat-legacy', name: 'Legada' },
        ],
        error: null,
      }),
    };
    const relationshipsQuery = {
      select: vi.fn().mockResolvedValue({
        data: [{ parent_id: 'env-1', child_id: 'cat-1' }],
        error: null,
      }),
    };
    (supabase.from as any).mockImplementation((table: string) =>
      table === 'categories' ? categoriesQuery : relationshipsQuery
    );

    await expect(fetchMobileCategories()).resolves.toEqual([
      { id: 'cat-1', name: 'Cozinha', type: 'category', parents: ['env-1'] },
      { id: 'cat-legacy', name: 'Legada', parents: [] },
    ]);
  });

  describe('1. Persistência de Ambientes (saveMobileEnvironment, delete, unlink)', () => {
    it('AC-04: Cria novo ambiente persistindo nome, tipo environment e vínculos', async () => {
      const mockSlugLookup = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'env-new-1', name: 'SALA VIP' }, error: null }),
        }),
      });

      const mockDeleteRel = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockInsertRel = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({ like: mockSlugLookup }),
            insert: mockInsert,
          };
        }
        if (table === 'category_relationships') {
          return { delete: mockDeleteRel, insert: mockInsertRel };
        }
        return {};
      });

      const result = await saveMobileEnvironment('SALA VIP', ['cat-1', 'cat-2']);
      expect(result).toBe('env-new-1');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Sala Vip', type: 'environment', slug: 'sala-vip' }),
      ]);
      expect(mockInsertRel).toHaveBeenCalledWith([
        { parent_id: 'env-new-1', child_id: 'cat-1' },
        { parent_id: 'env-new-1', child_id: 'cat-2' },
      ]);
      expect(mockDeleteRel).not.toHaveBeenCalled();
    });

    it('AC-07 / AC-08: Edita ambiente existente e sincroniza os relacionamentos', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: 'env-1', name: 'SALA ATUALIZADA' }, error: null }),
          }),
        }),
      });

      const mockDeleteRel = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') return { update: mockUpdate };
        if (table === 'category_relationships')
          return { delete: mockDeleteRel, insert: vi.fn().mockResolvedValue({ error: null }) };
        return {};
      });

      const result = await saveMobileEnvironment('SALA ATUALIZADA', [], 'env-1');
      expect(result).toBe('env-1');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Sala Atualizada', type: 'environment' })
      );
      expect(mockDeleteRel).toHaveBeenCalled();
    });

    it('AC-10: Bloqueia exclusão de ambiente se possuir categorias vinculadas', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'category_relationships') {
          return { select: mockSelect };
        }
        return {};
      });

      await expect(deleteMobileEnvironment('env-com-filhos')).rejects.toThrow(
        'Desvincule as categorias antes de excluir este ambiente.'
      );
    });

    it('AC-11: Permite exclusão de ambiente sem categorias vinculadas', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'category_relationships') return { select: mockSelect };
        if (table === 'categories') return { delete: mockDelete };
        return {};
      });

      await expect(deleteMobileEnvironment('env-vazio')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('AC-09: Desvincula categoria diretamente do ambiente sem remover a categoria', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'category_relationships') return { delete: mockDelete };
        return {};
      });

      await expect(unlinkMobileCategoryFromEnvironment('env-1', 'cat-1')).resolves.toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
