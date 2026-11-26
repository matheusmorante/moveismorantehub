import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../supabaseConfig', () => ({ supabase: { from: mocks.from } }));

import { dispatchAppNotification } from '../notifications/pushNotificationService';

const payload = {
  orderId: 'pedido-teste',
  title: 'Nova venda',
  message: 'Aviso sintético.',
  type: 'order_created' as const,
};

function mockPersistence(error: { message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error });
  mocks.from.mockImplementation((table: string) => {
    if (table === 'app_notifications') return { insert };
    throw new Error(`Unexpected table: ${table}`);
  });
  return insert;
}

describe('registro de notificações para envio pelo banco', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('não grava no app_notifications nem envia push para pedidos de teste', async () => {
    await dispatchAppNotification({
      ...payload,
      orderData: { is_test: true },
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('não envia push se a gravação da notificação falhar', async () => {
    mockPersistence({ message: 'Falha sintética de persistência' });

    await dispatchAppNotification(payload);

    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['app_notifications']);
    expect(fetch).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('registra o conteúdo usado pelo trigger sem ler tokens ou chamar a Expo pelo navegador', async () => {
    const insert = mockPersistence();

    await dispatchAppNotification({ ...payload, orderData: { status: 'scheduled' } });

    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['app_notifications']);
    expect(insert).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      order_id: payload.orderId,
      type: 'order_created',
      order_data: { status: 'scheduled' },
    }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
