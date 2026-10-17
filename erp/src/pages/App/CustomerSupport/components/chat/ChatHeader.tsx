import React, { useState } from 'react';
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
  isInfoPanelOpen: boolean;
  onToggleInfoPanel: () => void;
  isTimelineOpen: boolean;
  onToggleTimeline?: () => void;
  onBackMobile: () => void;
  onOpenSnippets: () => void;
  onToggleArchive: () => void;
  teamMembers: AssignedProfileSummary[];
  onAssign?: (profileId: string | null, profileName?: string) => Promise<void>;
  onUpdateStatus?: (status: ConversationStatus) => Promise<void>;
  currentUserId?: string;
  currentUserName?: string;
  onRefreshMessages?: () => Promise<void> | void;
  isRefreshingMessages?: boolean;
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
  isInfoPanelOpen,
  onToggleInfoPanel,
  isTimelineOpen,
  onToggleTimeline,
  onBackMobile,
  onOpenSnippets,
  onToggleArchive,
  teamMembers,
  onAssign,
  onUpdateStatus,
  currentUserId,
  currentUserName,
  onRefreshMessages,
  isRefreshingMessages = false,
}) => {
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const assignedName = conversation.assignedProfile?.fullName || 'Não atribuído';
  const assignedInitials = assignedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="h-16 px-4 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-xs">
      {/* Esquerda: Avatar, Nome, Telefone e Janela 24h */}
      <div
        onClick={onToggleInfoPanel}
        className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
        title="Clique para abrir informações do cliente e pedidos"
      >
        {/* Botão Voltar para Telas Pequenas */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBackMobile();
          }}
          className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-[11px]">{formattedPhone}</span>
            <span>•</span>
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                careWindow.isOpen
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              <i
                className={`bi ${careWindow.isOpen ? 'bi-check-circle-fill' : 'bi-clock-history'}`}
              ></i>
              {careWindow.isOpen
                ? `Janela 24h aberta (${careWindow.remainingHours}h)`
                : 'Janela expirada'}
            </span>
          </div>
        </div>
      </div>

      {/* Direita: Controles de Atendimento alinhados com a referência */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
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

              {currentUserId && (
                <button
                  type="button"
                  onClick={() => onAssign?.(currentUserId, currentUserName)}
                  className="w-full px-3.5 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <i className="bi bi-person-check-fill text-blue-500"></i>
                  Atribuir a mim
                </button>
              )}

              <button
                type="button"
                onClick={() => onAssign?.(null)}
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
                    onClick={() => onAssign?.(m.id, m.fullName)}
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

        {/* Indicador Ao Vivo (Realtime / Auto-Reload) */}
        <span
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 select-none"
          title="Sincronização em tempo real ativa: novas mensagens chegam sozinhas automaticamente via WebSocket e auto-reload"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Tempo Real
        </span>

        {/* Botão de Atualizar / Recarregar Mensagens */}
        <button
          type="button"
          onClick={onRefreshMessages}
          title="Recarregar mensagens desta conversa (atualização automática ativa)"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Recarregar mensagens"
        >
          <i
            className={`bi bi-arrow-clockwise text-base ${
              isRefreshingMessages ? 'animate-spin text-emerald-500' : ''
            }`}
          ></i>
        </button>

        {/* 2. Respostas Rápidas / Snippets (⚡) */}
        <button
          type="button"
          onClick={onOpenSnippets}
          title="Respostas rápidas e modelos (⚡)"
          className="w-9 h-9 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors cursor-pointer"
          aria-label="Respostas rápidas"
        >
          <i className="bi bi-lightning-charge-fill text-base"></i>
        </button>

        {/* 3. Busca Interna na Conversa (🔍) */}
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

        {/* 4. Menu de Três Pontos (•••) */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title="Mais opções da conversa"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <i className="bi bi-three-dots-vertical text-sm"></i>
        </button>

        {/* 5. Botão de Status (Close / Reopen) */}
        <div className="relative">
          {currentStatus === 'closed' ? (
            <button
              type="button"
              onClick={() => onUpdateStatus?.('open')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <i className="bi bi-arrow-repeat text-slate-400"></i>
              Reopen
            </button>
          ) : (
            <div className="inline-flex rounded-xl shadow-xs border border-emerald-600/30 overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdateStatus?.('closed')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-check2"></i>
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                className="px-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-l border-emerald-500/60 cursor-pointer"
                title="Mais opções de status"
              >
                <i className="bi bi-chevron-down text-[9px]"></i>
              </button>
            </div>
          )}

          {isStatusDropdownOpen && (
            <div
              className="absolute right-0 top-10 w-44 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
              onClick={() => setIsStatusDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => onUpdateStatus?.('closed')}
                className="w-full px-3.5 py-2 text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 font-bold cursor-pointer"
              >
                <i className="bi bi-check-circle-fill"></i>
                Fechar (Close)
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus?.('snoozed')}
                className="w-full px-3.5 py-2 text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 font-bold cursor-pointer"
              >
                <i className="bi bi-alarm-fill"></i>
                Adiar (Snooze)
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* 6. Botão Painel Comercial do Cliente ([📇]) */}
        <button
          type="button"
          onClick={onToggleInfoPanel}
          title={
            isInfoPanelOpen
              ? 'Ocultar dados do cliente e pedidos'
              : 'Ver dados do cliente e pedidos (ERP)'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isInfoPanelOpen
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="Painel de informações do cliente"
          aria-pressed={isInfoPanelOpen}
        >
          <i className="bi bi-person-vcard text-sm"></i>
        </button>

        {/* 7. Botão Linha do Tempo / Histórico de Atividades ([🕒]) */}
        <button
          type="button"
          onClick={onToggleTimeline}
          title={
            isTimelineOpen
              ? 'Ocultar linha do tempo de atividades'
              : 'Ver linha do tempo de atividades (🕒)'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isTimelineOpen
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="Linha do tempo de atividades"
          aria-pressed={isTimelineOpen}
        >
          <i className="bi bi-clock-history text-sm"></i>
        </button>

        {/* Dropdown do Menu 3 Pontos */}
        {isMenuOpen && (
          <div
            className="absolute right-12 top-11 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
            onClick={() => setIsMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(conversation.contactPhone);
                alert('Telefone copiado para a área de transferência.');
              }}
              className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-clipboard text-slate-400"></i>
              Copiar telefone
            </button>
            <button
              type="button"
              onClick={onOpenSnippets}
              className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-lightning-charge text-amber-500"></i>
              Modelos de resposta rápida
            </button>
            <button
              type="button"
              onClick={onToggleArchive}
              className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-archive text-slate-400"></i>
              {conversation.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
