import { CustomerSummary, CustomerLinkStatus } from '@/pages/utils/customerSupport/customerMatchingService';
import { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';

export type ConversationStatus = 'open' | 'closed' | 'snoozed';

export interface AssignedProfileSummary {
  id: string;
  fullName: string;
  role?: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface CustomerSupportFolderCriteria {
  status: 'all' | ConversationStatus;
  assigneeId: 'all' | 'unassigned' | 'mine' | string;
  unread: boolean;
  customerLink: 'all' | 'linked' | 'unlinked';
  orders: 'all' | 'with_orders' | 'without_orders';
  search: string;
  testArtifact?: { is_test: true; runId: string; ownerId: string; scenarioKey?: string };
}

export interface CustomerSupportFolder {
  id: string;
  name: string;
  criteria: CustomerSupportFolderCriteria;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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

  // Campos enriquecidos e calculados em tempo de execução
  status?: ConversationStatus;
  assignedProfile?: AssignedProfileSummary | null;
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
  | 'internal_note'
  | 'system_event'
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

  // Informações de autoria de notas internas ou atendente
  authorName?: string | null;
  authorAvatar?: string | null;
  authorRole?: string | null;
  rawPayload?: any;
}

export type ConversationFilter =
  | 'all'
  | 'mine'
  | 'unassigned'
  | 'unread'
  | 'linked'
  | 'unlinked'
  | 'with_orders'
  | 'without_orders'
  | 'archived'
  | 'closed'
  | 'snoozed';

export interface QuickSnippet {
  id: string;
  title: string;
  category: 'pagamento' | 'entrega' | 'loja' | 'assistencia' | 'geral';
  content: string;
  shortcut: string;
}
