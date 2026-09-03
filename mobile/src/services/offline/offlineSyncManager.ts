import { supabase } from '../supabaseClient';
import { SyncEvent, OfflineSyncSummary } from './offlineTypes';
import { offlineStorageService } from './offlineStorageService';

type SyncListener = (summary: OfflineSyncSummary) => void;

class OfflineSyncManager {
  private isProcessing = false;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncAt?: string;

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.emitSummary();
    return () => this.listeners.delete(listener);
  }

  async getSummary(): Promise<OfflineSyncSummary> {
    const queue = await offlineStorageService.getEventQueue();
    const pending = queue.filter((e) => e.state === 'PENDING').length;
    const syncing = queue.filter((e) => e.state === 'SYNCING').length;
    const rejected = queue.filter((e) => e.state === 'REJECTED').length;

    return {
      pendingCount: pending,
      syncingCount: syncing,
      rejectedCount: rejected,
      hasRejections: rejected > 0,
      isOnline: true, // Atualizado durante sincronização ativa
      lastSyncAt: this.lastSyncAt,
    };
  }

  private async emitSummary() {
    const summary = await this.getSummary();
    this.listeners.forEach((fn) => fn(summary));
  }

  // === REGISTRAR EVENTO E TENTAR SINCRONIZAÇÃO ===
  async recordEvent<T>(
    type: SyncEvent['type'],
    entityType: SyncEvent['entityType'],
    entityId: string,
    payload: T
  ): Promise<SyncEvent<T>> {
    const event = await offlineStorageService.pushEvent(
      type,
      entityType,
      entityId,
      payload
    );
    await this.emitSummary();

    // Tenta sincronizar imediatamente em background
    this.processQueue().catch(() => {});
    return event;
  }

  // === PROCESSAMENTO DA FILA COM AS REGRAS E MÁQUINA DE ESTADOS ===
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const queue = await offlineStorageService.getEventQueue();
      const pendingEvents = queue.filter((e) => e.state === 'PENDING');

      if (pendingEvents.length === 0) {
        // Limpa eventos confirmados para manter o banco leve
        await offlineStorageService.clearConfirmedEvents();
        await this.emitSummary();
        return;
      }

      for (const event of pendingEvents) {
        await offlineStorageService.updateEventState(event.eventId, 'SYNCING');
        await this.emitSummary();

        try {
          const result = await this.executeEventOnBackend(event);

          if (result.success) {
            await offlineStorageService.updateEventState(event.eventId, 'CONFIRMED');
          } else {
            // Rejeitado pelo backend (invariante violada, ex: pedido cancelado)
            console.warn(`[OfflineSync] Evento ${event.eventId} rejeitado pelo backend:`, result.reason);
            await offlineStorageService.updateEventState(
              event.eventId,
              'REJECTED',
              result.reason || 'Operação rejeitada pelo servidor.'
            );
          }
        } catch (networkOrSystemError: any) {
          // Erro de rede: volta para PENDING para retentar quando a conexão estiver estável
          console.log(`[OfflineSync] Erro de rede ao enviar evento ${event.eventId}. Voltando para PENDING.`, networkOrSystemError);
          await offlineStorageService.updateEventState(event.eventId, 'PENDING');
          break; // Interrompe o lote se estiver offline
        }
      }

      this.lastSyncAt = new Date().toISOString();
      await offlineStorageService.clearConfirmedEvents();
    } finally {
      this.isProcessing = false;
      await this.emitSummary();
    }
  }

  // === EXECUÇÃO DO EVENTO CONTRA O SUPABASE / BACKEND ===
  private async executeEventOnBackend(event: SyncEvent): Promise<{ success: boolean; reason?: string }> {
    const { type, entityId, payload } = event;

    switch (type) {
      case 'DELIVERY_START_ROUTE': {
        // 1. Verificar se o pedido ainda é válido
        const { data: currentOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('status, order_data')
          .eq('id', entityId)
          .single();

        if (fetchErr || !currentOrder) {
          return { success: false, reason: 'Pedido não encontrado no servidor.' };
        }

        if (currentOrder.status === 'cancelled') {
          return { success: false, reason: 'Pedido cancelado na central durante a rota.' };
        }

        const now = event.occurredAt || new Date().toISOString();
        const updatedData = {
          ...(currentOrder.order_data || {}),
          ...payload,
          deliveryStatus: 'in_progress',
          deliveryStartedAt: now,
          lastSyncEventId: event.eventId,
        };

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', entityId);

        if (updateErr) throw updateErr;
        return { success: true };
      }

      case 'DELIVERY_ARRIVE_DESTINATION': {
        const { data: currentOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('status, order_data')
          .eq('id', entityId)
          .single();

        if (fetchErr || !currentOrder) return { success: false, reason: 'Pedido não encontrado.' };
        if (currentOrder.status === 'cancelled') return { success: false, reason: 'Pedido cancelado na central.' };

        const now = event.occurredAt || new Date().toISOString();
        const updatedData = {
          ...(currentOrder.order_data || {}),
          ...payload,
          deliveryStatus: 'in_service',
          deliveryArrivedAt: now,
          lastSyncEventId: event.eventId,
        };

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', entityId);

        if (updateErr) throw updateErr;
        return { success: true };
      }

      case 'DELIVERY_FINISH': {
        const { data: currentOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('status, order_data')
          .eq('id', entityId)
          .single();

        if (fetchErr || !currentOrder) return { success: false, reason: 'Pedido não encontrado.' };
        if (currentOrder.status === 'cancelled') return { success: false, reason: 'Pedido foi cancelado pela administração.' };

        const now = event.occurredAt || new Date().toISOString();
        const updatedData = {
          ...(currentOrder.order_data || {}),
          ...payload,
          status: 'fulfilled',
          deliveryStatus: 'completed',
          deliveryFinishedAt: now,
          lastSyncEventId: event.eventId,
        };

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'fulfilled',
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', entityId);

        if (updateErr) throw updateErr;
        return { success: true };
      }

      case 'DELIVERY_UNATTENDED': {
        const { data: currentOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('status, order_data')
          .eq('id', entityId)
          .single();

        if (fetchErr || !currentOrder) return { success: false, reason: 'Pedido não encontrado.' };

        const now = event.occurredAt || new Date().toISOString();
        const updatedData = {
          ...(currentOrder.order_data || {}),
          ...payload,
          deliveryStatus: 'unattended',
          unattendedAt: now,
          lastSyncEventId: event.eventId,
        };

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', entityId);

        if (updateErr) throw updateErr;
        return { success: true };
      }

      case 'DELIVERY_STEP_BACK': {
        const { data: currentOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('status, order_data')
          .eq('id', entityId)
          .single();

        if (fetchErr || !currentOrder) return { success: false, reason: 'Pedido não encontrado.' };

        const now = event.occurredAt || new Date().toISOString();
        const updatedData = {
          ...(currentOrder.order_data || {}),
          ...payload,
          lastSyncEventId: event.eventId,
        };

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            order_data: updatedData,
            updated_at: now,
          })
          .eq('id', entityId);

        if (updateErr) throw updateErr;
        return { success: true };
      }

      default:
        return { success: true };
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();
