import React from 'react';
import type { CustomerSummary } from '@/pages/utils/customerSupport/customerMatchingService';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';

interface ManualLinkSearchResultsProps {
  results: CustomerSummary[];
  isSearching: boolean;
  isLinking: boolean;
  onLinkCustomer: (customer: CustomerSummary) => void;
}

export const ManualLinkSearchResults: React.FC<ManualLinkSearchResultsProps> = ({
  results,
  isSearching,
  isLinking,
  onLinkCustomer,
}) => {
  return (
    <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1">
      {results.length === 0 && !isSearching && (
        <div className="text-center py-8 text-slate-400 text-xs">
          <i className="bi bi-people text-2xl block mb-2 opacity-50" />
          Digite um termo e clique em buscar para localizar o cadastro do cliente.
        </div>
      )}

      {results.map((cust) => (
        <div
          key={cust.id}
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {cust.fullName}
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                #{cust.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {cust.phone && <span>{formatPhoneForDisplay(cust.phone)}</span>}
              {cust.cpfCnpj && <span>{cust.cpfCnpj}</span>}
            </div>
          </div>

          <button
            type="button"
            disabled={isLinking || isSearching}
            onClick={() => onLinkCustomer(cust)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            Vincular
          </button>
        </div>
      ))}
    </div>
  );
};
