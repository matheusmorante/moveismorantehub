import React from 'react';
import type { WhatsAppConversation, AssignedProfileSummary } from '../../types';
import { ChatHeaderAssigneeDropdown } from './ChatHeaderAssigneeDropdown';
import { ChatHeaderMoreMenu } from './ChatHeaderMoreMenu';

interface ChatHeaderActionButtonsProps {
  conversation: WhatsAppConversation;
  formattedPhone: string;
  isSearchingInChat: boolean;
  onToggleSearchInChat: () => void;
  isUnread: boolean;
  isUpdatingReadStatus: boolean;
  onToggleReadStatus?: () => void;
  isTimelineOpen: boolean;
  onToggleTimeline?: () => void;
  onToggleArchive: () => void;
  composerMode?: 'whatsapp' | 'comment';
  onToggleInternalComment?: () => void;
  assignedName: string;
  assignedInitials: string;
  teamMembers: AssignedProfileSummary[];
  isLoadingAgents?: boolean;
  agentsError?: string | null;
  onReloadAgents?: () => void;
  currentUserId?: string;
  onAssign: (assigneeId: string | null) => void;
  onClosePanel?: () => void;
}

export const ChatHeaderActionButtons: React.FC<ChatHeaderActionButtonsProps> = ({
  conversation,
  formattedPhone,
  isSearchingInChat,
  onToggleSearchInChat,
  isUnread,
  isUpdatingReadStatus,
  onToggleReadStatus,
  isTimelineOpen,
  onToggleTimeline,
  onToggleArchive,
  composerMode = 'whatsapp',
  onToggleInternalComment,
  assignedName,
  assignedInitials,
  teamMembers,
  isLoadingAgents = false,
  agentsError = null,
  onReloadAgents,
  currentUserId,
  onAssign,
  onClosePanel,
}) => {
  return (
    <div className="flex flex-wrap @3xl/chat:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0 relative">
      {/* Busca na conversa */}
      <button
        type="button"
        onClick={onToggleSearchInChat}
        title="Pesquisar nesta conversa"
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          isSearchingInChat
            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300'
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        aria-label="Pesquisar na conversa"
      >
        <i className="bi bi-search text-sm" />
      </button>

      {/* Marcar como lida/não lida */}
      <button
        type="button"
        onClick={onToggleReadStatus}
        title={`${isUnread ? 'Marcar como lida' : 'Marcar como não lida'} somente na central`}
        aria-label={`${isUnread ? 'Marcar como lida' : 'Marcar como não lida'} somente na central`}
        aria-pressed={!isUnread}
        aria-busy={isUpdatingReadStatus}
        disabled={isUpdatingReadStatus || !onToggleReadStatus}
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      >
        <i className={`bi ${isUnread ? 'bi-eye-slash' : 'bi-eye'} text-sm`} aria-hidden="true" />
      </button>

      {/* Menu de Mais Opções */}
      <ChatHeaderMoreMenu
        contactPhone={conversation.contactPhone}
        formattedPhone={formattedPhone}
        isArchived={Boolean(conversation.isArchived)}
        isTimelineOpen={isTimelineOpen}
        onToggleTimeline={onToggleTimeline}
        onToggleArchive={onToggleArchive}
      />

      {/* Botão de Comentário Interno */}
      {onToggleInternalComment && (
        <button
          type="button"
          onClick={onToggleInternalComment}
          title={composerMode === 'comment' ? 'Voltar ao atendimento' : 'Adicionar comentário interno'}
          aria-label="Comentário interno"
          aria-pressed={composerMode === 'comment'}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            composerMode === 'comment'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
          }`}
        >
          <i className="bi bi-chat-left-dots" />
          Comentário interno
        </button>
      )}

      {/* Seletor de Atendente Responsável */}
      <ChatHeaderAssigneeDropdown
        assignedTo={conversation.assignedTo}
        assignedName={assignedName}
        assignedInitials={assignedInitials}
        teamMembers={teamMembers}
        isLoadingAgents={isLoadingAgents}
        agentsError={agentsError}
        onReloadAgents={onReloadAgents}
        currentUserId={currentUserId}
        onAssign={onAssign}
      />

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

      {/* Fechar chat deste painel */}
      {onClosePanel && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClosePanel();
          }}
          title="Fechar este chat"
          aria-label="Fechar chat deste painel"
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors cursor-pointer"
        >
          <i className="bi bi-x-lg text-sm" />
        </button>
      )}
    </div>
  );
};
