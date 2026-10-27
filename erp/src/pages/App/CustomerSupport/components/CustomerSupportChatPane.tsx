import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AssignedProfileSummary, WhatsAppConversation } from '../types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import { useCustomerSupportMessages, useCustomerSupportActions } from '../hooks';
import { ActivityTimelineDrawer } from './ActivityTimelineDrawer';
import { ChatArea } from './ChatArea';
import { CustomerInfoPanel } from './CustomerInfoPanel';

interface CustomerSupportChatPaneProps {
  conversation: WhatsAppConversation;
  teamMembers: AssignedProfileSummary[];
  isLoadingAgents: boolean;
  agentsError: string | null;
  onReloadAgents: () => void;
  setConversations: Dispatch<SetStateAction<WhatsAppConversation[]>>;
  currentUserName: string;
  currentUserId?: string;
  currentUserRole?: string;
  onConversationChanged: (conversation: WhatsAppConversation) => void;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  onBackMobile: () => void;
  isMultiChatPanel: boolean;
  onClosePanel?: () => void;
}

export const CustomerSupportChatPane: React.FC<CustomerSupportChatPaneProps> = ({
  conversation,
  teamMembers,
  isLoadingAgents,
  agentsError,
  onReloadAgents,
  setConversations,
  currentUserName,
  currentUserId,
  currentUserRole,
  onConversationChanged,
  onSelectConversation,
  onBackMobile,
  isMultiChatPanel,
  onClosePanel,
}) => {
  const [chatConversation, setChatConversation] = useState(conversation);
  const chatConversationRef = useRef(chatConversation);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [shareOrderRequest, setShareOrderRequest] = useState<{ conversationId: string; requestId: string; record: SupportOrderSummary } | null>(null);

  useEffect(() => {
    chatConversationRef.current = conversation;
    setChatConversation(conversation);
    setShareOrderRequest(null);
  }, [conversation]);

  useEffect(() => {
    chatConversationRef.current = chatConversation;
  }, [chatConversation]);

  const setSelectedChatConversation: Dispatch<SetStateAction<WhatsAppConversation | null>> = useCallback((update) => {
    const current = chatConversationRef.current;
    const next = typeof update === 'function' ? update(current) : update;
    chatConversationRef.current = next || conversation;
    setChatConversation(next || conversation);
    if (next) onConversationChanged(next);
  }, [conversation, onConversationChanged]);

  const handleClearUnread = useCallback((conversationId: string) => {
    const current = chatConversationRef.current;
    if (current.id !== conversationId || current.unreadCount === 0) return;
    setSelectedChatConversation({ ...current, unreadCount: 0 });
  }, [setSelectedChatConversation]);

  const {
    messages,
    setMessages,
    resolveReplyTarget,
    jumpToMessage,
    jumpToMessageId,
    clearJumpToMessage,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasOlderMessages,
    loadOlderMessages,
    messagesError,
    refreshMessages,
  } = useCustomerSupportMessages({
    selectedConversation: chatConversation,
    onClearUnread: handleClearUnread,
  });

  const {
    handleToggleArchive,
    handleConversationUpdated,
    handleAssignConversation,
    handleUpdateStatus,
    handleAddInternalNote,
  } = useCustomerSupportActions({
    selectedConversation: chatConversation,
    setSelectedConversation: setSelectedChatConversation,
    setConversations,
    setMessages,
    currentUserName,
    currentUserId,
    currentUserRole,
  });

  const activityRefreshKey = messages
    .filter((message) => message.messageType === 'internal_note' || message.messageType === 'system_event')
    .map((message) => message.id)
    .join('|');

  const handleToggleInfoPanel = () => {
    setIsInfoPanelOpen((open) => !open);
    setIsTimelineOpen(false);
  };

  const handleToggleTimeline = () => {
    setIsTimelineOpen((open) => !open);
    setIsInfoPanelOpen(false);
  };

  return (
    <section
      data-testid="customer-support-chat-pane"
      aria-label="Conversa aberta"
      className={`relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden ${isMultiChatPanel ? 'border-r border-slate-200 dark:border-slate-800' : ''}`}
      onClick={() => onSelectConversation(chatConversation)}
    >
      <ChatArea
        key={`chat-${chatConversation.id}`}
        conversation={chatConversation}
        teamMembers={teamMembers}
        isLoadingAgents={isLoadingAgents}
        agentsError={agentsError}
        onReloadAgents={onReloadAgents}
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        messagesError={messagesError}
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        onLoadOlderMessages={loadOlderMessages}
        onBackMobile={onBackMobile}
        onClosePanel={onClosePanel}
        onToggleInfoPanel={handleToggleInfoPanel}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={handleToggleTimeline}
        onToggleArchive={handleToggleArchive}
        onAssign={handleAssignConversation}
        onUpdateStatus={handleUpdateStatus}
        onAddInternalNote={handleAddInternalNote}
        onRefreshMessages={refreshMessages}
        onResolveReplyTarget={resolveReplyTarget}
        onJumpToMessage={jumpToMessage}
        jumpToMessageId={jumpToMessageId}
        onJumpComplete={clearJumpToMessage}
        shareOrderRequest={shareOrderRequest}
        onShareOrderRequestHandled={(requestId) => setShareOrderRequest((current) => current?.requestId === requestId ? null : current)}
      />

      <CustomerInfoPanel
        key={`customer-info-${chatConversation.id}`}
        conversation={chatConversation}
        isOpen={isInfoPanelOpen}
        isOverlay={isMultiChatPanel}
        onClose={() => setIsInfoPanelOpen(false)}
        onConversationUpdated={handleConversationUpdated}
        onShareBudget={(record) => setShareOrderRequest({
          conversationId: chatConversation.id,
          requestId: `${Date.now()}-${Math.random()}`,
          record,
        })}
        onJumpToMessage={(message) => {
          jumpToMessage(message);
          setIsInfoPanelOpen(false);
        }}
      />

      <ActivityTimelineDrawer
        conversationId={chatConversation.id}
        activityRefreshKey={activityRefreshKey}
        isOpen={isTimelineOpen}
        isOverlay={isMultiChatPanel}
        onClose={() => setIsTimelineOpen(false)}
      />
    </section>
  );
};
