import React from 'react';
import type {
  FiscalPendenciesFilters,
  FiscalPendencyType,
} from '../../types/fiscalPendencies.types';

interface FiscalPendenciesFilterBarProps {
  readonly filters: FiscalPendenciesFilters;
  readonly onFilterChange: <K extends keyof FiscalPendenciesFilters>(
    field: K,
    value: FiscalPendenciesFilters[K]
  ) => void;
  readonly onResetFilters: () => void;
}

export const FiscalPendenciesFilterBar: React.FC<FiscalPendenciesFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60 md:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Campo de Busca */}
        <div className="relative sm:col-span-2">
          <i
            aria-hidden="true"
            className="bi bi-search absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Buscar por pedido (#123), cliente ou documento…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-3 pl-9 text-xs font-medium text-slate-800 placeholder-slate-400 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
          />
        </div>

        {/* Tipo de Pendência */}
        <div>
          <label htmlFor="filter-pendency-type" className="sr-only">Tipo de Pendência</label>
          <select
            id="filter-pendency-type"
            value={filters.pendencyType}
            onChange={(e) =>
              onFilterChange('pendencyType', e.target.value as 'all' | FiscalPendencyType)
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
          >
            <option value="all">Todos os tipos de pendência</option>
            <option value="awaiting_new_invoice">Nova emissão necessária</option>
            <option value="draft">Rascunho pendente</option>
            <option value="rejected">Emissão rejeitada</option>
            <option value="transmission_uncertain">Transmissão incerta</option>
            <option value="prior_regularization_failed">Erro na regularização anterior</option>
            <option value="prior_regularization_uncertain">Regularização anterior incerta</option>
            <option value="processing">Processamento em andamento</option>
          </select>
        </div>

        {/* Ambiente */}
        <div>
          <label htmlFor="filter-pendency-env" className="sr-only">Ambiente Fiscal</label>
          <select
            id="filter-pendency-env"
            value={filters.environment}
            onChange={(e) =>
              onFilterChange('environment', e.target.value as 'all' | '1' | '2')
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
          >
            <option value="all">Todos os ambientes</option>
            <option value="1">Produção (NF)</option>
            <option value="2">Homologação (NFH)</option>
          </select>
        </div>

        {/* Modelo */}
        <div>
          <label htmlFor="filter-pendency-model" className="sr-only">Modelo Fiscal</label>
          <select
            id="filter-pendency-model"
            value={filters.model}
            onChange={(e) =>
              onFilterChange('model', e.target.value as 'all' | '55' | '65')
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
          >
            <option value="all">Todos os modelos</option>
            <option value="55">Modelo 55 (NF-e)</option>
            <option value="65">Modelo 65 (NFC-e)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Período */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">Período:</span>
          {(
            [
              ['all', 'Todo o histórico'],
              ['today', 'Hoje'],
              ['7days', '7 dias'],
              ['30days', '30 dias'],
              ['currentMonth', 'Mês atual'],
              ['custom', 'Personalizado'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => onFilterChange('period', val)}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                filters.period === val
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Limpar Filtros */}
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-bold text-slate-500 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300 transition-colors"
        >
          Limpar filtros
        </button>
      </div>

      {filters.period === 'custom' && (
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">De:</span>
            <input
              type="date"
              value={filters.customDateFrom || ''}
              onChange={(e) => onFilterChange('customDateFrom', e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Até:</span>
            <input
              type="date"
              value={filters.customDateTo || ''}
              onChange={(e) => onFilterChange('customDateTo', e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
};
