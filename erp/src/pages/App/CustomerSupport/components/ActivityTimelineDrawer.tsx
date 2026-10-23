import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchConversationActivityPage, type CustomerSupportHistoryCursor } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppMessage } from '../types';
import { formatTimeAgo } from './ConversationItem';

interface ActivityTimelineDrawerProps {
  conversationId: string;
  activityRefreshKey?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  badgeColor: string;
}

function toTimelineEvent(message: WhatsAppMessage): TimelineEvent {
  const isComment = message.messageType === 'internal_note';
  return {
    id: message.id,
    title: isComment ? 'Comentário interno' : 'Evento do atendimento',
    description: message.textContent || '',
    timestamp: message.timestamp,
    icon: isComment ? 'bi-chat-left-dots-fill' : 'bi-clock-history',
    badgeColor: isComment ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white',
  };
}

export const ActivityTimelineDrawer: React.FC<ActivityTimelineDrawerProps> = ({
  conversationId,
  activityRefreshKey = '',
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const cursorRef = useRef<CustomerSupportHistoryCursor | null>(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const generationRef = useRef(0);
  const activityRefreshRef = useRef({ conversationId, activityRefreshKey });

  const loadPage = useCallback(async (reset = false) => {
    if (!conversationId || (!reset && (loadingRef.current || !hasMoreRef.current))) return;
    const generation = reset ? ++generationRef.current : generationRef.current;
    if (reset) {
      cursorRef.current = null;
      hasMoreRef.current = true;
      setMessages([]);
      setHasMore(true);
      setError('');
    }
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const page = await fetchConversationActivityPage(supabase, conversationId, reset ? null : cursorRef.current);
      if (generation !== generationRef.current) return;
      setMessages((current) => {
        const byId = new Map((reset ? [] : current).map((message) => [message.id, message]));
        page.messages.forEach((message) => byId.set(message.id, message));
        return Array.from(byId.values()).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
        );
      });
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      setError('');
    } catch (loadError) {
      if (generation === generationRef.current) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as atividades.');
      }
    } finally {
      if (generation === generationRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    generationRef.current += 1;
    loadingRef.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setMessages([]);
    setHasMore(true);
    setError('');
    setIsLoading(false);
    if (isOpen) void loadPage(true);
  }, [conversationId, isOpen, loadPage]);

  useEffect(() => {
    const previous = activityRefreshRef.current;
    activityRefreshRef.current = { conversationId, activityRefreshKey };
    if (previous.conversationId !== conversationId || previous.activityRefreshKey === activityRefreshKey || !isOpen) return;
    void loadPage(true);
  }, [activityRefreshKey, conversationId, isOpen, loadPage]);

  if (!isOpen) return null;
  const events = messages.map(toTimelineEvent);

  return (
    <aside
      aria-label="Linha do tempo de atividades"
      className="w-[320px] lg:w-[350px] shrink-0 border-l border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full select-none z-20 shadow-xl animate-slide-left"
    >
      <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <i className="bi bi-clock-history text-base" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Linha do Tempo</h3>
            <p className="text-[10px] text-slate-400">Atividades persistidas da conversa</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Fechar linha do tempo"
        >
          <i className="bi bi-x-lg text-xs" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <p role="alert" className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-xs text-amber-800 dark:text-amber-300">{error}</p>}
        {isLoading && events.length === 0 ? (
          <p className="py-12 text-center text-slate-400 text-xs">Carregando atividades…</p>
        ) : events.length === 0 && !error ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <i className="bi bi-calendar-event text-3xl block mb-2 opacity-40" />
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          events.map((evt, idx) => (
            <div key={evt.id} className="relative flex items-start gap-3">
              {idx < events.length - 1 && <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 -mb-4" />}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs ${evt.badgeColor}`}>
                <i className={`bi ${evt.icon} text-xs`} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{evt.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatTimeAgo(evt.timestamp)}</span>
                </div>
                {evt.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 select-text">{evt.description}</p>}
              </div>
            </div>
          ))
        )}
        {(hasMore || error) && (
          <button
            type="button"
            onClick={() => void loadPage(events.length === 0)}
            disabled={isLoading}
            className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 disabled:opacity-50"
          >
            {isLoading ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar atividades anteriores'}
          </button>
        )}
      </div>
    </aside>
  );
};
