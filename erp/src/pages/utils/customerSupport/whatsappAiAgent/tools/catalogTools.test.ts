import { describe, expect, it, vi } from 'vitest';
import { handleBuscarProdutos, handleObterDetalhesProduto } from './catalogTools.js';

const makeQuery = (data: unknown, error: unknown = null) => {
  const query: Record<string, any> = {};
  for (const method of ['select', 'eq', 'gt', 'filter', 'or', 'order', 'is']) {
    query[method] = vi.fn(() => query);
  }
  query.limit = vi.fn(() => Promise.resolve({ data, error }));
  query.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return query;
};

const context = { conversationId: 'conversation-1', contactPhone: '41999998888' };

describe('busca de produtos do atendimento WhatsApp', () => {
  it('mantém estoque e limite padrão quando parâmetros opcionais são nulos', async () => {
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
    expect(productsQuery.gt).toHaveBeenCalledWith('stock', 0);
    expect(productsQuery.limit).toHaveBeenCalledWith(5);
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
      { termo: 'balcão para pia Florença', apenasEmEstoque: false },
      context
    );

    expect(result.success).toBe(true);
    expect(result.produtos).toHaveLength(1);
    expect(result.produtos[0].codigo).toBe('000217');
    expect(result.produtos[0].correspondencia).toBe('correspondente');
    const serverFilter = productsQuery.or.mock.calls[0][0];
    expect(serverFilter.match(/name\.imatch/g)?.length).toBeGreaterThanOrEqual(6);
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
});
