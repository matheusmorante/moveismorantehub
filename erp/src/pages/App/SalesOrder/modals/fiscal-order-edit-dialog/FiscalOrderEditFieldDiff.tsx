import React from 'react';
import type { FiscalOrderEditFieldDiffProps } from './types';
import { formatFieldName } from './fiscalFieldFormatting';

export const FiscalOrderEditFieldDiff: React.FC<FiscalOrderEditFieldDiffProps> = ({ changes }) => {
  if (changes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
        Campos fiscais importantes alterados ({changes.length})
      </h4>
      <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden dark:border-slate-800 dark:divide-slate-800">
        {changes.map((change, index) => {
          const { label, group } = formatFieldName(change.field);
          return (
            <div
              key={`${change.field}-${index}`}
              className="p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-white dark:bg-slate-900"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {group}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {label}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0">
                <span className="line-through text-slate-400 dark:text-slate-500">
                  {String(change.expected)}
                </span>
                <i className="bi bi-arrow-right text-slate-400" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {String(change.actual)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
