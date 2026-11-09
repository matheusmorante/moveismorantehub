import type {
  WhatsAppConversation,
  WhatsAppMessage,
  ConversationStatus,
  AssignedProfileSummary,
} from '../../types';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';

export interface ChatAreaProps {
  conversation: WhatsAppConversation;
  teamMembers: AssignedProfileSummary[];
  isLoadingAgents?: boolean;
  agentsError?: string | null;
  onReloadAgents?: () => void;
  messages: WhatsAppMessage[];
  isLoadingMessages: boolean;
  onBackMobile: () => void;
  onToggleInfoPanel: () => void;
  isTimelineOpen?: boolean;
  onToggleTimeline?: () => void;
  onToggleArchive: () => Promise<boolean | void> | boolean | void;
  onToggleReadStatus?: () => Promise<boolean | void>;
  onAssign?: (profileId: string | null, profileName?: string) => Promise<boolean | void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<boolean | void>;
  onUpdateAiStatus?: (
    aiStatus: 'active' | 'needs_human' | 'human_active' | 'paused',
    reason?: string
  ) => Promise<boolean | void>;
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<number>;
  onRefreshMessages?: () => Promise<void> | void;
  onClosePanel?: () => void;
  onResolveReplyTarget?: (reference: {
    conversationId: string;
    messageId: string | null;
    apiMessageId: string | null;
  }) => Promise<WhatsAppMessage | null>;
  onSelectConversation?: (conversation: WhatsAppConversation) => void;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
  jumpToMessageId?: string | null;
  onJumpComplete?: () => void;
  messagesError?: string;
  shareOrderRequest?: { conversationId: string; requestId: string; record: SupportOrderSummary } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
}
