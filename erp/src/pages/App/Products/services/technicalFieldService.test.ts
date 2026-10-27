import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ ecommerceSupabase: supabaseMock }));

import {
  fetchTechnicalFieldDefinitions,
  invalidateTechnicalFieldDefinitionsCache,
} from './technicalFieldService';

describe('technicalFieldService no fluxo de publicação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateTechnicalFieldDefinitionsCache();
  });

  afterEach(() => {
    invalidateTechnicalFieldDefinitionsCache();
    vi.clearAllMocks();
  });

  it('exclui Linha e Modelo isolados, preservando o atributo combinado e nomes mais longos', async () => {
    const attributeNames = [
      'Reclinável',
      'reclinavel',
      'Reclinável manual',
      'Linha',
      'Modelo',
      'Modelo/Linha',
      'Linha/Modelo',
    ];
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: attributeNames.map((name, index) => ({
            id: `attr-${index}`,
            name,
            active: true,
            data_type: 'text',
            unit: null,
        })),
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', { forceRefresh: true });

    expect(fields.map(({ name }) => name)).toEqual([
      'Reclinável manual',
      'Modelo/Linha',
    ]);
    expect(fields.find(({ name }) => name === 'Modelo/Linha')?.id).toBe('attr-5');
  });

  it('projeta dimensões legadas como medidas numéricas com unidade cm', async () => {
    const names = ['Altura', 'Largura', 'Profundidade aberto', 'Espessura do colchão'];
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: names.map((name, index) => ({
          id: `measure-${index}`,
          name,
          active: true,
          data_type: 'list',
          unit: null,
          is_custom: false,
          decimal_places: null,
        })),
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', { forceRefresh: true });

    expect(fields).toMatchObject(
      names.map((name) => ({ name, dataType: 'measure', unit: 'cm' }))
    );
  });

  it('does not reuse an unverified category-link cache for catalog publication', async () => {
    let categoryQueryCount = 0;
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'finish', name: 'Acabamento', active: true, data_type: 'text', unit: null }],
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(async () => {
          categoryQueryCount += 1;
          return categoryQueryCount === 1
            ? { data: null, error: { message: 'offline' } }
            : {
                data: [{ attribute_id: 'finish', category_id: 'cat-1', is_required: true }],
                error: null,
              };
        }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await fetchTechnicalFieldDefinitions('product-form');
    const verified = await fetchTechnicalFieldDefinitions('product-form', {
      requireCategoryLinks: true,
    });

    expect(categoryQueryCount).toBe(2);
    expect(verified[0].requiredCategoryIds).toEqual(['cat-1']);
  });

  it('propaga falha ao carregar o cadastro global de atributos', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'attributes offline' } }),
    };
    supabaseMock.from.mockReturnValue(attributesQuery);

    await expect(
      fetchTechnicalFieldDefinitions('product-form', {
        forceRefresh: true,
        requireCategoryLinks: true,
      })
    ).rejects.toMatchObject({ message: 'attributes offline' });
    expect(supabaseMock.from).toHaveBeenCalledOnce();
    expect(supabaseMock.from).toHaveBeenCalledWith('attributes');
  });

  it('propaga falha ao carregar opções de atributos em vez de validar requisitos incompletos', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'attr-color', name: 'Cor', active: true, data_type: 'list', unit: null }],
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'attribute values offline' } }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(
      fetchTechnicalFieldDefinitions('product-form', {
        forceRefresh: true,
        requireCategoryLinks: true,
      })
    ).rejects.toMatchObject({ message: 'attribute values offline' });
  });

  it('usa fallbacks de colunas opcionais e conserva opções e vínculos obrigatórios', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'decimal_places' } })
        .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'is_custom' } })
        .mockResolvedValueOnce({
          data: [{ id: 'attr-color', name: 'Cor', active: true, data_type: 'list', unit: null }],
          error: null,
        }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi
          .fn()
          .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'sort_order' } })
          .mockResolvedValueOnce({
            data: [
              { id: 'opt-preto', attribute_id: 'attr-color', value: 'Preto' },
              { id: 'opt-azul', attribute_id: 'attr-color', value: 'Azul' },
            ],
            error: null,
          }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [{ attribute_id: 'attr-color', category_id: 'category-1', is_required: true }],
          error: null,
        }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', {
      forceRefresh: true,
      requireCategoryLinks: true,
    });

    expect(attributesQuery.select.mock.calls).toEqual([
      ['id, name, active, data_type, unit, is_custom, decimal_places'],
      ['id, name, active, data_type, unit, is_custom'],
      ['id, name, active, data_type, unit'],
    ]);
    expect(valuesQuery.select.mock.calls).toEqual([
      ['id, attribute_id, value, sort_order'],
      ['id, attribute_id, value'],
    ]);
    expect(fields[0]).toMatchObject({
      name: 'Cor',
      isCustom: false,
      requiredCategoryIds: ['category-1'],
      options: [{ value: 'Azul' }, { value: 'Preto' }],
    });
  });

  it('propaga erro se a consulta alternativa de atributos também falhar', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'decimal_places' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'attributes fallback offline' } }),
    };
    supabaseMock.from.mockReturnValue(attributesQuery);

    await expect(
      fetchTechnicalFieldDefinitions('product-form', {
        forceRefresh: true,
        requireCategoryLinks: true,
      })
    ).rejects.toMatchObject({ message: 'attributes fallback offline' });
  });

  it('propaga erro se a consulta alternativa de opções também falhar', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi
          .fn()
          .mockResolvedValueOnce({ data: null, error: { code: '42703', message: 'sort_order' } })
          .mockResolvedValueOnce({ data: null, error: { message: 'attribute values fallback offline' } }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(
      fetchTechnicalFieldDefinitions('product-form', {
        forceRefresh: true,
        requireCategoryLinks: true,
      })
    ).rejects.toMatchObject({ message: 'attribute values fallback offline' });
  });
});
