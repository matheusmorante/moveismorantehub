import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveMobileEnvironment,
  deleteMobileEnvironment,
  unlinkMobileCategoryFromEnvironment,
  saveMobileCategory,
  deleteMobileCategory,
  fetchMobileCategories,
  fetchMobileCategoryProductCounts,
  fetchMobileCategoryAttributes,
} from '../../services/mobileCategoryService';
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

  describe('2. Persistência de Categorias e Características (saveMobileCategory, delete)', () => {
    it('AC-08 / AC-12: Preserva obrigatoriedade configurada e as regras de Cor, Linha e Peso ao criar', async () => {
      const mockSlugLookup = vi.fn().mockResolvedValue({
        data: [{ slug: 'sofa-retratil' }, { slug: 'sofa-retratil-2' }],
        error: null,
      });
      const mockInsertCat = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'cat-new-1', name: 'Sofá Retrátil' }, error: null }),
        }),
      });

      const mockDeleteRel = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockInsertRel = vi.fn().mockResolvedValue({ error: null });
      const mockDeleteAttr = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockInsertAttr = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories')
          return {
            select: vi.fn().mockReturnValue({ like: mockSlugLookup }),
            insert: mockInsertCat,
          };
        if (table === 'category_relationships')
          return { delete: mockDeleteRel, insert: mockInsertRel };
        if (table === 'category_attributes')
          return { delete: mockDeleteAttr, insert: mockInsertAttr };
        return {};
      });

      const result = await saveMobileCategory(
        'SOFÁ RETRÁTIL',
        ['env-1', 'env-2'], // Vínculo com 2 ambientes
        [
          { id: 'attr-cor', name: 'Cor', isRequired: false },
          { id: 'attr-tecido', name: 'Tecido', isRequired: false },
          { id: 'attr-peso', name: 'Peso', isRequired: true },
          { id: 'attr-linha', name: 'Linha', isRequired: false },
        ]
      );

      expect(result).toEqual({ id: 'cat-new-1', name: 'Sofá Retrátil' });
      expect(mockInsertCat).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Sofá Retrátil',
          slug: 'sofa-retratil-3',
          type: 'category',
          meta_title: 'SOFÁ RETRÁTIL | Móveis Morante',
        }),
      ]);
      expect(mockInsertRel).toHaveBeenCalledWith([
        { parent_id: 'env-1', child_id: 'cat-new-1' },
        { parent_id: 'env-2', child_id: 'cat-new-1' },
      ]);
      expect(mockInsertAttr).toHaveBeenCalledWith([
        { category_id: 'cat-new-1', attribute_id: 'attr-cor', is_required: true },
        { category_id: 'cat-new-1', attribute_id: 'attr-tecido', is_required: false },
        { category_id: 'cat-new-1', attribute_id: 'attr-peso', is_required: false },
        { category_id: 'cat-new-1', attribute_id: 'attr-linha', is_required: true },
      ]);
      expect(mockDeleteRel).not.toHaveBeenCalled();
      expect(mockDeleteAttr).not.toHaveBeenCalled();
    });

    it('Propaga falha ao inserir vínculos de nova categoria após criar o registro base', async () => {
      const linkError = new Error('Falha ao gravar os ambientes vinculados.');
      const mockInsertCategory = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'cat-partial-1', name: 'Cadeira' },
            error: null,
          }),
        }),
      });
      const mockDeleteRel = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockInsertRel = vi.fn().mockResolvedValue({ error: linkError });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              like: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            insert: mockInsertCategory,
          };
        }
        if (table === 'category_relationships')
          return { delete: mockDeleteRel, insert: mockInsertRel };
        return {};
      });

      await expect(saveMobileCategory('Cadeira', ['env-1'])).rejects.toBe(linkError);
      expect(mockInsertCategory).toHaveBeenCalled();
      expect(mockInsertRel).toHaveBeenCalledWith([
        { parent_id: 'env-1', child_id: 'cat-partial-1' },
      ]);
      expect(mockDeleteRel).not.toHaveBeenCalled();
    });

    it('AC-13: Atualiza categoria desmarcando características e removendo vínculos de category_attributes', async () => {
      const mockUpdateCat = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'cat-1', name: 'SOFÁ' }, error: null }),
          }),
        }),
      });

      const mockDeleteAttr = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockDeleteRel = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockInsertAttr = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'categories') return { update: mockUpdateCat };
        if (table === 'category_relationships') {
          return {
            delete: mockDeleteRel,
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'category_attributes')
          return { delete: mockDeleteAttr, insert: mockInsertAttr };
        return {};
      });

      // Salva com lista vazia de características (desmarcação total)
      await saveMobileCategory('SOFÁ', ['env-1'], [], 'cat-1');
      expect(mockDeleteAttr).toHaveBeenCalled();
      expect(mockDeleteRel).toHaveBeenCalled();
      expect(mockInsertAttr).not.toHaveBeenCalled();
      expect(mockUpdateCat).toHaveBeenCalledWith({ name: 'Sofá', type: 'category' });
    });

    it('AC-14: Bloqueia exclusão de categoria quando possuir produtos (relacional + direto)', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_categories') {
          return {
            select: vi
              .fn()
              .mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 2, error: null }) }),
          };
        }
        if (table === 'products') {
          return {
            select: vi
              .fn()
              .mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 1, error: null }) }),
          };
        }
        return {};
      });

      await expect(deleteMobileCategory('00000000-0000-4000-8000-000000000014')).rejects.toThrow(
        /utilizada por 3 produtos/
      );
    });

    it('informa produtos distintos quando a mesma referência aparece nas duas fontes', async () => {
      const categoryId = '00000000-0000-4000-8000-000000000016';
      const makeQuery = (count: number, rows: unknown[]) => ({
        select: vi.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => ({
          eq: vi.fn().mockResolvedValue(
            options?.head ? { count, error: null } : { data: rows, error: null }
          ),
        })),
      });
      const relationQuery = makeQuery(2, [{ product_id: 'product-1' }, { product_id: 'product-2' }]);
      const directQuery = makeQuery(1, [{ id: 'product-2' }]);
      (supabase.from as any).mockImplementation((table: string) =>
        table === 'product_categories' ? relationQuery : directQuery
      );

      await expect(deleteMobileCategory(categoryId)).rejects.toThrow(/utilizada por 2 produtos/);
      expect(supabase.from).not.toHaveBeenCalledWith('category_attributes');
      expect(supabase.from).not.toHaveBeenCalledWith('categories');
    });

    it('falha fechado se a leitura dos IDs para deduplicar falhar', async () => {
      const categoryId = '00000000-0000-4000-8000-000000000017';
      const detailError = new Error('Falha ao ler produtos vinculados');
      const relationQuery = {
        select: vi.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => ({
          eq: vi.fn().mockResolvedValue(
            options?.head
              ? { count: 1, error: null }
              : { data: null, error: detailError }
          ),
        })),
      };
      const directQuery = {
        select: vi.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => ({
          eq: vi.fn().mockResolvedValue(options?.head ? { count: 0, error: null } : { data: [], error: null }),
        })),
      };
      (supabase.from as any).mockImplementation((table: string) =>
        table === 'product_categories' ? relationQuery : directQuery
      );

      await expect(deleteMobileCategory(categoryId)).rejects.toBe(detailError);
      expect(supabase.from).not.toHaveBeenCalledWith('category_attributes');
      expect(supabase.from).not.toHaveBeenCalledWith('categories');
    });

    it('falha fechado quando uma das consultas de contagem retorna erro', async () => {
      const categoryId = '00000000-0000-4000-8000-000000000018';
      const checkError = new Error('Falha ao consultar vínculos de Produto');
      const relationQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: checkError }),
        }),
      };
      const directQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      };
      (supabase.from as any).mockImplementation((table: string) =>
        table === 'product_categories' ? relationQuery : directQuery
      );

      await expect(deleteMobileCategory(categoryId)).rejects.toBe(checkError);
      expect(supabase.from).not.toHaveBeenCalledWith('category_attributes');
      expect(supabase.from).not.toHaveBeenCalledWith('categories');
    });

    it('AC-15: Exclui categoria sem produtos com cascata em relacionamentos e características', async () => {
      const mockDeleteAttr = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockDeleteRel = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const mockDeleteCat = vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_categories' || table === 'products') {
          return {
            select: vi
              .fn()
              .mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) }),
          };
        }
        if (table === 'category_attributes') return { delete: mockDeleteAttr };
        if (table === 'category_relationships') return { delete: mockDeleteRel };
        if (table === 'categories') return { delete: mockDeleteCat };
        return {};
      });

      await expect(
        deleteMobileCategory('00000000-0000-4000-8000-000000000015')
      ).resolves.toBeUndefined();
      expect(mockDeleteAttr).toHaveBeenCalled();
      expect(mockDeleteRel).toHaveBeenCalled();
      expect(mockDeleteCat).toHaveBeenCalled();
    });

    it('Rejeita ID sintético antes de consultar colunas UUID no Supabase', async () => {
      await expect(deleteMobileCategory('node-1790342264516-0')).rejects.toThrow(
        /identificador de categoria inválido/i
      );
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

    it('propaga falha de consulta da contagem em vez de apresentar total zero', async () => {
      const queryError = new Error('Falha ao consultar product_categories');
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_categories') {
          return { select: vi.fn().mockResolvedValue({ data: null, error: queryError }) };
        }
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      await expect(fetchMobileCategoryProductCounts()).rejects.toBe(queryError);
    });

    it('AT-11: Consulta características vinculadas e preserva Peso obrigatório', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'category_attributes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { attribute_id: 'a1', is_required: false, attributes: { id: 'a1', name: 'Cor' } },
                  { attribute_id: 'a2', is_required: false, attributes: [{ id: 'a2', name: 'Tamanho' }] },
                  { attribute_id: 'a3', is_required: true, attributes: { id: 'a3', name: 'Material' } },
                  { attribute_id: 'a4', is_required: true, attributes: { id: 'a4', name: 'Peso' } },
                  { attribute_id: 'a5', is_required: false, attributes: { id: 'a5', name: 'Linha' } },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const attrs = await fetchMobileCategoryAttributes('c1');
      expect(attrs).toEqual([
        { id: 'a1', name: 'Cor', isRequired: true },
        { id: 'a2', name: 'Tamanho', isRequired: false },
        { id: 'a3', name: 'Material', isRequired: true },
        { id: 'a4', name: 'Peso', isRequired: true },
        { id: 'a5', name: 'Linha', isRequired: true },
      ]);
    });

    it('bloqueia a edição quando não consegue consultar a configuração da categoria', async () => {
      const queryError = new Error('Falha ao consultar category_attributes');
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'category_attributes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: queryError }),
            }),
          };
        }
        return {};
      });

      await expect(fetchMobileCategoryAttributes('c1')).rejects.toBe(queryError);
    });
  });

});
