import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  ecommerceSupabase: {
    from: fromMock,
  },
}));

import { fetchVariations, subscribeToVariations } from '../variationService';

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
  });

  it('preserva a lista quando category_attributes ainda não está disponível', async () => {
    const categoryTableError = {
      code: 'PGRST205',
      message: "Could not find the table 'public.category_attributes'",
    };

    fromMock.mockImplementation((table: string) => {
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
        isCustom: false,
        options: [
          { id: 'value-1', value: 'Azul 2', sortOrder: undefined },
          { id: 'value-2', value: 'Azul 10', sortOrder: undefined },
        ],
        categoryAttributes: [],
        isGloballyRequired: false,
        deleted: false,
      },
    ]);
    expect(warningSpy).toHaveBeenCalledWith(
      'Aviso ao buscar vínculos de categorias dos atributos:',
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
