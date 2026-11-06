import React, { useEffect, useRef, useState } from 'react';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus, AssignedProfileSummary } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { getSettings } from '@/pages/utils/settingsService';
import type { CustomerSupportSendInput, CustomerSupportSendResult } from '@/pages/utils/customerSupport/customerSupportService';
import type { QuickSnippet } from '../types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import { QuickSnippetsModal } from './QuickSnippetsModal';
import { ChatHeader } from './chat/ChatHeader';
import { ChatInChatSearch } from './chat/ChatInChatSearch';
import { ChatMessageTimeline, groupMessagesByDate } from './chat/ChatMessageTimeline';
import { ChatComposer } from './chat/ChatComposer';
import { ForwardMessageDialog } from './chat/ForwardMessageDialog';

// Re-exporta groupMessagesByDate para manter compatibilidade com testes e outros módulos
export { groupMessagesByDate };

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
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<number>;
  onRefreshMessages?: () => Promise<void> | void;
  onClosePanel?: () => void;
  onResolveReplyTarget?: (reference: { conversationId: string; messageId: string | null; apiMessageId: string | null }) => Promise<WhatsAppMessage | null>;
  onSelectConversation?: (conversation: WhatsAppConversation) => void;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
  jumpToMessageId?: string | null;
  onJumpComplete?: () => void;
  messagesError?: string;
  shareOrderRequest?: { conversationId: string; requestId: string; record: SupportOrderSummary } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
}

