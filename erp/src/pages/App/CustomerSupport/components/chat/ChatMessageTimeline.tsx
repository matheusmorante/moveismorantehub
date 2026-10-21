import React, { useRef, useEffect, useState } from 'react';
import { WhatsAppMessage } from '../../types';
import { MessageBubble } from '../MessageBubble';

interface ChatMessageTimelineProps {
  messages: WhatsAppMessage[];
  displayName: string;
  inChatSearch: string;
  isLoadingMessages: boolean;
  conversationId: string;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<number>;
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
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const loadingOlderRef = useRef(false);
  const [preserveScroll, setPreserveScroll] = useState<{ height: number; top: number } | null>(null);

  // Mantém a posição ao anexar mensagens antigas; novas mensagens seguem para o final.
  useEffect(() => {
    const conversationChanged = previousConversationIdRef.current !== conversationId;
    const latestId = messages[messages.length - 1]?.id || null;
    const latestChanged = previousLastMessageIdRef.current !== latestId;
    previousConversationIdRef.current = conversationId;
    previousLastMessageIdRef.current = latestId;

    if (preserveScroll && timelineRef.current) {
      const container = timelineRef.current;
      container.scrollTop = preserveScroll.top + container.scrollHeight - preserveScroll.height;
      setPreserveScroll(null);
    } else if (conversationChanged || latestChanged) {
      messagesEndRef.current?.scrollIntoView({ behavior: conversationChanged ? 'auto' : 'smooth' });
    }
  }, [messages, conversationId]);

  const handleTimelineScroll = async () => {
    const container = timelineRef.current;
    if (!container || container.scrollTop > 24 || !hasOlderMessages || !onLoadOlderMessages || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    const currentPosition = { height: container.scrollHeight, top: container.scrollTop };
    setPreserveScroll(currentPosition);
    try {
      const loaded = await onLoadOlderMessages();
      if (!loaded) setPreserveScroll(null);
      requestAnimationFrame(() => {
        if (timelineRef.current && loaded) {
          timelineRef.current.scrollTop = currentPosition.top + timelineRef.current.scrollHeight - currentPosition.height;
          setPreserveScroll(null);
        }
      });
    } finally {
      loadingOlderRef.current = false;
    }
  };

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
    <div ref={timelineRef} onScroll={handleTimelineScroll} className="flex-1 overflow-y-auto p-4 space-y-3 z-0">
      {isLoadingOlderMessages && (
        <div className="sticky top-0 z-20 flex justify-center py-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-white/90 dark:bg-slate-800/90 px-3 py-1 shadow-sm">Carregando mensagens anteriores…</span>
        </div>
      )}
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
