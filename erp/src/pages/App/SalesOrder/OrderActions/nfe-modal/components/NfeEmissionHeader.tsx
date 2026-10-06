import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { FiscalIssueTone } from '@/pages/utils/nfe/fiscalIssuePresentation';

export interface NfeEmissionHeaderProps {
  order: Order;
  modelLabel: string;
  environment: 1 | 2;
  onClose: () => void;
  hasFiscalIssue?: boolean;
  fiscalIssueTone?: FiscalIssueTone;
  onOpenFiscalIssue?: () => void;
}

export const NfeEmissionHeader: React.FC<NfeEmissionHeaderProps> = ({
  order,
  modelLabel,
  environment,
  onClose,
  hasFiscalIssue,
  fiscalIssueTone,
  onOpenFiscalIssue,
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
        {hasFiscalIssue && onOpenFiscalIssue && (
          <button
            type="button"
            data-testid="nfe-fiscal-issue-trigger"
            onClick={onOpenFiscalIssue}
            aria-label="Ver alerta da nota fiscal"
            title="Clique para ver os detalhes do aviso ou erro da nota fiscal"
            className={`group relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 animate-in fade-in duration-150 ${
              fiscalIssueTone === 'error'
                ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 focus:ring-rose-400 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 focus:ring-amber-400 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
            }`}
          >
            <i className="bi bi-exclamation-triangle-fill text-sm" />
            <span className="font-bold">Aviso fiscal</span>
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  fiscalIssueTone === 'error' ? 'bg-rose-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  fiscalIssueTone === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                }`}
              />
            </span>
          </button>
        )}

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
