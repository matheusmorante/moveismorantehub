import { describe, expect, it, vi } from 'vitest';
import { handleConsultarMeusPedidos } from './orderTools.js';

const context = {
  conversationId: 'conversation-2',
  contactPhone: '+55 (41) 99999-8888',
};

const makeQuery = (data: unknown, error: unknown = null) => {
  const query: Record<string, any> = {};
  for (const method of ['select', 'eq', 'or', 'order']) {
    query[method] = vi.fn(() => query);
  }
  query.limit = vi.fn(() => Promise.resolve({ data, error }));
  return query;
};

describe('consulta de pedidos do atendimento WhatsApp', () => {
  it('não associa pedidos a um telefone apenas parecido', async () => {
    const peopleQuery = makeQuery([{ id: 'wrong-customer', phone: '+55 (41) 99999-8887' }]);
    const ordersQuery = makeQuery([]);
    const supabase = {
      from: vi.fn((table: string) => table === 'people' ? peopleQuery : ordersQuery),
    };

    const result = await handleConsultarMeusPedidos(supabase as any, {}, context);

    expect(result.success).toBe(true);
    expect(result.pedidos).toEqual([]);
    expect(ordersQuery.eq).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('consulta pedidos pelo ID do cliente confirmado por telefone exato', async () => {
    const peopleQuery = makeQuery([{ id: 'customer-1', phone: '+55 (41) 99999-8888' }]);
    const ordersQuery = makeQuery([
      {
        id: 'order-1',
        order_number: 321,
        order_type: 'sale',
        status: 'scheduled',
        items: [{ name: 'Mesa', quantity: 1 }],
      },
    ]);
    const supabase = {
      from: vi.fn((table: string) => table === 'people' ? peopleQuery : ordersQuery),
    };

    const result = await handleConsultarMeusPedidos(supabase as any, {}, context);

    expect(result.success).toBe(true);
    expect(result.totalPedidos).toBe(1);
    expect(ordersQuery.eq).toHaveBeenCalledWith('customer_id', 'customer-1');
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('distingue falha na busca de cadastro de ausência de pedidos', async () => {
    const peopleQuery = makeQuery(null, new Error('falha interna do banco'));
    const supabase = { from: vi.fn(() => peopleQuery) };

    const result = await handleConsultarMeusPedidos(supabase as any, {}, context);

    expect(result.success).toBe(false);
    expect(result.code).toBe('DATABASE_ERROR');
    expect(JSON.stringify(result)).not.toContain('falha interna');
  });
});
