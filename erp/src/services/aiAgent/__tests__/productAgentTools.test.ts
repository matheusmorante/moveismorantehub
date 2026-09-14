import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productAgentTools } from '../productAgentTools';
import { GeminiToolDispatcher } from '../geminiToolDispatcher';
import { supabase } from '@/pages/utils/supabaseConfig';

// Identificador único obrigatório de teste
const testRunId = `TEST_AUT_${Date.now()}_prod_tools`;

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe(`[${testRunId}] productAgentTools - Consulta e Ficha Técnica de Produtos`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbProduct = {
    id: 'f87a3e91-1234-4a5b-bcde-998877665544', // UUID interno que JAMAIS deve vazar
    code: '100010',
    sku: '100010',
    name: `[TESTE_AUT] Sofá Retrátil 3 Lugares`,
    description: `[TESTE_AUT] Sofá Retrátil e Reclinável em Tecido Suede Marrom`,
    category: 'Sofás',
    brand: 'Móveis Morante',
    condition: 'novo',
    supplier_id: 'supp-uuid-9999', // UUID interno que JAMAIS deve vazar
    supplier_ids: ['supp-uuid-9999'],
    opportunity_id: 'opp-uuid-8888',
    unit_price: 1899.9,
    price: 1899.9,
    promo_price: 1699.9,
    cost_price: 950.0,
    freight_cost: 80.0,
    stock: 7,
    min_stock: 2,
    unit: 'UN',
    active: true,
    deleted: false,
    width: 210,
    height: 105,
    depth: 95,
    weight: 65,
    pkg_width: 215,
    pkg_height: 110,
    pkg_depth: 100,
    material: 'Madeira Maciça de Eucalipto e Espuma D33',
    colors: 'Marrom',
    main_differential: 'Molas ensacadas e espuma D33 selada',
    images: ['https://exemplo.com/sofa1.jpg', 'https://exemplo.com/sofa2.jpg'],
    product_variations: [
      {
        id: 'var-uuid-001', // UUID interno que JAMAIS deve vazar
        product_id: 'f87a3e91-1234-4a5b-bcde-998877665544',
        sku: '100010-01',
        name: `[TESTE_AUT] Sofá Retrátil 3 Lugares - Marrom`,
        price: 1899.9,
        promo_price: 1699.9,
        cost_price: 950.0,
        stock: 4,
        active: true,
        attributes: [{ name: 'Cor', value: 'Marrom' }, { name: 'Lugares', value: '3' }],
        images: ['https://exemplo.com/sofa-marrom.jpg'],
      },
      {
        id: 'var-uuid-002', // UUID interno que JAMAIS deve vazar
        product_id: 'f87a3e91-1234-4a5b-bcde-998877665544',
        sku: '100010-02',
        name: `[TESTE_AUT] Sofá Retrátil 3 Lugares - Cinza`,
        price: 1899.9,
        promo_price: 1699.9,
        cost_price: 950.0,
        stock: 3,
        active: true,
        attributes: [{ name: 'Cor', value: 'Cinza' }, { name: 'Lugares', value: '3' }],
        images: ['https://exemplo.com/sofa-cinza.jpg'],
      },
    ],
  };

  it('buscarProdutos: deve retornar lista sanitizada sem NENHUM id/uuid do banco de dados', async () => {
    const mockQueryBuilder: any = {
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [mockDbProduct],
        count: 1,
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_variations') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue(mockQueryBuilder),
      };
    });

    const response = await productAgentTools.buscarProdutos({ termo: 'Sofá' });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data!.length).toBe(1);

    const prod = response.data![0];
    expect(prod.codigo).toBe('100010');
    expect(prod.nome).toContain('Sofá Retrátil 3 Lugares');
    expect(prod.preco).toBe(1899.9);
    expect(prod.estoque).toBe(7);
    expect(prod.quantidadeVariacoes).toBe(2);
    expect(prod.skusVariacoes).toEqual(['100010-01', '100010-02']);

    // Validação estrita de segurança: PROIBIDO EXPOR IDs DE BANCO
    expect((prod as any).id).toBeUndefined();
    expect((prod as any).product_id).toBeUndefined();
    expect((prod as any).supplier_id).toBeUndefined();
    expect((prod as any).opportunity_id).toBeUndefined();
  });

  it('obterDetalhesProduto: deve retornar ficha técnica completa sem ids internos', async () => {
    const mockSelect = {
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockDbProduct,
            error: null,
          }),
        }),
      }),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'products') {
        return { select: vi.fn().mockReturnValue(mockSelect) };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const response = await productAgentTools.obterDetalhesProduto({ codigoOuSku: '100010' });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();

    const details = response.data!;
    expect(details.codigo).toBe('100010');
    expect(details.nome).toContain('Sofá Retrátil 3 Lugares');
    expect(details.precos.precoVenda).toBe(1899.9);
    expect(details.precos.precoPromocional).toBe(1699.9);
    expect(details.precos.precoCusto).toBe(950.0);
    expect(details.estoque.atual).toBe(7);
    expect(details.dimensoes.larguraCm).toBe(210);
    expect(details.dimensoes.alturaCm).toBe(105);
    expect(details.caracteristicas?.material).toContain('Madeira Maciça');
    expect(details.fotos).toHaveLength(2);
    expect(details.variacoes).toHaveLength(2);

    // Validação estrita de cada variação
    const var1 = details.variacoes[0];
    expect(var1.sku).toBe('100010-01');
    expect(var1.atributos).toEqual({ Cor: 'Marrom', Lugares: '3' });
    expect(var1.estoque).toBe(4);

    // Validação de segurança: PROIBIDO EXPOR IDs/UUIDs NO PRODUTO E NAS VARIAÇÕES
    expect((details as any).id).toBeUndefined();
    expect((details as any).supplierId).toBeUndefined();
    expect((details as any).supplier_id).toBeUndefined();
    expect((details as any).opportunityId).toBeUndefined();
    expect((var1 as any).id).toBeUndefined();
    expect((var1 as any).product_id).toBeUndefined();
  });

  it('obterDetalhesProduto: deve falhar amigavelmente se produto não for encontrado', async () => {
    const mockSelect = {
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_variations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const response = await productAgentTools.obterDetalhesProduto({ codigoOuSku: '999999' });

    expect(response.success).toBe(false);
    expect(response.code).toBe('PRODUCT_NOT_FOUND');
    expect(response.error).toContain('Nenhum produto encontrado');
  });

  it('obterDetalhesProduto: deve rejeitar código ou sku vazio', async () => {
    const response = await productAgentTools.obterDetalhesProduto({ codigoOuSku: '   ' });

    expect(response.success).toBe(false);
    expect(response.code).toBe('INVALID_ARGUMENT');
  });

  it('GeminiToolDispatcher: deve despachar buscarProdutos e obterDetalhesProduto', async () => {
    // Teste de despacho via GeminiToolDispatcher
    const dispatch1 = await GeminiToolDispatcher.execute({
      name: 'buscarProdutos',
      args: { termo: 'Sofá' },
    });
    expect(dispatch1.record.name).toBe('buscarProdutos');
    expect(dispatch1.record.label).toBe('Pesquisando produtos no catálogo');

    const dispatch2 = await GeminiToolDispatcher.execute({
      name: 'obterDetalhesProduto',
      args: { codigoOuSku: '100010' },
    });
    expect(dispatch2.record.name).toBe('obterDetalhesProduto');
    expect(dispatch2.record.label).toBe('Carregando detalhes e ficha técnica do produto');
  });
});
