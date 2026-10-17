import React from 'react';
import { PurchaseItem } from '../../../../types/purchase.type';

export interface PurchaseReceiptItemRowProps {
  readonly item: PurchaseItem;
  readonly received: number;
  readonly invoiced: number;
  readonly onUpdateInvoiced: (val: number) => void;
  readonly onUpdateReceived: (val: number) => void;
}

export const PurchaseReceiptItemRow: React.FC<PurchaseReceiptItemRowProps> = ({
  item,
  received,
  invoiced,
  onUpdateInvoiced,
  onUpdateReceived,
}) => {
  const isMatch = received === item.quantity && received === invoiced;
  const hasDivergence = received !== item.quantity || received !== invoiced;

  return (
    <div
      className={`p-5 rounded-[1.5rem] border transition-all ${
        isMatch
          ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10'
          : hasDivergence
            ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10'
            : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50'
      }`}
    >
      <div className="grid grid-cols-12 items-center gap-4">
        <div className="col-span-5 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isMatch
                ? 'bg-emerald-100 text-emerald-600'
                : hasDivergence
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-blue-100 text-blue-600'
            }`}
          >
            <i
              className={`bi ${
                isMatch
                  ? 'bi-check-lg'
                  : hasDivergence
                    ? 'bi-exclamation-triangle'
                    : 'bi-box-seam'
              } text-lg`}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {item.description}
            </h4>
            {hasDivergence && (
              <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse uppercase tracking-tighter">
                Divergência
              </p>
            )}
          </div>
        </div>

        <div className="col-span-2 text-center text-xs font-black text-slate-400">
          {item.quantity}
        </div>

        <div className="col-span-2 flex justify-center">
          <input
            type="number"
            value={invoiced}
            onChange={(e) => onUpdateInvoiced(Number(e.target.value))}
            className="w-14 h-9 text-center bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl font-black text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-3 flex justify-center">
          <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => onUpdateReceived(Math.max(0, received - 1))}
              className="w-10 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all font-black"
              aria-label="Diminuir recebimento"
            >
              <i className="bi bi-dash text-lg" aria-hidden="true" />
            </button>
            <input
              type="number"
              value={received}
              onChange={(e) => onUpdateReceived(Number(e.target.value))}
              className={`w-12 h-9 text-center bg-transparent border-none outline-none font-black text-xs ${
                received === invoiced
                  ? 'text-emerald-600 font-black'
                  : 'text-amber-600 font-black'
              }`}
            />
            <button
              type="button"
              onClick={() => onUpdateReceived(received + 1)}
              className="w-10 h-9 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-all font-black"
              aria-label="Aumentar recebimento"
            >
              <i className="bi bi-plus text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
