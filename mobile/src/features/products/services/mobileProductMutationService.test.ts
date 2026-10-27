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
  checkMobileProductVariationHasMoves,
  deleteMobileProduct,
  moveMobileProductToTrash,
  restoreMobileProductFromTrash,
  saveMobileProduct,
  toggleMobileProductCatalog,
  toggleMobileProductActive,
} from './mobileProductMutationService';
import { fetchRequiredProductCategoryAttributes } from '../../../../../shared-utils/productCategoryRequiredAttributes';
import {
  productDraftDiscardFormSchema,
  productMoveToTrashFormSchema,
  productRestoreFromTrashFormSchema,
} from '../../../../../shared-utils/productVariationOperationFormSchemas';

let query: any;

describe('productDraftDiscardFormSchema', () => {
  it('accepts an explicitly confirmed draft and normalizes a display suffix from its UUID', () => {
    expect(
      productDraftDiscardFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000_display',
        confirmed: true,
      })
    ).toMatchObject({
      success: true,
      data: {
        productId: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: true,
      },
    });
  });

  it.each([
    { productId: 'not-a-uuid', confirmed: true },
    { productId: '123e4567-e89b-42d3-a456-426614174000', confirmed: false },
  ])('rejects invalid identifiers or an unconfirmed discard (%o)', (values) => {
    expect(productDraftDiscardFormSchema.safeParse(values).success).toBe(false);
  });

  it('requires explicit confirmation and a valid product ID before moving to trash', () => {
    expect(
      productMoveToTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: true,
      }).success
    ).toBe(true);
    expect(
      productMoveToTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: false,
      }).success
    ).toBe(false);
  });

  it('requires the restore action and parses the product UUID before restoring', () => {
    expect(
      productRestoreFromTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000_display',
        action: 'restore',
      })
    ).toMatchObject({
      success: true,
      data: {
        productId: '123e4567-e89b-42d3-a456-426614174000',
        action: 'restore',
      },
    });
    expect(
      productRestoreFromTrashFormSchema.safeParse({
        productId: 'not-a-uuid',
        action: 'restore',
      }).success
    ).toBe(false);
    expect(
      productRestoreFromTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000',
        action: 'delete',
      }).success
    ).toBe(false);
  });
});

describe('deleteMobileProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { success: true, code: 'product_deleted', message: 'Produto excluído com sucesso.' },
      error: null,
    });
  });

  it('discards drafts through the permission and reference checked ERP RPC', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174000';

    await expect(deleteMobileProduct(productId, true)).resolves.toMatchObject({
      success: true,
      code: 'product_deleted',
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('delete_unreferenced_product', {
      p_product_id: productId,
    });
  });

  it.each([
    { success: false, code: 'permission_denied', message: 'Seu perfil não permite excluir produtos.' },
    { success: false, code: 'product_in_use', message: 'Produto possui vínculos ou histórico.' },
  ])('surfaces an unsuccessful RPC result without a direct-delete fallback (%o)', async (result) => {
    mocks.rpc.mockResolvedValueOnce({ data: result, error: null });

    await expect(deleteMobileProduct('123e4567-e89b-42d3-a456-426614174000', true)).rejects.toThrow(
      result.message
    );

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it('rejects invalid draft identifiers before any database call', async () => {
    await expect(deleteMobileProduct('not-a-uuid', true)).rejects.toThrow('ID do produto inválido.');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe('moveMobileProductToTrash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { success: true, code: 'moved_to_trash', message: 'Produto movido com sucesso.' },
      error: null,
    });
  });

  it('uses the transactional ERP RPC and schedules Meta sync only after confirmed success', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174000';

    await expect(moveMobileProductToTrash(productId)).resolves.toMatchObject({
      success: true,
      code: 'moved_to_trash',
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('move_product_to_trash', {
      p_product_id: productId,
    });
    expect(mocks.triggerMetaCatalogSync).toHaveBeenCalledWith(productId);
  });

  it.each([
    {
      success: false,
      code: 'permission_denied',
      message: 'Seu perfil não possui permissão para mover produtos para a lixeira.',
    },
    {
      success: false,
      code: 'product_in_use',
      message: 'O produto possui vínculos e deve permanecer ativo.',
    },
  ])('does not synchronize or fall back when the RPC rejects the operation (%o)', async (result) => {
    mocks.rpc.mockResolvedValueOnce({ data: result, error: null });

    await expect(moveMobileProductToTrash('123e4567-e89b-42d3-a456-426614174000')).rejects.toThrow(
      result.message
    );

    expect(mocks.triggerMetaCatalogSync).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects invalid IDs before calling the backend', async () => {
    await expect(moveMobileProductToTrash('not-a-uuid')).rejects.toThrow('ID do produto inválido.');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.triggerMetaCatalogSync).not.toHaveBeenCalled();
  });
});

