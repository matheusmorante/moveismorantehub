import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { supportConversationCommandSchema, type SupportConversationCommand } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import { WhatsAppConversation, ConversationStatus, AssignedProfileSummary } from '../../types';
import { CareWindow } from '@/pages/utils/customerSupport/whatsappSupportGuard';

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
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdatingReadStatus, setIsUpdatingReadStatus] = useState(false);
  const commandLock = useRef(false);
  const { reset, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SupportConversationCommand>({
    resolver: zodResolver(supportConversationCommandSchema),
  });
  const submitCommand = async (command: SupportConversationCommand) => {
    if (commandLock.current) return;
    commandLock.current = true;
    reset(command);
    try {
      await handleSubmit(async (data) => {
        let saved: boolean | void = false;
        if (data.intent === 'assign' && onAssign) {
          const name = teamMembers.find((member) => member.id === data.assigneeId)?.fullName
            || (data.assigneeId === currentUserId ? currentUserName : undefined);
          saved = await onAssign(data.assigneeId, name);
        } else if (data.intent === 'status' && onUpdateStatus) saved = await onUpdateStatus(data.status);
        else if (data.intent === 'archive') saved = await onToggleArchive();
        if (saved === false) setError('root.command', { message: 'Não foi possível salvar a alteração. Tente novamente.' });
      }, () => setError('root.command', { message: 'Conversa, atendente ou status inválido. Atualize os dados antes de tentar novamente.' }))();
    } catch {
      setError('root.command', { message: 'Não foi possível salvar a alteração. Tente novamente.' });
    } finally {
      commandLock.current = false;
    }
  };
  const assign = (assigneeId: string | null) => void submitCommand({ intent: 'assign', conversationId: conversation.id, assigneeId });
  const isUnread = conversation.unreadCount > 0;
  const toggleReadStatus = async () => {
    if (!onToggleReadStatus || isUpdatingReadStatus) return;
    setIsUpdatingReadStatus(true);
    try {
      if (await onToggleReadStatus() === false) toast.error('Não foi possível atualizar a leitura interna da conversa.');
    } catch {
      toast.error('Não foi possível atualizar a leitura interna da conversa.');
    } finally {
      setIsUpdatingReadStatus(false);
    }
  };

  const assignedName = conversation.assignedProfile?.fullName || 'Não atribuído';
  const assignedInitials = assignedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="relative min-h-16 px-4 py-2 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col gap-2 @3xl/chat:h-16 @3xl/chat:flex-row @3xl/chat:items-center @3xl/chat:justify-between @3xl/chat:py-0 shrink-0 z-10 shadow-xs">
      <fieldset disabled={isSubmitting} className="contents" aria-busy={isSubmitting}>
      {errors.root?.command && <p role="alert" className="absolute top-full right-2 z-50 p-2 rounded-lg bg-red-50 dark:bg-red-950 text-xs text-red-700 dark:text-red-300 shadow-sm">{errors.root.command.message}</p>}
      {isSubmitting && <span role="status" className="absolute top-full right-2 z-50 p-2 rounded-lg bg-white dark:bg-slate-900 text-xs text-emerald-700 animate-pulse">Salvando alteração…</span>}
      {/* Esquerda: Avatar, Nome, Telefone e Janela 24h */}
      <div
        onClick={onToggleInfoPanel}
        className="flex items-center gap-3 min-w-0 cursor-pointer group shrink-0 @3xl/chat:flex-1"
        title="Clique para abrir informações do cliente e pedidos"
      >
        {/* Botão Voltar para Telas Pequenas */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBackMobile();
          }}
          className="md:hidden w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Voltar para a lista"
        >
          <i className="bi bi-chevron-left text-base"></i>
        </button>

        {/* Avatar com Indicador da Janela */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shadow-xs border border-slate-200/60 dark:border-slate-700">
            {initials || <i className="bi bi-person text-sm text-slate-400"></i>}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
              careWindow.isOpen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        </div>

        {/* Nome e Indicadores */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {displayName}
            </h3>
            {conversation.customerId ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] font-bold shrink-0">
                Cliente ERP
              </span>
            ) : conversation.customerLinkStatus === 'ambiguous' ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold shrink-0">
                Ambiguidade
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-medium shrink-0">
                Não identificado
              </span>
            )}

            {/* Status Badge */}
            {currentStatus === 'closed' ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold shrink-0 flex items-center gap-1">
                <i className="bi bi-check-circle-fill text-[8px]"></i> Fechada
              </span>
            ) : currentStatus === 'snoozed' ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] font-bold shrink-0 flex items-center gap-1">
                <i className="bi bi-alarm-fill text-[8px]"></i> Adiada
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-slate-400" title={`${formattedPhone} · ${careWindow.isOpen ? `Janela de 24h aberta (${careWindow.remainingHours}h)` : 'Janela de 24h expirada'}`}>
            <span className="shrink-0">WhatsApp</span>
            <span>·</span>
            <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
              {currentStatus === 'closed' ? 'Atendimento fechado' : currentStatus === 'snoozed' ? 'Atendimento adiado' : 'Atendimento aberto'}
            </span>
            <span>·</span>
            <span className={`truncate ${careWindow.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {careWindow.isOpen ? `Janela 24h aberta (${careWindow.remainingHours}h)` : 'Janela expirada'}
            </span>
          </div>
        </div>
      </div>

      {/* Direita: Controles de Atendimento alinhados com a referência */}
      <div className="flex flex-wrap @3xl/chat:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0 relative">
        {/* 1. Seletor de Atendente Responsável (Assignee Dropdown "Ben ▾") */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAssigneeDropdownOpen((prev) => !prev)}
            title="Atendente responsável pelo atendimento"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black uppercase">
              {conversation.assignedTo ? assignedInitials : <i className="bi bi-person"></i>}
            </div>
            <span className="max-w-[80px] sm:max-w-[100px] truncate">
              {conversation.assignedTo ? assignedName : 'Atribuir'}
            </span>
            <i className="bi bi-chevron-down text-[9px] text-slate-400"></i>
          </button>

          {isAssigneeDropdownOpen && (
            <div
              className="absolute right-0 top-10 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
              onClick={() => setIsAssigneeDropdownOpen(false)}
            >
              <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                Responsável pelo atendimento
              </div>

              {isLoadingAgents && <p role="status" className="flex items-center gap-2 px-3.5 py-2 text-slate-500 dark:text-slate-400"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin" />Carregando atendentes...</p>}
              {agentsError && <div role="alert" className="px-3.5 py-2 text-red-600 dark:text-red-300">
                <p>{agentsError}</p>
                {onReloadAgents && <button type="button" disabled={isLoadingAgents} onClick={(event) => { event.stopPropagation(); onReloadAgents(); }} aria-label="Tentar carregar atendentes novamente" className="mt-1 underline disabled:opacity-50">Tentar novamente</button>}
              </div>}

              {currentUserId && (
                <button
                  type="button"
                  onClick={() => assign(currentUserId)}
                  className="w-full px-3.5 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <i className="bi bi-person-check-fill text-blue-500"></i>
                  Atribuir a mim
                </button>
              )}

              <button
                type="button"
                onClick={() => assign(null)}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <i className="bi bi-person-x text-slate-400"></i>
                Não atribuído (Fila geral)
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

              <div className="max-h-48 overflow-y-auto">
                {teamMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => assign(m.id)}
                    className={`w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                      conversation.assignedTo === m.id
                        ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/30'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[9px] font-bold">
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate flex-1">{m.fullName}</span>
                    {conversation.assignedTo === m.id && (
                      <i className="bi bi-check text-blue-500 text-base"></i>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
          <i className="bi bi-search text-sm"></i>
        </button>

        <button
          type="button"
          onClick={() => void toggleReadStatus()}
          title={`${isUnread ? 'Marcar como lida' : 'Marcar como não lida'} somente na central`}
          aria-label={`${isUnread ? 'Marcar como lida' : 'Marcar como não lida'} somente na central`}
          aria-pressed={!isUnread}
          aria-busy={isUpdatingReadStatus}
          disabled={isUpdatingReadStatus || !onToggleReadStatus}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          <i className={`bi ${isUnread ? 'bi-eye-slash' : 'bi-eye'} text-sm`} aria-hidden="true"></i>
        </button>

        {/* 4. Menu de Três Pontos (•••) */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title="Mais opções da conversa"
          aria-label="Mais ações da conversa"
          aria-expanded={isMenuOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <i className="bi bi-three-dots-vertical text-sm"></i>
        </button>

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

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

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
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        )}

        {/* Dropdown do Menu 3 Pontos */}
        {isMenuOpen && (
          <div
            className="absolute right-12 top-11 w-60 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
            onClick={() => setIsMenuOpen(false)}
          >
            {onToggleTimeline && (
              <button
                type="button"
                onClick={onToggleTimeline}
                aria-pressed={isTimelineOpen}
                className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <i className={`bi bi-clock-history ${isTimelineOpen ? 'text-blue-500' : 'text-slate-400'}`}></i>
                {isTimelineOpen ? 'Ocultar linha do tempo' : 'Linha do tempo'}
              </button>
            )}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(conversation.contactPhone);
                  toast.success('Telefone copiado para a área de transferência.');
                } catch {
                  toast.error('Não foi possível copiar o telefone. Verifique a permissão da área de transferência.');
                }
              }}
              className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-clipboard text-slate-400"></i>
              Copiar telefone · {formattedPhone}
            </button>
            <button
              type="button"
              onClick={() => void submitCommand({ intent: 'archive', conversationId: conversation.id })}
              className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-archive text-slate-400"></i>
              {conversation.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
            </button>
          </div>
        )}
      </div>
      </fieldset>
    </div>
  );
};
