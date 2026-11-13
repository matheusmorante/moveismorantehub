import { describe, expect, it, vi } from 'vitest';
import {
  handleBuscarProdutos,
  handleListarCategoriasECaracteristicasProduto,
  handleObterDetalhesProduto,
} from './catalogTools.js';

const makeQuery = (data: unknown, error: unknown = null) => {
  const query: Record<string, any> = {};
  for (const method of ['select', 'eq', 'gt', 'filter', 'or', 'order', 'is', 'in']) {
    query[method] = vi.fn(() => query);
  }
  query.limit = vi.fn(() => Promise.resolve({ data, error }));
  query.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return query;
};

const context = { conversationId: 'conversation-1', contactPhone: '41999998888' };

describe('busca de produtos do atendimento WhatsApp', () => {
  it('não restringe buscas gerais a produtos em estoque quando o parâmetro é nulo', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([]);
    const supabase = {
      from: vi.fn((table: string) => table === 'product_variations' ? variationsQuery : productsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'mesa', categoria: null, apenasEmEstoque: null, limite: null },
      context
    );

    expect(result.success).toBe(true);
    expect(productsQuery.gt).not.toHaveBeenCalled();
    expect(productsQuery.limit).toHaveBeenCalledWith(5);
  });

  it('normaliza plural, linguagem coloquial e erro comum ao procurar balcão para pia', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([
      {
        code: '000122',
        name: 'Balcão para Pia 1,20 3 Gavetas 100% MDF Darmovel',
        stock: -2,
        unit_price: 479,
        product_variations: [
          { sku: '000122-02', name: 'Balcão para Pia Darmovel Branco', stock: -1, active: true },
        ],
      },
    ]);
    const supabase = {
      from: vi.fn((table: string) => table === 'product_variations' ? variationsQuery : productsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'bacoes pra pia', apenasEmEstoque: false },
      context
    );

    expect(result.success).toBe(true);
    expect(result.produtos).toHaveLength(1);
    expect(result.produtos[0].codigo).toBe('000122');
    expect(productsQuery.or.mock.calls[0][0]).toContain('technical_specs->testArtifact->>is_test.is.null');
    expect(variationsQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('technical_specs->testArtifact->>is_test.is.null'),
      { referencedTable: 'products' }
    );
  });

  it('corrige o erro "apra" e o nome informal da categoria balcão para pia', async () => {
    const productsQuery = makeQuery([{
      code: '000122',
      name: 'Balcão para Pia 1,20 3 Gavetas 100% MDF Darmovel',
      category: null,
      category_details: { name: 'Balcões para Pia', type: 'category' },
      unit_price: 479,
      product_variations: [],
    }]);
    const supabase = { from: vi.fn(() => productsQuery) };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'BALCÃO APRA PIA', categoria: 'Balcão apra pia' },
      context
    );

    const categoryFilter = productsQuery.filter.mock.calls.find(([field]: [string]) => field === 'category_details.name');
    expect(categoryFilter?.[2]).toContain('[oó]');
    expect(categoryFilter?.[2]).toContain('$');
    expect(result.produtos.map((product: any) => product.codigo)).toEqual(['000122']);
  });

  it('mantém Pias separada de Balcões para Pia quando termo e categoria são enviados juntos', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([{
      code: '000353',
      name: 'Pia de Mármore Sintético 1,20m',
      category: null,
      category_details: { name: 'Pias', type: 'category' },
      unit_price: 350,
      product_variations: [],
    }]);
    const supabase = {
      from: vi.fn((table: string) => table === 'product_variations' ? variationsQuery : productsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'pia', categoria: 'Pias', enviarCartoes: true },
      context
    );

    expect(variationsQuery.select).toHaveBeenCalledWith(
      'product_id,products!inner(id,category_details:categories!products_category_id_fkey!inner(name,type))'
    );
    expect(variationsQuery.filter).toHaveBeenCalledWith(
      'products.category_details.name',
      'imatch',
      expect.stringContaining('^')
    );
    expect(productsQuery.select.mock.calls[0][0]).toContain(
      'category_details:categories!products_category_id_fkey!inner(name,type)'
    );
    expect(productsQuery.eq).toHaveBeenCalledWith('category_details.type', 'category');
    const categoryFilter = productsQuery.filter.mock.calls.find(([field]: [string]) => field === 'category_details.name');
    expect(categoryFilter?.[1]).toBe('imatch');
    expect(categoryFilter?.[2]).toContain('^');
    expect(categoryFilter?.[2]).toContain('$');
    expect(productsQuery.filter.mock.invocationCallOrder[0]).toBeLessThan(
      productsQuery.limit.mock.invocationCallOrder[0]
    );
    expect(result.produtos.map((product: any) => product.codigo)).toEqual(['000353']);
    expect(result.produtos[0].categoria).toBe('Pias');
  });

  it('permite trocar para Balcões para Pia preservando medida e cor como qualificadores', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([{
      code: '000217',
      name: 'Balcão para Pia de 1,20m Florença Branco',
      category: null,
      category_details: { name: 'Balcões para Pia', type: 'category' },
      unit_price: 649,
      product_variations: [],
    }]);
    const supabase = {
      from: vi.fn((table: string) => table === 'product_variations' ? variationsQuery : productsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: '1,20 branco', categoria: 'Balcões para Pia' },
      context
    );

    const categoryFilter = productsQuery.filter.mock.calls.find(([field]: [string]) => field === 'category_details.name');
    expect(categoryFilter?.[2]).toContain('^');
    expect(categoryFilter?.[2]).toContain('$');
    expect(productsQuery.or.mock.calls[0][0]).toContain('name.imatch');
    expect(result.produtos.map((product: any) => product.codigo)).toEqual(['000217']);
    expect(result.produtos[0].categoria).toBe('Balcões para Pia');
  });

  it('lista somente os nomes reais de categorias e ambientes do ERP', async () => {
    const categoriesQuery = makeQuery([
      { name: 'Balcões para Pia', type: 'category' },
      { name: 'Pias', type: 'category' },
      { name: 'Cozinha', type: 'environment' },
    ]);
    const supabase = { from: vi.fn(() => categoriesQuery) };

    const result = await handleListarCategoriasECaracteristicasProduto(
      supabase as any,
      {},
      context
    );

    expect(categoriesQuery.select).toHaveBeenCalledWith('name, type');
    expect(categoriesQuery.in).toHaveBeenCalledWith('type', ['category', 'environment']);
    expect(result.categorias).toEqual([
      { nome: 'Balcões para Pia' },
      { nome: 'Pias' },
    ]);
    expect(result.ambientesPrincipais).toEqual(['Cozinha']);
  });

  it('mostra modelos mesmo quando saldo no banco está zerado ou negativo sem filtrar por estoque', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([{
      code: '000217',
      name: 'Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença',
      stock: -2,
      unit_price: 649,
      product_variations: [
        { sku: '000217-01', name: 'Florença Off White', stock: 0, active: true },
      ],
    }]);
    const supabase = {
      from: vi.fn((table: string) => table === 'product_variations' ? variationsQuery : productsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'balcões para pia' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.catalogoSemEstoque).toBeUndefined();
    expect(result.produtos[0].codigo).toBe('000217');
    expect(result.mensagem).toContain('1 modelo(s) encontrado(s)');
  });

  it('não oculta produto ativo com variações correspondentes', async () => {
    const variationParentId = '76abcf16-d16c-4d66-84df-d75d1096cc4e';
    const variationsQuery = makeQuery([{ product_id: variationParentId, stock: 2 }]);
    const productsQuery = makeQuery([{
      code: '000217',
      name: 'Balcão para Pia Florença',
      stock: 0,
      unit_price: 649,
      product_variations: [
        { sku: '000217-01', name: 'Florença Branco', stock: 2, active: true },
      ],
    }]);
    const supabase = {
      from: vi.fn((table: string) => table === 'product_variations' ? variationsQuery : productsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'balcão para pia' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.produtos[0].codigo).toBe('000217');
    expect(result.produtos[0].variacoes).toHaveLength(1);
    expect(result.produtos[0].variacoes[0].sku).toBe('000217-01');
  });

  it('retorna somente o balcão para pia Florença e exclui o balcão de canto com o mesmo nome de linha', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([
      {
        code: '004055',
        name: 'Florenca - Balcao Canto Obliquo em Madeira MDF Angelin/Cinza',
        line: 'Florença',
        stock: 0,
        unit_price: 499,
      },
      {
        code: '000217',
        name: 'Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença',
        line: 'Florença',
        stock: -2,
        unit_price: 499,
      },
    ]);
    const supabase = {
      from: vi.fn((table: string) =>
        table === 'product_variations' ? variationsQuery : productsQuery
      ),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'balcão para pia Florença' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.produtos).toHaveLength(1);
    expect(result.produtos[0].codigo).toBe('000217');
    expect(result.produtos[0].correspondencia).toBe('correspondente');
    const serverFilter = productsQuery.or.mock.calls[0][0];
    expect(serverFilter.match(/name\.imatch/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('interrompe a busca quando variações retornam mais do que o limite seguro', async () => {
    const variationsQuery = makeQuery(
      Array.from({ length: 51 }, (_, index) => ({ product_id: `product-${index}` }))
    );
    const supabase = {
      from: vi.fn(() => variationsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'cadeira' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('SEARCH_TOO_BROAD');
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('diferencia uma busca sem correspondência de uma falha técnica', async () => {
    const variationsQuery = makeQuery([]);
    const productsQuery = makeQuery([]);
    const supabase = {
      from: vi.fn((table: string) =>
        table === 'product_variations' ? variationsQuery : productsQuery
      ),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'balcão para pia modelo inexistente' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.mensagem).toContain('Não encontrei um produto');
  });

  it('retorna erro seguro em falha de consulta sem alegar que não há produto', async () => {
    const variationsQuery = makeQuery([], new Error('erro interno da tabela de variações'));
    const supabase = {
      from: vi.fn(() => variationsQuery),
    };

    const result = await handleBuscarProdutos(
      supabase as any,
      { termo: 'balcão para pia Florença' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('DATABASE_ERROR');
    expect(result.erro).not.toContain('tabela de variações');
  });

  it('não apresenta variações inativas ou mescladas como opções disponíveis', async () => {
    const query = makeQuery({ code: '000001', name: 'Mesa', active: true, stock: 3, unit_price: 300, promo_price: 250,
      product_variations: [
        { sku: 'ativa', active: true, merged_to_variation_id: null, stock: 2, use_parent_price: true, use_parent_promo_price: true },
        { sku: 'propria', active: true, merged_to_variation_id: null, stock: 1, use_parent_price: false,
          use_parent_promo_price: false, price: 400, promo_price: 350 },
        { sku: 'inativa', active: false, merged_to_variation_id: null, stock: 3 },
        { sku: 'mesclada', active: true, merged_to_variation_id: 'target', stock: 4 },
      ] });
    const result = await handleObterDetalhesProduto({ from: () => query } as any, { codigoOuSku: '000001' }, context);
    expect(result.produto.variacoes.map((variation: any) => variation.sku)).toEqual(['ativa', 'propria']);
    expect(result.produto.variacoes.map((variation: any) => [variation.precoVenda, variation.precoPromocional]))
      .toEqual([[300, 250], [400, 350]]);
    expect(query.eq).toHaveBeenCalledWith('product_variations.active', true);
    expect(query.is).toHaveBeenCalledWith('product_variations.merged_to_variation_id', null);
  });

  it('carrega detalhes do produto com variações ativas sem expor dados de estoque', async () => {
    const product = {
      id: 'product-id',
      code: '000217',
      name: 'Balcão para Pia Florença',
      stock: 0,
      unit_price: 649,
      product_variations: [
        { sku: '000217-01', name: 'Florença Branco', stock: 2, active: true, merged_to_variation_id: null },
      ],
    };
    const productQuery = makeQuery(product);
    productQuery.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: product, error: null });
    const variationQuery = makeQuery({ product_id: product.id });
    const supabase = {
      from: vi.fn((table: string) => table === 'products' ? productQuery : variationQuery),
    };

    const result = await handleObterDetalhesProduto(
      supabase as any,
      { codigoOuSku: '000217-01' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.produto.codigo).toBe('000217');
    expect(result.produto.variacoes[0].sku).toBe('000217-01');
    expect(result.produto.emEstoque).toBeUndefined();
  });
});
