import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseMetaStatusFailure,
  persistDeliveryStatusUpdate,
} from '../whatsappWebhookStatusService.js';

export interface StatusBatchResult {
  processedStatuses: number;
  errors: string[];
}

export async function processStatusBatch(
  supabase: SupabaseClient,
  statuses: any[]
): Promise<StatusBatchResult> {
  const result: StatusBatchResult = {
    processedStatuses: 0,
    errors: [],
  };

  if (!Array.isArray(statuses)) return result;

  for (const statusItem of statuses) {
    try {
      const msgId = statusItem.id;
      const rawStatus = String(statusItem.status || '').toLowerCase();
      const deliveryStatus =
        rawStatus === 'failed'
          ? 'failed'
          : rawStatus === 'read'
            ? 'read'
            : rawStatus === 'delivered'
              ? 'delivered'
              : 'sent';

      const updatedAt = statusItem.timestamp
        ? new Date(Number(statusItem.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      const { failureReason, errorCode } = parseMetaStatusFailure(statusItem.errors);

      await persistDeliveryStatusUpdate(
        supabase,
        msgId,
        deliveryStatus,
        updatedAt,
        statusItem,
        failureReason,
        errorCode
      );

      result.processedStatuses++;
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Erro ao atualizar status individual:', err);
      result.errors.push(err.message || String(err));
    }
  }

  return result;
}
