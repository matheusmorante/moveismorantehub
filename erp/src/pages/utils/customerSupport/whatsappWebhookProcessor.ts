import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractDigits, normalizeToE164 } from './phoneUtils.js';
import { matchCustomerByPhone } from './customerMatchingService.js';
import { extractMessageContent } from './whatsappMessageContent.js';

export { extractMessageContent };

export interface WebhookProcessResult {
  processedMessages: number;
  processedStatuses: number;
  deliveryConfirmations: number;
  duplicatesIgnored: number;
  errors: string[];
}

export function parseMetaStatusFailure(errors?: any[]): {
  failureReason: string | null;
  errorCode: string | null;
} {
  if (!Array.isArray(errors) || errors.length === 0) return { failureReason: null, errorCode: null };
  const first = errors[0] || {};
  const code = String(first.code || '');
  const details = first.error_data?.details || first.message || first.title || '';
  let failureReason: string;
  if (code === '131056') {
    failureReason = 'Mensagem descartada pela Meta (proteção anti-spam ou envio repetido). Aguarde 1 minuto ou altere o conteúdo do pedido antes de reenviar.';
  } else if (code === '131049') {
    failureReason = 'Disparo bloqueado por restrições de integridade ou política da Meta.';
  } else if (code === '131047') {
    failureReason = 'Janela de 24h fechada. É obrigatório o uso de modelo de mensagem aprovado.';
  } else if (code === '131026') {
    failureReason = 'Número não encontrado ou incapaz de receber mensagens no WhatsApp.';
  } else if (code === '130429') {
    failureReason = 'Limite temporário de taxa de envio atingido na Meta Cloud API. Aguarde alguns instantes.';
  } else {
    failureReason = first.title || first.message || `Falha reportada pela Meta (Código #${code})`;
  }
  if (details && !failureReason.includes(details)) failureReason += ` Detalhes: ${details}`;
  return { failureReason, errorCode: code || null };
}

/**
 * Valida a assinatura HMAC SHA-256 enviada no cabeçalho X-Hub-Signature-256
 */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret || appSecret.trim() === '') {
    return false;
  }
  if (!signatureHeader) return false;

  const signatureMatch = /^sha256=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  const signatureHex = signatureMatch?.[1];
  if (!signatureHex) return false;

  try {
    const expectedHex = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');

    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (err) {
    console.error('[verifyMetaSignature] Erro ao validar assinatura:', err);
    return false;
  }
}

