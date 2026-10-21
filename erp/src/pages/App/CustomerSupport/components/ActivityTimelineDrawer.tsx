import React from 'react';
import { WhatsAppMessage } from '../types';
import { formatTimeAgo } from './ConversationItem';

interface ActivityTimelineDrawerProps {
  messages: WhatsAppMessage[];
  isOpen: boolean;
  onClose: () => void;
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'assignment' | 'status' | 'workflow' | 'comment';
  title: string;
  description?: string;
  timestamp: string;
  icon: string;
  badgeColor: string;
}

export const ActivityTimelineDrawer: React.FC<ActivityTimelineDrawerProps> = ({
  messages,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // A linha do tempo deriva apenas de mensagens/eventos gravados no histórico.
  const events: TimelineEvent[] = Array.from(new Map(
    messages
      .filter((message) => message.messageType === 'internal_note' || message.messageType === 'system_event')
      .map((message) => [message.id, message])
  ).values()).map((message) => ({
    id: message.id,
    type: message.messageType === 'internal_note' ? 'comment' : 'status',
    title: message.messageType === 'internal_note' ? 'Comentário interno' : 'Evento do atendimento',
    description: message.textContent || '',
    timestamp: message.timestamp,
    icon: message.messageType === 'internal_note' ? 'bi-chat-left-dots-fill' : 'bi-clock-history',
    badgeColor: message.messageType === 'internal_note' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white',
  }));

  // Ordena por data decrescente (mais recente no topo)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <aside
      aria-label="Linha do tempo de atividades"
      className="w-[320px] lg:w-[350px] shrink-0 border-l border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full select-none z-20 shadow-xl animate-slide-left"
    >
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <i className="bi bi-clock-history text-base"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Linha do Tempo
            </h3>
            <p className="text-[10px] text-slate-400">Histórico de ações e eventos</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Fechar linha do tempo"
        >
          <i className="bi bi-x-lg text-xs"></i>
        </button>
      </div>

      {/* Lista de Eventos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <i className="bi bi-calendar-event text-3xl block mb-2 opacity-40"></i>
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          events.map((evt, idx) => (
            <div key={evt.id} className="relative flex items-start gap-3">
              {/* Linha vertical conectora */}
              {idx < events.length - 1 && (
                <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 -mb-4" />
              )}

              {/* Ícone */}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs ${evt.badgeColor}`}
              >
                <i className={`bi ${evt.icon} text-xs`}></i>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {evt.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatTimeAgo(evt.timestamp)}
                  </span>
                </div>
                {evt.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 select-text">
                    {evt.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
