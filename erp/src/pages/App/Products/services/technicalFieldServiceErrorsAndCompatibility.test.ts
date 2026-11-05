import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyApplicationLinksQuery } from './technicalFieldServiceTestQueries';

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
