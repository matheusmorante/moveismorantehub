import React from 'react';
import type { WhatsAppConversation, ConversationStatus, AssignedProfileSummary } from '../../types';
import type { CareWindow } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { ChatHeader } from './ChatHeader';
import { ChatInChatSearch } from './ChatInChatSearch';

interface ChatAreaHeaderSectionProps {
  isMessageSelectionMode: boolean;
  conversation: WhatsAppConversation;
  displayName: string;
  formattedPhone: string;
  initials: string;
  careWindow: CareWindow;
  currentStatus: string;
  isSearchingInChat: boolean;
  setIsSearchingInChat: React.Dispatch<React.SetStateAction<boolean>>;
  inChatSearch: string;
  setInChatSearch: (query: string) => void;
  setSearchRevision: React.Dispatch<React.SetStateAction<number>>;
  composerMode: 'whatsapp' | 'comment';
  setComposerMode: React.Dispatch<React.SetStateAction<'whatsapp' | 'comment'>>;
  setReplyTarget: (target: any) => void;
  onToggleInfoPanel: () => void;
  isTimelineOpen?: boolean;
  onToggleTimeline?: () => void;
  onBackMobile: () => void;
  onClosePanel?: () => void;
  onToggleArchive: () => Promise<boolean | void> | boolean | void;
  onToggleReadStatus?: () => Promise<boolean | void>;
  teamMembers: AssignedProfileSummary[];
  isLoadingAgents?: boolean;
  agentsError?: string | null;
  onReloadAgents?: () => void;
  onAssign?: (profileId: string | null, profileName?: string) => Promise<boolean | void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<boolean | void>;
  currentUserId?: string;
  currentUserName: string;
}

export const ChatAreaHeaderSection: React.FC<ChatAreaHeaderSectionProps> = ({
  isMessageSelectionMode,
  conversation,
  displayName,
  formattedPhone,
  initials,
  careWindow,
  currentStatus,
  isSearchingInChat,
  setIsSearchingInChat,
  inChatSearch,
  setInChatSearch,
  setSearchRevision,
  composerMode,
  setComposerMode,
  setReplyTarget,
  onToggleInfoPanel,
  isTimelineOpen = false,
  onToggleTimeline,
  onBackMobile,
  onClosePanel,
  onToggleArchive,
  onToggleReadStatus,
  teamMembers,
  isLoadingAgents,
  agentsError,
  onReloadAgents,
  onAssign,
  onUpdateStatus,
  currentUserId,
  currentUserName,
}) => {
  if (isMessageSelectionMode) return null;

  return (
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
        onToggleInternalComment={() =>
          setComposerMode((mode) => {
            if (mode === 'whatsapp') setReplyTarget(null);
            return mode === 'comment' ? 'whatsapp' : 'comment';
          })
        }
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
        currentUserId={currentUserId}
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
  );
};
