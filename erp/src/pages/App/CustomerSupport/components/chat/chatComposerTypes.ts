import type React from 'react';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import type { InsertedSnippet } from './useChatComposerController';

export interface ChatComposerProps {
  conversation?: WhatsAppConversation;
  displayName?: string;
  canSend?: boolean;
  canShareCommercialInfo?: boolean;
  canCreateOrders?: boolean;
  shareOrderRequest?: { record: SupportOrderSummary; requestId: string } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
  careWindowOpen?: boolean;
  isChannelConnected?: boolean;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  onRefreshMessages?: () => Promise<void> | void;
  replyTarget?: WhatsAppMessage | null;
  onClearReplyTarget?: () => void;
  composerMode?: 'whatsapp' | 'comment';
  onComposerModeChange?: (mode: 'whatsapp' | 'comment') => void;
  insertedSnippet?: InsertedSnippet | null;
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  internalComments?: WhatsAppMessage[];
  onOpenSnippets: () => void;
  catalogSpaceRef?: React.RefObject<HTMLElement | null>;
}

export const EMPTY_CONVERSATION: WhatsAppConversation = {
  id: '',
  businessPhoneNumberId: '',
  contactPhone: '',
  contactWaId: '',
  contactName: null,
  customerId: null,
  customerLinkStatus: 'unlinked',
  lastMessageText: null,
  lastMessageAt: '',
  lastCustomerMessageAt: null,
  unreadCount: 0,
  isArchived: true,
  internalNotes: null,
  tags: [],
  assignedTo: null,
  createdAt: '',
  updatedAt: '',
};
