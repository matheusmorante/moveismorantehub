import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { normalizeToE164 } from './phoneUtils';
import { matchCustomerByPhone } from './customerMatchingService';

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
  let failureReason = '';
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

export async function readRawWebhookBody(request: AsyncIterable<Buffer | string>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Extrai resumo e metadados de uma mensagem da Meta
 */
export function extractMessageContent(msg: any): {
  type: string;
  text: string;
  mediaId?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaCaption?: string;
  replyToWamid?: string;
} {
  const type = msg.type || 'unknown';
  const replyToWamid = msg.context?.id;

  switch (type) {
    case 'text':
      return {
        type: 'text',
        text: msg.text?.body || '',
        replyToWamid,
      };

    case 'image':
      return {
        type: 'image',
        text: msg.image?.caption || '[Imagem]',
        mediaId: msg.image?.id,
        mediaMimeType: msg.image?.mime_type || 'image/jpeg',
        mediaCaption: msg.image?.caption,
        replyToWamid,
      };

    case 'document':
      return {
        type: 'document',
        text: msg.document?.filename || msg.document?.caption || '[Documento]',
        mediaId: msg.document?.id,
        mediaMimeType: msg.document?.mime_type || 'application/pdf',
        mediaFilename: msg.document?.filename || 'documento.pdf',
        mediaCaption: msg.document?.caption,
        replyToWamid,
      };

    case 'audio':
      return {
        type: 'audio',
        text: '[Áudio]',
        mediaId: msg.audio?.id,
        mediaMimeType: msg.audio?.mime_type || 'audio/ogg',
        replyToWamid,
      };

    case 'video':
      return {
        type: 'video',
        text: msg.video?.caption || '[Vídeo]',
        mediaId: msg.video?.id,
        mediaMimeType: msg.video?.mime_type || 'video/mp4',
        mediaCaption: msg.video?.caption,
        replyToWamid,
      };

    case 'interactive': {
      const buttonTitle =
        msg.interactive?.button_reply?.title ||
        msg.interactive?.list_reply?.title ||
        'Resposta interativa';
      return {
        type: 'interactive',
        text: `🔘 ${buttonTitle}`,
        replyToWamid,
      };
    }

    case 'sticker':
      return {
        type: 'sticker',
        text: '[Figurinha]',
        mediaId: msg.sticker?.id,
        mediaMimeType: msg.sticker?.mime_type || 'image/webp',
        replyToWamid,
      };

    case 'location': {
      const loc = msg.location;
      const text = loc
        ? `📍 Localização: ${loc.name ? `${loc.name} - ` : ''}${loc.latitude}, ${loc.longitude}`
        : '📍 Localização compartilhada';
      return { type: 'location', text, replyToWamid };
    }

    case 'contacts':
      return { type: 'contacts', text: '👤 Contato compartilhado', replyToWamid };

    default:
      return {
        type: 'unsupported',
        text: 'Formato de mensagem não suportado diretamente pela central.',
        replyToWamid,
      };
  }
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

      // 1. Processa mensagens recebidas
      if (value.messages && Array.isArray(value.messages)) {
        for (const message of value.messages) {
          try {
            const wamid = message.id;
            const from = String(message.from || '');
            if (!wamid || !from) continue;

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
            const { data: existingMsg } = await supabase
              .from('whatsapp_messages')
              .select('id')
              .eq('api_message_id', wamid)
              .maybeSingle();

            if (existingMsg) {
              result.duplicatesIgnored++;
              continue;
            }

            // Extrai nome de perfil enviado pela Meta
            const contactProfile =
              value.contacts?.find((c: any) => c.wa_id === from)?.profile?.name ||
              value.contacts?.[0]?.profile?.name ||
              null;

            const contactPhoneE164 = normalizeToE164(from);
            const messageTimestamp = message.timestamp
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            // Localiza ou inicializa conversa
            let conversationId: string | null = null;
            let existingCustomerId: string | null = null;
            let existingUnreadCount = 0;

            const { data: convData } = await supabase
              .from('whatsapp_conversations')
              .select('id, customer_id, customer_link_status, unread_count')
              .eq('business_phone_number_id', businessPhoneNumberId)
              .eq('contact_wa_id', from)
              .maybeSingle();

            if (convData) {
              conversationId = convData.id;
              existingCustomerId = convData.customer_id;
              existingUnreadCount = convData.unread_count || 0;
            }

            // Se a conversa ainda não existir ou não estiver vinculada a cliente
            let matchedCustomerId: string | null = existingCustomerId;
            let customerLinkStatus = convData?.customer_link_status || 'unlinked';

            if (!existingCustomerId && customerLinkStatus !== 'manually_linked') {
              const matchResult = await matchCustomerByPhone(supabase, from);
              if (matchResult.status === 'auto_matched' && matchResult.customer) {
                matchedCustomerId = matchResult.customer.id;
                customerLinkStatus = 'auto_matched';
              } else if (matchResult.status === 'ambiguous') {
                customerLinkStatus = 'ambiguous';
              } else {
                customerLinkStatus = 'unlinked';
              }
            }

            const extracted = extractMessageContent(message);

            // Cria ou atualiza a conversa
            if (!conversationId) {
              const { data: newConv, error: convErr } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  business_phone_number_id: businessPhoneNumberId,
                  contact_phone: contactPhoneE164,
                  contact_wa_id: from,
                  contact_name: contactProfile,
                  customer_id: matchedCustomerId,
                  customer_link_status: customerLinkStatus,
                  last_message_text: extracted.text,
                  last_message_at: messageTimestamp,
                  last_customer_message_at: messageTimestamp,
                  unread_count: 1,
                  is_archived: false,
                })
                .select('id')
                .single();

              if (convErr) throw convErr;
              conversationId = newConv.id;
            } else {
              await supabase
                .from('whatsapp_conversations')
                .update({
                  contact_name: contactProfile || undefined,
                  customer_id: matchedCustomerId || undefined,
                  customer_link_status: customerLinkStatus,
                  last_message_text: extracted.text,
                  last_message_at: messageTimestamp,
                  last_customer_message_at: messageTimestamp,
                  unread_count: existingUnreadCount + 1,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
            }

            // Insere mensagem
            const { error: msgErr } = await supabase.from('whatsapp_messages').insert({
              conversation_id: conversationId,
              api_message_id: wamid,
              direction: 'inbound',
              message_type: extracted.type,
              text_content: extracted.text,
              media_id: extracted.mediaId,
              media_mime_type: extracted.mediaMimeType,
              media_filename: extracted.mediaFilename,
              media_caption: extracted.mediaCaption,
              reply_to_wamid: extracted.replyToWamid,
              status: 'received',
              timestamp: messageTimestamp,
            });

            if (msgErr) throw msgErr;

            result.processedMessages++;
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
