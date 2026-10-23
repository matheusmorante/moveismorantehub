import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchConversations } from '@/pages/utils/customerSupport/customerSupportService';

const summaries = 'customer_support_list_customer_summaries';
const counts = 'customer_support_count_customer_orders';
const feedback = 'Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.';
const row = {
  id: 'conversation-unit', customer_id: 'customer-unit', customer_link_status: 'manually_linked',
  contact_name: 'Contato unitário', contact_phone: '+5511999990000', tags: [], unread_count: 0,
  is_archived: false, created_at: '2026-10-22T10:00:00Z', total_count: 1,
};

function client(overrides: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    customer_support_list_conversations: { data: [row], error: null },
    [summaries]: { data: [{ id: 'customer-unit', full_name: 'Cliente unitário' }], error: null },
    [counts]: { data: [{ customer_id: 'customer-unit', order_count: 2 }], error: null },
    ...overrides,
  };
  return { rpc: vi.fn((name: string) => Promise.resolve(responses[name])) };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Hidratação comercial da lista — sem PostgreSQL', () => {
  it.each([summaries, counts])('recusa erro, ausência ou formato inválido de %s', async (operation) => {
    for (const response of [
      { data: null, error: { code: '42501', message: 'Private server detail' } },
      { data: [], error: { code: '08006', message: 'Private server detail' } },
      { data: null, error: null },
      { data: {}, error: null },
    ]) {
      const db = client({ [operation]: response });
      await expect(fetchConversations(db as any, { canViewCommercialInfo: true })).rejects.toThrow(feedback);
      if (operation === summaries) expect(db.rpc).not.toHaveBeenCalledWith(counts, expect.anything());
    }
  });

  it.each([summaries, counts])('recusa timeout de %s sem transformar a falha em zero pedidos', async (operation) => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const db = client({ [operation]: new Promise(() => undefined) });
    const pending = fetchConversations(db as any, { canViewCommercialInfo: true })
      .then((value) => ({ value, error: null }), (error: Error) => ({ value: null, error }));
    await vi.advanceTimersByTimeAsync(15_001);
    expect((await pending).error?.message).toBe(feedback);
  });

  it('mantém zero pedidos e ausência de resumo quando as consultas válidas retornam listas vazias', async () => {
    const db = client({ [summaries]: { data: [], error: null }, [counts]: { data: [], error: null } });
    const result = await fetchConversations(db as any, { canViewCommercialInfo: true });
    expect(result.totalCount).toBe(1);
    expect(result.conversations[0]).toMatchObject({ id: 'conversation-unit', customer: null, orders: [] });
  });

  it('recupera os dados comerciais confirmados ao repetir a consulta', async () => {
    const db = client({ [counts]: { data: null, error: { message: 'Falha de contagem' } } });
    await expect(fetchConversations(db as any, { canViewCommercialInfo: true })).rejects.toThrow(feedback);
    db.rpc.mockImplementation(client().rpc);
    const result = await fetchConversations(db as any, { canViewCommercialInfo: true });
    expect(result.conversations[0].customer?.fullName).toBe('Cliente unitário');
    expect(result.conversations[0].orders).toHaveLength(2);
  });

  it('não consulta resumos nem pedidos sem a permissão comercial', async () => {
    const db = client();
    await fetchConversations(db as any, { canViewCommercialInfo: false });
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith('customer_support_list_conversations', expect.anything());
  });
});
