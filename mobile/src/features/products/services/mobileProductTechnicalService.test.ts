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
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'opt-firme', attribute_id: 'attr-1', value: 'Firme', sort_order: null },
          { id: 'opt-macio', attribute_id: 'attr-1', value: 'Macio', sort_order: null },
          { id: 'opt-medio', attribute_id: 'attr-1', value: 'Médio', sort_order: null },
        ],
        error: null,
      }),
    };

    const categoryLinksQuery = {
      select: vi.fn().mockResolvedValue({
        data: [{ attribute_id: 'attr-1', category_id: 'cat-sofas' }],
        error: null,
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
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'opt-2', attribute_id: 'attr-cor', value: 'Branco', sort_order: 2 },
          { id: 'opt-1', attribute_id: 'attr-cor', value: 'Azul', sort_order: 1 },
          { id: 'opt-0', attribute_id: 'attr-cor', value: 'Preto', sort_order: 0 },
        ],
        error: null,
      }),
    };

    const categoryLinksQuery = {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
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
});
