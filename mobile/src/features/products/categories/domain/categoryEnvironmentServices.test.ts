import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveMobileEnvironment,
  deleteMobileEnvironment,
  unlinkMobileCategoryFromEnvironment,
  saveMobileCategory,
  deleteMobileCategory,
  fetchMobileCategoryProductCounts,
  fetchMobileCategoryRequiredAttributes,
} from '../../services/mobileCategoryService';
import {
  fetchMobileAttributes,
  saveMobileAttribute,
  deleteMobileAttribute,
  addMobileAttributeValue,
  deleteMobileAttributeValue,
} from '../../services/mobileAttributeService';
import { supabase } from '../../../../services/supabaseClient';

vi.mock('../../../../services/supabaseClient', () => {
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

  describe('1. Persistência de Ambientes (saveMobileEnvironment, delete, unlink)', () => {
    it('AC-04: Cria novo ambiente persistindo nome, tipo environment e vínculos', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'env-new-1', name: 'SALA VIP' }, error: null }),
        }),
      });

      const mockDeleteRel = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockInsertRel = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') {
          return { insert: mockInsert };
        }
        if (table === 'category_relationships') {
          return { delete: mockDeleteRel, insert: mockInsertRel };
        }
        return {};
      });

      const result = await saveMobileEnvironment('SALA VIP', ['cat-1', 'cat-2']);
      expect(result).toBe('env-new-1');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'SALA VIP', type: 'environment' }),
      ]);
      expect(mockInsertRel).toHaveBeenCalledWith([
        { parent_id: 'env-new-1', child_id: 'cat-1' },
        { parent_id: 'env-new-1', child_id: 'cat-2' },
      ]);
    });

    it('AC-07 / AC-08: Edita ambiente existente e atualiza relacionamentos atomicamente', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'env-1', name: 'SALA ATUALIZADA' }, error: null }),
          }),
        }),
      });

      const mockDeleteRel = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') return { update: mockUpdate };
        if (table === 'category_relationships') return { delete: mockDeleteRel, insert: vi.fn().mockResolvedValue({ error: null }) };
        return {};
      });

      const result = await saveMobileEnvironment('SALA ATUALIZADA', [], 'env-1');
      expect(result).toBe('env-1');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'SALA ATUALIZADA', type: 'environment' })
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

  describe('2. Persistência de Categorias e Características (saveMobileCategory, delete)', () => {
    it('AC-08 / AC-12: Cria categoria vinculada a múltiplos ambientes e com características associadas', async () => {
      const mockInsertCat = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'cat-new-1', name: 'SOFÁ RETRÁTIL' }, error: null }),
        }),
      });

      const mockDeleteRel = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockInsertRel = vi.fn().mockResolvedValue({ error: null });
      const mockDeleteAttr = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockInsertAttr = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') return { insert: mockInsertCat };
        if (table === 'category_relationships') return { delete: mockDeleteRel, insert: mockInsertRel };
        if (table === 'category_attributes') return { delete: mockDeleteAttr, insert: mockInsertAttr };
        return {};
      });

      const result = await saveMobileCategory(
        'SOFÁ RETRÁTIL',
        ['env-1', 'env-2'], // Vínculo com 2 ambientes
        ['attr-cor', 'attr-tecido'] // 2 características associadas
      );

      expect(result).toEqual({ id: 'cat-new-1', name: 'SOFÁ RETRÁTIL' });
      expect(mockInsertRel).toHaveBeenCalledWith([
        { parent_id: 'env-1', child_id: 'cat-new-1' },
        { parent_id: 'env-2', child_id: 'cat-new-1' },
      ]);
      expect(mockInsertAttr).toHaveBeenCalledWith([
        { category_id: 'cat-new-1', attribute_id: 'attr-cor', is_required: true },
        { category_id: 'cat-new-1', attribute_id: 'attr-tecido', is_required: true },
      ]);
    });

    it('AC-13: Atualiza categoria desmarcando características e removendo vínculos de category_attributes', async () => {
      const mockUpdateCat = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'cat-1', name: 'SOFÁ' }, error: null }),
          }),
        }),
      });

      const mockDeleteAttr = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockInsertAttr = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') return { update: mockUpdateCat };
        if (table === 'category_relationships') {
          return {
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'category_attributes') return { delete: mockDeleteAttr, insert: mockInsertAttr };
        return {};
      });

      // Salva com lista vazia de características (desmarcação total)
      await saveMobileCategory('SOFÁ', ['env-1'], [], 'cat-1');
      expect(mockDeleteAttr).toHaveBeenCalled();
      expect(mockInsertAttr).not.toHaveBeenCalled();
    });

    it('AC-14: Bloqueia exclusão de categoria quando possuir produtos (relacional + direto)', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_categories') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 2, error: null }) }) };
        }
        if (table === 'products') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 1, error: null }) }) };
        }
        return {};
      });

      await expect(deleteMobileCategory('00000000-0000-4000-8000-000000000014')).rejects.toThrow(
        /utilizada por 3 produtos/
      );
    });

    it('AC-15: Exclui categoria sem produtos com cascata em relacionamentos e características', async () => {
      const mockDeleteAttr = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockDeleteRel = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockDeleteCat = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_categories' || table === 'products') {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) }) };
        }
        if (table === 'category_attributes') return { delete: mockDeleteAttr };
        if (table === 'category_relationships') return { delete: mockDeleteRel };
        if (table === 'categories') return { delete: mockDeleteCat };
        return {};
      });

      await expect(deleteMobileCategory('00000000-0000-4000-8000-000000000015')).resolves.toBeUndefined();
      expect(mockDeleteAttr).toHaveBeenCalled();
      expect(mockDeleteRel).toHaveBeenCalled();
      expect(mockDeleteCat).toHaveBeenCalled();
    });

    it('Rejeita ID sintético antes de consultar colunas UUID no Supabase', async () => {
      await expect(deleteMobileCategory('node-1790342264516-0')).rejects.toThrow(/identificador de categoria inválido/i);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('AC-02: Consolida contagem de produtos por categoria unificando direct e product_categories', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_categories') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { category_id: 'c1', product_id: 'p1' },
                { category_id: 'c1', product_id: 'p2' },
              ],
              error: null,
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: [
                  { id: 'p2', category_id: 'c1' }, // Produto repetido no vínculo direto -> Set deve contar 1 vez
                  { id: 'p3', category_id: 'c2' },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const counts = await fetchMobileCategoryProductCounts();
      expect(counts['c1']).toBe(2); // p1, p2
      expect(counts['c2']).toBe(1); // p3
    });

    it('AT-11: Consulta características vinculadas à categoria no formato normalizado', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'category_attributes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { attribute_id: 'a1', attributes: { id: 'a1', name: 'Cor' } },
                  { attribute_id: 'a2', attributes: [{ id: 'a2', name: 'Tamanho' }] },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const attrs = await fetchMobileCategoryRequiredAttributes('c1');
      expect(attrs).toEqual([
        { id: 'a1', name: 'Cor' },
        { id: 'a2', name: 'Tamanho' },
      ]);
    });
  });

  describe('3. Persistência de Características Globais (saveMobileAttribute, delete, options)', () => {
    it('AT-02 / AT-10: Cria característica com tipo de dado, unidade e obrigatoriedade global', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'attr-1' }, error: null }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attributes') return { insert: mockInsert };
        return {};
      });

      const id = await saveMobileAttribute('Dimensão', undefined, {
        dataType: 'decimal',
        unit: 'cm',
        isGloballyRequired: true,
      });

      expect(id).toBe('attr-1');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Dimensão',
          data_type: 'decimal',
          unit: 'cm',
          is_globally_required: true,
          active: true,
        }),
      ]);
    });

    it('AT-05: Edita característica existente atualizando seus metadados', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attributes') return { update: mockUpdate };
        return {};
      });

      const id = await saveMobileAttribute('Dimensão Altura', 'attr-1', {
        dataType: 'integer',
        unit: 'mm',
      });

      expect(id).toBe('attr-1');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dimensão Altura',
          data_type: 'integer',
          unit: 'mm',
        })
      );
    });

    it('AT-06: Adiciona opção/valor a uma característica com trim de espaços', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attribute_values') return { insert: mockInsert };
        return {};
      });

      await addMobileAttributeValue('attr-1', '  Azul Royal  ');
      expect(mockInsert).toHaveBeenCalledWith([
        { attribute_id: 'attr-1', value: 'Azul Royal' },
      ]);
    });

    it('AT-08: Exclui opção/valor de uma característica', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attribute_values') return { delete: mockDelete };
        return {};
      });

      await deleteMobileAttributeValue('val-123');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('AT-09: Exclui característica global com limpeza em cascata de seus valores', async () => {
      const mockDeleteValues = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockDeleteAttr = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'attribute_values') return { delete: mockDeleteValues };
        if (table === 'attributes') return { delete: mockDeleteAttr };
        return {};
      });

      await deleteMobileAttribute('attr-1');
      expect(mockDeleteValues).toHaveBeenCalled();
      expect(mockDeleteAttr).toHaveBeenCalled();
    });

    it('AT-12: Trata falha de rede ou backend ao carregar características retornando lista vazia sem quebrar', async () => {
      (supabase.from as any).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
          }),
        };
      });

      const result = await fetchMobileAttributes();
      expect(result).toEqual([]);
    });
  });
});
