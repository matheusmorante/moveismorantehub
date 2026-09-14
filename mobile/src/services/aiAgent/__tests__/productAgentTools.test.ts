import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileToolDispatcher } from '../mobileToolDispatcher';
import { mobileAgentTools } from '../mobileAgentTools';
import { supabase } from '../../supabaseClient';
import * as mobileProductFetchService from '../../../features/products/services/mobileProductFetchService';

// Identificador único obrigatório de teste
const testRunId = `TEST_AUT_${Date.now()}_mob_prod_tools`;

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../features/products/services/mobileProductFetchService', () => ({
  fetchMobileProductsPage: vi.fn(),
}));

describe(`[${testRunId}] Mobile productAgentTools - Consulta de Produtos`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMobileDbProduct = {
    id: 'mob-uuid-secret-12345', // JAMAIS deve vazar
    code: '200050',
    sku: '200050',
    name: `[TESTE_AUT] Mesa de Jantar 6 Cadeiras`,
    description: `[TESTE_AUT] Mesa com Tampo de Vidro e 6 Cadeiras Acolchoadas`,
    category: 'Salas de Jantar',
    brand: 'Móveis Morante',
    condition: 'novo',
    supplier_id: 'supp-secret-999',
    unit_price: 2499.0,
    price: 2499.0,
    promo_price: 2299.0,
    cost_price: 1300.0,
    freight_cost: 100.0,
    stock: 5,
    min_stock: 1,
    unit: 'CJ',
    active: true,
    deleted: false,
    width: 160,
    height: 80,
    depth: 90,
    weight: 75,
    material: 'MDF com lâmina de madeira e vidro temperado',
    colors: 'Off White / Cinza',
    main_differential: 'Vidro temperado 4mm colado',
    images: ['https://exemplo.com/mesa1.jpg'],
    product_variations: [
      {
        id: 'var-secret-abc', // JAMAIS deve vazar
        product_id: 'mob-uuid-secret-12345',
        sku: '200050-01',
        name: `[TESTE_AUT] Mesa 6 Lugares - Tecido Cinza`,
        price: 2499.0,
        promo_price: 2299.0,
        cost_price: 1300.0,
        stock: 3,
        active: true,
        attributes: { Tecido: 'Suede Cinza' },
        images: ['https://exemplo.com/mesa-cinza.jpg'],
      },
      {
        id: 'var-secret-def', // JAMAIS deve vazar
        product_id: 'mob-uuid-secret-12345',
        sku: '200050-02',
        name: `[TESTE_AUT] Mesa 6 Lugares - Tecido Bege`,
        price: 2499.0,
        promo_price: 2299.0,
        cost_price: 1300.0,
        stock: 2,
        active: true,
        attributes: { Tecido: 'Linho Bege' },
        images: ['https://exemplo.com/mesa-bege.jpg'],
      },
    ],
  };

  it('buscarProdutos: deve retornar produtos sanitizados e proibir IDs de banco', async () => {
    vi.mocked(mobileProductFetchService.fetchMobileProductsPage).mockResolvedValueOnce({
      data: [
        {
          ...mockMobileDbProduct,
          allVariations: mockMobileDbProduct.product_variations,
        },
      ],
      total: 1,
    });

    const result = await mobileAgentTools.buscarProdutos({ termo: 'Mesa' });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const prods = result.data as any[];
    expect(prods.length).toBe(1);

    const prod = prods[0];
    expect(prod.codigo).toBe('200050');
    expect(prod.nome).toContain('Mesa de Jantar 6 Cadeiras');
    expect(prod.preco).toBe(2499.0);
    expect(prod.estoque).toBe(5);
    expect(prod.quantidadeVariacoes).toBe(2);
    expect(prod.skusVariacoes).toEqual(['200050-01', '200050-02']);

    // Omissão estrita de IDs
    expect(prod.id).toBeUndefined();
    expect(prod.product_id).toBeUndefined();
    expect(prod.supplier_id).toBeUndefined();
  });

  it('obterDetalhesProduto: deve retornar ficha técnica detalhada sem IDs', async () => {
    const mockSelect = {
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockMobileDbProduct,
            error: null,
          }),
        }),
      }),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockSelect),
    });

    const result = await mobileAgentTools.obterDetalhesProduto({ codigoOuSku: '200050' });

    expect(result.success).toBe(true);
    const details = result.data as any;

    expect(details.codigo).toBe('200050');
    expect(details.nome).toContain('Mesa de Jantar 6 Cadeiras');
    expect(details.precos.precoVenda).toBe(2499.0);
    expect(details.dimensoes.larguraCm).toBe(160);
    expect(details.variacoes).toHaveLength(2);

    const v1 = details.variacoes[0];
    expect(v1.sku).toBe('200050-01');
    expect(v1.atributos).toEqual({ Tecido: 'Suede Cinza' });

    // Omissão estrita de IDs
    expect(details.id).toBeUndefined();
    expect(details.supplierId).toBeUndefined();
    expect(v1.id).toBeUndefined();
    expect(v1.product_id).toBeUndefined();
  });

  it('MobileToolDispatcher: deve despachar buscarProdutos e obterDetalhesProduto', async () => {
    vi.mocked(mobileProductFetchService.fetchMobileProductsPage).mockResolvedValueOnce({
      data: [],
      total: 0,
    });

    const { record, functionResponse } = await MobileToolDispatcher.execute({
      name: 'buscarProdutos',
      args: { termo: 'Cadeira' },
    });

    expect(record.name).toBe('buscarProdutos');
    expect(functionResponse.response.content.success).toBe(true);

    const { record: recDetails } = await MobileToolDispatcher.execute({
      name: 'obterDetalhesProduto',
      args: { codigoOuSku: '999999' },
    });

    expect(recDetails.name).toBe('obterDetalhesProduto');
  });
});
