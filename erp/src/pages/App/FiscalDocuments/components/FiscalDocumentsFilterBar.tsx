import React, { useEffect, useRef, useState } from 'react';
import type {
  FiscalDocumentFilters,
  FiscalDocumentPeriod,
} from '../types/fiscalDocuments.types';

interface FiscalDocumentsFilterBarProps {
  filters: FiscalDocumentFilters;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onModelChange: (model: string) => void;
  onStatusChange: (status: string) => void;
  onEnvironmentChange: (env: string) => void;
  period: FiscalDocumentPeriod;
  onPeriodChange: (period: FiscalDocumentPeriod) => void;
  customDateFrom: string;
  customDateTo: string;
  onCustomDateFromChange: (date: string) => void;
  onCustomDateToChange: (date: string) => void;
}

const PERIOD_OPTIONS: { label: string; value: FiscalDocumentPeriod }[] = [
  { label: 'Últimos 30 dias', value: 'last_30_days' },
  { label: 'Este mês', value: 'this_month' },
  { label: 'Mês passado', value: 'last_month' },
  { label: 'Últimos 3 meses', value: 'last_3_months' },
  { label: 'Este ano', value: 'this_year' },
  { label: 'Período personalizado', value: 'custom' },
];

interface FiscalDocumentPeriodSelectorProps {
  period: FiscalDocumentPeriod;
  onChange: (period: FiscalDocumentPeriod) => void;
  className?: string;
}

