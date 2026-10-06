import React from 'react';
import type Order from '@/pages/types/order.type';

export interface NfeEmissionHeaderProps {
  order: Order;
  modelLabel: string;
  environment: 1 | 2;
  onClose: () => void;
}

export const NfeEmissionHeader: React.FC<NfeEmissionHeaderProps> = ({
  order,
  modelLabel,
  environment,
  onClose,
}) => {
  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-2">
      <div className="flex min-w-0 w-full items-center justify-start gap-2 sm:flex-1 sm:gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
          <i className="bi bi-receipt-cutoff text-sm" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 leading-tight truncate">
              Emitir nota fiscal de saída
            </h3>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 truncate">
              Pedido #{order.orderIndex || order.id} • {modelLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider select-none ${
            environment === 2
              ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {environment === 2 ? 'Homologação' : 'Produção'}
        </span>
        <button
          type="button"
          aria-label="Fechar emissão fiscal"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          <i className="bi bi-x-lg text-sm" />
        </button>
      </div>
    </header>
  );
};

export default NfeEmissionHeader;
