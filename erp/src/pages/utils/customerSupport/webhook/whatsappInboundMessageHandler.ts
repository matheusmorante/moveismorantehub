import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeToE164 } from '../phoneUtils.js';
import { matchCustomerByPhone } from '../customerMatchingService.js';
import { extractMessageContent } from '../whatsappMessageContent.js';
import { maybeTriggerWhatsAppAiAgent } from '../whatsappAiAgentService.js';
import { processRevokedMessage } from '../whatsappWebhookEchoService.js';

export interface InboundBatchResult {
  processedMessages: number;
  deliveryConfirmations: number;
  duplicatesIgnored: number;
  errors: string[];
}

export async function processInboundMessageBatch(
  supabase: SupabaseClient,
  businessPhoneNumberId: string,
  value: any
): Promise<InboundBatchResult> {
  const result: InboundBatchResult = {
    processedMessages: 0,
    deliveryConfirmations: 0,
    duplicatesIgnored: 0,
    errors: [],
  };

  if (!Array.isArray(value?.messages)) return result;

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

      // Extrai perfil e normaliza telefone
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

      // Matching fora da transação. A RPC reavalia sob row lock.
      if (!existingMsg) {
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

      // Gravação atômica via RPC
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

      if (receipt.inserted) {
        result.processedMessages++;
        if (extracted.type === 'text' && extracted.text?.trim()) {
          try {
            await maybeTriggerWhatsAppAiAgent(supabase, {
              conversationId: receipt.conversation_id,
              messageId: receipt.message_id,
              from,
              contactPhoneE164,
              contactProfile,
              text: extracted.text,
              wamid,
              businessPhoneNumberId,
            });
          } catch (aiErr) {
            console.error('[WhatsApp Webhook] Erro não bloqueante no Agente de IA:', aiErr);
          }
        }
      } else {
        result.duplicatesIgnored++;
      }
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Erro ao processar mensagem individual:', err);
      result.errors.push(err.message || String(err));
    }
  }

  return result;
}
