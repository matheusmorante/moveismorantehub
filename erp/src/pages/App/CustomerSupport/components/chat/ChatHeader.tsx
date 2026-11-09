import React from 'react';
import type { WhatsAppConversation, ConversationStatus, AssignedProfileSummary } from '../../types';
import type { CareWindow } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import {
  ChatHeaderUserInfo,
  ChatHeaderActionButtons,
  useChatHeaderCommands,
} from './header';

interface ChatHeaderProps {
  conversation: WhatsAppConversation;
  displayName: string;
  formattedPhone: string;
  initials: string;
  careWindow: CareWindow;
  currentStatus: string;
  isSearchingInChat: boolean;
  onToggleSearchInChat: () => void;
  onToggleInfoPanel: () => void;
  composerMode?: 'whatsapp' | 'comment';
  onToggleInternalComment?: () => void;
  isTimelineOpen: boolean;
  onToggleTimeline?: () => void;
  onBackMobile: () => void;
  onClosePanel?: () => void;
  onToggleArchive: () => Promise<boolean | void> | boolean | void;
  teamMembers: AssignedProfileSummary[];
  isLoadingAgents?: boolean;
  agentsError?: string | null;
  onReloadAgents?: () => void;
  onAssign?: (profileId: string | null, profileName?: string) => Promise<boolean | void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<boolean | void>;
  onToggleReadStatus?: () => Promise<boolean | void>;
  currentUserId?: string;
  currentUserName?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  displayName,
  formattedPhone,
  initials,
  careWindow,
  currentStatus,
  isSearchingInChat,
  onToggleSearchInChat,
  onToggleInfoPanel,
  composerMode = 'whatsapp',
  onToggleInternalComment,
  isTimelineOpen,
  onToggleTimeline,
  onBackMobile,
  onClosePanel,
  onToggleArchive,
  teamMembers,
  isLoadingAgents = false,
  agentsError = null,
  onReloadAgents,
  onAssign,
  onUpdateStatus,
  onToggleReadStatus,
  currentUserId,
  currentUserName,
}) => {
  const {
    errors,
    isSubmitting,
    submitCommand,
    assign,
    isUpdatingReadStatus,
    toggleReadStatus,
  } = useChatHeaderCommands({
    conversationId: conversation.id,
    teamMembers,
    currentUserId,
    currentUserName,
    onAssign,
    onUpdateStatus,
    onToggleArchive,
    onToggleReadStatus,
  });

  const isUnread = conversation.unreadCount > 0;
  const assignedName = conversation.assignedProfile?.fullName || 'Não atribuído';
  const assignedInitials = assignedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="relative min-h-16 px-4 py-2 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col gap-2 @3xl/chat:h-16 @3xl/chat:flex-row @3xl/chat:items-center @3xl/chat:justify-between @3xl/chat:py-0 shrink-0 z-30 shadow-xs">
      <fieldset disabled={isSubmitting} className="contents" aria-busy={isSubmitting}>
        {errors.root?.command && (
          <p
            role="alert"
            className="absolute top-full right-2 z-50 p-2 rounded-lg bg-red-50 dark:bg-red-950 text-xs text-red-700 dark:text-red-300 shadow-sm"
          >
            {errors.root.command.message}
          </p>
        )}
        {isSubmitting && (
          <span
            role="status"
            className="absolute top-full right-2 z-50 p-2 rounded-lg bg-white dark:bg-slate-900 text-xs text-emerald-700 animate-pulse"
          >
            Salvando alteração…
          </span>
        )}

        {/* Esquerda: Informações e Avatar do Contato */}
        <ChatHeaderUserInfo
          conversation={conversation}
          displayName={displayName}
          formattedPhone={formattedPhone}
          initials={initials}
          careWindow={careWindow}
          currentStatus={currentStatus}
          onToggleInfoPanel={onToggleInfoPanel}
          onBackMobile={onBackMobile}
        />

        {/* Direita: Controles e Ações de Atendimento */}
        <ChatHeaderActionButtons
          conversation={conversation}
          formattedPhone={formattedPhone}
          isSearchingInChat={isSearchingInChat}
          onToggleSearchInChat={onToggleSearchInChat}
          isUnread={isUnread}
          isUpdatingReadStatus={isUpdatingReadStatus}
          onToggleReadStatus={() => void toggleReadStatus()}
          isTimelineOpen={isTimelineOpen}
          onToggleTimeline={onToggleTimeline}
          onToggleArchive={() => void submitCommand({ intent: 'archive', conversationId: conversation.id })}
          composerMode={composerMode}
          onToggleInternalComment={onToggleInternalComment}
          assignedName={assignedName}
          assignedInitials={assignedInitials}
          teamMembers={teamMembers}
          isLoadingAgents={isLoadingAgents}
          agentsError={agentsError}
          onReloadAgents={onReloadAgents}
          currentUserId={currentUserId}
          onAssign={assign}
          onClosePanel={onClosePanel}
        />
      </fieldset>
    </div>
  );
};
