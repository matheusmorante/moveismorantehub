import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
}));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductTechnicalFields } from './mobileProductTechnicalService';

describe('mobileProductTechnicalService', () => {
  beforeEach(() => {
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

    const fields = await fetchMobileProductTechnicalFields();

    expect(fields.map(({ name }) => name)).toEqual([
      'Reclinável manual',
      'Modelo/Linha',
    ]);
    expect(fields.find(({ name }) => name === 'Modelo/Linha')?.id).toBe('attr-5');
  });

  it('filtra características reclinável e ordena opções de firmeza por macio, médio, firme', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'attr-1',
            name: 'Nível de firmeza do estofamento',
            active: true,
            data_type: 'list',
            unit: null,
            is_custom: false,
            decimal_places: null,
          },
          {
            id: 'attr-2',
            name: 'Reclinável',
            active: true,
            data_type: 'boolean',
            unit: null,
            is_custom: false,
            decimal_places: null,
          },
          {
            id: 'attr-3',
            name: 'reclinavel',
            active: true,
            data_type: 'boolean',
            unit: null,
            is_custom: false,
            decimal_places: null,
          },
        ],
        error: null,
      }),
    };

    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'opt-firme', attribute_id: 'attr-1', value: 'Firme', sort_order: null },
            { id: 'opt-macio', attribute_id: 'attr-1', value: 'Macio', sort_order: null },
            { id: 'opt-medio', attribute_id: 'attr-1', value: 'Médio', sort_order: null },
          ],
          error: null,
        }),
      }),
    };

    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [{ attribute_id: 'attr-1', category_id: 'cat-sofas', is_required: true }],
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

    const fields = await fetchMobileProductTechnicalFields();

    // Reclinável deve ser completamente removido
    expect(fields.map((f) => f.name)).toEqual(['Nível de firmeza do estofamento']);
    expect(fields[0]).toMatchObject({
      isRequired: false,
      isRequiredForProduct: false,
      requiredCategoryIds: ['cat-sofas'],
    });

    // Nível de firmeza deve ser ordenado por macio, médio, firme
    expect(fields[0].options.map((o) => o.value)).toEqual(['Macio', 'Médio', 'Firme']);
  });

  it('respeita sort_order explícito das opções quando configurado', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'attr-cor',
            name: 'Cor',
            active: true,
            data_type: 'list',
            unit: null,
            is_custom: true,
            decimal_places: null,
          },
        ],
        error: null,
      }),
    };

    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'opt-2', attribute_id: 'attr-cor', value: 'Branco', sort_order: 2 },
            { id: 'opt-1', attribute_id: 'attr-cor', value: 'Azul', sort_order: 1 },
            { id: 'opt-0', attribute_id: 'attr-cor', value: 'Preto', sort_order: 0 },
          ],
          error: null,
        }),
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

    const fields = await fetchMobileProductTechnicalFields();

    expect(fields[0].options.map((o) => o.value)).toEqual(['Preto', 'Azul', 'Branco']);
  });

  it('falha ao verificar requisitos do catálogo quando a consulta de vínculos de categoria falha', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'offline',
    });
  });

  it('propaga falha ao carregar o cadastro global de atributos usado nos requisitos', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'attributes offline' } }),
    };
    supabaseMock.from.mockReturnValue(attributesQuery);

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attributes offline',
    });
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

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attribute values offline',
    });
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

    const fields = await fetchMobileProductTechnicalFields({ requireCategoryLinks: true });

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

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attributes fallback offline',
    });
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

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attribute values fallback offline',
    });
  });
});
