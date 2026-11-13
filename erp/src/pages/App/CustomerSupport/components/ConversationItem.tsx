import React from 'react';
import { CalendarDays, Hand } from 'lucide-react';
import { WhatsAppConversation, type CustomerSupportChannel } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { getOrderTypeClasses } from '@/pages/utils/orderTypeColorUtils';

export interface ScheduledOrderBadgeColors {
  delivery: string;
  pickup: string;
  assistance: string;
  returnCollection: string;
}

interface ConversationItemProps {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  onSelect: (conversation: WhatsAppConversation) => void;
  scheduledBadgeColors?: ScheduledOrderBadgeColors;
  showAiHandoffBadge?: boolean;
}

const DEFAULT_SCHEDULE_BADGE_COLORS: ScheduledOrderBadgeColors = {
  delivery: getOrderTypeClasses('green').badge,
  pickup: getOrderTypeClasses('purple').badge,
  assistance: getOrderTypeClasses('orange').badge,
  returnCollection: getOrderTypeClasses('orange').badge,
};

const CHANNEL_ICONS: Partial<Record<CustomerSupportChannel, { label: string; icon: string; color: string }>> = {
  whatsapp: { label: 'WhatsApp', icon: 'bi-whatsapp', color: 'text-[#25D366]' },
  instagram: { label: 'Instagram Direct', icon: 'bi-instagram', color: 'text-pink-600 dark:text-pink-400' },
  messenger: { label: 'Messenger', icon: 'bi-messenger', color: 'text-blue-600 dark:text-blue-400' },
};

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
  scheduledBadgeColors = DEFAULT_SCHEDULE_BADGE_COLORS,
  showAiHandoffBadge = true,
}) => {
  const displayName =
    conversation.contactName?.trim() ||
    formatPhoneForDisplay(conversation.contactPhone);

  const timeFormatted = formatTimeAgo(conversation.lastMessageAt);
  const channelIcon = CHANNEL_ICONS[conversation.channel ?? 'whatsapp'];
  const lastMessagePreview = conversation.lastMessageText?.trim() === '🔘 Resposta interativa'
    ? '[ Card de Produto ]'
    : conversation.lastMessageText || 'Conversa iniciada';

  const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');
  const scheduleIndicators = conversation.scheduledOrderIndicators;
  const scheduledBadges = [
    scheduleIndicators?.delivery && {
      label: 'Entrega agendada',
      color: scheduledBadgeColors.delivery,
    },
    scheduleIndicators?.pickup && {
      label: 'Retirada agendada',
      color: scheduledBadgeColors.pickup,
    },
    scheduleIndicators?.assistance && {
      label: 'Assistência agendada',
      color: scheduledBadgeColors.assistance,
    },
    scheduleIndicators?.returnCollection && {
      label: 'Coleta de devolução agendada',
      color: scheduledBadgeColors.returnCollection,
    },
  ].filter((badge): badge is { label: string; color: string } => Boolean(badge));

  return (
    <div
      data-conversation-id={conversation.id}
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
      {/* Conteúdo da Conversa */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Linha 1: Nome e Horário */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <h4 className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {displayName}
            </h4>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {channelIcon && (
              <span role="img" aria-label={channelIcon.label} title={channelIcon.label} className={`inline-flex items-center text-[12px] ${channelIcon.color}`}>
                <i aria-hidden="true" className={`bi ${channelIcon.icon}`} />
              </span>
            )}
            <span
              className={`text-[11px] font-medium ${
                conversation.unreadCount > 0
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {timeFormatted}
            </span>
          </div>
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
              {lastMessagePreview}
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
        <div className="flex items-center gap-1 mt-2">
          <div className="flex items-center gap-1.5 overflow-visible flex-wrap">
            {/* Status de IA / Handoff Silencioso */}
            {showAiHandoffBadge && conversation.aiStatus === 'needs_human' && (
              <span
                data-testid="badge-intervencao-necessaria"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-200 text-[10px] font-bold border border-orange-400 dark:border-orange-700 shadow-xs"
              >
                <Hand aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                Intervenção necessária
              </span>
            )}

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

            {scheduledBadges.map(({ label, color }) => (
              <span
                key={label}
                aria-label={label}
                title={label}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${color}`}
              >
                <CalendarDays aria-hidden="true" className="h-3 w-3 shrink-0" />
                {label}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
