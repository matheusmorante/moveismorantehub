import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
}));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductTechnicalFields } from './mobileProductTechnicalService';

const missingCategoryApplicationsQuery = () => ({
  select: () => ({
    limit: async () => ({
      data: null,
      error: {
        code: 'PGRST205',
        message: 'Could not find table attribute_category_applications',
      },
    }),
  }),
});

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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchMobileProductTechnicalFields();

    expect(fields.map(({ name }) => name)).toEqual([
      'Reclinável manual',
      'Modelo/Linha',
    ]);
    expect(fields.find(({ name }) => name === 'Modelo/Linha')?.id).toBe('attr-5');
  });

  it('carrega dependências configuradas e alternativas usando o contrato do ERP', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'doors', name: 'Quantidade de portas', active: true, data_type: 'integer', unit: null },
          {
            id: 'finish', name: 'Acabamento das portas', active: true, data_type: 'text', unit: null,
            dependency_attribute_id: 'doors', dependency_operator: 'greater_than', dependency_value: '0',
          },
          { id: 'drawers', name: 'Quantidade de gavetas', active: true, data_type: 'integer', unit: null },
        ],
        error: null,
      }),
    };
    const queryWith = (data: unknown, error: unknown = null) => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error }),
      }),
    });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes') return queryWith([]);
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      if (table === 'attribute_dependency_alternatives') {
        return queryWith([
          { attribute_id: 'finish', reference_attribute_id: 'drawers', operator: 'greater_than', value: '0' },
        ]);
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchMobileProductTechnicalFields();
    const finish = fields.find(({ id }) => id === 'finish');

    expect(finish?.dependency).toEqual({
      referenceAttributeId: 'doors', operator: 'greater_than', value: '0',
    });
    expect(finish?.dependencyAlternatives).toEqual([
      { referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' },
    ]);
  });

  it('mapeia grupo persistido e ordenação compartilhada para a aba técnica', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'finish',
          name: 'Acabamento das portas',
          active: true,
          data_type: 'text',
          unit: null,
          group_id: 'group-doors',
          dependency_attribute_id: 'doors',
          dependency_operator: 'greater_than',
          dependency_value: '0',
        }],
        error: null,
      }),
    };
    const queryWith = (data: unknown, error: unknown = null) => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error }),
      }),
    });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes') return queryWith([]);
      if (table === 'attribute_category_applications') return queryWith([]);
      if (table === 'attribute_dependency_alternatives') {
        return queryWith([
          { attribute_id: 'finish', reference_attribute_id: 'drawers', operator: 'greater_than', value: '0' },
        ]);
      }
      if (table === 'attribute_groups') {
        return queryWith([
          { id: 'group-custom', name: 'Grupo Z' },
          { id: 'group-weight', name: 'Peso e capacidade' },
          { id: 'group-doors', name: 'Portas, gavetas e ferragens' },
        ]);
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const [field] = await fetchMobileProductTechnicalFields();

    expect(field).toMatchObject({
      groupId: 'group-doors',
      groupName: 'Portas, gavetas e ferragens',
      dependency: { referenceAttributeId: 'doors', operator: 'greater_than', value: '0' },
      dependencyAlternatives: [
        { referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' },
      ],
    });
  });

  it('propaga erro de permissão nas condições alternativas, sem tratar como tabela ausente', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'finish', name: 'Acabamento', active: true, data_type: 'text', unit: null,
          dependency_attribute_id: 'doors', dependency_operator: 'greater_than', dependency_value: '0',
        }],
        error: null,
      }),
    };
    const queryWith = (data: unknown, error: unknown = null) => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error }),
      }),
    });
    const accessError = { code: '42501', message: 'permission denied for table attribute_dependency_alternatives' };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes') return queryWith([]);
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      if (table === 'attribute_dependency_alternatives') return queryWith(null, accessError);
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchMobileProductTechnicalFields()).rejects.toMatchObject(accessError);
  });

  it('preserva a condição principal quando a relação de alternativas ainda não existe', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'finish', name: 'Acabamento', active: true, data_type: 'text', unit: null,
          dependency_attribute_id: 'doors', dependency_operator: 'greater_than', dependency_value: '0',
        }],
        error: null,
      }),
    };
    const queryWith = (data: unknown, error: unknown = null) => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error }),
      }),
    });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes') return queryWith([]);
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      if (table === 'attribute_dependency_alternatives') {
        return queryWith(null, {
          code: 'PGRST205',
          message: 'Could not find table attribute_dependency_alternatives',
        });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const [field] = await fetchMobileProductTechnicalFields();

    expect(field.dependency).toEqual({
      referenceAttributeId: 'doors', operator: 'greater_than', value: '0',
    });
    expect(field.dependencyAlternatives).toEqual([]);
  });

  it('mapeia aplicação de Produto e exigência de Catálogo como vínculos independentes do ERP', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'attr-finish', name: 'Acabamento', active: true, data_type: 'text', unit: null }],
        error: null,
      }),
    };
    const queryWith = (data: unknown) => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    });
    const valuesQuery = queryWith([]);
    const categoryLinksQuery = queryWith([
      { attribute_id: 'attr-finish', category_id: 'cat-unavailable', is_required: true },
    ]);
    const categoryApplicationsQuery = queryWith([
      { attribute_id: 'attr-finish', category_id: 'cat-optional', application: 'optional' },
      { attribute_id: 'attr-finish', category_id: 'cat-required', application: 'required' },
      { attribute_id: 'attr-finish', category_id: 'cat-unavailable', application: 'unavailable' },
    ]);
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return categoryApplicationsQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const [field] = await fetchMobileProductTechnicalFields({ requireCategoryLinks: true });

    expect(field).toMatchObject({
      categoryIds: ['cat-optional', 'cat-required'],
      categoryApplications: [
        { categoryId: 'cat-optional', application: 'optional' },
        { categoryId: 'cat-required', application: 'required' },
        { categoryId: 'cat-unavailable', application: 'unavailable' },
      ],
      requiredCategoryIds: ['cat-unavailable'],
    });
  });

  it('propaga falha de permissão da tabela de aplicações sem ativar fallback legado', async () => {
    const queryWith = (data: unknown, error: unknown = null) => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error }),
      }),
    });
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const accessError = {
      code: '42501',
      message: 'permission denied for table attribute_category_applications',
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values' || table === 'category_attributes') return queryWith([]);
      if (table === 'attribute_category_applications') return queryWith(null, accessError);
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchMobileProductTechnicalFields()).rejects.toMatchObject(accessError);
  });

  it('projeta capacidades de peso como medidas opcionais com unidade kg', async () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: ['Peso', 'Peso suportado', 'Peso suportado por prateleiras', 'Peso suportado por cadeiras'].map(
          (name, index) => ({
            id: `weight-${index}`,
            name,
            active: true,
            data_type: 'list',
            unit: null,
            is_custom: true,
            decimal_places: 3,
          })
        ),
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
        limit: vi.fn().mockResolvedValue({
          data: [0, 1, 2, 3].map((index) => ({
            attribute_id: `weight-${index}`,
            category_id: 'cat-weight',
            is_required: true,
          })),
          error: null,
        }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchMobileProductTechnicalFields();

    expect(fields).toMatchObject([
      { name: 'Peso', unit: 'kg', decimal_places: 1, requiredCategoryIds: [] },
      { name: 'Peso suportado', data_type: 'weight', unit: 'kg', decimal_places: 1, requiredCategoryIds: [] },
      { name: 'Peso suportado por prateleiras', data_type: 'weight', unit: 'kg', decimal_places: 1, requiredCategoryIds: [] },
      { name: 'Peso suportado por cadeiras', data_type: 'weight', unit: 'kg', decimal_places: 1, requiredCategoryIds: [] },
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
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchMobileProductTechnicalFields();

    expect(fields).toMatchObject(
      names.map((name) => ({ name, data_type: 'measure', unit: 'cm' }))
    );
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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    const fields = await fetchMobileProductTechnicalFields({ requireCategoryLinks: true });

    expect(attributesQuery.select.mock.calls).toEqual([
      ['id, name, active, data_type, unit, configuration, is_custom, decimal_places, group_id, dependency_attribute_id, dependency_operator, dependency_value'],
      ['id, name, active, data_type, unit, configuration, is_custom, group_id, dependency_attribute_id, dependency_operator, dependency_value'],
      ['id, name, active, data_type, unit, configuration, group_id, dependency_attribute_id, dependency_operator, dependency_value'],
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
      if (table === 'attribute_category_applications') return missingCategoryApplicationsQuery();
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(fetchMobileProductTechnicalFields({ requireCategoryLinks: true })).rejects.toMatchObject({
      message: 'attribute values fallback offline',
    });
  });
});
