import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fromMock,
  rpcMock,
  invalidateTechnicalFieldDefinitionsCacheMock,
  saveAttributeValueWithClientMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  invalidateTechnicalFieldDefinitionsCacheMock: vi.fn(),
  saveAttributeValueWithClientMock: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  ecommerceSupabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock('@/pages/App/Products/services/technicalFieldService', () => ({
  invalidateTechnicalFieldDefinitionsCache: invalidateTechnicalFieldDefinitionsCacheMock,
}));
vi.mock('../../../../../shared-utils/productAttributeValueService', () => ({
  saveAttributeValueWithClient: saveAttributeValueWithClientMock,
}));

import {
  fetchVariations,
  saveAttributeValue,
  saveCharacteristicOptions,
  saveVariation,
  subscribeToVariations,
} from '../variationService';

const pagedQuery = (result: (from: number, to: number) => unknown) => {
  const chain: any = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn((from: number, to: number) => Promise.resolve(result(from, to))),
  };
  return chain;
};

describe('subscribeToVariations', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
    invalidateTechnicalFieldDefinitionsCacheMock.mockReset();
    saveAttributeValueWithClientMock.mockReset();
  });

  it('salva condições alternativas pela operação atômica de características', async () => {
    rpcMock.mockResolvedValue({ data: 'attr-1', error: null });
    const dependency = { referenceAttributeId: 'doors', operator: 'greater_than' as const, value: '0' };
    const alternative = { referenceAttributeId: 'drawers', operator: 'greater_than' as const, value: '0' };
    await saveVariation({ id: 'attr-1', name: 'Puxador', active: true, options: [],
      dependency, dependencyAlternatives: [alternative] }, { invalidate: false });
    expect(rpcMock).toHaveBeenCalledWith('save_product_characteristic_definition_v3', {
      p_definition: expect.objectContaining({ dependency, dependencyAlternatives: [alternative] }),
    });
  });

  it('preserva literalmente opções existentes ao adicionar uma opção nova', async () => {
    rpcMock.mockResolvedValue({ data: 'attribute-color', error: null });
    const existingOptionId = '11111111-1111-4111-8111-111111111111';

    await saveVariation({
      id: 'attribute-color',
      name: 'Cor',
      active: true,
      options: [
        { id: existingOptionId, value: 'Avela PF/Mocca UV', active: true },
        { id: 'new-option-test', value: 'cedar/cinza soft', active: true },
      ],
    }, { invalidate: false });

    expect(rpcMock).toHaveBeenCalledWith('save_product_characteristic_definition', {
      p_definition: expect.objectContaining({
        options: [
          expect.objectContaining({ id: existingOptionId, value: 'Avela PF/Mocca UV' }),
          expect.objectContaining({ id: 'new-option-test', value: 'Cedar/Cinza Soft' }),
        ],
      }),
    });
  });

  it('salva opções pela RPC independente e invalida a lista usada nos formulários de produto', async () => {
    const persistedOptionId = '11111111-1111-4111-8111-111111111111';
    const newOptionId = '22222222-2222-4222-8222-222222222222';
    rpcMock.mockResolvedValue({
      data: [
        { id: persistedOptionId, value: 'Avela PF/Mocca UV', active: true, sortOrder: 0 },
        { id: newOptionId, value: 'Cedar/Cinza Soft', active: true, sortOrder: 1 },
      ],
      error: null,
    });

    const saved = await saveCharacteristicOptions('attribute-color', [
      { id: persistedOptionId, value: 'Avela PF/Mocca UV', active: true },
      { id: 'new-option-test', value: 'cedar/cinza soft', active: true },
    ]);

    expect(rpcMock).toHaveBeenCalledWith('save_characteristic_options', {
      p_attribute_id: 'attribute-color',
      p_options: [
        { id: persistedOptionId, value: 'Avela PF/Mocca UV', active: true, sortOrder: 0 },
        { id: 'new-option-test', value: 'Cedar/Cinza Soft', active: true, sortOrder: 1 },
      ],
    });
    expect(saved.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: persistedOptionId, value: 'Avela PF/Mocca UV' },
      { id: newOptionId, value: 'Cedar/Cinza Soft' },
    ]);
    expect(invalidateTechnicalFieldDefinitionsCacheMock).toHaveBeenCalledOnce();
  });

  it('rejeita opções duplicadas sem diferenciar maiúsculas e minúsculas antes da RPC', async () => {
    await expect(saveCharacteristicOptions('attribute-color', [
      { id: '11111111-1111-4111-8111-111111111111', value: 'Avela PF/Mocca UV', active: true },
      { id: 'new-option-test', value: 'avela pf/mocca uv', active: true },
    ])).rejects.toThrow('As opções não podem ter nomes duplicados.');

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejeita opções duplicadas ao salvar uma definição completa', async () => {
    await expect(saveVariation({
      id: 'attribute-color',
      name: 'Cor',
      active: true,
      options: [
        { id: '11111111-1111-4111-8111-111111111111', value: 'Avela PF/Mocca UV', active: true },
        { id: 'new-option-test', value: 'avela pf/mocca uv', active: true },
      ],
    }, { invalidate: false })).rejects.toThrow('As opções não podem ter nomes duplicados.');

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('não confirma o salvamento se o banco devolver uma lista sem a opção nova', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        id: '11111111-1111-4111-8111-111111111111',
        value: 'Azul',
        active: true,
        sortOrder: 0,
      }],
      error: null,
    });

    await expect(saveCharacteristicOptions('attribute-color', [
      { id: '11111111-1111-4111-8111-111111111111', value: 'Azul', active: true },
      { id: 'new-option-test', value: 'Verde', active: true },
    ])).rejects.toThrow('O banco não confirmou todas as opções.');
    expect(invalidateTechnicalFieldDefinitionsCacheMock).not.toHaveBeenCalled();
  });

  it('invalida as características em cache ao cadastrar uma opção de cor no formulário', async () => {
    const saved = {
      id: 'color-red',
      attribute_id: 'attribute-color',
      value: 'Cedar/Cinza Soft',
    };
    saveAttributeValueWithClientMock.mockResolvedValue(saved);

    await expect(saveAttributeValue('attribute-color', 'Cedar/Cinza Soft')).resolves.toEqual(saved);

    expect(saveAttributeValueWithClientMock).toHaveBeenCalledWith(
      expect.anything(),
      'attribute-color',
      'Cedar/Cinza Soft',
    );
    expect(invalidateTechnicalFieldDefinitionsCacheMock).toHaveBeenCalledOnce();
  });

  it('preserva a lista quando category_attributes ainda não está disponível', async () => {
    const categoryTableError = {
      code: 'PGRST205',
      message: "Could not find the table 'public.category_attributes'",
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'attribute_dependency_alternatives') return pagedQuery(() => ({ data: [], error: null }));
      if (table === 'attributes') {
        return pagedQuery((from) => ({
          data: from === 0 ? [{ id: 'attr-1', name: 'Cor', active: true }] : [],
          error: null,
        }));
      }

      if (table === 'attribute_values') {
        return pagedQuery((from) => ({
          data:
            from === 0
              ? [
                  { id: 'value-2', attribute_id: 'attr-1', value: 'Azul 10' },
                  { id: 'value-1', attribute_id: 'attr-1', value: 'Azul 2' },
                ]
              : [],
          error: null,
        }));
      }

      if (table === 'category_attributes') {
        return pagedQuery(() => ({ data: null, error: categoryTableError }));
      }
      if (table === 'attribute_category_applications') {
        return pagedQuery((from) => ({
          data: from === 0
            ? [
                { attribute_id: 'attr-1', category_id: 'cat-pending', application: 'optional', is_configured: false },
                { attribute_id: 'attr-1', category_id: 'cat-2', application: 'required', is_configured: true },
              ]
            : [],
          error: null,
        }));
      }

      throw new Error(`Tabela inesperada no teste: ${table}`);
    });

    const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const variations = await new Promise<
      Parameters<typeof subscribeToVariations>[0] extends (data: infer T) => void ? T : never
    >((resolve) => {
      subscribeToVariations(resolve);
    });

    expect(variations).toEqual([
      {
        id: 'attr-1',
        name: 'Cor',
        active: true,
        dataType: 'radio',
        unit: '',
        decimalPlaces: undefined,
        groupId: undefined,
        configuration: {},
        dependency: null,
        dependencyAlternatives: [],
        isCustom: false,
        options: [
          { id: 'value-1', value: 'Azul 2', sortOrder: undefined, active: true },
          { id: 'value-2', value: 'Azul 10', sortOrder: undefined, active: true },
        ],
        categoryAttributes: [],
        categoryApplications: [
          { categoryId: 'cat-pending', application: 'optional' },
          { categoryId: 'cat-2', application: 'required' },
        ],
        isGloballyRequired: false,
        deleted: false,
      },
    ]);
    expect(warningSpy).toHaveBeenCalledWith(
      'Aviso ao buscar vínculos de categorias das características:',
      categoryTableError
    );
  });

  it('carrega valores de atributos além do limite de 1.000 linhas da API', async () => {
    const values = Array.from({ length: 1000 }, (_, index) => ({
      id: `value-${String(index).padStart(4, '0')}`,
      attribute_id: 'attr-1',
      value: `Opção ${index}`,
    }));
    const requestedRanges: number[][] = [];

    fromMock.mockImplementation((table: string) => {
      if (table === 'attribute_dependency_alternatives') return pagedQuery(() => ({ data: [], error: null }));
      if (table === 'attributes') {
        return pagedQuery((from) => ({
          data: from === 0 ? [{ id: 'attr-1', name: 'Cor', active: true }] : [],
          error: null,
        }));
      }
      if (table === 'attribute_values') {
        return pagedQuery((from, to) => {
          requestedRanges.push([from, to]);
          return {
            data:
              from === 0
                ? values
                : [{ id: 'value-after-cap', attribute_id: 'attr-1', value: 'Opção final' }],
            error: null,
          };
        });
      }
      if (table === 'category_attributes') {
        return pagedQuery(() => ({ data: [], error: null }));
      }
      if (table === 'attribute_category_applications') {
        return pagedQuery(() => ({ data: [], error: null }));
      }
      throw new Error(`Tabela inesperada no teste: ${table}`);
    });

    const variations = await fetchVariations({ throwOnError: true });

    expect(variations[0].options).toHaveLength(1001);
    expect(variations[0].options.some((option) => option.id === 'value-after-cap')).toBe(true);
    expect(requestedRanges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});
