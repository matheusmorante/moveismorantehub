import React from 'react';
import type { FiscalDocumentFilters } from '../types/fiscalDocuments.types';

interface FiscalDocumentsFilterBarProps {
  filters: FiscalDocumentFilters;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onModelChange: (model: string) => void;
  onStatusChange: (status: string) => void;
  onEnvironmentChange: (env: string) => void;
  onSeriesChange: (series: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  showMoreFilters: boolean;
  onToggleMoreFilters: () => void;
}

export const FiscalDocumentsFilterBar: React.FC<FiscalDocumentsFilterBarProps> = ({
  filters,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onModelChange,
  onStatusChange,
  onEnvironmentChange,
  onSeriesChange,
  onDateFromChange,
  onDateToChange,
  showMoreFilters,
  onToggleMoreFilters,
}) => {
  return (
    <form
      onSubmit={onSearchSubmit}
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar notas fiscais</span>
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="NF, chave, cliente, CPF/CNPJ ou pedido…"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950"
          />
        </label>
        <select
          aria-label="Modelo fiscal"
          value={filters.model}
          onChange={(event) => onModelChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="all">Todos os modelos</option>
          <option value="55">NF-e 55</option>
          <option value="65">NFC-e 65</option>
        </select>
        <select
          aria-label="Status fiscal"
          value={filters.status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
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
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Buscar
        </button>
        <button
          type="button"
          aria-expanded={showMoreFilters}
          onClick={onToggleMoreFilters}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"
        >
          {showMoreFilters ? 'Menos filtros' : 'Mais filtros'}
        </button>
      </div>

      {showMoreFilters && (
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
            Ambiente
            <select
              aria-label="Ambiente fiscal"
              value={filters.environment}
              onChange={(event) => onEnvironmentChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Produção + Homologação</option>
              <option value="1">Produção</option>
              <option value="2">Homologação</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
            Série
            <input
              aria-label="Série fiscal"
              value={filters.series}
              onChange={(event) =>
                onSeriesChange(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
            Emissão desde
            <input
              type="date"
              aria-label="Emissão desde"
              value={filters.dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
            Emissão até
            <input
              type="date"
              aria-label="Emissão até"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(event) => onDateToChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
        </div>
      )}
    </form>
  );
};
