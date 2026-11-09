import type { SupabaseClient } from '@supabase/supabase-js';

export async function recordDispatchOutcomeSafe(
  supabase: SupabaseClient,
  dispatchId: string | undefined,
  status: 'sent' | 'failed' | 'uncertain',
  apiMessageId: string | null,
  errorMessage: string | null
): Promise<void> {
  if (!dispatchId || typeof supabase?.rpc !== 'function') return;
  try {
    await supabase.rpc('customer_support_record_ai_dispatch_outcome', {
      p_dispatch_id: dispatchId,
      p_status: status,
      p_api_message_id: apiMessageId,
      p_error_message: errorMessage,
    });
  } catch (err) {
    console.warn('[AI Dispatcher] Falha ao registrar desfecho do despacho:', err);
  }
}

export async function persistOutboundMessageAndSyncConversation(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    apiMessageId: string;
    replyToWamid?: string;
    textContent: string;
    status: 'sent' | 'suggested';
    rawPayload: Record<string, any>;
    sendAt: string;
    syncConversationLastMessage?: boolean;
  }
): Promise<void> {
  await supabase.from('whatsapp_messages').insert({
    conversation_id: params.conversationId,
    api_message_id: params.apiMessageId,
    direction: 'outbound',
    message_type: 'text',
    text_content: params.textContent,
    reply_to_wamid: params.replyToWamid,
    status: params.status,
    raw_payload: params.rawPayload,
    timestamp: params.sendAt,
  });

  if (params.syncConversationLastMessage) {
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_text: params.textContent,
        last_message_at: params.sendAt,
        updated_at: params.sendAt,
      })
      .eq('id', params.conversationId);
  }
}
