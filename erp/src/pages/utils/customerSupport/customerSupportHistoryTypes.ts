import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';

export const CONVERSATION_SELECT_COLUMNS =
  'id, business_phone_number_id, contact_phone, contact_wa_id, contact_name, customer_id, customer_link_status, last_message_text, last_message_at, last_customer_message_at, unread_count, is_archived, internal_notes, tags, assigned_to, ai_status, ai_handoff_reason, ai_handoff_at, created_at, updated_at';

export const MESSAGE_SELECT_COLUMNS =
  'id, conversation_id, api_message_id, direction, message_type, text_content, media_id, media_mime_type, media_url, media_filename, media_caption, reply_to_message_id, reply_to_wamid, status, error_code, failure_reason, raw_payload, timestamp, created_at, changed_at';

export interface CustomerSupportHistoryCursor {
  timestamp: string;
  id: string;
}

export interface CustomerSupportHistoryPage {
  messages: WhatsAppMessage[];
  hasMore: boolean;
  nextCursor: CustomerSupportHistoryCursor | null;
}
