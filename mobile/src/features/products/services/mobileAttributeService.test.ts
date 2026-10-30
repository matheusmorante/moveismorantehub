import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import {
  addMobileAttributeValue,
  deleteMobileAttribute,
  deleteMobileAttributeValue,
  fetchMobileAttributes,
  saveMobileAttributeDefinition,
} from './mobileAttributeService';

describe('mobile attribute service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAttributeReads = (
    attributeResults: Array<{ data: unknown[] | null; error: unknown }> = [{
      data: [
        {
          id: 'attribute-id',
          name: 'Cor',
          active: true,
          data_type: 'radio',
          unit: null,
          is_custom: true,
          decimal_places: null,
          is_globally_required: false,
          configuration: {},
        },
      ],
      error: null,
    }],
    dataType?: 'radio' | 'multi_select',
    optionRows = [
      { id: '11111111-1111-4111-8111-111111111111', attribute_id: 'attribute-id', value: 'Azul', sort_order: 0, active: true },
      { id: '22222222-2222-4222-8222-222222222222', attribute_id: 'attribute-id', value: 'Preto', sort_order: 1, active: true },
    ],
  ) => {
    const results = dataType ? attributeResults.map((result, index) => index === 0 && result.data
      ? { ...result, data: result.data.map((row: any) => ({ ...row, data_type: dataType })) }
      : result) : attributeResults;
    let attributeQueryIndex = 0;
    const createQuery = (result: { data: unknown[] | null; error: unknown }) => {
      const query: any = {};
      query.select = vi.fn(() => query);
      query.order = vi.fn(() => query);
      query.range = vi.fn().mockResolvedValue(result);
      return query;
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') {
        const result = results[Math.min(attributeQueryIndex++, results.length - 1)];
        return createQuery(result);
      }
      if (table === 'attribute_values') return createQuery({
        data: optionRows,
        error: null,
      });
      return createQuery({ data: [], error: null });
    });
  };

  it('creates a choice characteristic through the same transactional ERP RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'attribute-id', error: null });

    const id = await saveMobileAttributeDefinition({
      name: ' Cor ',
      dataType: 'list',
      unit: '',
      active: true,
      isCustom: true,
      options: [
        { id: '', value: 'Azul' },
        { id: '', value: 'Preto' },
      ],
    });

    expect(id).toBe('attribute-id');
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'save_product_characteristic_definition',
      expect.objectContaining({
        p_definition: expect.objectContaining({
          name: 'Cor',
          active: true,
          dataType: 'radio',
          isCustom: true,
          options: [
            { value: 'Azul', sortOrder: 0 },
            { value: 'Preto', sortOrder: 1 },
          ],
        }),
      })
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('propagates transaction failure without splitting the definition across table writes', async () => {
    const error = new Error('rollback');
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(
      saveMobileAttributeDefinition({
        name: 'Cor',
        dataType: 'radio',
        active: true,
        isCustom: true,
        options: [{ id: '', value: 'Azul' }],
      })
    ).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('saves fill configuration with the same v2 RPC used by the ERP', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'attribute-id', error: null });

    await saveMobileAttributeDefinition({
      name: 'Largura',
      dataType: 'decimal',
      unit: 'cm',
      decimalPlaces: 2,
      active: true,
      isCustom: true,
      options: [],
      configuration: { minValue: 10, maxValue: 42.5, dependencyLogic: 'any' } as any,
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'save_product_characteristic_definition_v2',
      expect.objectContaining({
        p_definition: expect.objectContaining({
          configuration: { minValue: 10, maxValue: 42.5 },
        }),
      })
    );
  });

  it('loads supported fill configuration and falls back only when the configuration column is absent', async () => {
    mockAttributeReads([{
      data: [
        {
          id: 'attribute-id', name: 'Largura', active: true, data_type: 'decimal', unit: 'cm',
          is_custom: true, decimal_places: 2, is_globally_required: false,
          configuration: { minValue: 10, maxValue: 42.5, dependencyLogic: 'any' },
        },
      ],
      error: null,
    }]);

    await expect(fetchMobileAttributes()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'attribute-id',
        configuration: { minValue: 10, maxValue: 42.5 },
      }),
    ]));

    mockAttributeReads([
      { data: null, error: { code: '42703', message: 'column attributes.configuration does not exist' } },
      {
        data: [{
          id: 'attribute-id', name: 'Cor', active: true, data_type: 'radio', unit: null,
          is_custom: true, decimal_places: null, is_globally_required: false,
        }],
        error: null,
      },
    ]);
    await expect(fetchMobileAttributes()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'attribute-id', configuration: undefined }),
    ]));
  });

  it('saves edited option order and values in one ERP transaction', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'attribute-id', error: null });

    await saveMobileAttributeDefinition({
      id: 'attribute-id',
      name: 'Cor',
      dataType: 'radio',
      active: true,
      isCustom: true,
      options: [
        { id: 'option-2', value: 'Preto' },
        { id: 'option-1', value: 'Azul' },
      ],
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'save_product_characteristic_definition',
      expect.objectContaining({
        p_definition: expect.objectContaining({
          id: 'attribute-id',
          options: [
            { id: 'option-2', value: 'Preto', sortOrder: 0 },
            { id: 'option-1', value: 'Azul', sortOrder: 1 },
          ],
        }),
      })
    );
  });

  it('uses the ERP soft delete behavior for characteristics already in use', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'deactivated', error: null });

    await expect(deleteMobileAttribute('attribute-id')).resolves.toBe('deactivated');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_product_characteristic', {
      p_attribute_id: 'attribute-id',
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it.each(['radio', 'multi_select'] as const)(
    'adds an option to a %s characteristic through the independent options RPC', async (dataType) => {
      mockAttributeReads(undefined, dataType);
      supabaseMock.rpc.mockResolvedValue({
        data: [
          { id: '11111111-1111-4111-8111-111111111111', value: 'Azul', active: true, sortOrder: 0 },
          { id: '22222222-2222-4222-8222-222222222222', value: 'Preto', active: true, sortOrder: 1 },
          { id: '33333333-3333-4333-8333-333333333333', value: 'Verde', active: true, sortOrder: 2 },
        ],
        error: null,
      });

      await addMobileAttributeValue('attribute-id', '  Verde  ');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('save_characteristic_options', {
        p_attribute_id: 'attribute-id',
        p_options: [
          { id: '11111111-1111-4111-8111-111111111111', value: 'Azul', active: true, sortOrder: 0 },
          { id: '22222222-2222-4222-8222-222222222222', value: 'Preto', active: true, sortOrder: 1 },
          { value: 'Verde', active: true, sortOrder: 2 },
        ],
      });
    }
  );

  it('blocks adding an option that already exists with different capitalization', async () => {
    mockAttributeReads();

    await expect(addMobileAttributeValue('attribute-id', 'azul')).rejects.toThrow(
      'As opções não podem ter nomes duplicados.'
    );
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('blocks duplicate capitalization when saving a complete definition', async () => {
    await expect(saveMobileAttributeDefinition({
      name: 'Cor',
      dataType: 'radio',
      active: true,
      isCustom: true,
      options: [
        { id: '', value: 'Avela PF/Mocca UV' },
        { id: '', value: 'avela pf/mocca uv' },
      ],
    })).rejects.toThrow('As opções não podem ter nomes duplicados.');

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('removes an option using the same RPC while preserving the other choices', async () => {
    mockAttributeReads();
    supabaseMock.rpc.mockResolvedValue({
      data: [{ id: '22222222-2222-4222-8222-222222222222', value: 'Preto', active: true, sortOrder: 0 }],
      error: null,
    });

    await deleteMobileAttributeValue('11111111-1111-4111-8111-111111111111');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_characteristic_options', {
      p_attribute_id: 'attribute-id',
      p_options: [
        { id: '22222222-2222-4222-8222-222222222222', value: 'Preto', active: true, sortOrder: 0 },
      ],
    });
  });

  it('preserves inactive options when another value is added', async () => {
    const optionRows = [
      { id: '11111111-1111-4111-8111-111111111111', attribute_id: 'attribute-id', value: 'Azul', sort_order: 0, active: false },
      { id: '22222222-2222-4222-8222-222222222222', attribute_id: 'attribute-id', value: 'Preto', sort_order: 1, active: true },
    ];
    mockAttributeReads(undefined, 'radio', optionRows);
    supabaseMock.rpc.mockResolvedValue({
      data: [
        { id: '11111111-1111-4111-8111-111111111111', value: 'Azul', active: false, sortOrder: 0 },
        { id: '22222222-2222-4222-8222-222222222222', value: 'Preto', active: true, sortOrder: 1 },
        { id: '33333333-3333-4333-8333-333333333333', value: 'Verde', active: true, sortOrder: 2 },
      ],
      error: null,
    });

    await addMobileAttributeValue('attribute-id', 'Verde');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_characteristic_options', {
      p_attribute_id: 'attribute-id',
      p_options: [
        { id: '11111111-1111-4111-8111-111111111111', value: 'Azul', active: false, sortOrder: 0 },
        { id: '22222222-2222-4222-8222-222222222222', value: 'Preto', active: true, sortOrder: 1 },
        { value: 'Verde', active: true, sortOrder: 2 },
      ],
    });
  });
});
