import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  triggerMetaCatalogSync: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock('./mobileProductMetaCatalogSyncService', () => ({
  triggerMobileProductMetaCatalogSync: mocks.triggerMetaCatalogSync,
}));

vi.mock('../../../../../shared-utils/productCategoryRequiredAttributes', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../../../../shared-utils/productCategoryRequiredAttributes')
  >();
  return {
    ...actual,
    fetchRequiredProductCategoryAttributes: vi.fn().mockResolvedValue([]),
  };
});

import {
  toggleMobileProductCatalog,
  toggleMobileProductActive,
} from './mobileProductMutationService';

let query: any;
const validProductActivationRow = (overrides: Record<string, unknown> = {}) => ({
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Produto ativo',
  description: 'Produto para ativação',
  code: 'PROD-01',
  sku: 'PROD-01',
  unit_price: 100,
  price: 100,
  category_id: 'category-1',
  supplier_id: 'supplier-1',
  product_kind: 'normal',
  item_type: 'product',
  is_draft: false,
  product_categories: [],
  product_variations: [
    {
      id: '123e4567-e89b-42d3-a456-426614174001',
      sku: 'PROD-01-01',
      active: false,
      price: 100,
      use_parent_price: true,
      combo_items: [],
    },
  ],
  ...overrides,
});

describe('toggleMobileProductCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      neq: vi.fn(() => query),
      update: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mocks.from.mockReturnValue(query);
  });

  it('bloqueia publicação de artefato de teste marcado em technical_specs', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'prod-test-1',
        code: 'SKU-1',
        name: 'Teste',
        technical_specs: { testArtifact: { is_test: true } },
      },
      error: null,
    });

    await expect(
      toggleMobileProductCatalog('prod-test-1', 'hidden')
    ).rejects.toThrow('Produtos identificados como teste não podem ser publicados no Catálogo Digital.');
    expect(query.select).toHaveBeenCalledWith(
      'id, code, sku, name, title, observations, technical_specs'
    );
  });

  it('permite ocultar produto mesmo sendo produto de teste', async () => {
    query.update.mockReturnValueOnce(query);
    query.eq.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: null });

    const status = await toggleMobileProductCatalog('prod-test-1', 'published');
    expect(status).toBe('hidden');
    expect(mocks.from).toHaveBeenCalledWith('products');
    expect(mocks.from).toHaveBeenCalledWith('product_variations');
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'hidden' }));
    expect(query.eq).toHaveBeenCalledWith('product_id', 'prod-test-1');
    expect(mocks.triggerMetaCatalogSync).toHaveBeenCalledWith('prod-test-1');
  });

  it('publica o produto pai quando publica uma variação', async () => {
    await expect(
      toggleMobileProductCatalog(
        '123e4567-e89b-42d3-a456-426614174000',
        'hidden',
        true,
        '123e4567-e89b-42d3-a456-426614174001'
      )
    ).resolves.toBe('published');

    expect(mocks.from).toHaveBeenCalledWith('product_variations');
    expect(mocks.from).toHaveBeenCalledWith('products');
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
    expect(query.eq).toHaveBeenCalledWith('id', '123e4567-e89b-42d3-a456-426614174001');
    expect(query.eq).toHaveBeenCalledWith('id', '123e4567-e89b-42d3-a456-426614174000');
  });

  it('oculta o produto pai quando a última variação publicada é ocultada', async () => {
    query.eq.mockImplementation((column: string, value: unknown) => {
      if (column === 'status' && value === 'published') {
        return Promise.resolve({ data: [], error: null });
      }
      return query;
    });

    await expect(
      toggleMobileProductCatalog(
        '123e4567-e89b-42d3-a456-426614174000',
        'published',
        true,
        '123e4567-e89b-42d3-a456-426614174001'
      )
    ).resolves.toBe('hidden');

    expect(query.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: 'hidden' }));
    expect(query.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: 'hidden' }));
  });

  it('propaga a negação de permissão e não inicia sincronização Meta', async () => {
    const denial = {
      code: '42501',
      message: 'Seu perfil não possui permissão para alterar o Catálogo Digital.',
    };
    query.eq.mockResolvedValueOnce({ error: denial });

    await expect(
      toggleMobileProductCatalog('123e4567-e89b-42d3-a456-426614174000', 'published')
    ).rejects.toMatchObject(denial);

    expect(mocks.triggerMetaCatalogSync).not.toHaveBeenCalled();
  });

  it('mantém o produto pai publicado se outra variação ainda estiver publicada', async () => {
    query.eq.mockImplementation((column: string, value: unknown) => {
      if (column === 'status' && value === 'published') {
        return Promise.resolve({ data: [{ id: 'sibling-variation' }], error: null });
      }
      return query;
    });

    await toggleMobileProductCatalog(
      '123e4567-e89b-42d3-a456-426614174000',
      'published',
      true,
      '123e4567-e89b-42d3-a456-426614174001'
    );

    expect(query.update).toHaveBeenCalledTimes(1);
  });
});

