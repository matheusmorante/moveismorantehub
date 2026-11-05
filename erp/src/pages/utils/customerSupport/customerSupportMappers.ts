import type {
  ConversationStatus,
  WhatsAppConversation,
  WhatsAppMessage,
} from '@/pages/App/CustomerSupport/types';

export function computeConversationStatus(row: any): ConversationStatus {
  if (row.is_archived || (Array.isArray(row.tags) && row.tags.includes('status:closed'))) {
    return 'closed';
  }
  if (Array.isArray(row.tags) && row.tags.includes('status:snoozed')) {
    return 'snoozed';
  }
  return 'open';
}

export function mapRowToConversation(row: any): WhatsAppConversation {
  return {
    id: row.id,
    businessPhoneNumberId: row.business_phone_number_id || '',
    contactPhone: row.contact_phone,
    contactWaId: row.contact_wa_id,
    contactName: row.contact_name,
    customerId: row.customer_id,
    customerLinkStatus: row.customer_link_status || 'unlinked',
    lastMessageText: row.last_message_text,
    lastMessageAt: row.last_message_at || row.created_at,
    lastCustomerMessageAt: row.last_customer_message_at,
    unreadCount: Number(row.unread_count) || 0,
    isArchived: Boolean(row.is_archived),
    internalNotes: row.internal_notes || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    assignedTo: row.assigned_to || null,
    status: computeConversationStatus(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToMessage(row: any): WhatsAppMessage {
  const isLegacyRevocation = row.message_type === 'unsupported'
    && typeof row.text_content === 'string'
    && /a central ainda não consegue exibir este tipo de mensagem\s*\(\s*revoke\s*\)\./i.test(row.text_content);
  const legacyUnsupportedText = row.direction === 'inbound'
    && row.message_type === 'unsupported'
    && (row.text_content === 'Formato de mensagem não suportado diretamente pela central.'
      || row.text_content === '[Mensagem tipo unsupported]')
    ? 'Mensagem sem prévia: a integração não salvou o tipo nem o conteúdo original. Peça ao cliente para reenviar como texto, imagem, áudio ou documento.'
    : row.text_content;
  const legacyUnsupportedCode = row.message_type === 'unsupported'
    && typeof row.text_content === 'string'
    ? /^A API do WhatsApp informou que este tipo de mensagem não é suportado\.\s*\(código\s+(131051)\)$/i.exec(row.text_content)?.[1]
    : null;
  const authorName =
    row.raw_payload?.author_name || (row.direction === 'outbound' ? 'Atendente' : null);
  const authorAvatar = row.raw_payload?.author_avatar || null;
  const authorRole = row.raw_payload?.author_role || null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    apiMessageId: row.api_message_id,
    direction: row.direction,
    messageType: isLegacyRevocation ? 'deleted' : row.message_type || 'text',
    textContent: isLegacyRevocation ? 'Esta mensagem foi apagada' : legacyUnsupportedText,
    mediaId: row.media_id,
    mediaMimeType: row.media_mime_type,
    mediaUrl: row.media_url,
    mediaFilename: row.media_filename,
    mediaCaption: row.media_caption,
    replyToMessageId: row.reply_to_message_id,
    replyToWamid: row.reply_to_wamid,
    status: row.status || 'received',
    errorCode: row.error_code || legacyUnsupportedCode,
    failureReason: row.failure_reason,
    timestamp: row.timestamp || row.created_at,
    createdAt: row.created_at,
    authorName,
    authorAvatar,
    authorRole,
    rawPayload: row.raw_payload,
    changedAt: row.changed_at || undefined,
  };
}
