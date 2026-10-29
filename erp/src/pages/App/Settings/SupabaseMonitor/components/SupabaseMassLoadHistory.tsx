import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMassLoadHistoryPage,
  getPendingMassLoadHistory,
  MassLoadHistoryRecord,
} from '@/services/monitoring/massLoadHistoryService';

const PAGE_SIZE = 25;

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

export function SupabaseMassLoadHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MassLoadHistoryRecord[]>([]);
  const [pending, setPending] = useState<MassLoadHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let newestRequest = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const load = async (initial = false) => {
      const requestId = ++newestRequest;
      if (initial) setLoading(true);
      setError(false);
      if (user?.id && mounted) setPending(getPendingMassLoadHistory(user.id));

      try {
        const firstPage = await fetchMassLoadHistoryPage(null, PAGE_SIZE);
        if (!mounted || requestId !== newestRequest) return;
        setRecords(firstPage);
        setHasMore(firstPage.length === PAGE_SIZE);
      } catch {
        if (mounted && requestId === newestRequest) setError(true);
      } finally {
        if (mounted && requestId === newestRequest) setLoading(false);
      }
    };

    const onHistoryChanged = (event: Event) => {
      if (user?.id) setPending(getPendingMassLoadHistory(user.id));
      if ((event as CustomEvent<{ synced?: boolean }>).detail?.synced && !refreshTimer) {
        refreshTimer = setTimeout(() => { refreshTimer = undefined; void load(); }, 1000);
      }
    };
    window.addEventListener('SUPABASE_ANOMALY_HISTORY_CHANGED', onHistoryChanged);
    void load(true);
    return () => {
      mounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('SUPABASE_ANOMALY_HISTORY_CHANGED', onHistoryChanged);
    };
  }, [user?.id]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = await fetchMassLoadHistoryPage(records[records.length - 1] || null, PAGE_SIZE);
      setRecords((current) => [...current, ...nextPage]);
      setHasMore(nextPage.length === PAGE_SIZE);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const persistedIds = new Set(records.map((record) => record.id));
  const visibleRecords = [...pending.filter((record) => !persistedIds.has(record.id)), ...records]
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || b.id.localeCompare(a.id));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
          Histórico de alertas do Supabase
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Os avisos ficam registrados para consulta e correção posterior.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Carregando histórico...</div>
      ) : error && visibleRecords.length === 0 ? (
        <div className="p-8 text-center text-sm text-amber-700 dark:text-amber-300">
          Não foi possível carregar o histórico agora.
        </div>
      ) : visibleRecords.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Nenhum alerta registrado ainda.
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleRecords.map((record) => (
              <article key={record.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{record.title}</h3>
                  <div className="flex items-center gap-2">
                    {record.pending && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        Pendente de sincronização
                      </span>
                    )}
                    {record.level === 'CRITICAL' && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        Crítico
                      </span>
                    )}
                    <time className="text-xs text-slate-400" dateTime={record.occurred_at}>
                      {formatDate(record.occurred_at)}
                    </time>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{record.message}</p>
                {record.metric && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {record.metric.module && <span>Módulo: {record.metric.module}</span>}
                    {record.metric.screen && <span>Tela: {record.metric.screen}</span>}
                    {record.metric.table_name && <span>Tabela: {record.metric.table_name}</span>}
                    {record.metric.operation_type && record.metric.operation_type !== 'UNKNOWN' && <span>Operação: {record.metric.operation_type}</span>}
                    {record.metric.execution_count != null && <span>Consultas: {record.metric.execution_count}</span>}
                    {record.metric.rows_returned > 0 && <span>Registros: {record.metric.rows_returned}</span>}
                    {record.metric.unknown_rows_count ? <span>Respostas sem contagem: {record.metric.unknown_rows_count}</span> : null}
                    {record.metric.measured_response_count ? (
                      <span>Dados medidos: {((record.metric.response_bytes || 0) / 1024 / 1024).toFixed(1)} MiB ({record.metric.measured_response_count} respostas)</span>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
          {hasMore && (
            <div className="border-t border-slate-100 p-4 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-xl px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                {loadingMore ? 'Carregando...' : 'Carregar avisos anteriores'}
              </button>
            </div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-amber-700 dark:text-amber-300">
              Não foi possível atualizar todos os alertas agora.
            </div>
          )}
        </>
      )}
    </section>
  );
}
