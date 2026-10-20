import React from 'react';
import { getItemAssemblyTone } from './cardViewHelpers';

interface CardItemsListProps {
  items: any[];
  isAssemblyTask: boolean;
  isAssistance: boolean;
  allOptions?: any[];
}

export const CardItemsList: React.FC<CardItemsListProps> = ({
  items,
  isAssemblyTask,
  isAssistance,
  allOptions = [],
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-1 bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all overflow-hidden">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 opacity-60">
        {isAssemblyTask
          ? 'Necessita Montar:'
          : isAssistance
            ? 'Peças / Materiais'
            : 'Itens do Pedido'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.filter(Boolean).map((item, i) => {
          const tone = getItemAssemblyTone(item, allOptions);
          return (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg shadow-sm border ${
                tone === 'outside'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
                  : tone === 'depot'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                    : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700/40'
              }`}
            >
              <span
                className={`text-[10px] font-black ${
                  tone === 'outside'
                    ? 'text-red-600 dark:text-red-400'
                    : tone === 'depot'
                      ? 'text-amber-700 dark:text-amber-400'
                      : isAssemblyTask
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {item.quantity}x
              </span>
              <span
                className={`text-[10px] font-bold uppercase leading-none ${
                  tone === 'outside'
                    ? 'text-red-700 dark:text-red-300'
                    : tone === 'depot'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