describe('toggleMobileProductActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      update: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({ data: validProductActivationRow(), error: null }),
    };
    mocks.from.mockReturnValue(query);
  });

  it('alterna o produto pai e todas as variações como no ERP', async () => {
    await expect(
      toggleMobileProductActive('123e4567-e89b-42d3-a456-426614174000', false)
    ).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith('products');
    expect(mocks.from).toHaveBeenCalledWith('product_variations');
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    expect(query.eq).toHaveBeenCalledWith('product_id', '123e4567-e89b-42d3-a456-426614174000');
    expect(mocks.triggerMetaCatalogSync).toHaveBeenCalledWith('123e4567-e89b-42d3-a456-426614174000');
  });

  it('recalcula a ativação do produto pai ao alternar uma variação', async () => {
    const writes: Array<{ table: string; values: Record<string, unknown> }> = [];
    mocks.from.mockImplementation((table: string) => {
      let updateValues: Record<string, unknown> | undefined;
      const builder: any = {
        select: vi.fn(() => builder),
        update: vi.fn((values: Record<string, unknown>) => {
          updateValues = values;
          return builder;
        }),
        eq: vi.fn((column: string) => {
          if (updateValues) {
            writes.push({ table, values: updateValues });
            return Promise.resolve({ error: null });
          }
          if (table === 'product_variations' && column === 'product_id') {
            return Promise.resolve({ data: [{ active: true }, { active: false }], error: null });
          }
          return builder;
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: validProductActivationRow(),
          error: null,
        }),
      };
      return builder;
    });

    await expect(
      toggleMobileProductActive(
        '123e4567-e89b-42d3-a456-426614174000',
        false,
        true,
        '123e4567-e89b-42d3-a456-426614174001'
      )
    ).resolves.toBe(true);

    expect(writes).toEqual([
      { table: 'product_variations', values: expect.objectContaining({ active: true }) },
      { table: 'products', values: expect.objectContaining({ active: true }) },
    ]);
  });

  it('mantém o pai ativo ao desativar uma variação quando outra irmã continua ativa', async () => {
    const writes: Array<{ table: string; values: Record<string, unknown> }> = [];
    mocks.from.mockImplementation((table: string) => {
      let updateValues: Record<string, unknown> | undefined;
      const builder: any = {
        select: vi.fn(() => builder),
        update: vi.fn((values: Record<string, unknown>) => {
          updateValues = values;
          return builder;
        }),
        eq: vi.fn((column: string) => {
          if (updateValues) {
            writes.push({ table, values: updateValues });
            return Promise.resolve({ error: null });
          }
          if (table === 'product_variations' && column === 'product_id') {
            return Promise.resolve({ data: [{ active: false }, { active: true }], error: null });
          }
          return builder;
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: validProductActivationRow(),
          error: null,
        }),
      };
      return builder;
    });

    await expect(
      toggleMobileProductActive(
        '123e4567-e89b-42d3-a456-426614174000',
        true,
        true,
        '123e4567-e89b-42d3-a456-426614174001'
      )
    ).resolves.toBe(false);

    expect(writes).toEqual([
      { table: 'product_variations', values: expect.objectContaining({ active: false }) },
      { table: 'products', values: expect.objectContaining({ active: true }) },
    ]);
  });

  it('não ativa se falhar a consulta da origem do produto', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('consulta falhou') });

    await expect(
      toggleMobileProductActive('123e4567-e89b-42d3-a456-426614174000', false)
    ).rejects.toThrow('consulta falhou');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('bloqueia produto simples com variação padrão e preço herdado zerado', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: validProductActivationRow({
        unit_price: 0,
        price: 0,
        product_variations: [
          {
            id: '123e4567-e89b-42d3-a456-426614174001',
            sku: 'PROD-01-01',
            active: false,
            price: 0,
            use_parent_price: true,
            combo_items: [],
          },
        ],
      }),
      error: null,
    });

    await expect(
      toggleMobileProductActive('123e4567-e89b-42d3-a456-426614174000', false)
    ).rejects.toThrow('preço de venda');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('bloqueia variação que herda preço quando o preço do pai está zerado', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: validProductActivationRow({
        unit_price: 0,
        price: 0,
        product_variations: [
          {
            id: '123e4567-e89b-42d3-a456-426614174001',
            sku: 'PROD-01-01',
            active: false,
            price: 0,
            use_parent_price: true,
            combo_items: [],
          },
        ],
      }),
      error: null,
    });

    await expect(
      toggleMobileProductActive(
        '123e4567-e89b-42d3-a456-426614174000',
        false,
        true,
        '123e4567-e89b-42d3-a456-426614174001'
      )
    ).rejects.toThrow('preço de venda');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('valida ativação pelo preço canônico quando o alias legado diverge', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: validProductActivationRow({ unit_price: 100, price: 0 }),
      error: null,
    });

    await expect(
      toggleMobileProductActive('123e4567-e89b-42d3-a456-426614174000', false)
    ).resolves.toBe(true);

    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
  });

  it('bloqueia ativação de composição simples com menos de dois componentes', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: validProductActivationRow({
        item_type: 'composition',
        is_combo: true,
        product_variations: [],
        combo_items: [{ productId: 'component-1', quantity: 1 }],
      }),
      error: null,
    });

    await expect(
      toggleMobileProductActive('123e4567-e89b-42d3-a456-426614174000', false)
    ).rejects.toThrow('pelo menos 2 produtos componentes vinculados');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('valida os componentes da variação composta sem usar os componentes do pai como fallback', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: validProductActivationRow({
        item_type: 'composition',
        is_combo: true,
        combo_items: [
          { productId: 'component-1', quantity: 1 },
          { productId: 'component-2', quantity: 1 },
        ],
        product_variations: [
          {
            id: '123e4567-e89b-42d3-a456-426614174001',
            sku: 'PROD-01-01',
            price: 100,
            use_parent_price: true,
            combo_items: [{ productId: 'component-1', quantity: 1 }],
          },
        ],
      }),
      error: null,
    });

    await expect(
      toggleMobileProductActive(
        '123e4567-e89b-42d3-a456-426614174000',
        false,
        true,
        '123e4567-e89b-42d3-a456-426614174001'
      )
    ).rejects.toThrow('pelo menos 2 produtos componentes vinculados');
    expect(query.update).not.toHaveBeenCalled();
  });
});

