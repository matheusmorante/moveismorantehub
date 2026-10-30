import React, { useEffect, useRef, useState } from 'react';
import { useGeminiQuotaStatus } from '@/pages/utils/geminiQuotaService';
import { GeminiQuotaWarningBanner } from './GeminiQuotaWarningBanner';
import { SefazSyncStatusBadge } from './SefazSyncStatusBadge';

export type DateFilterMode =
  | 'current_month'
  | 'previous_month'
  | 'current_year'
  | 'previous_year'
  | 'custom_month'
  | 'custom_range';

export interface DateFilterConfig {
  mode: DateFilterMode;
  customMonth: string;
  startMonth: string;
  endMonth: string;
}

interface InboundInvoicesHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFilter: DateFilterConfig;
  onDateFilterChange: (config: DateFilterConfig) => void;
  onOpenAddInvoice: () => void;
  onSyncSuccess?: () => void;
}

export const InboundInvoicesHeader: React.FC<InboundInvoicesHeaderProps> = ({
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  onOpenAddInvoice,
  onSyncSuccess,
}) => {
  const { isUnavailable, reason } = useGeminiQuotaStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleModeChange = (mode: DateFilterMode) => {
    onDateFilterChange({
      ...dateFilter,
      mode,
    });
  };

  const handleImport = () => {
    setMenuOpen(false);
    onOpenAddInvoice();
  };

  return (
    <header className="mb-4 flex flex-col gap-3">
      <GeminiQuotaWarningBanner isUnavailable={isUnavailable} reason={reason} variant="header" />

      <div className="flex min-h-9 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20">
            <i className="bi bi-receipt-cutoff text-base" aria-hidden="true" />
          </div>
          <h1 className="truncate text-base font-black leading-tight tracking-tight text-slate-800 dark:text-slate-100">
            NF de entrada
          </h1>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="Mais opções de NF de entrada"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="inbound-invoices-header-menu"
            title="Mais opções"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <i aria-hidden="true" className="bi bi-three-dots-vertical text-lg" />
          </button>
          {menuOpen && (
            <div
              id="inbound-invoices-header-menu"
              role="menu"
              aria-label="Ações da NF de entrada"
              className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleImport}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <i aria-hidden="true" className="bi bi-file-earmark-plus text-blue-600 dark:text-blue-400" />
                <span>Importar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 md:shrink-0 md:justify-start">
          <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-1.5 px-2 py-1">
              <i className="bi bi-calendar-event text-blue-600 dark:text-blue-400 text-sm" />
              <span className="text-slate-500 font-semibold">Período:</span>
            </div>

            <select
              value={dateFilter.mode}
              onChange={(e) => handleModeChange(e.target.value as DateFilterMode)}
              className="rounded-none border-0 border-b-2 border-slate-300 bg-transparent px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer transition-colors focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:bg-transparent dark:text-slate-100 dark:focus:border-blue-500"
            >
              <option value="current_month">Mês Atual</option>
              <option value="previous_month">Mês Anterior</option>
              <option value="current_year">Este Ano</option>
              <option value="previous_year">Ano Passado</option>
              <option value="custom_month">Outro Mês</option>
              <option value="custom_range">Intervalo Personalizado</option>
            </select>

            {dateFilter.mode === 'custom_month' && (
              <div className="flex items-center gap-1.5 pl-1">
                <input
                  type="month"
                  required
                  value={dateFilter.customMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      onDateFilterChange({
                        ...dateFilter,
                        customMonth: e.target.value,
                      });
                    }
                  }}
                  className="rounded-none border-0 border-b-2 border-slate-300 bg-transparent px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer transition-colors focus:border-blue-600 dark:border-slate-700 dark:text-slate-100 dark:focus:border-blue-500"
                />
              </div>
            )}

            {dateFilter.mode === 'custom_range' && (
              <div className="flex items-center gap-2 pl-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">De:</span>
                  <input
                    type="month"
                    required
                    value={dateFilter.startMonth}
                    onChange={(e) => {
                      if (e.target.value) {
                        onDateFilterChange({
                          ...dateFilter,
                          startMonth: e.target.value,
                        });
                      }
                    }}
                    className="rounded-none border-0 border-b-2 border-slate-300 bg-transparent px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer transition-colors focus:border-blue-600 dark:border-slate-700 dark:text-slate-100 dark:focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Até:</span>
                  <input
                    type="month"
                    required
                    value={dateFilter.endMonth}
                    onChange={(e) => {
                      if (e.target.value) {
                        onDateFilterChange({
                          ...dateFilter,
                          endMonth: e.target.value,
                        });
                      }
                    }}
                    className="rounded-none border-0 border-b-2 border-slate-300 bg-transparent px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer transition-colors focus:border-blue-600 dark:border-slate-700 dark:text-slate-100 dark:focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center self-end pr-1 sm:self-center md:ml-auto">
            <SefazSyncStatusBadge onSyncSuccess={onSyncSuccess} />
          </div>
        </div>

        <div className="relative w-full min-w-0 md:flex-1">
          <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Fornecedor, NF-e ou chave de acesso"
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:focus:border-blue-500"
            aria-label="Pesquisar notas fiscais de entrada"
          />
        </div>
      </div>
    </header>
  );
};