describe('restoreMobileProductFromTrash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { success: true, code: 'restored', message: 'Produto restaurado.' },
      error: null,
    });
  });

  it('calls the protected ERP RPC and synchronizes Meta only after success', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174000';

    await expect(restoreMobileProductFromTrash(productId)).resolves.toMatchObject({
      success: true,
      code: 'restored',
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('restore_product_from_trash', {
      p_product_id: productId,
    });
    expect(mocks.triggerMetaCatalogSync).toHaveBeenCalledWith(productId);
  });

  it.each([
    {
      success: false,
      code: 'permission_denied',
      message: 'Seu perfil não possui permissão para restaurar produtos da lixeira.',
    },
    { success: false, code: 'not_in_trash', message: 'Este produto não está na lixeira.' },
  ])('does not synchronize or fall back when the RPC rejects restoration (%o)', async (result) => {
    mocks.rpc.mockResolvedValueOnce({ data: result, error: null });

    await expect(
      restoreMobileProductFromTrash('123e4567-e89b-42d3-a456-426614174000')
    ).rejects.toThrow(result.message);

    expect(mocks.triggerMetaCatalogSync).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects invalid IDs before calling the backend', async () => {
    await expect(restoreMobileProductFromTrash('not-a-uuid')).rejects.toThrow(
      'ID do produto inválido.'
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.triggerMetaCatalogSync).not.toHaveBeenCalled();
  });

  it('times out a restoration RPC that does not settle', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockReturnValueOnce(new Promise(() => {}));
    const restoration = restoreMobileProductFromTrash('123e4567-e89b-42d3-a456-426614174000');

    try {
      const rejection = expect(restoration).rejects.toThrow(
        'A operação expirou. Verifique a conexão e tente novamente.'
      );
      await vi.advanceTimersByTimeAsync(10_001);
      await rejection;
    } finally {
      vi.useRealTimers();
    }

    expect(mocks.triggerMetaCatalogSync).not.toHaveBeenCalled();
  });
});

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
    vi.mocked(fetchRequiredProductCategoryAttributes).mockResolvedValue([]);
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

  it('propaga erro da RPC que grava a galeria e mantém o payload de fotos do produto pai', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Falha ao persistir product_images.'),
    });

    await expect(
      saveMobileProduct({
        clientProductId: '123e4567-e89b-42d3-a456-426614174000',
        operationId: '123e4567-e89b-42d3-a456-426614174001',
        code: 'MESA-01',
        name: 'Mesa Aurora',
        itemType: 'product',
        isDraft: true,
        status: 'draft',
        hasVariations: false,
        categoryIds: [],
        images: ['parent-cover.jpg', 'parent-side.jpg'],
        variations: [
          {
            id: '123e4567-e89b-42d3-a456-426614174002',
            sku: 'MESA-01-01',
            name: 'Mesa Aurora',
            status: 'draft',
            active: false,
            images: ['parent-cover.jpg', 'parent-side.jpg'],
          },
        ],
      })
    ).rejects.toThrow('Falha ao persistir product_images.');

    expect(mocks.rpc).toHaveBeenCalledWith(
      'save_mobile_product_transaction',
      expect.objectContaining({
        p_images: ['parent-cover.jpg', 'parent-side.jpg'],
        p_product: expect.objectContaining({
          images: ['parent-cover.jpg', 'parent-side.jpg'],
        }),
      })
    );
  });

  it('salva Modelo/Linha canônico e projeta requisito de categoria com aliases legados', async () => {
    vi.mocked(fetchRequiredProductCategoryAttributes).mockResolvedValue([
      {
        attributeId: 'attribute-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['category-model'],
      },
    ]);

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'MODEL-LINE',
      name: 'Produto com variações',
      itemType: 'product',
      productKind: 'normal',
      categoryIds: ['category-model'],
      technicalValues: { 'Linha/Modelo': 'Linha Global' },
      variableTechnicalFields: ['Modelo/Linha'],
      hasVariations: true,
      variations: [
        {
          name: 'Produto Azul',
          sku: 'MODEL-LINE-01',
          technicalValues: { 'Linha/Modelo': 'Linha Azul' },
          attributes: [],
          comboItems: [],
        },
        {
          name: 'Produto sem linha',
          sku: 'MODEL-LINE-02',
          technicalValues: { 'Modelo/Linha': '', Modelo: 'Valor legado obsoleto' },
          attributes: [],
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_product.technical_specs.technicalValues).toEqual({
      'Linha/Modelo': 'Linha Global',
      'Modelo/Linha': 'Linha Global',
    });
    expect(parameters.p_variations.map((variation: any) => variation.attributes)).toEqual([
      [{ name: 'Modelo/Linha', value: 'Linha Azul', showName: false }],
      [],
    ]);
    expect(parameters.p_product.technical_specs.variationDetails[1].technicalValues).toEqual({
      'Modelo/Linha': '',
      Modelo: 'Valor legado obsoleto',
    });
  });

  it('serializa opções múltiplas para compatibilidade e mantém o array técnico no snapshot', async () => {
    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'MULTI-SELECT',
      name: 'Produto com seleção múltipla',
      itemType: 'product',
      productKind: 'normal',
      hasVariations: true,
      technicalValues: { 'Materiais das corrediças': ['Metal', 'Nylon'] },
      variations: [
        {
          name: 'Produto com seleção múltipla - Metal e Nylon',
          sku: 'MULTI-SELECT-01',
          technicalValues: { 'Materiais das corrediças': ['Metal', 'Nylon'] },
          attributes: [
            {
              name: 'Materiais das corrediças',
              value: ['Metal', 'Nylon'],
              showName: false,
            },
          ],
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_variations[0].attributes).toEqual([
      {
        name: 'Materiais das corrediças',
        value: 'Metal,Nylon',
        showName: false,
      },
    ]);
    expect(parameters.p_product.technical_specs.variationDetails[0].technicalValues).toEqual({
      'Materiais das corrediças': ['Metal', 'Nylon'],
    });
  });

  it('não mascara alias próprio legado de attributes com Modelo/Linha herdado do pai', async () => {
    vi.mocked(fetchRequiredProductCategoryAttributes).mockResolvedValue([
      {
        attributeId: 'attribute-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['category-model'],
      },
    ]);

    const legacyAttributes = [
      { name: 'Linha/Modelo', value: 'Linha própria', showName: false },
    ];

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'MODEL-LINE-LEGACY',
      name: 'Produto legado com variação',
      itemType: 'product',
      productKind: 'normal',
      categoryIds: ['category-model'],
      technicalValues: { 'Modelo/Linha': 'Linha herdada' },
      hasVariations: true,
      variations: [
        {
          name: 'Produto da linha própria',
          sku: 'MODEL-LINE-LEGACY-01',
          technicalValues: {},
          attributes: legacyAttributes,
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_variations[0].attributes).toEqual(legacyAttributes);
  });

  it('não sobrescreve o atributo canônico mostrado por alias legado conflitante no payload', async () => {
    vi.mocked(fetchRequiredProductCategoryAttributes).mockResolvedValue([
      {
        attributeId: 'attribute-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['category-model'],
      },
    ]);

    const displayedAttribute = [
      { name: 'Modelo/Linha', value: 'Atributo da variação', showName: true },
    ];

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'MODEL-LINE-CONFLICT',
      name: 'Produto com fontes divergentes',
      itemType: 'product',
      productKind: 'normal',
      categoryIds: ['category-model'],
      technicalValues: { 'Modelo/Linha': 'Modelo do pai' },
      variableTechnicalFields: ['Modelo/Linha'],
      hasVariations: true,
      variations: [
        {
          name: 'Produto com atributo canônico',
          sku: 'MODEL-LINE-CONFLICT-01',
          technicalValues: { 'Linha/Modelo': 'TechnicalValues legado' },
          attributes: displayedAttribute,
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_variations[0].attributes).toEqual(displayedAttribute);
  });

  it('envia um único atributo canônico quando dois requisitos de categoria usam aliases', async () => {
    vi.mocked(fetchRequiredProductCategoryAttributes).mockResolvedValue([
      {
        attributeId: 'legacy-line-model',
        name: 'Linha/Modelo',
        requiredCategoryIds: ['category-model'],
      },
      {
        attributeId: 'canonical-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['category-model'],
      },
    ]);

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'MODEL-LINE-DUPLICATE-REQUIREMENTS',
      name: 'Produto com requisito técnico duplicado',
      itemType: 'product',
      productKind: 'normal',
      categoryIds: ['category-model'],
      hasVariations: true,
      variations: [
        {
          name: 'Produto com dois aliases técnicos',
          sku: 'MODEL-LINE-DUPLICATE-REQUIREMENTS-01',
          technicalValues: {},
          attributes: [
            { name: 'Linha/Modelo', value: 'Valor legado', showName: false, source: 'legacy' },
            { name: 'Modelo/Linha', value: 'Valor canônico', showName: true, source: 'canonical' },
          ],
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_variations[0].attributes).toEqual([
      { name: 'Modelo/Linha', value: 'Valor canônico', showName: true },
    ]);
  });

  it('não persiste alias antigo quando o override canônico foi explicitamente limpo', async () => {
    vi.mocked(fetchRequiredProductCategoryAttributes).mockResolvedValue([
      {
        attributeId: 'attribute-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['category-model'],
      },
    ]);

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'MODEL-LINE-CLEARED',
      name: 'Produto com campo limpo',
      itemType: 'product',
      productKind: 'normal',
      categoryIds: ['category-model'],
      technicalValues: { 'Modelo/Linha': 'Linha herdada' },
      hasVariations: true,
      variations: [
        {
          name: 'Produto sem linha',
          sku: 'MODEL-LINE-CLEARED-01',
          technicalValues: { 'Modelo/Linha': '' },
          attributes: [{ name: 'Linha/Modelo', value: 'Valor antigo', showName: false }],
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_variations[0].attributes).toEqual([]);
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

  it('preserva Marca vazia ao limpar a característica, como no mapper ERP', async () => {
    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174010',
      operationId: '123e4567-e89b-42d3-a456-426614174011',
      code: 'PROD',
      name: 'Produto sem marca',
      itemType: 'product',
      productKind: 'normal',
      brand: '',
      categoryIds: [],
      variations: [
        {
          id: 'new_PROD-01',
          name: 'Produto sem marca',
          sku: 'PROD-01',
          attributes: [],
          comboItems: [],
        },
      ],
      images: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    expect(parameters.p_product.brand).toBe('');
  });

  it('limita fotos de família a 15 na RPC e nos detalhes técnicos, preservando a galeria pai', async () => {
    const parentImages = Array.from({ length: 18 }, (_, index) =>
      `https://images.test/parent-${index + 1}.webp`
    );
    const variationImages = Array.from({ length: 20 }, (_, index) =>
      `https://images.test/variation-${index + 1}.webp`
    );

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD-FOTOS',
      name: 'Produto com variações',
      itemType: 'product',
      hasVariations: true,
      variations: [
        { id: 'new_PROD-FOTOS-01', name: 'Azul', sku: 'PROD-FOTOS-01', images: variationImages, comboItems: [] },
        { id: 'new_PROD-FOTOS-02', name: 'Verde', sku: 'PROD-FOTOS-02', images: variationImages, comboItems: [] },
      ],
      images: parentImages,
      categoryIds: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    const expectedVariationImages = variationImages.slice(0, 15);

    expect(parameters.p_product.images).toEqual(parentImages);
    expect(parameters.p_product.technical_specs.variationDetails.map((row: any) => row.images)).toEqual([
      expectedVariationImages,
      expectedVariationImages,
    ]);
    expect(parameters.p_variations.map((row: any) => row.image_url)).toEqual([
      expectedVariationImages.join(','),
      expectedVariationImages.join(','),
    ]);
  });

  it('preserva modo e fotos próprias ao salvar rascunho de família com uma variação provisória', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174000';
    const previousVersion = '2026-10-25T10:00:00.000Z';
    const acknowledgedVersion = '2026-10-25T10:00:01.000Z';
    const parentImages = ['https://images.test/parent.webp'];
    const variationImages = Array.from({ length: 18 }, (_, index) =>
      `https://images.test/provisional-${index + 1}.webp`
    );
    mocks.rpc.mockResolvedValueOnce({
      data: [{ product_id: productId, updated_at: acknowledgedVersion }],
      error: null,
    });

    const acknowledgement = await saveMobileProduct({
      id: productId,
      updated_at: previousVersion,
      clientProductId: productId,
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      saveUpdatedAt: '2026-10-25T10:00:00.500Z',
      code: 'PROD-RASCUNHO-FAMILIA',
      name: 'Produto com variações em rascunho',
      itemType: 'product',
      isDraft: true,
      status: 'draft',
      hasVariations: true,
      variations: [
        {
          id: 'new_PROD-RASCUNHO-FAMILIA-01',
          name: 'Azul',
          sku: 'PROD-RASCUNHO-FAMILIA-01',
          images: variationImages,
          comboItems: [],
        },
      ],
      images: parentImages,
      categoryIds: [],
    }, { returnVersionAcknowledgement: true });

    const parameters = mocks.rpc.mock.calls[0][1];
    const expectedVariationImages = variationImages.slice(0, 15);

    expect(acknowledgement).toEqual({ productId, updatedAt: acknowledgedVersion });
    expect(mocks.rpc).toHaveBeenCalledWith('save_mobile_product_transaction_with_version', expect.any(Object));
    expect(parameters.p_expected_updated_at).toBe(previousVersion);
    expect(parameters.p_product.has_variations).toBe(true);
    expect(parameters.p_product.is_draft).toBe(true);
    expect(parameters.p_product.images).toEqual(parentImages);
    expect(parameters.p_product.technical_specs.variationDetails[0].images).toEqual(
      expectedVariationImages
    );
    expect(parameters.p_variations[0].image_url).toBe(expectedVariationImages.join(','));
    expect(parameters.p_variations[0].image_url).not.toContain(parentImages[0]);
  });

  it('mantém modo família e galeria própria vazia ao salvar a primeira linha de rascunho sem variações', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174020';
    const parentImages = ['https://images.test/parent.webp'];
    mocks.rpc.mockResolvedValueOnce({
      data: [{ product_id: productId, updated_at: '2026-10-25T10:00:01.000Z' }],
      error: null,
    });

    await saveMobileProduct({
      clientProductId: productId,
      operationId: '123e4567-e89b-42d3-a456-426614174021',
      saveUpdatedAt: '2026-10-25T10:00:00.500Z',
      code: 'PROD-PRIMEIRA-VARIACAO',
      name: 'Família em rascunho',
      itemType: 'product',
      isDraft: true,
      status: 'draft',
      hasVariations: true,
      variations: [],
      images: parentImages,
      categoryIds: [],
    }, { returnVersionAcknowledgement: true });

    const parameters = mocks.rpc.mock.calls[0][1];

    expect(parameters.p_product.has_variations).toBe(true);
    expect(parameters.p_product.is_draft).toBe(true);
    expect(parameters.p_product.images).toEqual(parentImages);
    expect(parameters.p_product.technical_specs.variationDetails).toHaveLength(1);
    expect(parameters.p_product.technical_specs.variationDetails[0].images).toEqual([]);
    expect(parameters.p_variations).toHaveLength(1);
    expect(parameters.p_variations[0].image_url).toBeNull();
  });

  it('mantém a galeria completa do pai na variação simples, sem reaproveitar URL antiga', async () => {
    const parentImages = Array.from({ length: 18 }, (_, index) =>
      `https://images.test/parent-${index + 1}.webp`
    );

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD-SIMPLES',
      name: 'Produto simples',
      itemType: 'product',
      hasVariations: false,
      variations: [
        {
          id: 'new_PROD-SIMPLES-01',
          name: 'Produto simples',
          sku: 'PROD-SIMPLES-01',
          images: [],
          imageUrl: 'https://images.test/legacy.webp',
          comboItems: [],
        },
      ],
      images: parentImages,
      categoryIds: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];

    expect(parameters.p_product.images).toEqual(parentImages);
    expect(parameters.p_product.technical_specs.variationDetails[0].images).toEqual(parentImages);
    expect(parameters.p_variations[0].image_url).toBe(parentImages.join(','));
  });

  it('usa a RPC versionada quando o formulário precisa continuar editando o rascunho', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174050';
    const operationId = '123e4567-e89b-42d3-a456-426614174051';
    const saveUpdatedAt = '2026-10-24T12:30:00.000Z';
    mocks.rpc.mockResolvedValueOnce({
      data: [{ product_id: productId, updated_at: '2026-10-24T12:30:01+00:00' }],
      error: null,
    });

    await expect(
      saveMobileProduct(
        {
          id: productId,
          updated_at: '2026-10-24T12:20:00+00:00',
          operationId,
          saveUpdatedAt,
          name: 'Rascunho editado',
          itemType: 'product',
          isDraft: true,
          variations: [{ id: 'new_TESTE-01', sku: 'TESTE-01', name: 'Rascunho editado' }],
          images: [],
          categoryIds: [],
        },
        { returnVersionAcknowledgement: true }
      )
    ).resolves.toEqual({ productId, updatedAt: '2026-10-24T12:30:01+00:00' });

    expect(mocks.rpc).toHaveBeenCalledWith(
      'save_mobile_product_transaction_with_version',
      expect.objectContaining({
        p_operation_id: operationId,
        p_expected_updated_at: '2026-10-24T12:20:00+00:00',
        p_product: expect.objectContaining({ updated_at: saveUpdatedAt }),
      })
    );
  });

  it('atualiza o snapshot do rascunho versionado com preços próprios/herdados e composição atuais', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174060';
    const ownPriceVariationId = '123e4567-e89b-42d3-a456-426614174061';
    const inheritedPriceVariationId = '123e4567-e89b-42d3-a456-426614174062';
    const component = {
      productId: '123e4567-e89b-42d3-a456-426614174063',
      variationId: '123e4567-e89b-42d3-a456-426614174064',
      quantity: 2,
      description: 'Componente atual',
    };
    const staleSnapshot = {
      id: productId,
      isDraft: true,
      itemType: 'composition',
      unitPrice: '90,00',
      variations: [
        {
          id: ownPriceVariationId,
          price: '90,00',
          syncUnitPrice: true,
          costPrice: '30,00',
          syncCostPrice: false,
          comboItems: [],
        },
      ],
    };
    mocks.rpc.mockResolvedValueOnce({
      data: [{ product_id: productId, updated_at: '2026-10-25T12:30:01.000Z' }],
      error: null,
    });
    query.in.mockImplementation((column: string) =>
      Promise.resolve({
        data: column === 'id'
          ? [
              { id: ownPriceVariationId, cost_price: 31 },
              { id: inheritedPriceVariationId, cost_price: 22 },
            ]
          : [],
        error: null,
      })
    );

    await saveMobileProduct(
      {
        id: productId,
        updated_at: '2026-10-25T12:20:00.000Z',
        operationId: '123e4567-e89b-42d3-a456-426614174065',
        saveUpdatedAt: '2026-10-25T12:30:00.000Z',
        code: 'KIT-RASCUNHO',
        name: 'Kit em rascunho',
        itemType: 'composition',
        isDraft: true,
        status: 'draft',
        hasVariations: true,
        unitPrice: '220,00',
        costPrice: '50,00',
        promoPrice: '180,00',
        comboItems: [component],
        technical_specs: { customField: 'preservado', draftProduct: staleSnapshot },
        variations: [
          {
            id: ownPriceVariationId,
            name: 'Kit Azul',
            sku: 'KIT-RASCUNHO-01',
            price: '165,00',
            promoPrice: '140,00',
            costPrice: '40,00',
            syncUnitPrice: false,
            syncPromoPrice: false,
            syncCostPrice: false,
            comboItems: [component],
          },
          {
            id: inheritedPriceVariationId,
            name: 'Kit Verde',
            sku: 'KIT-RASCUNHO-02',
            price: '220,00',
            promoPrice: '180,00',
            costPrice: '50,00',
            syncUnitPrice: true,
            syncPromoPrice: true,
            syncCostPrice: true,
            comboItems: [component],
          },
        ],
        images: [],
        categoryIds: [],
      },
      { returnVersionAcknowledgement: true }
    );

    const parameters = mocks.rpc.mock.calls[0][1];
    const savedDraft = parameters.p_product.technical_specs.draftProduct;

    expect(parameters.p_product.technical_specs.customField).toBe('preservado');
    expect(savedDraft).toMatchObject({
      id: productId,
      isDraft: true,
      active: false,
      status: 'draft',
      itemType: 'composition',
      unitPrice: '220,00',
      costPrice: '50,00',
      promoPrice: '180,00',
    });
    expect(savedDraft.variations).toMatchObject([
      {
        id: ownPriceVariationId,
        price: '165,00',
        promoPrice: '140,00',
        costPrice: '40,00',
        syncUnitPrice: false,
        syncPromoPrice: false,
        syncCostPrice: false,
        comboItems: [component],
        active: false,
        status: 'hidden',
      },
      {
        id: inheritedPriceVariationId,
        price: '220,00',
        promoPrice: '180,00',
        costPrice: '50,00',
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
        comboItems: [component],
        active: false,
        status: 'hidden',
      },
    ]);
    expect(savedDraft).not.toHaveProperty('technicalSpecs');
    expect(savedDraft).not.toHaveProperty('technical_specs');
    expect(parameters.p_variations).toMatchObject([
      {
        price: 165,
        promo_price: 140,
        cost_price: 31,
        use_parent_price: false,
        use_parent_promo_price: false,
      },
      {
        price: 220,
        promo_price: 180,
        cost_price: 22,
        use_parent_price: true,
        use_parent_promo_price: true,
      },
    ]);
  });

  it('remove o snapshot obsoleto ao finalizar um rascunho após autosave', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174070';
    const variationId = '123e4567-e89b-42d3-a456-426614174071';
    const component = {
      productId: '123e4567-e89b-42d3-a456-426614174073',
      variationId: '123e4567-e89b-42d3-a456-426614174074',
      quantity: 1,
      description: 'Componente final',
    };

    await saveMobileProduct({
      id: productId,
      updated_at: '2026-10-25T12:30:01.000Z',
      operationId: '123e4567-e89b-42d3-a456-426614174072',
      code: 'PROD-FINAL',
      name: 'Produto concluído',
      itemType: 'composition',
      isDraft: false,
      status: 'hidden',
      hasVariations: true,
      unitPrice: '220,00',
      comboItems: [component],
      technical_specs: {
        draftProduct: { id: productId, isDraft: true, variations: [{ id: variationId, price: '90,00' }] },
      },
      variations: [
        {
          id: variationId,
          name: 'Produto Azul',
          sku: 'PROD-FINAL-01',
          price: '165,00',
          syncUnitPrice: false,
          comboItems: [component],
        },
      ],
      images: [],
      categoryIds: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    expect(parameters.p_product.is_draft).toBe(false);
    expect(parameters.p_product.is_combo).toBe(true);
    expect(parameters.p_product.combo_items).toMatchObject([component]);
    expect(parameters.p_product.technical_specs.draftProduct).toBeNull();
    expect(parameters.p_variations[0]).toMatchObject({
      price: 165,
      use_parent_price: false,
      status: 'hidden',
      combo_items: [expect.objectContaining(component)],
    });
  });

  it('rejeita ACK versionado de outro produto sem avançar a versão local', async () => {
    const requestedProductId = '123e4567-e89b-42d3-a456-426614174050';
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          product_id: '123e4567-e89b-42d3-a456-426614174099',
          updated_at: '2026-10-24T12:30:01+00:00',
        },
      ],
      error: null,
    });

    await expect(
      saveMobileProduct(
        {
          id: requestedProductId,
          updated_at: '2026-10-24T12:20:00+00:00',
          operationId: '123e4567-e89b-42d3-a456-426614174051',
          name: 'Rascunho editado',
          itemType: 'product',
          isDraft: true,
          variations: [{ id: 'new_TESTE-01', sku: 'TESTE-01', name: 'Rascunho editado' }],
          images: [],
          categoryIds: [],
        },
        { returnVersionAcknowledgement: true }
      )
    ).rejects.toThrow(/produto diferente do solicitado/i);
  });

  it('preserva promoção e custos próprios/herdados ao salvar um rascunho de família', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174000';
    const variationId = '123e4567-e89b-42d3-a456-426614174002';
    const inheritedCostVariationId = '123e4567-e89b-42d3-a456-426614174003';
    query.in.mockImplementation((column: string) =>
      Promise.resolve({
        data:
          column === 'id'
            ? [
                { id: variationId, cost_price: 31 },
                { id: inheritedCostVariationId, cost_price: 22 },
              ]
            : [],
        error: null,
      })
    );

    await saveMobileProduct({
      id: productId,
      updated_at: '2026-10-24T12:20:00+00:00',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
      name: 'Produto de teste',
      itemType: 'product',
      isDraft: true,
      unitPrice: '100,00',
      promoPrice: '80,00',
      discountPercent: '20',
      discountFixed: '20,00',
      costPrice: '50,00',
      hasVariations: true,
      variations: [
        {
          id: variationId,
          name: 'Produto Azul',
          sku: 'PROD-01',
          cost_price: 12,
          attributes: [{ name: 'Cor', value: 'Azul' }],
          syncUnitPrice: true,
          syncPromoPrice: false,
          price: '100,00',
          promoPrice: '65,00',
          syncCostPrice: false,
          costPrice: '40,00',
          comboItems: [],
        },
        {
          id: inheritedCostVariationId,
          name: 'Produto Verde',
          sku: 'PROD-02',
          cost_price: 14,
          syncUnitPrice: true,
          syncPromoPrice: true,
          syncCostPrice: true,
          price: '100,00',
          promoPrice: '80,00',
          costPrice: '50,00',
          comboItems: [],
        },
      ],
      images: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    expect(parameters.p_variations[0]).toMatchObject({
      price: 100,
      promo_price: 65,
      cost_price: 31,
      use_parent_price: true,
      use_parent_promo_price: false,
    });
    expect(parameters.p_product.is_draft).toBe(true);
    expect(parameters.p_product.technical_specs.draftProduct).not.toHaveProperty('discountPercent');
    expect(parameters.p_product.technical_specs.draftProduct).not.toHaveProperty('discountFixed');
    expect(parameters.p_product.technical_specs.draftProduct).toMatchObject({
      unitPrice: '100,00',
      promoPrice: '80,00',
    });
    expect(parameters.p_variations[1]).toMatchObject({
      price: 100,
      promo_price: 80,
      cost_price: 22,
      use_parent_price: true,
      use_parent_promo_price: true,
      status: 'draft',
      active: false,
    });
    expect(query.select).toHaveBeenCalledWith('id, cost_price');
    expect(parameters.p_product.technical_specs.variationDetails[0]).toMatchObject({
      syncUnitPrice: true,
      syncPromoPrice: false,
      syncCostPrice: false,
      promoPrice: '65,00',
      costPrice: '40,00',
    });
  });

  it('mantém custo próprio de variação nova no snapshot sem inicializar o CMPM', async () => {
    await saveMobileProduct({
      id: '123e4567-e89b-42d3-a456-426614174000',
      updated_at: '2026-10-24T12:20:00+00:00',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
      name: 'Produto de teste',
      itemType: 'product',
      unitPrice: '100,00',
      costPrice: '50,00',
      variations: [
        {
          id: 'new_PROD-01',
          name: 'Produto Azul',
          sku: 'PROD-01',
          syncCostPrice: false,
          costPrice: '40,00',
          comboItems: [],
        },
      ],
      images: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    expect(parameters.p_variations[0].cost_price).toBeNull();
    expect(parameters.p_product.technical_specs.variationDetails[0]).toMatchObject({
      syncCostPrice: false,
      costPrice: '40,00',
    });
  });

  it('preserva CMPM de variação composta sem serializar o saldo calculado', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174010';
    const variationId = '123e4567-e89b-42d3-a456-426614174012';
    query.in.mockImplementation((column: string) =>
      Promise.resolve({
        data: column === 'id' ? [{ id: variationId, cost_price: 27 }] : [],
        error: null,
      })
    );

    await saveMobileProduct({
      id: productId,
      updated_at: '2026-10-24T12:20:00+00:00',
      operationId: '123e4567-e89b-42d3-a456-426614174011',
      code: 'KIT',
      name: 'Kit de teste',
      itemType: 'composition',
      stock: 12,
      initialStock: 12,
      unitPrice: '200,00',
      costPrice: '90,00',
      hasVariations: true,
      variations: [
        {
          id: variationId,
          name: 'Kit Azul',
          sku: 'KIT-01',
          stock: 8,
          syncCostPrice: false,
          costPrice: '55,00',
          comboItems: [
            {
              productId: '123e4567-e89b-42d3-a456-426614174020',
              quantity: 2,
              stock: 8,
            },
          ],
        },
      ],
      images: [],
    });

    const parameters = mocks.rpc.mock.calls[0][1];
    expect(parameters.p_variations[0].cost_price).toBe(27);
    expect(parameters.p_variations[0]).not.toHaveProperty('stock');
    expect(parameters.p_product).not.toHaveProperty('stock');
    expect(parameters.p_product).not.toHaveProperty('initial_stock');
    expect(parameters.p_variations[0].combo_items).toEqual([
      expect.objectContaining({
        productId: '123e4567-e89b-42d3-a456-426614174020',
        quantity: 2,
        stock: 8,
      }),
    ]);
    expect(parameters.p_product.technical_specs.variationDetails[0]).toMatchObject({
      syncCostPrice: false,
      costPrice: '55,00',
    });
    expect(parameters.p_product.technical_specs.variationDetails[0]).not.toHaveProperty('stock');
    expect(mocks.from).not.toHaveBeenCalledWith('inventory_moves');
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

    expect(parameters.p_variations.map((variation: any) => variation.id)).toEqual([
      '123e4567-e89b-42d3-a456-426614174002',
      '123e4567-e89b-42d3-a456-426614174003',
    ]);
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

  it('omite variationId nulo no payload de composição como no ERP', async () => {
    const component = {
      productId: '123e4567-e89b-42d3-a456-426614174050',
      variationId: null,
      quantity: 1,
      unitPrice: 12,
      stock: 5,
      description: 'Mesa sem variação própria',
    };

    await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174051',
      operationId: '123e4567-e89b-42d3-a456-426614174052',
      code: 'KIT-BASE',
      name: 'Kit base',
      itemType: 'composition',
      productKind: 'normal',
      comboItems: [component],
      variations: [{
        id: '123e4567-e89b-42d3-a456-426614174053',
        name: 'Kit base',
        sku: 'KIT-BASE-01',
        comboItems: [component],
      }],
      images: [],
      categoryIds: [],
    });

    const [, parameters] = mocks.rpc.mock.calls[0];
    const normalizedComponent = {
      productId: component.productId,
      quantity: 1,
      unitPrice: 12,
      stock: 5,
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

