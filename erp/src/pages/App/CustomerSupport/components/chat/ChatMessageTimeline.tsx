import React, { useRef, useEffect } from 'react';
import { WhatsAppMessage } from '../../types';
import { MessageBubble } from '../MessageBubble';

interface ChatMessageTimelineProps {
  messages: WhatsAppMessage[];
  displayName: string;
  inChatSearch: string;
  isLoadingMessages: boolean;
  conversationId: string;
}

export function groupMessagesByDate(
  messages: WhatsAppMessage[]
): { dateLabel: string; items: WhatsAppMessage[] }[] {
  const groups: { [key: string]: WhatsAppMessage[] } = {};

  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const dateKey = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : 'Desconhecida';

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  return Object.keys(groups).map((key) => {
    let dateLabel = key;
    if (key === todayKey) {
      dateLabel = 'Hoje';
    } else if (key === yesterdayKey) {
      dateLabel = 'Ontem';
    } else {
      const [y, m, d] = key.split('-');
      dateLabel = `${d}/${m}/${y}`;
    }

    return {
      dateLabel,
      items: groups[key],
    };
  });
}

export const ChatMessageTimeline: React.FC<ChatMessageTimelineProps> = ({
  messages,
  displayName,
  inChatSearch,
  isLoadingMessages,
  conversationId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao trocar de conversa ou receber novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversationId]);

  // Filtragem local se busca interna estiver ativa
  const filteredMessages = inChatSearch.trim()
    ? messages.filter(
        (m) =>
          m.textContent?.toLowerCase().includes(inChatSearch.toLowerCase().trim()) ||
          m.mediaFilename?.toLowerCase().includes(inChatSearch.toLowerCase().trim())
      )
    : messages;

  const grouped = groupMessagesByDate(filteredMessages);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 z-0">
      {isLoadingMessages ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2">
          <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Carregando mensagens...</span>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <i className="bi bi-chat-square-text text-3xl block mb-2 opacity-40"></i>
          {inChatSearch
            ? 'Nenhuma mensagem encontrada para a busca.'
            : 'Nenhuma mensagem registrada nesta conversa.'}
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.dateLabel} className="space-y-1.5">
            {/* Separador de Data estilo Pílula Flutuante */}
            <div className="flex justify-center my-3 sticky top-2 z-10 select-none">
              <span className="px-3 py-1 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 text-[11px] font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                {group.dateLabel}
              </span>
            </div>

            {/* Balões de Mensagem */}
            {group.items.map((msg) => (
              <MessageBubble key={msg.id} message={msg} contactName={displayName} />
            ))}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
