import type { SupabaseClient } from '@supabase/supabase-js';

export async function recordDispatchOutcomeSafe(
  supabase: SupabaseClient,
  dispatchId: string | undefined,
  status: 'sent' | 'failed' | 'uncertain',
  apiMessageId: string | null,
  errorMessage: string | null
): Promise<boolean> {
  if (!dispatchId || typeof supabase?.rpc !== 'function') return false;
  try {
    const { data, error } = await supabase.rpc('customer_support_record_ai_dispatch_outcome', {
      p_dispatch_id: dispatchId,
      p_status: status,
      p_api_message_id: apiMessageId,
      p_error_message: errorMessage,
    });
    if (error || data !== true) {
      console.error('[AI Dispatcher] O resultado do despacho não foi persistido:', error?.message || 'registro ausente');
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[AI Dispatcher] Falha ao registrar desfecho do despacho:', err);
    return false;
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
    idempotent?: boolean;
  }
): Promise<void> {
  const message = {
    conversation_id: params.conversationId,
    api_message_id: params.apiMessageId,
    direction: 'outbound',
    message_type: 'text',
    text_content: params.textContent,
    reply_to_wamid: params.replyToWamid,
    status: params.status,
    raw_payload: params.rawPayload,
    timestamp: params.sendAt,
  };
  const table = supabase.from('whatsapp_messages');
  const { error: insertError } = params.idempotent
    ? await table.upsert(message, { onConflict: 'api_message_id', ignoreDuplicates: true })
    : await table.insert(message);

  if (insertError) throw new Error('Falha ao persistir a mensagem gerada pelo agente.');

  if (params.syncConversationLastMessage) {
    let update = supabase
      .from('whatsapp_conversations')
      .update({
        last_message_text: params.textContent,
        last_message_at: params.sendAt,
        updated_at: params.sendAt,
      })
      .eq('id', params.conversationId);
    if (params.idempotent) update = update.lte('last_message_at', params.sendAt);
    const { error: conversationError } = await update;
    if (conversationError) throw new Error('Falha ao atualizar a última mensagem da conversa.');
  }
}