const FiscalDocumentPeriodSelector: React.FC<FiscalDocumentPeriodSelectorProps> = ({
  period,
  onChange,
  className = '',
}) => (
  <label
    className={`flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 ${className}`}
  >
    Período de emissão
    <select
      aria-label="Período de emissão"
      value={period}
      onChange={(event) => onChange(event.target.value as FiscalDocumentPeriod)}
      className="min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
    >
      {PERIOD_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

type FiscalEnvironmentCode = '1' | '2';

interface EnvironmentCheckboxesProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const EnvironmentCheckboxes: React.FC<EnvironmentCheckboxesProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const selectedValues: FiscalEnvironmentCode[] =
    value === 'all' ? ['1', '2'] : value === '1' || value === '2' ? [value] : [];
  const selectedEnvironments = new Set(selectedValues);

  const toggleEnvironment = (environment: FiscalEnvironmentCode, checked: boolean) => {
    const next = new Set(selectedEnvironments);
    if (checked) next.add(environment);
    else next.delete(environment);
    if (next.size === 0) return;

    const nextValue = next.size === 2 ? 'all' : next.has('1') ? '1' : '2';

    onChange(nextValue);
  };

  return (
    <fieldset
      className={`flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ${className}`}
    >
      <legend className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
        Ambiente
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <label className="inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedEnvironments.has('1')}
            disabled={selectedValues.length === 1 && selectedEnvironments.has('1')}
            onChange={(event) => toggleEnvironment('1', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          Produção
        </label>
        <label className="inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedEnvironments.has('2')}
            disabled={selectedValues.length === 1 && selectedEnvironments.has('2')}
            onChange={(event) => toggleEnvironment('2', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          Homologação
        </label>
      </div>
    </fieldset>
  );
};

export const FiscalDocumentsFilterBar: React.FC<FiscalDocumentsFilterBarProps> = ({
  filters,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onModelChange,
  onStatusChange,
  onEnvironmentChange,
  period,
  onPeriodChange,
  customDateFrom,
  customDateTo,
  onCustomDateFromChange,
  onCustomDateToChange,
}) => {
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const moreFiltersDialogRef = useRef<HTMLDialogElement>(null);

  const handlePeriodChange = (nextPeriod: FiscalDocumentPeriod) => {
    onPeriodChange(nextPeriod);
    if (nextPeriod === 'custom') setIsMoreFiltersOpen(true);
  };

  useEffect(() => {
    const dialog = moreFiltersDialogRef.current;
    if (!dialog) return;

    if (isMoreFiltersOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isMoreFiltersOpen && dialog.open) {
      dialog.close();
    }
  }, [isMoreFiltersOpen]);

  return (
    <form
      onSubmit={onSearchSubmit}
      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(0,1fr)_9rem_10rem_auto_auto] 2xl:flex 2xl:flex-nowrap 2xl:items-end">
        <label className="col-span-2 min-w-0 md:col-span-1 lg:flex-1 2xl:min-w-[190px]">
          <span className="sr-only">Buscar notas fiscais</span>
          <span className="relative block">
            <i
              className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="NF, chave, cliente, CPF/CNPJ ou pedido…"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </span>
        </label>

        <select
          aria-label="Modelo fiscal"
          value={filters.model}
          onChange={(event) => onModelChange(event.target.value)}
          className="hidden min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 lg:block lg:w-36 lg:min-w-36 2xl:w-auto 2xl:flex-none"
        >
          <option value="all">Todos os modelos</option>
          <option value="55">NF-e 55</option>
          <option value="65">NFC-e 65</option>
        </select>

        <select
          aria-label="Status fiscal"
          value={filters.status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="hidden min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 lg:block lg:w-40 lg:min-w-40 2xl:w-auto 2xl:flex-none"
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Aguardando autorização</option>
          <option value="processando">Em processamento</option>
          <option value="autorizada">Autorizadas</option>
          <option value="homologada">Homologadas</option>
          <option value="cancelada">Canceladas</option>
          <option value="rejeitada">Rejeitadas</option>
          <option value="denegada">Denegadas</option>
          <option value="erro">Erro</option>
          <option value="abandoned">Encerrada antes da transmissão</option>
        </select>

        <EnvironmentCheckboxes
          value={filters.environment}
          onChange={onEnvironmentChange}
          className="hidden 2xl:flex 2xl:w-44 2xl:shrink-0"
        />

        <FiscalDocumentPeriodSelector
          period={period}
          onChange={handlePeriodChange}
          className="hidden 2xl:flex 2xl:w-52 2xl:shrink-0"
        />

        <button
          type="submit"
          className="col-span-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 md:col-auto"
        >
          Buscar
        </button>

        <button
          type="button"
          onClick={() => setIsMoreFiltersOpen(true)}
          className="col-span-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:col-auto 2xl:hidden"
        >
          <i className="bi bi-sliders" aria-hidden="true" />
          Mais filtros
        </button>
      </div>

      <dialog
        ref={moreFiltersDialogRef}
        aria-labelledby="fiscal-more-filters-title"
        onCancel={(event) => {
          event.preventDefault();
          setIsMoreFiltersOpen(false);
        }}
        onClose={() => setIsMoreFiltersOpen(false)}
        className={`${isMoreFiltersOpen ? 'flex' : 'hidden'} fixed inset-0 m-0 h-dvh w-screen max-h-none max-w-none flex-col overflow-hidden border-0 bg-white p-0 text-slate-800 backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-100 lg:m-auto lg:h-auto lg:max-h-[85dvh] lg:w-[calc(100vw-2rem)] lg:max-w-xl lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-2xl dark:lg:border-slate-700`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 md:px-5">
          <div>
            <h2 id="fiscal-more-filters-title" className="text-base font-bold">
              Mais filtros
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ajuste os filtros que não cabem na barra principal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMoreFiltersOpen(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Fechar mais filtros"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-2 md:p-5">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 lg:hidden">
            Modelo fiscal
            <select
              aria-label="Modelo fiscal"
              value={filters.model}
              onChange={(event) => onModelChange(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Todos os modelos</option>
              <option value="55">NF-e 55</option>
              <option value="65">NFC-e 65</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 lg:hidden">
            Status fiscal
            <select
              aria-label="Status fiscal"
              value={filters.status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Todos os status</option>
              <option value="pendente">Aguardando autorização</option>
              <option value="processando">Em processamento</option>
              <option value="autorizada">Autorizadas</option>
              <option value="homologada">Homologadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="rejeitada">Rejeitadas</option>
              <option value="denegada">Denegadas</option>
              <option value="erro">Erro</option>
              <option value="abandoned">Encerrada antes da transmissão</option>
            </select>
          </label>

          <EnvironmentCheckboxes
            value={filters.environment}
            onChange={onEnvironmentChange}
            className="sm:col-span-2"
          />

          <FiscalDocumentPeriodSelector
            period={period}
            onChange={handlePeriodChange}
            className="sm:col-span-2"
          />

          {period === 'custom' && (
            <>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Emissão desde
                <input
                  type="date"
                  aria-label="Emissão desde"
                  value={customDateFrom}
                  max={customDateTo || undefined}
                  onChange={(event) => onCustomDateFromChange(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Emissão até
                <input
                  type="date"
                  aria-label="Emissão até"
                  value={customDateTo}
                  min={customDateFrom || undefined}
                  onChange={(event) => onCustomDateToChange(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </>
          )}
        </div>

        <footer className="border-t border-slate-200 p-4 dark:border-slate-800 md:px-5">
          <button
            type="button"
            onClick={() => setIsMoreFiltersOpen(false)}
            className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Concluir
          </button>
        </footer>
      </dialog>
    </form>
  );
};