export async function readRawWebhookBody(request: AsyncIterable<Buffer | string> & { rawBody?: Buffer }): Promise<Buffer> {
  if (Buffer.isBuffer(request.rawBody)) return request.rawBody;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function processRevokedMessage(
  supabase: SupabaseClient,
  businessPhoneNumberId: string,
  contactWaId: string,
  message: any,
  direction: 'inbound' | 'outbound',
): Promise<boolean | null> {
  const originalMessageId = String(message?.revoke?.original_message_id || '').trim();
  if (!originalMessageId) throw new Error('Revogação do WhatsApp sem o ID da mensagem original.');

  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const { data, error } = await supabase.rpc('customer_support_revoke_message', {
    p_business_phone_number_id: businessPhoneNumberId,
    p_contact_wa_id: contactWaId,
    p_original_message_id: originalMessageId,
    p_direction: direction,
    p_timestamp: timestamp,
  });
  if (error) throw error;
  if (!data || data.handled !== true || typeof data.found !== 'boolean' || typeof data.changed !== 'boolean') {
    throw new Error('Revogação da mensagem não confirmada pelo servidor.');
  }
  if (!data.found) return null;
  return data.changed;
}

async function processBusinessAppEcho(
  supabase: SupabaseClient,
  businessPhoneNumberId: string,
  value: any,
  message: any,
): Promise<boolean | null> {
  const contactWaId = extractDigits(String(message?.to || ''));
  if (contactWaId.length < 8 || contactWaId.length > 15) return null;
  if (message?.type === 'revoke') {
    return processRevokedMessage(supabase, businessPhoneNumberId, contactWaId, message, 'outbound');
  }

  const wamid = String(message?.id || '');
  if (!wamid) return null;

  const { data: existingMessage, error: duplicateError } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('api_message_id', wamid)
    .maybeSingle();
  if (duplicateError) throw duplicateError;

  let matchedCustomerId: string | null = null;
  let customerLinkStatus = 'unlinked';
  if (!existingMessage) {
    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('id, customer_id, customer_link_status')
      .eq('business_phone_number_id', businessPhoneNumberId)
      .eq('contact_wa_id', contactWaId)
      .maybeSingle();
    if (conversationError) throw conversationError;

    if (!conversation?.customer_id && conversation?.customer_link_status !== 'manually_linked') {
      const matchResult = await matchCustomerByPhone(supabase, contactWaId);
      if (matchResult.status === 'auto_matched' && matchResult.customer) {
        matchedCustomerId = matchResult.customer.id;
        customerLinkStatus = 'auto_matched';
      } else if (matchResult.status === 'ambiguous') {
        customerLinkStatus = 'ambiguous';
      }
    }
  }

  const extracted = extractMessageContent(message);
  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const profile = value.contacts?.find((contact: any) => extractDigits(contact?.wa_id) === contactWaId)?.profile?.name;
  const { data: receipt, error: receiptError } = await supabase.rpc('customer_support_receive_message_echo', {
    p_business_phone_number_id: businessPhoneNumberId,
    p_contact_wa_id: contactWaId,
    p_contact_phone: normalizeToE164(contactWaId),
    p_contact_name: profile || null,
    p_customer_id: matchedCustomerId,
    p_customer_link_status: customerLinkStatus,
    p_message: {
      api_message_id: wamid,
      message_type: extracted.type,
      text_content: extracted.text,
      media_id: extracted.mediaId ?? null,
      media_mime_type: extracted.mediaMimeType ?? null,
      media_filename: extracted.mediaFilename ?? null,
      media_caption: extracted.mediaCaption ?? null,
      reply_to_wamid: extracted.replyToWamid ?? null,
      ...(extracted.errorCode ? { error_code: extracted.errorCode } : {}),
      ...(extracted.failureReason ? { failure_reason: extracted.failureReason } : {}),
      ...(extracted.rawPayload ? { raw_payload: extracted.rawPayload } : {}),
      timestamp,
    },
  });
  if (receiptError) throw receiptError;
  if (!receipt?.conversation_id || !receipt?.message_id || typeof receipt.inserted !== 'boolean') {
    throw new Error('Recebimento da mensagem enviada pelo WhatsApp Business não confirmado pelo servidor.');
  }
  return receipt.inserted;
}

/**
 * Processador principal do payload do Webhook da Meta
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

  if (!body || !body.entry || !Array.isArray(body.entry)) {
    return result;
  }

  for (const entry of body.entry) {
    if (!entry.changes || !Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      const value = change.value;
      if (!value) continue;

      const businessPhoneNumberId = String(value.metadata?.phone_number_id || '');

      // Coexistence reports messages sent from the WhatsApp Business app in a
      // separate webhook field. Persist them as outbound echoes for every agent.
      if (change.field === 'smb_message_echoes' && Array.isArray(value.message_echoes)) {
        for (const message of value.message_echoes) {
          try {
            const inserted = await processBusinessAppEcho(supabase, businessPhoneNumberId, value, message);
            if (inserted) result.processedMessages++;
            else if (inserted === false) result.duplicatesIgnored++;
          } catch (err: any) {
            console.error('[WhatsApp Webhook] Erro ao processar mensagem enviada pelo app:', err);
            result.errors.push(err.message || String(err));
          }
        }
      }

      // 1. Processa mensagens recebidas
      if (value.messages && Array.isArray(value.messages)) {
        for (const message of value.messages) {
          try {
            const from = String(message.from || '');
            if (!from) continue;
            if (message.type === 'revoke') {
              const changed = await processRevokedMessage(
                supabase,
                businessPhoneNumberId,
                from,
                message,
                'inbound',
              );
              if (changed) result.processedMessages++;
              else if (changed === false) result.duplicatesIgnored++;
              continue;
            }

            const wamid = message.id;
            if (!wamid) continue;

            // PRESERVAÇÃO: Confirmação de Entrega por botão interativo
            if (message.type === 'interactive' && message.interactive?.button_reply) {
              const buttonId = String(message.interactive.button_reply.id || '');
              if (buttonId.startsWith('confirm_delivery_')) {
                const orderId = buttonId.replace('confirm_delivery_', '');
                console.log(`[WhatsApp Webhook] Confirmando entrega para pedido #${orderId}`);
                await supabase
                  .from('orders')
                  .update({
                    delivery_confirmed_at: new Date().toISOString(),
                    delivery_confirmed_by: from,
                  })
                  .eq('id', orderId);
                result.deliveryConfirmations++;
              }
            }

            // IDEMPOTÊNCIA: Verifica se a mensagem já foi salva anteriormente
            const { data: existingMsg, error: duplicateError } = await supabase
              .from('whatsapp_messages')
              .select('id')
              .eq('api_message_id', wamid)
              .maybeSingle();

            if (duplicateError) throw duplicateError;

            // Extrai nome de perfil enviado pela Meta
            const contactProfile =
              value.contacts?.find((c: any) => c.wa_id === from)?.profile?.name ||
              value.contacts?.[0]?.profile?.name ||
              null;

            const contactPhoneE164 = normalizeToE164(from);
            const messageTimestamp = message.timestamp
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let matchedCustomerId: string | null = null;
            let customerLinkStatus = 'unlinked';
            // A known ID only skips matching. The RPC must still validate its
            // channel/contact and direction before classifying it as duplicate.
            if (!existingMsg) {
              // Matching stays outside the transaction. The RPC rechecks the
              // current link under its row lock before applying any match.
              const { data: convData, error: conversationError } = await supabase
                .from('whatsapp_conversations')
                .select('id, customer_id, customer_link_status')
                .eq('business_phone_number_id', businessPhoneNumberId)
                .eq('contact_wa_id', from)
                .maybeSingle();
              if (conversationError) throw conversationError;

              if (!convData?.customer_id && convData?.customer_link_status !== 'manually_linked') {
                const matchResult = await matchCustomerByPhone(supabase, from);
                if (matchResult.status === 'auto_matched' && matchResult.customer) {
                  matchedCustomerId = matchResult.customer.id;
                  customerLinkStatus = 'auto_matched';
                } else if (matchResult.status === 'ambiguous') {
                  customerLinkStatus = 'ambiguous';
                }
              }
            }

            const extracted = extractMessageContent(message);

            // The provider ID, inbound row, summary/count and persisted reopening
            // event are committed together. No fallback to separate writes.
            const { data: receipt, error: receiptError } = await supabase.rpc('customer_support_receive_message', {
              p_business_phone_number_id: businessPhoneNumberId,
              p_contact_wa_id: from,
              p_contact_phone: contactPhoneE164,
              p_contact_name: contactProfile,
              p_customer_id: matchedCustomerId,
              p_customer_link_status: customerLinkStatus,
              p_message: {
                api_message_id: wamid,
                message_type: extracted.type,
                text_content: extracted.text,
                media_id: extracted.mediaId ?? null,
                media_mime_type: extracted.mediaMimeType ?? null,
                media_filename: extracted.mediaFilename ?? null,
                media_caption: extracted.mediaCaption ?? null,
                reply_to_wamid: extracted.replyToWamid ?? null,
                ...(extracted.errorCode ? { error_code: extracted.errorCode } : {}),
                ...(extracted.failureReason ? { failure_reason: extracted.failureReason } : {}),
                ...(extracted.rawPayload ? { raw_payload: extracted.rawPayload } : {}),
                timestamp: messageTimestamp,
              },
            });
            if (receiptError) throw receiptError;
            if (!receipt?.conversation_id || !receipt?.message_id || typeof receipt.inserted !== 'boolean') {
              throw new Error('Recebimento da mensagem não confirmado pelo servidor.');
            }
            if (receipt.inserted) result.processedMessages++;
            else result.duplicatesIgnored++;
          } catch (err: any) {
            console.error('[WhatsApp Webhook] Erro ao processar mensagem individual:', err);
            result.errors.push(err.message || String(err));
          }
        }
      }

      // 2. Processa status de entrega (sent, delivered, read, failed)
      if (value.statuses && Array.isArray(value.statuses)) {
        for (const statusItem of value.statuses) {
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

            // Atualiza tabela de despachos (PRESERVAÇÃO DO FLUXO EXISTENTE)
            await supabase
              .from('whatsapp_dispatches')
              .update({
                status: deliveryStatus,
                updated_at: updatedAt,
                raw_payload: statusItem,
                ...(failureReason ? { failure_reason: failureReason } : {}),
                ...(errorCode ? { error_code: errorCode } : {}),
              })
              .eq('api_message_id', msgId);

            // Atualiza tabela de termos de garantia (PRESERVAÇÃO DO FLUXO EXISTENTE)
            await supabase
              .from('warranty_terms')
              .update({
                delivery_status: deliveryStatus,
                delivery_status_updated_at: updatedAt,
                ...(failureReason ? { failure_reason: failureReason } : {}),
              })
              .eq('api_message_id', msgId);

            // Atualiza tabela de mensagens da Central de Atendimento se for mensagem enviada
            await supabase
              .from('whatsapp_messages')
              .update({
                status: deliveryStatus,
                ...(failureReason ? { failure_reason: failureReason } : {}),
                ...(errorCode ? { error_code: errorCode } : {}),
              })
              .eq('api_message_id', msgId);

            result.processedStatuses++;
          } catch (err: any) {
            console.error('[WhatsApp Webhook] Erro ao atualizar status individual:', err);
            result.errors.push(err.message || String(err));
          }
        }
      }
    }
  }

  return result;
}
