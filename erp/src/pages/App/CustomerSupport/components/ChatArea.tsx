import React, { useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { ChatMessageTimeline, groupMessagesByDate } from './chat/ChatMessageTimeline';
import { ChatComposer } from './chat/ChatComposer';
import { SelectedMessageActionBar } from './chat/SelectedMessageActionBar';
import { SilentHandoffAlertBanner } from './chat/SilentHandoffAlertBanner';
import { useChatAreaState } from './chat/useChatAreaState';
import { useChatAreaConversationMeta } from './chat/useChatAreaConversationMeta';
import { ChatAreaHeaderSection } from './chat/ChatAreaHeaderSection';
import { ChatAreaModals } from './chat/ChatAreaModals';
import type { ChatAreaProps } from './chat/chatAreaTypes';

export { groupMessagesByDate };
export type { ChatAreaProps };

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  teamMembers,
  isLoadingAgents,
  agentsError,
  onReloadAgents,
  messages,
  isLoadingMessages,
  onBackMobile,
  onToggleInfoPanel,
  isTimelineOpen = false,
  onToggleTimeline,
  onToggleArchive,
  onToggleReadStatus,
  onAssign,
  onUpdateStatus,
  onUpdateAiStatus,
  onAddInternalNote,
  onSendCustomerMessage,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  onRefreshMessages,
  onClosePanel,
  onResolveReplyTarget,
  onSelectConversation,
  onJumpToMessage,
  jumpToMessageId,
  onJumpComplete,
  messagesError = '',
  shareOrderRequest = null,
  onShareOrderRequestHandled,
}) => {
  const { profile, user } = useAuth();
  const catalogSpaceRef = useRef<HTMLDivElement>(null);

  const roles = profile ? getProfileRoles(profile) : [];
  const canSend = canPerform('sendCustomerSupportMessages', roles);
  const canShareCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);
  const canCreateOrders = canPerform('createEditOrders', roles);

  const {
    inChatSearch,
    setInChatSearch,
    composerMode,
    setComposerMode,
    searchRevision,
    setSearchRevision,
    isSearchingInChat,
    setIsSearchingInChat,
    isSnippetsModalOpen,
    setIsSnippetsModalOpen,
    replyTarget,
    setReplyTarget,
    forwardMessage,
    setForwardMessage,
    selectedMessage,
    setSelectedMessage,
    insertedSnippet,
    handleInsertSnippet,
    isMessageSelectionMode,
    selectedMessagePreview,
  } = useChatAreaState({
    conversationId: conversation.id,
    canSend,
    jumpToMessageId,
  });

  const {
    displayName,
    formattedPhone,
    careWindow,
    isChannelConnected,
    initials,
    currentStatus,
    currentUserName,
  } = useChatAreaConversationMeta(conversation, profile, user);

  return (
    <div
      ref={catalogSpaceRef}
      className="@container/chat flex-1 flex flex-col min-w-0 min-h-0 h-full bg-[#efeae2]/80 dark:bg-[#0b141a] relative overflow-hidden select-none transition-colors"
    >
      {/* Textura sutil de fundo estilo WhatsApp Web */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none bg-[radial-gradient(#128c7e_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Barra de Mensagem Selecionada (Responder / Encaminhar) */}
      {selectedMessage && canSend && (
        <SelectedMessageActionBar
          selectedMessagePreview={selectedMessagePreview}
          canReply={selectedMessage.canReply}
          canForward={selectedMessage.canForward}
          onReply={() => {
            setComposerMode('whatsapp');
            setReplyTarget(selectedMessage.message);
            setSelectedMessage(null);
          }}
          onForward={() => {
            setForwardMessage(selectedMessage.message);
            setSelectedMessage(null);
          }}
          onCancel={() => setSelectedMessage(null)}
        />
      )}

      {/* Header Fixo e Barra de Busca */}
      <ChatAreaHeaderSection
        isMessageSelectionMode={isMessageSelectionMode}
        conversation={conversation}
        displayName={displayName}
        formattedPhone={formattedPhone}
        initials={initials}
        careWindow={careWindow}
        currentStatus={currentStatus}
        isSearchingInChat={isSearchingInChat}
        setIsSearchingInChat={setIsSearchingInChat}
        inChatSearch={inChatSearch}
        setInChatSearch={setInChatSearch}
        setSearchRevision={setSearchRevision}
        composerMode={composerMode}
        setComposerMode={setComposerMode}
        setReplyTarget={setReplyTarget}
        onToggleInfoPanel={onToggleInfoPanel}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={onToggleTimeline}
        onBackMobile={onBackMobile}
        onClosePanel={onClosePanel}
        onToggleArchive={onToggleArchive}
        onToggleReadStatus={onToggleReadStatus}
        teamMembers={teamMembers}
        isLoadingAgents={isLoadingAgents}
        agentsError={agentsError}
        onReloadAgents={onReloadAgents}
        onAssign={onAssign}
        onUpdateStatus={onUpdateStatus}
        currentUserId={profile?.id || user?.id}
        currentUserName={currentUserName}
      />

      {/* Banner Persistente de Escalonamento Silencioso (Intervenção Humana Necessária) */}
      {conversation.aiStatus === 'needs_human' && (
        <SilentHandoffAlertBanner
          reason={conversation.aiHandoffReason}
          onAssumeChat={() => onUpdateAiStatus?.('human_active')}
          onReactivateAi={() => onUpdateAiStatus?.('active')}
        />
      )}

      {/* Área Central de Mensagens com Rolagem Independente */}
      <ChatMessageTimeline
        key={conversation.id}
        messages={messages}
        displayName={displayName}
        inChatSearch={inChatSearch}
        searchRevision={searchRevision}
        isLoadingMessages={isLoadingMessages}
        error={messagesError}
        conversationId={conversation.id}
        searchUserId={user?.id}
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        onLoadOlderMessages={onLoadOlderMessages}
        selectedMessageId={isMessageSelectionMode ? selectedMessage?.message.id : undefined}
        onSelectMessage={
          canSend
            ? (message, capabilities) => {
                setSelectedMessage((current) =>
                  current?.message.id === message.id ? null : { message, ...capabilities }
                );
              }
            : undefined
        }
        onResolveReplyTarget={onResolveReplyTarget}
        onJumpToMessage={onJumpToMessage}
        jumpToMessageId={jumpToMessageId}
        onJumpComplete={onJumpComplete}
      />

      {/* Rodapé de Composição (WhatsApp vs Comentário Interno) */}
      <ChatComposer
        conversation={conversation}
        displayName={displayName}
        canSend={canSend}
        canShareCommercialInfo={canShareCommercialInfo}
        canCreateOrders={canCreateOrders}
        shareOrderRequest={
          shareOrderRequest?.conversationId === conversation.id
            ? { record: shareOrderRequest.record, requestId: shareOrderRequest.requestId }
            : null
        }
        onShareOrderRequestHandled={onShareOrderRequestHandled}
        careWindowOpen={careWindow.isOpen}
        isChannelConnected={isChannelConnected}
        onSendCustomerMessage={onSendCustomerMessage}
        onRefreshMessages={onRefreshMessages}
        replyTarget={replyTarget}
        onClearReplyTarget={() => setReplyTarget(null)}
        composerMode={composerMode}
        onComposerModeChange={setComposerMode}
        insertedSnippet={insertedSnippet}
        onAddInternalNote={onAddInternalNote}
        internalComments={messages.filter((message) => message.messageType === 'internal_note')}
        onOpenSnippets={() => setIsSnippetsModalOpen(true)}
        catalogSpaceRef={catalogSpaceRef}
      />

      {/* Modais de Snippets e Encaminhamento */}
      <ChatAreaModals
        isSnippetsModalOpen={isSnippetsModalOpen}
        setIsSnippetsModalOpen={setIsSnippetsModalOpen}
        handleInsertSnippet={handleInsertSnippet}
        forwardMessage={forwardMessage}
        setForwardMessage={setForwardMessage}
        canSend={canSend}
        onSelectConversation={onSelectConversation}
      />
    </div>
  );
};
