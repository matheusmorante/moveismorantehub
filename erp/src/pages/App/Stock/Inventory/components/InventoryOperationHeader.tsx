import React from 'react';
import type { AuditItem } from '../types/inventoryAudit.types';

interface InventoryOperationHeaderProps {
  readonly items: readonly AuditItem[];
}

export const InventoryOperationHeader: React.FC<InventoryOperationHeaderProps> = ({ items }) => {
  const countedItems = items.filter((i) => i.physicalCount !== null);
  const progressPercent =
    items.length > 0 ? Math.round((countedItems.length / items.length) * 100) : 0;

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
      <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
        <div className="shrink-0 text-sm font-bold text-slate-500 dark:text-slate-400">
          <span className="text-emerald-600 dark:text-emerald-400">{countedItems.length}</span>{' '}
          / {items.length} contados
        </div>
        <div
          className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-label="Progresso do inventário"
        >
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="shrink-0 text-xs font-bold text-slate-400">{progressPercent}%</div>
      </div>
    </div>
  );
};
