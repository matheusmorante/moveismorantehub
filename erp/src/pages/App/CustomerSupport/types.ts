import { CustomerSummary, CustomerLinkStatus } from '@/pages/utils/customerSupport/customerMatchingService';
import { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';

export interface WhatsAppConversation {
  id: string;
  businessPhoneNumberId: string;
  contactPhone: string; // E.164
  contactWaId: string;
  contactName: string | null;
  customerId: string | null;
  customerLinkStatus: CustomerLinkStatus;
  lastMessageText: string | null;
  lastMessageAt: string;
  lastCustomerMessageAt: string | null;
  unreadCount: number;
  isArchived: boolean;
  internalNotes: string | null;
  tags: string[];
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;

  // Campos hidratados em tempo de execução
  customer?: CustomerSummary | null;
  orders?: SupportOrderSummary[];
  ambiguityList?: CustomerSummary[];
}

export type WhatsAppMessageDirection = 'inbound' | 'outbound';
export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'interactive'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'unsupported';

export type WhatsAppMessageDeliveryStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'received';

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  apiMessageId: string | null;
  direction: WhatsAppMessageDirection;
  messageType: WhatsAppMessageType;
  textContent: string | null;
  mediaId: string | null;
  mediaMimeType: string | null;
  mediaUrl: string | null;
  mediaFilename: string | null;
  mediaCaption: string | null;
  replyToMessageId: string | null;
  replyToWamid: string | null;
  status: WhatsAppMessageDeliveryStatus;
  errorCode: string | null;
  failureReason: string | null;
  timestamp: string;
  createdAt: string;
}

export type ConversationFilter =
  | 'all'
  | 'unread'
  | 'linked'
  | 'unlinked'
  | 'with_orders'
  | 'without_orders'
  | 'archived';
