import type { SupabaseClient } from '@supabase/supabase-js';
import { extractDigits, normalizeToE164 } from './phoneUtils.js';
import { matchCustomerByPhone } from './customerMatchingService.js';
import { extractMessageContent } from './whatsappMessageContent.js';

/**
 * Processa a revogação de uma mensagem do WhatsApp (apagar para todos)
 * invocando a RPC transacional customer_support_revoke_message.
 */
export async function processRevokedMessage(
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

/**
 * Processa mensagens enviadas pelo aplicativo móvel WhatsApp Business oficial (Coexistence).
 * A Meta reporta esses disparos em `smb_message_echoes`.
 * Persiste como mensagem outbound na conversa correspondente.
 */
export async function processBusinessAppEcho(
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
