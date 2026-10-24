import React from 'react';
import { WhatsAppConversation } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';

interface ConversationItemProps {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  onSelect: (conversation: WhatsAppConversation) => void;
}

export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Ontem';

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onSelect,
}) => {
  const displayName =
    conversation.customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  const timeFormatted = formatTimeAgo(conversation.lastMessageAt);

  const isCustomerLinked = Boolean(conversation.customerId);
  const hasOrders = (conversation.orders?.length || 0) > 0;
  const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');

  // Iniciais para o avatar do contato
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  // Atendente atribuído (avatar no canto inferior direito do item como no print)
  const assignedName = conversation.assignedProfile?.fullName;
  const assignedInitials = assignedName
    ? assignedName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : null;

  return (
    <div
      onClick={() => onSelect(conversation)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(conversation);
        }
      }}
      className={`relative mx-2 my-1.5 p-3 rounded-2xl cursor-pointer transition-all duration-150 select-none flex items-center gap-3 ${
        isSelected
          ? 'bg-white dark:bg-slate-800/90 border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20'
          : 'bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-xs'
      }`}
    >
      {/* Avatar do Contato (48px) com Badge do Canal WhatsApp */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shadow-xs border border-slate-200/60 dark:border-slate-700">
          {initials || <i className="bi bi-person text-base text-slate-400"></i>}
        </div>

        {/* Badge do WhatsApp com indicador de canal */}
        <span
          title="Canal WhatsApp"
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] border-2 border-white dark:border-slate-900 shadow-xs"
        >
          <i className="bi bi-whatsapp"></i>
        </span>
      </div>

      {/* Conteúdo da Conversa */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Linha 1: Nome e Horário */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </h4>
          <span
            className={`text-[11px] font-medium shrink-0 ${
              conversation.unreadCount > 0
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {timeFormatted}
          </span>
        </div>

        {/* Linha 2: Ponto de Canal/Status + Prévia da Última Mensagem + Contador de Não Lidas */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                conversation.unreadCount > 0 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-snug">
              {conversation.lastMessageText || 'Conversa iniciada'}
            </p>
          </div>

          {/* Badge de Mensagens Não Lidas estilo CRM (pílula azul como no print de referência) */}
          {conversation.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-black shadow-xs">
              {conversation.unreadCount}
            </span>
          )}
        </div>

        {/* Linha 3: Identificadores de Status e Atendente Responsável */}
        <div className="flex items-center justify-between gap-1 mt-2">
          <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
            {/* Status da conversa */}
            {currentStatus === 'closed' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                <i className="bi bi-check-circle-fill text-[9px] text-emerald-600"></i>
                Fechada
              </span>
            ) : currentStatus === 'snoozed' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                <i className="bi bi-alarm-fill text-[9px] text-amber-600"></i>
                Adiada
              </span>
            ) : null}

            {isCustomerLinked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200/60 dark:border-blue-800/60">
                <i className="bi bi-person-check-fill text-[9px]"></i>
                ERP
              </span>
            )}

            {hasOrders && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200/60 dark:border-purple-800/60">
                <i className="bi bi-bag-fill text-[9px]"></i>
                Pedidos
              </span>
            )}
          </div>

          {/* Avatar do Atendente Responsável (Canto inferior direito do card como no print) */}
          {assignedInitials ? (
            <div
              title={`Atribuído a: ${assignedName}`}
              className="w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-xs border border-white dark:border-slate-800"
            >
              {assignedInitials}
            </div>
          ) : (
            <div
              title="Sem atendente atribuído (Fila geral)"
              className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[9px] shrink-0"
            >
              <i className="bi bi-person-dash"></i>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
