import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  ecommerceSupabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

import { fetchVariations, saveVariation, subscribeToVariations } from '../variationService';

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
