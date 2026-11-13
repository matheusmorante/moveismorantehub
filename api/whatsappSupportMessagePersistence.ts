import type { SupabaseClient } from '@supabase/supabase-js';
import type { SendPayload } from './whatsappSupportSendRequest.js';
import type { WhatsAppSupportContentType } from './whatsappSupportFileClassifier.js';
import type { ResolvedCatalogMessage } from './whatsappSupportCatalogMessage.js';

export interface PersistWhatsAppSupportMessageInput {
  adminDb: SupabaseClient;
  payload: SendPayload;
  apiMessageId: string;
  messageType: WhatsAppSupportContentType | 'text' | 'contacts' | 'interactive';
  storedText: string;
  mediaId: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  message: string;
  replyToMessageId: string | null;
  sendAt: string;
  userId: string;
  authorName: string;
  aiSuggestionRawPayload: Record<string, any> | null;
  nativeProducts?: ResolvedCatalogMessage['nativeProducts'];
  withTimeout: <T>(promise: PromiseLike<T>, timeoutMs: number) => Promise<T>;
}

export interface ClaimAiSuggestionInput {
  adminDb: SupabaseClient;
  conversationId: string;
  aiSuggestionMessageId: string;
  withTimeout: <T>(promise: PromiseLike<T>, timeoutMs: number) => Promise<T>;
}

export async function claimAiSuggestion({
  adminDb,
  conversationId,
  aiSuggestionMessageId,
  withTimeout,
}: ClaimAiSuggestionInput): Promise<{ errorStatus?: number; errorMessage?: string }> {
  const claimResult = await withTimeout<any>(
    adminDb
      .from('whatsapp_messages')
      .update({ status: 'sending' })
      .eq('id', aiSuggestionMessageId)
      .eq('conversation_id', conversationId)
      .eq('status', 'suggested')
      .contains('raw_payload', { is_suggestion: true })
      .select('id')
      .maybeSingle(),
    12_000,
  );

  if (claimResult.error) {
    return { errorStatus: 503, errorMessage: 'Não foi possível reservar esta sugestão para envio.' };
  }
  if (!claimResult.data) {
    return { errorStatus: 409, errorMessage: 'Esta sugestão já está sendo enviada ou foi aprovada.' };
  }
  return {};
}

export async function revertAiSuggestionClaim(
  adminDb: SupabaseClient,
  conversationId: string,
  aiSuggestionMessageId: string,
  withTimeout: <T>(promise: PromiseLike<T>, timeoutMs: number) => Promise<T>,
): Promise<void> {
  await withTimeout(
    adminDb
      .from('whatsapp_messages')
      .update({ status: 'suggested' })
      .eq('id', aiSuggestionMessageId)
      .eq('conversation_id', conversationId)
      .eq('status', 'sending'),
    12_000,
  ).catch(() => undefined);
}

export async function persistWhatsAppSupportOutboundMessage({
  adminDb,
  payload,
  apiMessageId,
  messageType,
  storedText,
  mediaId,
  mediaMimeType,
  mediaFilename,
  message,
  replyToMessageId,
  sendAt,
  userId,
  authorName,
  aiSuggestionRawPayload,
  nativeProducts,
  withTimeout,
}: PersistWhatsAppSupportMessageInput): Promise<{ success: boolean; warning?: string }> {
  try {
    const sentRawPayload = {
      ...(payload.aiSuggestionMessageId
        ? {
            ...aiSuggestionRawPayload,
            author_id: userId,
            author_name: authorName,
            origin: 'customer_support_composer',
            is_ai: false,
            is_suggestion: false,
            accepted_ai_suggestion: true,
          }
        : {
            author_id: userId,
            author_name: authorName,
            origin: payload.forwarded ? 'customer_support_forward' : 'customer_support_composer',
            ...(payload.forwarded ? { forwarded: true } : {}),
          }),
      ...(nativeProducts?.length
        ? {
            provider_message_type: nativeProducts.length === 1 ? 'product' : 'product_list',
            catalog_product_count: nativeProducts.length,
            catalog_products: nativeProducts.map((product) => ({
              retailer_id: product.retailerId,
              name: product.name,
            })),
          }
        : {}),
    };

    const messagePersistence = payload.aiSuggestionMessageId
      ? await withTimeout(
          adminDb
            .from('whatsapp_messages')
            .update({
              api_message_id: apiMessageId,
              direction: 'outbound',
              message_type: messageType,
              text_content: storedText,
              media_id: mediaId,
              media_mime_type: mediaMimeType,
              media_filename: mediaFilename,
              media_caption: payload.file ? message || null : null,
              reply_to_message_id: replyToMessageId,
              reply_to_wamid: payload.replyToWamid || null,
              status: 'sent',
              raw_payload: sentRawPayload,
              timestamp: sendAt,
            })
            .eq('id', payload.aiSuggestionMessageId)
            .eq('conversation_id', payload.conversationId)
            .eq('status', 'sending')
            .select('id')
            .maybeSingle(),
          12_000,
        )
      : await withTimeout(
          adminDb.from('whatsapp_messages').insert({
            conversation_id: payload.conversationId,
            api_message_id: apiMessageId,
            direction: 'outbound',
            message_type: messageType,
            text_content: storedText,
            media_id: mediaId,
            media_mime_type: mediaMimeType,
            media_filename: mediaFilename,
            media_caption: payload.file ? message || null : null,
            reply_to_message_id: replyToMessageId,
            reply_to_wamid: payload.replyToWamid || null,
            status: 'sent',
            raw_payload: sentRawPayload,
            timestamp: sendAt,
          }),
          12_000,
        );

    if (messagePersistence.error || (payload.aiSuggestionMessageId && !messagePersistence.data)) {
      throw new Error('message persistence failed');
    }

    const conversationUpdate = await withTimeout(
      adminDb
        .from('whatsapp_conversations')
        .update({
          last_message_text: storedText,
          last_message_at: sendAt,
          unread_count: 0,
          updated_at: sendAt,
        })
        .eq('id', payload.conversationId)
        .lte('last_customer_message_at', sendAt)
        .lte('last_message_at', sendAt),
      12_000,
    );

    if (conversationUpdate.error) {
      throw new Error('conversation update failed');
    }

    return { success: true };
  } catch {
    return {
      success: false,
      warning:
        'A Meta aceitou a mensagem, mas o histórico não foi atualizado. Atualize a conversa e não reenvie este conteúdo.',
    };
  }
}