interface SelectedSupportMessage {
  message: WhatsAppMessage;
  canReply: boolean;
  canForward: boolean;
}

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
  const [inChatSearch, setInChatSearch] = useState('');
  const [composerMode, setComposerMode] = useState<'whatsapp' | 'comment'>('whatsapp');
  const [searchRevision, setSearchRevision] = useState(0);
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<WhatsAppMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<WhatsAppMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SelectedSupportMessage | null>(null);
  const [insertedSnippet, setInsertedSnippet] = useState<{ id: number; text: string } | null>(null);
  const snippetRevision = useRef(0);
  const catalogSpaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jumpToMessageId) return;
    setIsSearchingInChat(false);
    setInChatSearch('');
  }, [jumpToMessageId]);

  const displayName =
    conversation.contactName?.trim() ||
    formatPhoneForDisplay(conversation.contactPhone);

  const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
  const roles = profile ? getProfileRoles(profile) : [];
  const canSend = canPerform('sendCustomerSupportMessages', roles);
  const canShareCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);
  const canCreateOrders = canPerform('createEditOrders', roles);
  const isMessageSelectionMode = Boolean(selectedMessage && canSend);
  const configuredPhoneNumberId = getSettings().whatsappConfig?.phoneNumberId;
  const isChannelConnected = Boolean(
    configuredPhoneNumberId && configuredPhoneNumberId === conversation.businessPhoneNumberId,
  );

  const handleInsertSnippet = (snippet: QuickSnippet) => {
    snippetRevision.current += 1;
    setInsertedSnippet({ id: snippetRevision.current, text: snippet.content });
    setIsSnippetsModalOpen(false);
  };

  const initials = conversation.contactName?.trim()
    ? conversation.contactName
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : '';

  const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');
  const currentUserName = profile?.full_name || user?.email || 'Atendente';
  const selectedMessagePreview = selectedMessage?.message.textContent?.trim()
    || selectedMessage?.message.mediaCaption?.trim()
    || (selectedMessage?.message.messageType === 'image' ? 'Foto'
      : selectedMessage?.message.messageType === 'video' ? 'Vídeo'
        : selectedMessage?.message.messageType === 'audio' ? 'Áudio'
          : selectedMessage?.message.messageType === 'document' ? 'Documento'
            : selectedMessage?.message.messageType === 'sticker' ? 'Figurinha'
              : 'Mensagem');

  useEffect(() => {
    setSelectedMessage(null);
  }, [conversation.id]);

  return (
    <div ref={catalogSpaceRef} className="@container/chat flex-1 flex flex-col min-w-0 min-h-0 h-full bg-[#efeae2]/80 dark:bg-[#0b141a] relative overflow-hidden select-none transition-colors">
      {/* Textura sutil de fundo estilo WhatsApp Web */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none bg-[radial-gradient(#128c7e_1px,transparent_1px)] [background-size:20px_20px]" />

      {selectedMessage && canSend && (
        <div className="relative z-20 flex min-h-14 shrink-0 items-center gap-2 border-b border-emerald-100 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-[#202c33] sm:px-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Mensagem selecionada</p>
            <p className="truncate text-xs text-slate-600 dark:text-slate-300" title={selectedMessagePreview}>{selectedMessagePreview}</p>
          </div>
          <button
            type="button"
            disabled={!selectedMessage.canReply}
            onClick={() => {
              setComposerMode('whatsapp');
              setReplyTarget(selectedMessage.message);
              setSelectedMessage(null);
            }}
            aria-label="Responder mensagem selecionada"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-emerald-950/40"
          >
            <i className="bi bi-reply-fill" aria-hidden="true" />
            Responder
          </button>
          <button
            type="button"
            disabled={!selectedMessage.canForward}
            onClick={() => {
              setForwardMessage(selectedMessage.message);
              setSelectedMessage(null);
            }}
            aria-label="Encaminhar mensagem selecionada"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-emerald-950/40"
          >
            <i className="bi bi-forward-fill" aria-hidden="true" />
            Encaminhar
          </button>
          <button
            type="button"
            onClick={() => setSelectedMessage(null)}
            aria-label="Cancelar seleção da mensagem"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>
      )}

      {!isMessageSelectionMode && (
        <>
          {/* 1. Header Fixo da Conversa Ativa */}
          <ChatHeader
            conversation={conversation}
            displayName={displayName}
            formattedPhone={formattedPhone}
            initials={initials}
            careWindow={careWindow}
            currentStatus={currentStatus}
            isSearchingInChat={isSearchingInChat}
            composerMode={composerMode}
            onToggleInternalComment={() => setComposerMode((mode) => {
              if (mode === 'whatsapp') setReplyTarget(null);
              return mode === 'comment' ? 'whatsapp' : 'comment';
            })}
            onToggleSearchInChat={() => {
              setIsSearchingInChat((prev) => !prev);
              if (isSearchingInChat) setInChatSearch('');
            }}
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

          {/* 2. Barra de Busca Interna (se ativada) */}
          {isSearchingInChat && (
            <ChatInChatSearch
              searchQuery={inChatSearch}
              onSearchChange={(query) => {
                setInChatSearch(query);
                setSearchRevision((revision) => revision + 1);
              }}
              onClose={() => {
                setIsSearchingInChat(false);
                setInChatSearch('');
              }}
            />
          )}
        </>
      )}

      {/* 3. Área Central de Mensagens com Rolagem Independente */}
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
        onSelectMessage={canSend ? (message, capabilities) => {
          setSelectedMessage((current) => current?.message.id === message.id
            ? null
            : { message, ...capabilities });
        } : undefined}
        onResolveReplyTarget={onResolveReplyTarget}
        onJumpToMessage={onJumpToMessage}
        jumpToMessageId={jumpToMessageId}
        onJumpComplete={onJumpComplete}
      />

      {/* 4. Rodapé de Composição (WhatsApp vs Comentário Interno) */}
      <ChatComposer
        conversation={conversation}
        displayName={displayName}
        canSend={canSend}
        canShareCommercialInfo={canShareCommercialInfo}
        canCreateOrders={canCreateOrders}
        shareOrderRequest={shareOrderRequest?.conversationId === conversation.id
          ? { record: shareOrderRequest.record, requestId: shareOrderRequest.requestId }
          : null}
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

      {/* Modal de Respostas Rápidas & Snippets */}
      <QuickSnippetsModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
        onSelect={handleInsertSnippet}
      />

      {forwardMessage && (
        <ForwardMessageDialog
          message={forwardMessage}
          canSend={canSend}
          onClose={() => setForwardMessage(null)}
          onSelectConversation={(target) => {
            onSelectConversation?.(target);
            setForwardMessage(null);
          }}
        />
      )}
    </div>
  );
};
