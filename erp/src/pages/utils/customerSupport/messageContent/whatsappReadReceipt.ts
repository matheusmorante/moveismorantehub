import type { SupabaseClient } from '@supabase/supabase-js';

const GRAPH_VERSION = 'v26.0';

type ReadReceiptResult = 'marked' | 'no_message' | 'failed';

interface MarkLatestCustomerMessageAsReadOptions {
  conversationId: string;
  messageId?: string;
  businessPhoneNumberId: string;
  accessToken: string;
  beforeTimestamp?: string;
  fetchMeta?: typeof fetch;
}

/** Marks the latest inbound message; WhatsApp also marks earlier messages in that conversation as read. */
export async function markLatestCustomerMessageAsRead(
  supabase: SupabaseClient,
  options: MarkLatestCustomerMessageAsReadOptions,
): Promise<ReadReceiptResult> {
  const { conversationId, businessPhoneNumberId, accessToken, beforeTimestamp } = options;
  if (!conversationId || !/^\d{1,32}$/.test(businessPhoneNumberId) || !accessToken) {
    return 'failed';
  }

  try {
    let messageId = options.messageId?.trim() || '';
    if (!messageId) {
      if (!beforeTimestamp) return 'failed';
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('api_message_id')
        .eq('conversation_id', conversationId)
        .eq('direction', 'inbound')
        .lte('timestamp', beforeTimestamp)
        .not('api_message_id', 'is', null)
        .order('timestamp', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return 'failed';
      messageId = typeof data?.api_message_id === 'string' ? data.api_message_id.trim() : '';
    }
    if (!messageId) return 'no_message';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await (options.fetchMeta || globalThis.fetch)(
        `https://graph.facebook.com/${GRAPH_VERSION}/${businessPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          }),
          signal: controller.signal,
        },
      );
      return response.ok ? 'marked' : 'failed';
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return 'failed';
  }
}
