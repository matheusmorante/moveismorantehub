import React from 'react';
import { WhatsAppConversation } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';

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

  const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
  const timeFormatted = formatTimeAgo(conversation.lastMessageAt);
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);

  const isCustomerLinked = Boolean(conversation.customerId);
  const hasOrders = (conversation.orders?.length || 0) > 0;
  const isAmbiguous = conversation.customerLinkStatus === 'ambiguous';

  // Iniciais para o avatar
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div
      onClick={() => onSelect(conversation)}
      className={`relative flex items-center gap-3 p-3.5 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-all duration-200 select-none ${
        isSelected
          ? 'bg-blue-50/70 dark:bg-blue-900/20 border-l-4 border-l-blue-600 dark:border-l-blue-500'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* Avatar do Contato */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm shadow-sm border border-slate-200/60 dark:border-slate-700">
          {initials || <i className="bi bi-person text-lg text-slate-400"></i>}
        </div>

        {/* Indicador da Janela de 24h (Ponto Verde ou Âmbar) */}
        <span
          title={
            careWindow.isOpen
              ? `Janela de 24h ativa (${careWindow.remainingHours}h restantes)`
              : 'Janela de 24h expirada'
          }
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
            careWindow.isOpen ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
          }`}
        />
      </div>

      {/* Conteúdo da Conversa */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </h4>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
            {timeFormatted}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1 leading-snug">
            {conversation.lastMessageText || 'Nova conversa iniciada'}
          </p>

          {/* Badge de Mensagens Não Lidas */}
          {conversation.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm animate-pulse">
              {conversation.unreadCount}
            </span>
          )}
        </div>

        {/* Badges de Identificação Comercial */}
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-hidden">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {formattedPhone}
          </span>

          {isCustomerLinked ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-semibold border border-blue-200 dark:border-blue-800">
              <i className="bi bi-person-check-fill text-[9px]"></i>
              Cliente ERP
            </span>
          ) : isAmbiguous ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-semibold border border-amber-200 dark:border-amber-800">
              <i className="bi bi-exclamation-triangle-fill text-[9px]"></i>
              Ambiguidade
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-medium">
              Não identificado
            </span>
          )}

          {hasOrders && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[9px] font-semibold border border-purple-200 dark:border-purple-800">
              <i className="bi bi-bag-fill text-[9px]"></i>
              Pedidos
            </span>
          )}

          {conversation.isArchived && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-medium">
              <i className="bi bi-archive-fill text-[8px]"></i>
              Arquivada
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
