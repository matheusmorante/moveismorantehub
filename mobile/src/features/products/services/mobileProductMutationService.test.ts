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

import {
  checkMobileProductVariationHasMoves,
  saveMobileProduct,
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

describe('saveMobileProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      filter: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      neq: vi.fn(() => query),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({ data: 'saved-product-id', error: null });
  });

  it('envia os campos suportados em uma RPC, converte preço local e deixa o estoque sob controle do inventário', async () => {
    const savedId = await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
      name: 'Produto de teste',
      itemType: 'product',
      productKind: 'normal',
      category: 'Categoria legada',
      categoryId: 'category-stale',
      categoryIds: ['category-selected-1', 'category-selected-2'],
      brand: 'Morante',
      colors: 'AZUL / VERDE',
      noColors: false,
      unitPrice: '1.234,50',
      promoPrice: '1.199,90',
      costPrice: '1.000,00',
      freightCost: '25,50',
      ipiPercent: '5,25',
      finalPurchasePrice: '1.078,00',
      minStock: '2,5',
      attributes: [{ name: 'Cor', value: 'Azul' }],
      technical_specs: { technicalValues: { Altura: '180' } },
      technicalValues: { Cor: 'Verde', Marca: 'Morante' },
      variations: [
        {
          id: 'new_PROD-01',
          name: 'Produto de teste',
          sku: 'PROD-01',
          attributes: [
            { name: 'Cor', value: 'Azul', showName: false },
            { name: 'Tamanho', value: 'M' },
          ],
          syncUnitPrice: true,
          syncPromoPrice: true,
          discountPercent: '150',
          discountFixed: '150',
          comboItems: [],
          stock: 999,
        },
      ],
      images: [],
    });

    expect(savedId).toBe('saved-product-id');
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith('product_variations');
    expect(query.in).toHaveBeenCalledWith('sku', ['PROD-01']);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [rpcName, parameters] = mocks.rpc.mock.calls[0];
    expect(rpcName).toBe('save_mobile_product_transaction');
    expect(parameters).toMatchObject({
      p_is_edit: false,
      p_product_id: '123e4567-e89b-42d3-a456-426614174000',
      p_product: {
        unit_price: 1234.5,
        price: 1234.5,
        marketplace_title: 'Produto de teste',
        brand: 'Morante',
        colors: 'AZUL / VERDE',
        no_colors: false,
        promo_price: 1199.9,
        cost_price: 1000,
        freight_cost: 25.5,
        ipi_percent: 5.25,
        final_purchase_price: 1078,
        min_stock: 2.5,
        technical_specs: {
          technicalValues: { Altura: '180', Cor: 'Verde', Marca: 'Morante' },
        },
      },
    });
    expect(parameters.p_product).not.toHaveProperty('weight');
    expect(parameters.p_product).not.toHaveProperty('category');
    expect(parameters.p_product.category_id).toBe('category-selected-1');
    expect(parameters.p_category_ids).toEqual(['category-selected-1', 'category-selected-2']);
    expect(parameters.p_variations[0]).not.toHaveProperty('stock');
    expect(parameters.p_variations[0]).not.toHaveProperty('discountPercent');
    expect(parameters.p_variations[0]).not.toHaveProperty('discountFixed');
    expect(parameters.p_variations[0].combo_items).toEqual([]);
    expect(parameters.p_variations[0].name).toBe('Produto de teste M');
    expect(parameters.p_product.technical_specs.variationDetails).toEqual([
      expect.objectContaining({ id: parameters.p_variations[0].id, stock: 999 }),
    ]);
    expect(parameters.p_variations[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(parameters.p_product.technical_specs.variationDetails[0]).not.toHaveProperty('initialStock');
    expect(parameters.p_product.technical_specs.variationDetails[0]).not.toHaveProperty('discountPercent');
    expect(parameters.p_product.technical_specs.variationDetails[0]).not.toHaveProperty('discountFixed');
  });

  it('persiste promoção própria quando o preço de venda continua herdado do pai', async () => {
    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
      name: 'Produto de teste',
      itemType: 'product',
      unitPrice: '100,00',
      promoPrice: '80,00',
      costPrice: '50,00',
      hasVariations: true,
      variations: [
        {
          id: '123e4567-e89b-42d3-a456-426614174002',
          name: 'Produto Azul',
          sku: 'PROD-01',
          attributes: [{ name: 'Cor', value: 'Azul' }],
          syncUnitPrice: true,
          syncPromoPrice: false,
          price: '100,00',
          promoPrice: '65,00',
          syncCostPrice: false,
          costPrice: '40,00',
          comboItems: [],
        },
      ],
      images: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    expect(parameters.p_variations[0]).toMatchObject({
      price: 100,
      promo_price: 65,
      cost_price: 40,
      use_parent_price: true,
      use_parent_promo_price: false,
    });
    expect(parameters.p_product.technical_specs.variationDetails[0]).toMatchObject({
      syncUnitPrice: true,
      syncPromoPrice: false,
      syncCostPrice: false,
      promoPrice: '65,00',
      costPrice: '40,00',
    });
  });

  it('persiste override variável vazio em technical_specs e remove atributo vazio da linha', async () => {
    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
      name: 'Produto de teste',
      itemType: 'product',
      productKind: 'normal',
      variableTechnicalFields: ['Cor'],
      variations: [
        {
          id: 'new_PROD-01',
          name: 'Produto de teste',
          sku: 'PROD-01',
          attributes: [],
          technicalValues: { Cor: '' },
          comboItems: [],
        },
      ],
      images: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    const variationId = parameters.p_variations[0].id;
    expect(parameters.p_variations[0].attributes).toEqual([]);
    expect(parameters.p_product.technical_specs.variationDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: variationId, technicalValues: { Cor: '' } }),
      ])
    );
  });

  it('salva valores técnicos próprios distintos sob o UUID de cada variação', async () => {
    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
      name: 'Armario',
      itemType: 'product',
      productKind: 'normal',
      variableTechnicalFields: ['Cor'],
      hasVariations: true,
      variations: [
        {
          id: '123e4567-e89b-42d3-a456-426614174002',
          name: 'Armario Azul',
          sku: 'PROD-01',
          attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
          technicalValues: { Cor: 'Azul' },
          comboItems: [],
        },
        {
          id: '123e4567-e89b-42d3-a456-426614174003',
          name: 'Armario Verde',
          sku: 'PROD-02',
          attributes: [{ name: 'Cor', value: 'Verde', showName: false }],
          technicalValues: { Cor: 'Verde' },
          comboItems: [],
        },
      ],
      images: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    const valuesById = Object.fromEntries(
      parameters.p_product.technical_specs.variationDetails.map((variation: any) => [
        variation.id,
        variation.technicalValues?.Cor,
      ])
    );

    expect(valuesById).toEqual({
      '123e4567-e89b-42d3-a456-426614174002': 'Azul',
      '123e4567-e89b-42d3-a456-426614174003': 'Verde',
    });
  });

  it('preserva metadados de catálogo e descrições por canal ao editar um produto', async () => {
    await saveMobileProduct({
      id: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      updated_at: '2026-10-22T12:00:00.000Z',
      code: 'PROD',
      name: 'Produto atualizado',
      itemType: 'product',
      productKind: 'normal',
      status: 'hidden',
      metaTitle: 'Título SEO salvo',
      metaDescription: 'Resumo SEO salvo',
      seoDescription: 'Descrição SEO salva',
      ecommerceDescription: 'Descrição para e-commerce',
      whatsappDescription: 'Descrição para WhatsApp',
      ecommerce_template: 'Modelo e-commerce salvo',
      whatsapp_template: 'Modelo WhatsApp salvo',
      variations: [{ id: '123e4567-e89b-42d3-a456-426614174002', sku: 'PROD-01', name: 'Produto atualizado' }],
      images: [],
      categoryIds: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_product).toMatchObject({
      meta_title: 'Título SEO salvo',
      meta_description: 'Resumo SEO salvo',
      seo_description: 'Descrição SEO salva',
      ecommerce_description: 'Descrição para e-commerce',
      whatsapp_description: 'Descrição para WhatsApp',
      ecommerce_template: 'Modelo e-commerce salvo',
      whatsapp_template: 'Modelo WhatsApp salvo',
    });
  });

  it('usa categoryId como vínculo singular quando a lista não foi preenchida', async () => {
    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174050',
      operationId: '123e4567-e89b-42d3-a456-426614174051',
      code: 'PROD-SINGULAR',
      name: 'Produto com categoria singular',
      itemType: 'product',
      productKind: 'normal',
      categoryId: 'category-single',
      categoryIds: [],
      variations: [{ sku: 'PROD-SINGULAR-01' }],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_product.category_id).toBe('category-single');
    expect(parameters.p_category_ids).toEqual(['category-single']);
    expect(parameters.p_product).not.toHaveProperty('category');
  });

  it('preserva quantidades fracionárias localizadas dos componentes no produto e na variação composta', async () => {
    const component = {
      productId: '123e4567-e89b-42d3-a456-426614174010',
      variationId: '123e4567-e89b-42d3-a456-426614174011',
      quantity: '1,5',
      unitPrice: '12,50',
      stock: '20,5',
      description: 'Tecido azul',
    };

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174020',
      operationId: '123e4567-e89b-42d3-a456-426614174021',
      code: 'KIT',
      name: 'Kit composto',
      itemType: 'composition',
      productKind: 'normal',
      comboItems: [component],
      variations: [
        {
          id: '123e4567-e89b-42d3-a456-426614174022',
          name: 'Kit composto',
          sku: 'KIT-01',
          comboItems: [component],
        },
      ],
      images: [],
      categoryIds: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    const normalizedComponent = {
      productId: component.productId,
      variationId: component.variationId,
      quantity: 1.5,
      unitPrice: 12.5,
      stock: 20.5,
      description: component.description,
    };
    expect(parameters.p_product.combo_items).toEqual([normalizedComponent]);
    expect(parameters.p_variations[0].combo_items).toEqual([normalizedComponent]);
  });

  it('mantém ingredientes exclusivos da variação fora do cadastro pai', async () => {
    const variationComponent = {
      productId: '123e4567-e89b-42d3-a456-426614174030',
      variationId: '123e4567-e89b-42d3-a456-426614174031',
      quantity: 2,
      unitPrice: 25,
      stock: 8,
      description: 'Cadeira azul',
    };

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174040',
      operationId: '123e4567-e89b-42d3-a456-426614174041',
      code: 'KIT-COR',
      name: 'Kit por cor',
      itemType: 'composition',
      productKind: 'normal',
      comboItems: [],
      variations: [{
        id: '123e4567-e89b-42d3-a456-426614174042',
        name: 'Kit por cor Azul',
        sku: 'KIT-COR-01',
        comboItems: [variationComponent],
      }],
      images: [],
      categoryIds: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_product.combo_items).toEqual([]);
    expect(parameters.p_variations[0].combo_items).toEqual([
      expect.objectContaining({
        productId: variationComponent.productId,
        variationId: variationComponent.variationId,
        quantity: 2,
      }),
    ]);
  });

  it('bloqueia a remoção local quando uma variação já aparece no histórico de vendas', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'order-item-id' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('inventory_moves');
    expect(mocks.from).toHaveBeenCalledWith('order_items');
  });

  it('bloqueia a remoção quando a variação aparece em recebimento de mercadoria', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'receipt-item-id' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('goods_receipt_items');
  });

  it('bloqueia a remoção quando a variação aparece em nota de entrada', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'inbound-invoice-id' }], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(query.filter).toHaveBeenCalledWith(
      'items',
      'cs',
      '[{"variationId": "123e4567-e89b-42d3-a456-426614174002"}]'
    );
    expect(mocks.from).toHaveBeenCalledWith('inbound_invoices');
  });

  it('falha fechado quando o id da variação não é UUID', async () => {
    await expect(checkMobileProductVariationHasMoves('produto', 'nova-variacao')).resolves.toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
  });
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

  it('bloqueia publicação de produto de teste no catálogo', async () => {
    query.maybeSingle.mockResolvedValueOnce({
      data: { id: 'prod-test-1', code: 'TEST_AUT_01', name: 'Teste' },
      error: null,
    });

    await expect(
      toggleMobileProductCatalog('prod-test-1', 'hidden')
    ).rejects.toThrow('Produtos identificados como teste não podem ser publicados no Catálogo Digital.');
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

