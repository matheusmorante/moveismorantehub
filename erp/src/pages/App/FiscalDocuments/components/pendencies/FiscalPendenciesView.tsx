import React from 'react';
import type { FiscalPendencyItem } from '../../types/fiscalPendencies.types';
import type { ReplacementPendingAction } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import type { useFiscalPendencies } from '../../hooks/useFiscalPendencies';
import { FiscalPendenciesFilterBar } from './FiscalPendenciesFilterBar';
import { FiscalPendenciesTable } from './FiscalPendenciesTable';

interface FiscalPendenciesViewProps {
  readonly state: ReturnType<typeof useFiscalPendencies>;
  readonly onOpenPendencyAction: (item: FiscalPendencyItem, actionKind: ReplacementPendingAction) => void;
  readonly onViewPendencyDetails: (item: FiscalPendencyItem) => void;
}

export const FiscalPendenciesView: React.FC<FiscalPendenciesViewProps> = ({
  state,
  onOpenPendencyAction,
  onViewPendencyDetails,
}) => {
  const {
    pendencies,
    loading,
    error,
    metrics,
    filters,
    setFilterField,
    resetFilters,
    reload,
  } = state;

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
      >
        <p>{error} A lista não foi confirmada e não deve ser considerada vazia.</p>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="w-fit rounded-xl border border-red-300 px-3 py-2 text-xs font-bold disabled:opacity-50 dark:border-red-800"
        >
          {loading ? 'Atualizando…' : 'Tentar novamente'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Abertas */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Abertas
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <i aria-hidden="true" className="bi bi-clock-history text-sm" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {metrics.openCount}
          </div>
        </div>

        {/* Produção */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Produção (NF)
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <i aria-hidden="true" className="bi bi-shield-check text-sm" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {metrics.productionCount}
          </div>
        </div>

        {/* Homologação */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Homologação (NFH)
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
              <i aria-hidden="true" className="bi bi-flask text-sm" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {metrics.homologationCount}
          </div>
        </div>

        {/* Reemissões Necessárias */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reemissões
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <i aria-hidden="true" className="bi bi-receipt text-sm" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
            {metrics.reissueCount}
          </div>
        </div>

        {/* Rejeições / Erros */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rejeições / Erros
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <i aria-hidden="true" className="bi bi-exclamation-triangle-fill text-sm" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
            {metrics.rejectionCount}
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <FiscalPendenciesFilterBar
        filters={filters}
        onFilterChange={setFilterField}
        onResetFilters={resetFilters}
      />

      {/* Tabela de Pendências */}
      <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Central de Pendências Fiscais
            </h2>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
              {pendencies.length} {pendencies.length === 1 ? 'pendência' : 'pendências'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <i aria-hidden="true" className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        <FiscalPendenciesTable
          pendencies={pendencies}
          loading={loading}
          onOpenAction={onOpenPendencyAction}
          onViewDetails={onViewPendencyDetails}
        />
      </div>
    </div>
  );
};
