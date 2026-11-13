import type { SupabaseClient } from '@supabase/supabase-js';
import { extractMessageContent } from './whatsappMessageContent.js';
import { maybeTriggerWhatsAppAiAgent } from './whatsappAiAgentService.js';
import { processDurableAiJob } from './whatsappAiAgent/durableAiJob.js';
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
import { normalizeMetaSocialMediaUrl } from './socialMediaUrl.js';

// Re-exports para manter compatibilidade total com módulos, testes e build CJS
export {
  extractMessageContent,
  maybeTriggerWhatsAppAiAgent,
  processDurableAiJob,
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

/**
 * Receives Instagram Direct and Facebook Messenger events. Social messages are
 * persisted in the same inbox tables, but deliberately bypass the WhatsApp AI
 * queue and WhatsApp delivery/status processing.
 */
export async function processMetaSocialWebhookPayload(
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

  if (!Array.isArray(body?.entry)) return result;

  const channel = body.object === 'instagram'
    ? 'instagram'
    : body.object === 'page'
      ? 'messenger'
      : null;
  if (!channel) return result;

  for (const entry of body.entry) {
    if (!Array.isArray(entry?.messaging)) continue;

    for (const event of entry.messaging) {
      const message = event?.message;
      const postback = event?.postback;
      if ((!message || message.is_deleted) && !postback) continue;
      if (event?.read || event?.delivery || event?.reaction) continue;

      const direction = message?.is_echo === true ? 'outbound' : 'inbound';
      const accountId = String(entry?.id || (direction === 'inbound' ? event?.recipient?.id : event?.sender?.id) || '').trim();
      const person = direction === 'inbound' ? event?.sender : event?.recipient;
      const contactId = String(person?.id || '').trim();
      const providerMessageId = String(
        message?.mid
          || postback?.mid
          || (postback
            ? `postback:${contactId}:${event?.timestamp || ''}:${String(postback.payload || postback.title || '')}`
            : '')
      ).trim();

      if (!accountId || !contactId || !providerMessageId) {
        result.errors.push('Evento social sem identificadores obrigatórios.');
        continue;
      }

      const eventTime = Number(event?.timestamp || message?.timestamp);
      const timestamp = Number.isFinite(eventTime) && eventTime > 0
        ? new Date(eventTime).toISOString()
        : null;
      if (!timestamp) {
        result.errors.push('Evento social sem data válida.');
        continue;
      }

      const attachment = Array.isArray(message?.attachments) ? message.attachments[0] : null;
      const attachmentType = String(attachment?.type || '').toLowerCase();
      const attachmentPayload = attachment?.payload || {};
      const attachmentUrl = ['image', 'video', 'audio', 'file'].includes(attachmentType)
        ? normalizeMetaSocialMediaUrl(attachmentPayload.url)
        : null;
      let messageType = message?.is_unsupported === true ? 'unsupported' : 'text';
      if (attachmentType === 'image') messageType = 'image';
      else if (attachmentType === 'video') messageType = 'video';
      else if (attachmentType === 'audio') messageType = 'audio';
      else if (attachmentType === 'file') messageType = 'document';
      else if (attachmentType === 'sticker') messageType = 'sticker';
      else if (attachmentType === 'location') messageType = 'location';
      else if (attachmentType || postback) messageType = 'interactive';

      const postbackText = postback
        ? String(postback.title || postback.payload || 'Resposta interativa')
        : null;
      const textContent = typeof message?.text === 'string'
        ? message.text
        : postbackText || (message?.is_unsupported === true
          ? 'Conteúdo recebido sem prévia neste canal.'
          : ({
              image: '[Imagem]',
              video: '[Vídeo]',
              audio: '[Áudio]',
              file: '[Arquivo]',
              sticker: '[Figurinha]',
              location: '[Localização]',
            } as Record<string, string>)[attachmentType] || (attachmentType ? '[Anexo]' : null));
      const normalizedType = [
        'text', 'image', 'document', 'audio', 'video', 'interactive',
        'sticker', 'location', 'contacts', 'unsupported',
      ].includes(messageType) ? messageType : 'unsupported';

      const providerMessage = {
        api_message_id: `meta-social:${channel}:${accountId}:${providerMessageId}`,
        message_type: normalizedType,
        text_content: textContent,
        media_id: null,
        media_mime_type: typeof attachmentPayload.mime_type === 'string' ? attachmentPayload.mime_type : null,
        media_url: attachmentUrl,
        media_filename: typeof attachmentPayload.name === 'string' ? attachmentPayload.name : null,
        media_caption: typeof message?.text === 'string' ? message.text : null,
        reply_to_wamid: typeof message?.reply_to?.mid === 'string' ? message.reply_to.mid : null,
        timestamp,
        raw_payload: {
          provider: channel,
          is_echo: direction === 'outbound',
          event: event,
        },
      };

      const { data, error } = await supabase.rpc('customer_support_receive_social_message', {
        p_channel: channel,
        p_account_id: accountId,
        p_contact_id: contactId,
        p_contact_name: typeof person?.username === 'string'
          ? person.username
          : typeof person?.name === 'string'
            ? person.name
            : null,
        p_direction: direction,
        p_message: providerMessage,
      });

      if (error || !data || typeof data !== 'object') {
        result.errors.push('Não foi possível salvar uma mensagem social.');
        continue;
      }
      if (data.inserted === false) result.duplicatesIgnored += 1;
      else result.processedMessages += 1;
    }
  }

  return result;
}
