import { describe, expect, it } from 'vitest';
import { resolveWhatsAppSupportCatalogMessage } from '../../../../../../api/whatsappSupportCatalogMessage';
import type { ProductCatalogSendSelection } from '../../../../../../shared-utils/productCatalogFormSchemas';

const withTimeout = async <T>(promise: PromiseLike<T>): Promise<T> => promise;

describe('resolveWhatsAppSupportCatalogMessage', () => {
  it('rejeita cards nativos quando hidePrices é true', async () => {
    const selection: ProductCatalogSendSelection = {
      items: [{ productId: 'p1' }],
      bulkScope: null,
      hidePrices: true,
      deliveryMode: 'native',
    };
    await expect(
      resolveWhatsAppSupportCatalogMessage({} as any, selection, '', withTimeout),
    ).rejects.toThrow(/Cards nativos exibem o preço publicado na Meta/);
  });

  it('rejeita cards nativos quando items excede 30', async () => {
    const items = Array.from({ length: 31 }, (_, i) => ({ productId: `p${i}` }));
    const selection: ProductCatalogSendSelection = {
      items,
      bulkScope: null,
      hidePrices: false,
      deliveryMode: 'native',
    };
    await expect(
      resolveWhatsAppSupportCatalogMessage({} as any, selection, '', withTimeout),
    ).rejects.toThrow(/Cards nativos aceitam até 30 produtos/);
  });

  it('resolve bulkScope com até 30 produtos para cards nativos via RPC', async () => {
    const selectCalls: Array<{ table: string; columns: string }> = [];
    const product = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Armário Multiuso',
      marketplace_title: 'Armário Multiuso 2 Portas',
      unit_price: 399,
      status: 'published',
      active: true,
      deleted: false,
      deleted_at: null,
      is_draft: false,
      code: 'ARM-01',
      images: ['https://example.com/armario.jpg'],
    };

    const userDb: any = {
      rpc: async (fn: string, params: any) => {
        if (fn === 'customer_support_catalog_summary_page') {
          return {
            data: {
              totalCount: 1,
              categoryName: 'Armários Multiuso',
              products: [{ id: product.id, hasVariations: false, variations: [] }],
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      from: (table: string) => ({
        select: (columns: string) => {
          selectCalls.push({ table, columns });
          if (table === 'product_variations') {
            return { in: async () => ({ data: [], error: null }) };
          }
          return {
            in: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    or: () => ({
                      or: () => ({
                        or: async () => ({ data: [product], error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        },
      }),
    };

    const selection: ProductCatalogSendSelection = {
      items: [],
      bulkScope: {
        selectionMode: 'all_matching',
        categoryName: 'Armários Multiuso',
        total: 1,
        excludedProductIds: [],
        filters: { categoryId: 'cat-armarios', search: '', brand: '' },
      },
      hidePrices: false,
      deliveryMode: 'native',
    };

    const result = await resolveWhatsAppSupportCatalogMessage(
      userDb,
      selection,
      'Confira este produto:',
      withTimeout,
    );

    expect(result.text).toBe('Confira este produto:');
    expect(result.nativeProducts).toBeDefined();
    expect(result.nativeProducts).toHaveLength(1);
    expect(result.nativeProducts?.[0].retailerId).toBe('ARM-01');
    expect(selectCalls).toEqual([
      {
        table: 'products',
        columns: 'id,name,marketplace_title,description,slug,unit_price,price,promo_price,brand,active,is_draft,status,deleted,deleted_at,item_type,technical_specs,opportunity_id,stock,images,code,is_salvado,product_kind,material,condition,product_categories(categories(name,type))',
      },
      {
        table: 'product_variations',
        columns: 'id,product_id,status,active,name,sku,image_url,price,promo_price,stock,attributes,description,use_parent_price,use_parent_promo_price,use_parent_name,use_parent_description',
      },
    ]);
  });

  it('usa uma projeção curta para link e mantém o preço promocional atual', async () => {
    const selectCalls: string[] = [];
    const product = {
      id: 'product-1',
      name: 'Mesa lateral',
      marketplace_title: 'Mesa lateral em madeira',
      unit_price: 120,
      promo_price: 99,
      technical_specs: {},
      images: ['não deve ser solicitada no modo link'],
    };
    const query: any = {
      select: (columns: string) => { selectCalls.push(columns); return query; },
      in: () => query,
      eq: () => query,
      is: () => query,
      or: () => query,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [product], error: null }).then(resolve),
    };
    const userDb: any = { from: () => query };
    const selection: ProductCatalogSendSelection = {
      items: [{ productId: product.id }],
      bulkScope: null,
      hidePrices: false,
      deliveryMode: 'link',
    };

    const result = await resolveWhatsAppSupportCatalogMessage(userDb, selection, '', withTimeout);

    expect(selectCalls).toEqual(['id,name,marketplace_title,unit_price,price,promo_price,technical_specs']);
    expect(result.text).toContain('Mesa lateral em madeira');
    expect(result.text).toMatch(/R\$[\u00a0 ]99,00/);
  });

  it('resolve múltiplos produtos da categoria para lista nativa (product_list)', async () => {
    const product1 = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Armário Branco',
      unit_price: 299,
      status: 'published',
      active: true,
      deleted: false,
      deleted_at: null,
      is_draft: false,
      code: 'ARM-BR',
      images: ['https://example.com/arm-br.jpg'],
    };
    const product2 = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Armário Preto',
      unit_price: 349,
      status: 'published',
      active: true,
      deleted: false,
      deleted_at: null,
      is_draft: false,
      code: 'ARM-PR',
      images: ['https://example.com/arm-pr.jpg'],
    };

    const userDb: any = {
      rpc: async (fn: string) => {
        if (fn === 'customer_support_catalog_summary_page') {
          return {
            data: {
              totalCount: 2,
              categoryName: 'Armários Multiuso',
              products: [
                { id: product1.id, hasVariations: false, variations: [] },
                { id: product2.id, hasVariations: false, variations: [] },
              ],
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      from: (table: string) => {
        if (table === 'products') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      or: () => ({
                        or: () => ({
                          or: async () => ({
                            data: [product1, product2],
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'product_variations') {
          return {
            select: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          };
        }
        throw new Error(`Tabela inesperada: ${table}`);
      },
    };

    const selection: ProductCatalogSendSelection = {
      items: [],
      bulkScope: {
        selectionMode: 'all_matching',
        categoryName: 'Armários Multiuso',
        total: 2,
        excludedProductIds: [],
        filters: { categoryId: 'cat-armarios', search: '', brand: '' },
      },
      hidePrices: false,
      deliveryMode: 'native',
    };

    const result = await resolveWhatsAppSupportCatalogMessage(userDb, selection, '', withTimeout);
    expect(result.text).toBe('Separei 2 produtos do nosso catálogo para você:');
    expect(result.nativeProducts).toHaveLength(2);
    expect(result.nativeProducts?.map((p) => p.retailerId)).toEqual(['ARM-BR', 'ARM-PR']);
  });

  it('recupera o retailer ID da primeira variação publicada quando o item não tem variationId explícito', async () => {
    const product = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Cômoda',
      unit_price: 499,
      status: 'published',
      active: true,
      deleted: false,
      deleted_at: null,
      is_draft: false,
      code: 'COM-01',
      images: ['https://example.com/comoda.jpg'],
    };
    const variation = {
      id: '44444444-4444-4444-8444-444444444444',
      product_id: product.id,
      sku: 'COM-01-BR',
      name: 'Cômoda Branca',
      status: 'published',
      active: true,
      price: 499,
    };

    const userDb: any = {
      from: (table: string) => {
        if (table === 'products') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      or: () => ({
                        or: () => ({
                          or: async () => ({ data: [product], error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'product_variations') {
          return {
            select: () => ({
              in: async () => ({ data: [variation], error: null }),
            }),
          };
        }
        throw new Error(`Tabela inesperada: ${table}`);
      },
    };

    const selection: ProductCatalogSendSelection = {
      items: [{ productId: product.id }],
      bulkScope: null,
      hidePrices: false,
      deliveryMode: 'native',
    };

    const result = await resolveWhatsAppSupportCatalogMessage(userDb, selection, '', withTimeout);
    expect(result.nativeProducts).toHaveLength(1);
    expect(result.nativeProducts?.[0].retailerId).toBe('COM-01-BR');
    expect(result.nativeProducts?.[0].name).toContain('Cômoda Branca');
  });
});
