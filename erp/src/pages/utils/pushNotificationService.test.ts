import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('./supabaseConfig', () => ({ supabase: { from: mocks.from } }));

import { dispatchAppNotification } from './pushNotificationService';

const payload = {
  orderId: 'pedido-teste',
  title: 'Nova venda',
  message: 'Aviso sintético.',
  type: 'order_created' as const,
};

function mockPersistence(data: { id: string } | null, error: { message: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ maybeSingle }),
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === 'app_notifications') return { insert };
    if (table === 'push_tokens') return {
      select: vi.fn().mockResolvedValue({ data: [{ token: 'ExponentPushToken[synthetic]' }] }),
    };
    throw new Error(`Unexpected table: ${table}`);
  });
  return { insert, maybeSingle };
}

describe('notificações de artefatos de teste', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
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

  it('não envia push quando o banco suprime um pedido de teste identificado só pelo ID', async () => {
    const persistence = mockPersistence(null);

    await dispatchAppNotification(payload);

    expect(persistence.maybeSingle).toHaveBeenCalledOnce();
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['app_notifications']);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('não envia push se a gravação da notificação falhar', async () => {
    mockPersistence(null, { message: 'Falha sintética de persistência' });

    await dispatchAppNotification(payload);

    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['app_notifications']);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envia a notificação operacional depois da confirmação de persistência', async () => {
    const persistence = mockPersistence({ id: 'notification-synthetic' });

    await dispatchAppNotification({ ...payload, orderData: { status: 'scheduled' } });

    expect(persistence.maybeSingle).toHaveBeenCalledOnce();
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['app_notifications', 'push_tokens']);
    expect(fetch).toHaveBeenCalledOnce();
    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(request?.body))).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[synthetic]',
        data: expect.objectContaining({ orderId: payload.orderId, status: 'scheduled' }),
      }),
    ]);
  });
});
