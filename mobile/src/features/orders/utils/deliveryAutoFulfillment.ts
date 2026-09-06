import { supabase } from '../../../services/supabaseClient';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Verifica se a entrega do pedido foi iniciada e se já se passaram mais de 12 horas.
 */
export function hasDeliveryExceeded12Hours(order: any): boolean {
  if (!order) return false;
  const data = order.order_data || order;
  const status = String(order.status || data.status || '').toLowerCase();

  // Se já está atendido ou cancelado, não precisa de auto-atendimento
  if (status === 'fulfilled' || status === 'atendido' || status === 'cancelled' || status === 'cancelado') {
    return false;
  }

  const deliveryStatus = data.deliveryStatus;
  if (deliveryStatus === 'completed' || deliveryStatus === 'fulfilled') {
    return false;
  }

  // Verifica se a entrega foi iniciada (deliveryStartedAt ou deliveryArrivedAt)
  const startedAt = data.deliveryStartedAt || data.delivery_started_at || order.delivery_started_at;
  if (!startedAt) return false;

  const startedTime = new Date(startedAt).getTime();
  if (isNaN(startedTime)) return false;

  const elapsed = Date.now() - startedTime;
  return elapsed >= TWELVE_HOURS_MS;
}

/**
 * Marca o pedido automaticamente como Atendido (fulfilled) após 12 horas do início da entrega.
 * Atualiza o estado em memória, grava no banco via Supabase e registra evento atômico na fila offline.
 */
export async function autoFulfillOrderIfExceeded12Hours(order: any): Promise<boolean> {
  if (!hasDeliveryExceeded12Hours(order)) return false;

  const data = order.order_data || order;
  const now = new Date().toISOString();

  const payload = {
    status: 'fulfilled',
    deliveryStatus: 'completed',
    deliveryFinishedAt: data.deliveryFinishedAt || now,
    autoFulfilledAfter12h: true,
    autoFulfilledAt: now,
  };

  const updatedData = {
    ...data,
    ...payload,
  };

  // 1. Atualização em memória no objeto
  order.status = 'fulfilled';
  order.order_data = updatedData;

  // 2. Registro na fila offline-first
  try {
    await offlineSyncManager.recordEvent(
      'DELIVERY_FINISH',
      'order',
      order.id,
      payload
    );
  } catch (err) {
    console.warn('[AutoFulfill] Erro ao registrar evento offline:', err);
  }

  // 3. Persistência direta no Supabase para sincronização imediata
  try {
    await supabase
      .from('orders')
      .update({
        status: 'fulfilled',
        order_data: updatedData,
        updated_at: now,
      })
      .eq('id', order.id);
  } catch (err) {
    console.warn('[AutoFulfill] Erro ao atualizar supabase:', err);
  }

  return true;
}
