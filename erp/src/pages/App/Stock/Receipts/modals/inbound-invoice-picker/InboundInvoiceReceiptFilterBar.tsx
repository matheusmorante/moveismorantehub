import React from 'react';
import type {
  DateFilterConfig,
  DateFilterMode,
} from '@/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader';

interface InboundInvoiceReceiptFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateFilter: DateFilterConfig;
  setDateFilter: (filter: DateFilterConfig) => void;
}

export const InboundInvoiceReceiptFilterBar: React.FC<InboundInvoiceReceiptFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
}) => {
  return (
    <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
      <div className="relative">
        <i
          className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Emitente, CNPJ, nº da nota ou chave de acesso"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-colors"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <div className="flex items-center gap-1.5 px-2 py-1">
            <i
              className="bi bi-calendar-event text-blue-600 dark:text-blue-400 text-sm"
              aria-hidden="true"
            />
            <span className="text-slate-500 font-semibold">Período:</span>
          </div>

          <select
            value={dateFilter.mode}
            onChange={(e) =>
              setDateFilter({ ...dateFilter, mode: e.target.value as DateFilterMode })
            }
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-transparent focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100"
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
                    setDateFilter({
                      ...dateFilter,
                      customMonth: e.target.value,
                    });
                  }
                }}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      setDateFilter({
                        ...dateFilter,
                        startMonth: e.target.value,
                      });
                    }
                  }}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      setDateFilter({
                        ...dateFilter,
                        endMonth: e.target.value,
                      });
                    }
                  }}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
