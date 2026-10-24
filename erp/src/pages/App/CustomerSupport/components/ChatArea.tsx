import React, { useState } from 'react';
import { WhatsAppConversation, WhatsAppMessage, ConversationStatus, AssignedProfileSummary } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { useAuth } from '@/context/AuthContext';
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
}) => {
  const { profile, user } = useAuth();
  const [inChatSearch, setInChatSearch] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState(false);

  const displayName =
    conversation.customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');
  const currentUserName = profile?.full_name || user?.email || 'Atendente';

  return (
    <div className="@container/chat flex-1 flex flex-col min-w-0 h-full bg-[#efeae2]/80 dark:bg-[#0b141a] relative overflow-hidden select-none transition-colors">
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
        onAddInternalNote={onAddInternalNote}
        onOpenSnippets={() => setIsSnippetsModalOpen(true)}
      />

      {/* Modal de Respostas Rápidas & Snippets */}
      <QuickSnippetsModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
      />
    </div>
  );
};
