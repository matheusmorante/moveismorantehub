import type { SupabaseClient } from '@supabase/supabase-js';
import { extractMessageContent } from './whatsappMessageContent.js';
import { maybeTriggerWhatsAppAiAgent } from './whatsappAiAgentService.js';
import {
  verifyMetaSignature,
  readRawWebhookBody,
} from './whatsappWebhookSignature.js';
import {
  parseMetaStatusFailure,
  persistDeliveryStatusUpdate,
} from './whatsappWebhookStatusService.js';
import {
  processRevokedMessage,
  processBusinessAppEcho,
} from './whatsappWebhookEchoService.js';
import {
  processEchoBatch,
  processStatusBatch,
  processInboundMessageBatch,
} from './webhook/index.js';

// Re-exports para manter compatibilidade total com módulos, testes e build CJS
export {
  extractMessageContent,
  maybeTriggerWhatsAppAiAgent,
  verifyMetaSignature,
  readRawWebhookBody,
  parseMetaStatusFailure,
  persistDeliveryStatusUpdate,
  processRevokedMessage,
  processBusinessAppEcho,
};

export interface WebhookProcessResult {
  processedMessages: number;
  processedStatuses: number;
  deliveryConfirmations: number;
  duplicatesIgnored: number;
  errors: string[];
}

/**
 * Processador principal do payload do Webhook da Meta Cloud API.
 * Orquestra recebimento de mensagens, ecos de app móvel, revogações e atualizações de status.
 */
export async function processWhatsAppWebhookPayload(
  supabase: SupabaseClient,
  body: any
): Promise<WebhookProcessResult> {
  const result: WebhookProcessResult = {
    processedMessages: 0,
    processedStatuses: 0,
    deliveryConfirmations: 0,
    duplicatesIgnored: 0,
    errors: [],
  };

  if (!body?.entry || !Array.isArray(body.entry)) {
    return result;
  }

  for (const entry of body.entry) {
    if (!Array.isArray(entry?.changes)) continue;

    for (const change of entry.changes) {
      const value = change?.value;
      if (!value) continue;

      const businessPhoneNumberId = String(value.metadata?.phone_number_id || '');

      // 1. Coexistence: mensagens enviadas pelo app WhatsApp Business oficial (smb_message_echoes)
      if (change.field === 'smb_message_echoes') {
        const echoResult = await processEchoBatch(supabase, businessPhoneNumberId, value);
        result.processedMessages += echoResult.processedMessages;
        result.duplicatesIgnored += echoResult.duplicatesIgnored;
        result.errors.push(...echoResult.errors);
      }

      // 2. Processa mensagens recebidas (inbound)
      if (value.messages) {
        const inboundResult = await processInboundMessageBatch(supabase, businessPhoneNumberId, value);
        result.processedMessages += inboundResult.processedMessages;
        result.deliveryConfirmations += inboundResult.deliveryConfirmations;
        result.duplicatesIgnored += inboundResult.duplicatesIgnored;
        result.errors.push(...inboundResult.errors);
      }

      // 3. Processa status de entrega (sent, delivered, read, failed)
      if (value.statuses) {
        const statusResult = await processStatusBatch(supabase, value.statuses);
        result.processedStatuses += statusResult.processedStatuses;
        result.errors.push(...statusResult.errors);
      }
    }
  }

  return result;
}
