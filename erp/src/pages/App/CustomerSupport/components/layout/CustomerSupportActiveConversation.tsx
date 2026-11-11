import React from 'react';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import { ChatArea } from '../ChatArea';
import type { ChatAreaProps } from '../chat/chatAreaTypes';
import { CustomerInfoPanel } from '../CustomerInfoPanel';
import { ActivityTimelineDrawer } from '../ActivityTimelineDrawer';

interface CustomerSupportActiveConversationProps {
  selectedConversation: WhatsAppConversation;
  agents: any[];
  isLoadingAgents: boolean;
  agentsError: ChatAreaProps['agentsError'];
  reloadAgents: () => void;
  messages: WhatsAppMessage[];
  isLoadingMessages: boolean;
  messagesError: string;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  loadOlderMessages: () => Promise<number>;
  onBackMobile: () => void;
  isInfoPanelOpen: boolean;
  onToggleInfoPanel: () => void;
  onCloseInfoPanel: () => void;
  isTimelineOpen: boolean;
  onToggleTimeline: () => void;
  onCloseTimeline: () => void;
  onToggleArchive: ChatAreaProps['onToggleArchive'];
  onToggleReadStatus: NonNullable<ChatAreaProps['onToggleReadStatus']>;
  onAssign: NonNullable<ChatAreaProps['onAssign']>;
  onUpdateStatus: NonNullable<ChatAreaProps['onUpdateStatus']>;
  onUpdateAiStatus: NonNullable<ChatAreaProps['onUpdateAiStatus']>;
  onAddInternalNote: (text: string) => Promise<boolean | void>;
  onSendCustomerMessage: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  onRefreshMessages: () => Promise<void> | void;
  resolveReplyTarget: (reference: { conversationId: string; messageId: string | null; apiMessageId: string | null }) => Promise<WhatsAppMessage | null>;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  jumpToMessage: (message: WhatsAppMessage) => void;
  jumpToMessageId: string | null;
  clearJumpToMessage: () => void;
  shareOrderRequest: { conversationId: string; requestId: string; record: SupportOrderSummary } | null;
  onShareOrderRequestHandled: (requestId: string) => void;
  onConversationUpdated: (updated: Partial<WhatsAppConversation>) => void;
  onShareBudget: (record: SupportOrderSummary) => void;
  onJumpToMessageFromPanel: (message: WhatsAppMessage) => void;
  activityRefreshKey: string;
}

export const CustomerSupportActiveConversation: React.FC<CustomerSupportActiveConversationProps> = ({
  selectedConversation,
  agents,
  isLoadingAgents,
  agentsError,
  reloadAgents,
  messages,
  isLoadingMessages,
  messagesError,
  hasOlderMessages,
  isLoadingOlderMessages,
  loadOlderMessages,
  onBackMobile,
  isInfoPanelOpen,
  onToggleInfoPanel,
  onCloseInfoPanel,
  isTimelineOpen,
  onToggleTimeline,
  onCloseTimeline,
  onToggleArchive,
  onToggleReadStatus,
  onAssign,
  onUpdateStatus,
  onUpdateAiStatus,
  onAddInternalNote,
  onSendCustomerMessage,
  onRefreshMessages,
  resolveReplyTarget,
  onSelectConversation,
  jumpToMessage,
  jumpToMessageId,
  clearJumpToMessage,
  shareOrderRequest,
  onShareOrderRequestHandled,
  onConversationUpdated,
  onShareBudget,
  onJumpToMessageFromPanel,
  activityRefreshKey,
}) => {
  return (
    <div className="flex-1 flex h-full min-h-0 min-w-0 md:min-w-[240px] relative">
      <ChatArea
        key={`chat-${selectedConversation.id}`}
        conversation={selectedConversation}
        teamMembers={agents}
        isLoadingAgents={isLoadingAgents}
        agentsError={agentsError}
        onReloadAgents={reloadAgents}
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        messagesError={messagesError}
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        onLoadOlderMessages={loadOlderMessages}
        onBackMobile={onBackMobile}
        onToggleInfoPanel={onToggleInfoPanel}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={onToggleTimeline}
        onToggleArchive={onToggleArchive}
        onToggleReadStatus={onToggleReadStatus}
        onAssign={onAssign}
        onUpdateStatus={onUpdateStatus}
        onUpdateAiStatus={onUpdateAiStatus}
        onAddInternalNote={onAddInternalNote}
        onSendCustomerMessage={onSendCustomerMessage}
        onRefreshMessages={onRefreshMessages}
        onResolveReplyTarget={resolveReplyTarget}
        onSelectConversation={onSelectConversation}
        onJumpToMessage={jumpToMessage}
        jumpToMessageId={jumpToMessageId}
        onJumpComplete={clearJumpToMessage}
        shareOrderRequest={shareOrderRequest}
        onShareOrderRequestHandled={onShareOrderRequestHandled}
      />

      {/* Coluna 5: Painel Contextual do ERP (Dados do Cliente e Pedidos) */}
      <CustomerInfoPanel
        key={`customer-info-${selectedConversation.id}`}
        conversation={selectedConversation}
        isOpen={isInfoPanelOpen}
        onClose={onCloseInfoPanel}
        onConversationUpdated={onConversationUpdated}
        onShareBudget={onShareBudget}
        onJumpToMessage={onJumpToMessageFromPanel}
      />

      {/* Linha do Tempo / Histórico de Atividades (Ativado via botão 🕒 do cabeçalho) */}
      <ActivityTimelineDrawer
        conversationId={selectedConversation.id}
        activityRefreshKey={activityRefreshKey}
        isOpen={isTimelineOpen}
        onClose={onCloseTimeline}
      />
    </div>
  );
};
