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
  saveMobileAttributeDefinition,
} from './mobileAttributeService';

describe('mobile attribute service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAttributeReads = () => {
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
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
          },
        ],
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'option-1', attribute_id: 'attribute-id', value: 'Azul', sort_order: 0 },
          { id: 'option-2', attribute_id: 'attribute-id', value: 'Preto', sort_order: 1 },
        ],
        error: null,
      }),
    };
    const categoriesQuery = {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      return categoriesQuery;
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

  it('adds an option by saving the full ordered definition in one transaction', async () => {
    mockAttributeReads();
    supabaseMock.rpc.mockResolvedValue({ data: 'attribute-id', error: null });

    await addMobileAttributeValue('attribute-id', '  Verde  ');

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'save_product_characteristic_definition',
      expect.objectContaining({
        p_definition: expect.objectContaining({
          id: 'attribute-id',
          options: [
            { id: 'option-1', value: 'Azul', sortOrder: 0 },
            { id: 'option-2', value: 'Preto', sortOrder: 1 },
            { value: 'Verde', sortOrder: 2 },
          ],
        }),
      })
    );
  });

  it('removes an option through the ERP transaction and preserves category links', async () => {
    mockAttributeReads();
    supabaseMock.rpc.mockResolvedValue({ data: 'attribute-id', error: null });

    await deleteMobileAttributeValue('option-1');

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'save_product_characteristic_definition',
      expect.objectContaining({
        p_definition: expect.objectContaining({
          id: 'attribute-id',
          options: [{ id: 'option-2', value: 'Preto', sortOrder: 0 }],
          categoryAttributes: [],
        }),
      })
    );
  });
});
