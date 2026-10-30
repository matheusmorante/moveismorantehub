import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
}));
const createApplicationLinksQuery = (pages: Array<{ data: any[] | null; error: any }> = [
  { data: [], error: null },
]) => {
  const builder = {
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(async (start: number) =>
      pages[Math.floor(start / 1000)] ?? { data: [], error: null }
    ),
  };
  return { select: vi.fn().mockReturnValue(builder), builder };
};
const createEmptyApplicationLinksQuery = () => createApplicationLinksQuery();

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

  it('recarrega opções da característica depois que um salvamento invalida o cache', async () => {
    let storedOptions: Array<Record<string, unknown>> = [];
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'color', name: 'Cor', active: true, data_type: 'radio' }],
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(async () => ({ data: storedOptions, error: null })),
      }),
    };
    const emptyQuery = () => ({
      select: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return emptyQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const beforeSave = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: [] });
    expect(beforeSave[0].options).toEqual([]);

    storedOptions = [{ id: 'color-red', attribute_id: 'color', value: 'Cedar/Cinza Soft', active: true }];
    invalidateTechnicalFieldDefinitionsCache();
    const afterSave = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: [] });

    expect(afterSave[0].options).toEqual([
      { id: 'color-red', value: 'Cedar/Cinza Soft', sortOrder: undefined },
    ]);
    expect(attributesQuery.order).toHaveBeenCalledTimes(2);
  });

  it('carrega condições alternativas junto à condição principal', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'handle', name: 'Tipo(s) de puxador', active: true,
        data_type: 'multi_select', dependency_attribute_id: 'doors', dependency_operator: 'greater_than', dependency_value: '0' }], error: null }),
    };
    const emptyQuery = { select: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    const alternativesQuery = createApplicationLinksQuery([{ data: [{ attribute_id: 'handle',
      reference_attribute_id: 'drawers', operator: 'greater_than', value: '0' }], error: null }]);
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_dependency_alternatives') return alternativesQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      if (table === 'attribute_values' || table === 'category_attributes') return emptyQuery;
      throw new Error(`Unexpected table ${table}`);
    });
    const fields = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: [], forceRefresh: true });
    expect(supabaseMock.from).not.toHaveBeenCalledWith('attribute_category_applications');
    expect(fields[0]).toMatchObject({
      dependency: { referenceAttributeId: 'doors', operator: 'greater_than', value: '0' },
      dependencyAlternatives: [{ referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' }],
    });
  });

  it('exclui Linha e Modelo isolados e preserva Reclinável e o atributo combinado', async () => {
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
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: [], forceRefresh: true });

    expect(fields.map(({ name }) => name)).toEqual([
      'Reclinável',
      'reclinavel',
      'Reclinável manual',
      'Modelo/Linha',
    ]);
    expect(fields.find(({ name }) => name === 'Modelo/Linha')?.id).toBe('attr-5');
  });

  it('carrega aplicações padrão opcionais e aplicações explícitas por categoria', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'attr-explicit', name: 'Cor de acabamento', active: true, data_type: 'text' },
          { id: 'attr-pending', name: 'Puxadores', active: true, data_type: 'text' },
        ],
        error: null,
      }),
    };
    const emptyQuery = () => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const applicationLinksQuery = createApplicationLinksQuery([
      {
          data: [
            { attribute_id: 'attr-explicit', category_id: 'cat-1', application: 'optional' },
            { attribute_id: 'attr-explicit', category_id: 'cat-2', application: 'required' },
            { attribute_id: 'attr-pending', category_id: 'cat-1', application: 'optional' },
          ],
          error: null,
      },
    ]);
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes' || table === 'attribute_dependency_alternatives') return emptyQuery();
      if (table === 'attribute_category_applications') return applicationLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: ['cat-1', 'cat-2'], forceRefresh: true });

    expect(fields.find(({ id }) => id === 'attr-explicit')).toMatchObject({
      categoryIds: ['cat-1', 'cat-2'],
      requiredProductCategoryIds: ['cat-2'],
      unavailableCategoryIds: [],
      categoryApplications: [
        { categoryId: 'cat-1', application: 'optional' },
        { categoryId: 'cat-2', application: 'required' },
      ],
    });
    expect(fields.find(({ id }) => id === 'attr-pending')).toMatchObject({
      categoryIds: ['cat-1'],
      requiredProductCategoryIds: [],
      categoryApplications: [{ categoryId: 'cat-1', application: 'optional' }],
    });
  });

  it('filtra as aplicações pelas categorias selecionadas e mantém a paginação do Supabase', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'target', name: 'Material do tampo', active: true, data_type: 'text' }],
        error: null,
      }),
    };
    const emptyQuery = () => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const applications = createApplicationLinksQuery([
      {
        data: Array.from({ length: 1000 }, (_, index) => ({
          attribute_id: 'other',
          category_id: 'cat-selected',
          application: 'optional',
        })),
        error: null,
      },
      {
        data: [{ attribute_id: 'target', category_id: 'cat-selected', application: 'required' }],
        error: null,
      },
    ]);
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes' || table === 'attribute_dependency_alternatives') return emptyQuery();
      if (table === 'attribute_category_applications') return applications;
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: ['cat-selected'], forceRefresh: true });
    expect(applications.builder.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    expect(applications.builder.in).toHaveBeenCalledWith('category_id', ['cat-selected']);
    expect(fields[0].categoryApplications).toEqual([
      { categoryId: 'cat-selected', application: 'required' },
    ]);
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
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', { categoryIds: [], forceRefresh: true });

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
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    await fetchTechnicalFieldDefinitions('product-form', { categoryIds: ['cat-1'] });
    const verified = await fetchTechnicalFieldDefinitions('product-form', {
      categoryIds: ['cat-1'],
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
        categoryIds: [],
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
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(
      fetchTechnicalFieldDefinitions('product-form', {
        categoryIds: [],
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
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchTechnicalFieldDefinitions('product-form', {
      categoryIds: [],
      forceRefresh: true,
      requireCategoryLinks: true,
    });

    expect(attributesQuery.select.mock.calls).toEqual([
      ['id, name, active, data_type, unit, is_custom, decimal_places, group_id, configuration, dependency_attribute_id, dependency_operator, dependency_value'],
      ['id, name, active, data_type, unit, is_custom'],
      ['id, name, active, data_type, unit'],
    ]);
    expect(valuesQuery.select.mock.calls).toEqual([
      ['id, attribute_id, value, sort_order, active'],
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
        categoryIds: [],
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
      if (table === 'attribute_dependency_alternatives') return createEmptyApplicationLinksQuery();
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return createEmptyApplicationLinksQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(
      fetchTechnicalFieldDefinitions('product-form', {
        categoryIds: [],
        forceRefresh: true,
        requireCategoryLinks: true,
      })
    ).rejects.toMatchObject({ message: 'attribute values fallback offline' });
  });
});
