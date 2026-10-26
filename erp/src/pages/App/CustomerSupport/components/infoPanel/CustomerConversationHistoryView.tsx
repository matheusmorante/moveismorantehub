import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchConversationActivityPage,
  type CustomerSupportHistoryCursor,
} from '@/pages/utils/customerSupport/customerSupportService';
import { formatDate } from '@/pages/utils/customerSupport/supportOrdersService';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { WhatsAppMessage } from '../../types';

interface CustomerConversationHistoryViewProps {
  conversationId: string;
}

export const CustomerConversationHistoryView: React.FC<CustomerConversationHistoryViewProps> = ({ conversationId }) => {
  const [activities, setActivities] = useState<WhatsAppMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const generationRef = useRef(0);
  const loadingRef = useRef(false);
  const cursorRef = useRef<CustomerSupportHistoryCursor | null>(null);
  const hasMoreRef = useRef(true);

  const loadPage = useCallback(async (reset: boolean) => {
    if (!conversationId || loadingRef.current || (!reset && !hasMoreRef.current)) return;
    const generation = reset ? ++generationRef.current : generationRef.current;
    loadingRef.current = true;
    setIsLoading(true);
    setError('');
    if (reset) {
      setActivities([]);
      cursorRef.current = null;
      hasMoreRef.current = true;
      setHasMore(true);
    }
    try {
      const result = await fetchConversationActivityPage(supabase, conversationId, reset ? null : cursorRef.current);
      if (generation !== generationRef.current) return;
      setActivities((current) => {
        const byId = new Map((reset ? [] : current).map((activity) => [activity.id, activity]));
        result.messages.forEach((activity) => byId.set(activity.id, activity));
        return Array.from(byId.values()).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
        );
      });
      cursorRef.current = result.nextCursor;
      hasMoreRef.current = result.hasMore;
      setHasMore(result.hasMore);
    } catch (loadError) {
      if (generation === generationRef.current) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o histórico.');
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
    setActivities([]);
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setError('');
    void loadPage(true);
    return () => { generationRef.current += 1; };
  }, [conversationId, loadPage]);

  const retryOrLoadMore = () => void loadPage(activities.length === 0);

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
        Histórico de atividades e notas internas desta conversa.
      </p>
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}
      {isLoading && activities.length === 0 && <p role="status" className="py-8 text-center text-xs text-slate-500">Carregando histórico…</p>}
      {!isLoading && activities.length === 0 && !error && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700">Nenhuma atividade registrada nesta conversa.</p>}

      <ol className="space-y-3">
        {activities.map((activity, index) => {
          const isNote = activity.messageType === 'internal_note';
          return (
            <li key={activity.id} className="relative flex gap-3">
              {index < activities.length - 1 && <span aria-hidden="true" className="absolute bottom-[-12px] left-3 top-7 w-px bg-slate-200 dark:bg-slate-700" />}
              <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${isNote ? 'bg-amber-500' : 'bg-blue-500'}`}>
                <i className={`bi ${isNote ? 'bi-chat-left-dots-fill' : 'bi-clock-history'} text-xs`} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{isNote ? 'Nota interna' : 'Evento do atendimento'}</h4>
                  <time className="shrink-0 text-[10px] text-slate-400" dateTime={activity.timestamp}>
                    {formatDate(activity.timestamp)} · {new Date(activity.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                {activity.textContent && <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{activity.textContent}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {(hasMore || error) && (
        <button type="button" disabled={isLoading} onClick={retryOrLoadMore} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:text-blue-400">
          {isLoading ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar atividades anteriores'}
        </button>
      )}
    </div>
  );
};
