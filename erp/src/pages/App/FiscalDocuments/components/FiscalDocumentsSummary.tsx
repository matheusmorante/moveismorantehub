import React from 'react';
import { formatCurrency } from '@/pages/utils/formatters';
import type { FiscalDocumentsSummary as FiscalDocumentsSummaryData } from '../services/fiscalDocumentsService';

interface FiscalDocumentsSummaryProps {
  data?: FiscalDocumentsSummaryData;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRetry: () => void;
}

export const FiscalDocumentsSummary: React.FC<FiscalDocumentsSummaryProps> = ({
  data,
  loading,
  error,
  expanded,
  onToggleExpanded,
  onRetry,
}) => {
  const metrics = [
    {
      label: 'Autorizadas',
      count: data?.authorizedCount,
      value: data?.authorizedValue,
      primary: true,
      icon: 'bi-check-circle',
      color: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Canceladas',
      count: data?.canceledCount,
      value: data?.canceledValue,
      icon: 'bi-x-circle',
      color: 'text-rose-700 dark:text-rose-300',
    },
    {
      label: 'Estornos fiscais',
      count: data?.estornoCount,
      value: data?.estornoValue,
      icon: 'bi-arrow-counterclockwise',
      color: 'text-violet-700 dark:text-violet-300',
    },
    {
      label: 'Pendências',
      count: data?.pendingCount,
      value: data?.pendingValue,
      primary: true,
      icon: 'bi-hourglass-split',
      color: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Rejeitadas e denegadas',
      count: data?.rejectedCount,
      value: data?.rejectedValue,
      icon: 'bi-exclamation-circle',
      color: 'text-orange-700 dark:text-orange-300',
    },
    {
      label: 'Encerradas antes da transmissão',
      count: data?.abandonedCount,
      value: data?.abandonedValue,
      icon: 'bi-slash-circle',
      color: 'text-slate-600 dark:text-slate-300',
    },
  ];

  return (
    <aside
      aria-labelledby="fiscal-summary-title"
      className="fiscal-summary-panel rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id="fiscal-summary-title" className="text-sm font-bold text-slate-900 dark:text-white">
            Resumo fiscal
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Totalizadores com os filtros aplicados
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="fiscal-summary-expand-control shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          {expanded ? 'Mostrar menos' : 'Ver todos'}
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 font-bold underline underline-offset-2">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="fiscal-summary-grid" aria-live="polite" aria-busy={loading}>
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={`fiscal-summary-card ${metric.primary ? 'fiscal-summary-card--primary' : 'fiscal-summary-card--secondary'} flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50`}
            >
              <span className={`mt-0.5 shrink-0 ${metric.color}`} aria-hidden="true">
                <i className={`bi ${metric.icon}`} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 [overflow-wrap:anywhere]">
                  {loading && !data ? 'Carregando…' : formatCurrency(metric.value || 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {loading && !data ? ' ' : `${metric.count || 0} documentos`}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <span className="text-slate-500 dark:text-slate-400">Total no recorte</span>
        <span className="min-w-0 break-words text-right font-bold text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">
          {loading && !data
            ? 'Carregando…'
            : `${data?.totalCount || 0} docs · ${formatCurrency(data?.totalValue || 0)}`}
        </span>
      </div>
    </aside>
  );
};
