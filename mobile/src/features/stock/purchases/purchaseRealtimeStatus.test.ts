import { describe, expect, it, vi } from 'vitest';
import { createPurchaseRealtimeStatusHandler } from './purchaseRealtimeStatus';

describe('estado da conexão da lista de compras', () => {
  it('não agenda outra busca na primeira assinatura', () => {
    const onReconnect = vi.fn();
    const onStatus = createPurchaseRealtimeStatusHandler(onReconnect);

    onStatus('SUBSCRIBED');

    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('agenda uma conferência após a assinatura ativa cair e voltar', () => {
    const onReconnect = vi.fn();
    const onStatus = createPurchaseRealtimeStatusHandler(onReconnect);

    onStatus('SUBSCRIBED');
    onStatus('CHANNEL_ERROR');
    onStatus('TIMED_OUT');
    expect(onReconnect).not.toHaveBeenCalled();

    onStatus('SUBSCRIBED');
    expect(onReconnect).toHaveBeenCalledTimes(1);

    onStatus('CLOSED');
    onStatus('SUBSCRIBED');
    expect(onReconnect).toHaveBeenCalledTimes(2);
  });

  it('ignora falhas anteriores à primeira assinatura bem-sucedida', () => {
    const onReconnect = vi.fn();
    const onStatus = createPurchaseRealtimeStatusHandler(onReconnect);

    onStatus('CHANNEL_ERROR');
    onStatus('SUBSCRIBED');

    expect(onReconnect).not.toHaveBeenCalled();
  });
});
