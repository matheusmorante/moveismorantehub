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
  isInfoPanelOpen: boolean;
  onToggleInfoPanel: () => void;
  isTimelineOpen?: boolean;
  onToggleTimeline?: () => void;
  onToggleArchive: () => Promise<boolean | void> | boolean | void;
  onAssign?: (profileId: string | null, profileName?: string) => Promise<boolean | void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<boolean | void>;
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<number>;
  onRefreshMessages?: () => Promise<void> | void;
  isRefreshingMessages?: boolean;
  onClosePanel?: () => void;
  onResolveReplyTarget?: (reference: { conversationId: string; messageId: string | null; apiMessageId: string | null }) => Promise<WhatsAppMessage | null>;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
  jumpToMessageId?: string | null;
  onJumpComplete?: () => void;
  messagesError?: string;
  shareOrderRequest?: { conversationId: string; requestId: string; record: SupportOrderSummary } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
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
  isInfoPanelOpen,
  onToggleInfoPanel,
  isTimelineOpen = false,
  onToggleTimeline,
  onToggleArchive,
  onAssign,
  onUpdateStatus,
  onAddInternalNote,
  onSendCustomerMessage,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  onRefreshMessages,
  isRefreshingMessages = false,
  onClosePanel,
  onResolveReplyTarget,
  onJumpToMessage,
  jumpToMessageId,
  onJumpComplete,
  messagesError = '',
  shareOrderRequest = null,
  onShareOrderRequestHandled,
}) => {
  const { profile, user } = useAuth();
  const [inChatSearch, setInChatSearch] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState(false);
  const [insertedSnippet, setInsertedSnippet] = useState<{ id: number; text: string } | null>(null);
  const snippetRevision = useRef(0);
  const catalogSpaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jumpToMessageId) return;
    setIsSearchingInChat(false);
    setInChatSearch('');
  }, [jumpToMessageId]);

  const displayName =
    conversation.customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
  const roles = profile ? getProfileRoles(profile) : [];
  const canSend = canPerform('sendCustomerSupportMessages', roles);
  const canShareCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);
  const configuredPhoneNumberId = getSettings().whatsappConfig?.phoneNumberId;
  const isChannelConnected = Boolean(
    configuredPhoneNumberId && configuredPhoneNumberId === conversation.businessPhoneNumberId,
  );

  const handleInsertSnippet = (snippet: QuickSnippet) => {
    snippetRevision.current += 1;
    setInsertedSnippet({ id: snippetRevision.current, text: snippet.content });
    setIsSnippetsModalOpen(false);
  };

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');
  const currentUserName = profile?.full_name || user?.email || 'Atendente';

  return (
    <div ref={catalogSpaceRef} className="@container/chat flex-1 flex flex-col min-w-0 min-h-0 h-full bg-[#efeae2]/80 dark:bg-[#0b141a] relative overflow-hidden select-none transition-colors">
      {/* Textura sutil de fundo estilo WhatsApp Web */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none bg-[radial-gradient(#128c7e_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* 1. Header Fixo da Conversa Ativa */}
      <ChatHeader
        conversation={conversation}
        displayName={displayName}
        formattedPhone={formattedPhone}
        initials={initials}
        careWindow={careWindow}
        currentStatus={currentStatus}
        isSearchingInChat={isSearchingInChat}
        onToggleSearchInChat={() => {
          setIsSearchingInChat((prev) => !prev);
          if (isSearchingInChat) setInChatSearch('');
        }}
        isInfoPanelOpen={isInfoPanelOpen}
        onToggleInfoPanel={onToggleInfoPanel}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={onToggleTimeline}
        onBackMobile={onBackMobile}
        onClosePanel={onClosePanel}
        onOpenSnippets={() => setIsSnippetsModalOpen(true)}
        onToggleArchive={onToggleArchive}
        teamMembers={teamMembers}
        isLoadingAgents={isLoadingAgents}
        agentsError={agentsError}
        onReloadAgents={onReloadAgents}
        onAssign={onAssign}
        onUpdateStatus={onUpdateStatus}
        currentUserId={profile?.id || user?.id}
        currentUserName={currentUserName}
        onRefreshMessages={async () => {
          if (isSearchingInChat) setSearchRevision((revision) => revision + 1);
          await onRefreshMessages?.();
        }}
        isRefreshingMessages={isRefreshingMessages}
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
        shareOrderRequest={shareOrderRequest?.conversationId === conversation.id
          ? { record: shareOrderRequest.record, requestId: shareOrderRequest.requestId }
          : null}
        onShareOrderRequestHandled={onShareOrderRequestHandled}
        careWindowOpen={careWindow.isOpen}
        isChannelConnected={isChannelConnected}
        onSendCustomerMessage={onSendCustomerMessage}
        onRefreshMessages={onRefreshMessages}
        insertedSnippet={insertedSnippet}
        onAddInternalNote={onAddInternalNote}
        onOpenSnippets={() => setIsSnippetsModalOpen(true)}
        catalogSpaceRef={catalogSpaceRef}
      />

      {/* Modal de Respostas Rápidas & Snippets */}
      <QuickSnippetsModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
        onSelect={handleInsertSnippet}
      />
    </div>
  );
};
