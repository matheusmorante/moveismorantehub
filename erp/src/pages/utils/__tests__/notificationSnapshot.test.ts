// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), remove: vi.fn(), orders: vi.fn(), settings: vi.fn(), change: undefined as undefined | (() => void) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  rpc: mocks.rpc, from: mocks.from, removeChannel: mocks.remove,
  channel: () => ({ on(_name: string, _filter: unknown, callback: () => void) { mocks.change = callback; return this; }, subscribe() { return this; } }),
  auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
} }));
vi.mock('../settingsService', () => ({ getSettings: () => ({ stockNotificationConditions: ['novo'] }), subscribeToSettings: () => mocks.settings }));
vi.mock('../orderSyncQueries/sharedOrdersRealtime', () => ({ subscribeToOrderChanges: () => mocks.orders }));
import { markAsRead, subscribeToNotifications } from '../notificationService';

beforeEach(() => {
  localStorage.clear(); vi.useFakeTimers();
  mocks.rpc.mockImplementation(async (name) => name === 'notification_product_summaries'
    ? { data: [{ id: 'product', description: 'Mesa', stock: 0, has_variations: false, active: true, deleted: false, item_type: 'product', condition: 'novo' }], error: null }
    : { data: { ids: [], total: 0, totalAmount: 0 }, error: null });
  const query: any = { select: () => query, eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
  mocks.from.mockReturnValue(query);
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('snapshot compartilhado de alertas', () => {
  it('sino e dashboard compartilham a consulta e a leitura sem baixar os produtos outra vez', async () => {
    const first = vi.fn(), second = vi.fn();
    const stopA = subscribeToNotifications(first), stopB = subscribeToNotifications(second);
    await vi.waitFor(() => expect(first).toHaveBeenCalled());
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'notification_product_summaries')).toHaveLength(1);
    expect(first.mock.lastCall?.[0][0]).toMatchObject({ id: 'stock_zero_product', read: false });
    markAsRead('stock_zero_product');
    expect(second.mock.lastCall?.[0][0]).toMatchObject({ read: true });
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'notification_product_summaries')).toHaveLength(1);
    stopA(); expect(mocks.remove).not.toHaveBeenCalled(); stopB(); expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it('uma alteração invalida o snapshot e repete a leitura compacta com debounce', async () => {
    const callback = vi.fn(), stop = subscribeToNotifications(callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalled());
    mocks.change?.(); mocks.change?.();
    await vi.advanceTimersByTimeAsync(751);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'notification_product_summaries')).toHaveLength(2);
    stop();
  });

  it('preserva nome, identificador e nota do alerta da variação no contrato reduzido', async () => {
    mocks.rpc.mockImplementation(async (name) => name === 'notification_product_summaries'
      ? { data: [{ id: 'parent', description: 'Mesa', has_variations: true, active: true, item_type: 'product', condition: 'novo',
        notification_config: { enabled: true, notifyCustom: 'Conferir reposição' },
        variations: [{ id: 'white', name: 'Branca', stock: 0 }],
      }], error: null }
      : { data: { ids: [], total: 0, totalAmount: 0 }, error: null });
    const callback = vi.fn(), stop = subscribeToNotifications(callback);
    try {
      await vi.waitFor(() => expect(callback).toHaveBeenCalled());
      expect(callback.mock.lastCall?.[0]).toEqual([expect.objectContaining({
        id: 'stock_zero_var_parent_white', title: 'Variação sem Estoque',
        description: '"Mesa" (Branca) está sem estoque.\nNota: Conferir reposição', severity: 'critical',
      })]);
    } finally { stop(); }
  });

  it('mantém a desativação individual de avisos e a condição escolhida nas configurações', async () => {
    mocks.rpc.mockImplementation(async (name) => name === 'notification_product_summaries'
      ? { data: [{ id: 'parent', description: 'Mesa', stock: 0, has_variations: false, active: true, item_type: 'product',
        condition: 'novo', notification_config: { enabled: false },
      }], error: null }
      : { data: { ids: [], total: 0, totalAmount: 0 }, error: null });
    const callback = vi.fn(), stop = subscribeToNotifications(callback);
    try {
      await vi.waitFor(() => expect(callback).toHaveBeenCalled());
      expect(callback.mock.lastCall?.[0]).toEqual([]);
      expect(mocks.rpc).toHaveBeenCalledWith('notification_product_summaries', { p_conditions: ['novo'] });
    } finally { stop(); }
  });
});
