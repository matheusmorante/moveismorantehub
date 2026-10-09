import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('./supabaseConfig', () => ({ supabase: { from: mocks.from } }));

import { dispatchAppNotification } from './pushNotificationService';

describe('notificações de artefatos de teste', () => {
  it('não grava no app_notifications nem envia push para pedidos de teste', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await dispatchAppNotification({
      orderId: 'pedido-teste',
      title: 'Nova venda de teste',
      message: 'Este aviso não deve ser enviado.',
      type: 'order_created',
      orderData: { is_test: true },
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
