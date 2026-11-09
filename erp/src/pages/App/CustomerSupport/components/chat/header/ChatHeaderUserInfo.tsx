import React from 'react';
import type { WhatsAppConversation } from '../../../types';
import type { CareWindow } from '@/pages/utils/customerSupport/whatsappSupportGuard';

interface ChatHeaderUserInfoProps {
  conversation: WhatsAppConversation;
  displayName: string;
  formattedPhone: string;
  initials: string;
  careWindow: CareWindow;
  currentStatus: string;
  onToggleInfoPanel: () => void;
  onBackMobile: () => void;
}

export const ChatHeaderUserInfo: React.FC<ChatHeaderUserInfoProps> = ({
  conversation,
  displayName,
  formattedPhone,
  initials,
  careWindow,
  currentStatus,
  onToggleInfoPanel,
  onBackMobile,
}) => {
  return (
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
          ) : null}

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

        <div
          className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-slate-400"
          title={`${formattedPhone} · ${careWindow.isOpen ? `Janela de 24h aberta (${careWindow.remainingHours}h)` : 'Janela de 24h expirada'}`}
        >
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
  );
};
