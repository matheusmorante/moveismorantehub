import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { removeCustomerSupportMessagesFromCentral } from '@/pages/utils/customerSupport/customerSupportService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { ChatMessageTimeline, groupMessagesByDate } from './chat/ChatMessageTimeline';
import { ChatComposer } from './chat/ChatComposer';
import { SelectedMessageActionBar } from './chat/SelectedMessageActionBar';
import { CopySelectedMessageFooter } from './CopySelectedMessageFooter';
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
  const { profile, user, isRealAdministrator } = useAuth();
  const catalogSpaceRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingMessages, setIsDeletingMessages] = useState(false);

  const roles = profile ? getProfileRoles(profile) : [];
  const canSend = isRealAdministrator || canPerform('viewCustomerSupport', roles);
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
    selectedMessages,
    selectedMessageIds,
    toggleSelectedMessage,
    clearSelectedMessages,
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

  const handleDeleteSelectedMessages = async () => {
    const messageIds = [...selectedMessageIds];
    if (!messageIds.length || isDeletingMessages) return;
    setIsDeletingMessages(true);
    try {
      const removedCount = await removeCustomerSupportMessagesFromCentral(conversation.id, messageIds);
      if (!removedCount) throw new Error('Nenhuma mensagem foi removida da Central.');
      setIsDeleteDialogOpen(false);
      clearSelectedMessages();
      toast.success(`${removedCount} mensagem${removedCount === 1 ? '' : 's'} removida${removedCount === 1 ? '' : 's'} da Central. O WhatsApp não permite apagá-la para todos pela API.`);
      try { await onRefreshMessages?.(); } catch {}
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover as mensagens da Central.');
    } finally {
      setIsDeletingMessages(false);
    }
  };

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
          selectedCount={selectedMessages.length}
          canReply={selectedMessage.canReply}
          canForward={selectedMessage.canForward}
          isDeleting={isDeletingMessages}
          onDelete={() => setIsDeleteDialogOpen(true)}
          onReply={() => {
            setComposerMode('whatsapp');
            setReplyTarget(selectedMessage.message);
            clearSelectedMessages();
          }}
          onForward={() => {
            setForwardMessage(selectedMessage.message);
            clearSelectedMessages();
          }}
          onCancel={clearSelectedMessages}
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
        canSelectForActions={canSend}
        isMessageSelectionMode={isMessageSelectionMode}
        selectedMessageId={selectedMessage?.message.id}
        selectedMessageIds={selectedMessageIds}
        onSelectMessage={toggleSelectedMessage}
        onResolveReplyTarget={onResolveReplyTarget}
        onJumpToMessage={onJumpToMessage}
        onApproveAiSuggestion={
          canSend && isChannelConnected && onSendCustomerMessage
            ? async (suggestion) => {
                try {
                  const result = await onSendCustomerMessage({
                    message: suggestion.textContent || '',
                    aiSuggestionMessageId: suggestion.id,
                    ...(suggestion.replyToWamid ? { replyToWamid: suggestion.replyToWamid } : {}),
                  });
                  try {
                    await onRefreshMessages?.();
                  } catch {}
                  return result;
                } catch (error) {
                  try {
                    await onRefreshMessages?.();
                  } catch {}
                  throw error;
                }
              }
            : undefined
        }
        aiSuggestionAuthorName={currentUserName}
        jumpToMessageId={jumpToMessageId}
        onJumpComplete={onJumpComplete}
      />

      {selectedMessages.length === 1 && selectedMessage?.message.messageType === 'text' && selectedMessage.message.textContent?.trim() && (
        <CopySelectedMessageFooter
          messageText={selectedMessage.message.textContent ?? ''}
          onCancel={clearSelectedMessages}
        />
      )}

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

      {isDeleteDialogOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="customer-support-delete-title"
            aria-describedby="customer-support-delete-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <i className="bi bi-trash3 text-lg" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="customer-support-delete-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  Remover {selectedMessages.length === 1 ? 'mensagem' : `${selectedMessages.length} mensagens`} da Central?
                </h2>
                <p id="customer-support-delete-description" className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  A API da Meta não permite apagar mensagens para todos pelo WhatsApp. Esta ação remove o conteúdo do histórico da Central, mas os participantes ainda poderão vê-lo no WhatsApp.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingMessages}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingMessages || selectedMessages.length === 0}
                onClick={() => void handleDeleteSelectedMessages()}
                className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-50"
              >
                {isDeletingMessages ? 'Removendo…' : 'Remover da Central'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
