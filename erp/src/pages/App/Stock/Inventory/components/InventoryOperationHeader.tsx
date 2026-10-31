import React from 'react';
import type { AuditItem } from '../types/inventoryAudit.types';

interface InventoryOperationHeaderProps {
  readonly items: readonly AuditItem[];
  readonly title?: string;
  readonly showCount?: boolean;
  readonly count?: number;
  readonly countLabel?: string;
  readonly onClose?: () => void;
  readonly onRequestCancelInventory?: () => void;
}

export const InventoryOperationHeader: React.FC<InventoryOperationHeaderProps> = ({
  items,
  title,
  showCount = true,
  count,
  countLabel = 'produtos contados',
  onClose,
  onRequestCancelInventory,
}) => {
  const countedItems = items.filter((i) => typeof i.physicalCount === 'number');
  const displayedCount = count ?? countedItems.length;
  const [isCancelMenuOpen, setIsCancelMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!onRequestCancelInventory) setIsCancelMenuOpen(false);
  }, [onRequestCancelInventory]);

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
        {title && <div className="min-w-0 flex-1 truncate text-base font-black text-slate-800 dark:text-slate-100">{title}</div>}
        <div className="flex shrink-0 items-center gap-1">
          {onRequestCancelInventory && (
            <div className="relative sm:hidden">
              {isCancelMenuOpen && (
                <button
                  type="button"
                  aria-label="Fechar menu do inventário"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsCancelMenuOpen(false)}
                />
              )}
              <button
                type="button"
                aria-label="Ações do inventário"
                aria-haspopup="menu"
                aria-expanded={isCancelMenuOpen}
                onClick={() => setIsCancelMenuOpen((open) => !open)}
                className="relative z-50 flex h-9 w-9 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <i className="bi bi-three-dots-vertical" aria-hidden="true" />
              </button>
              {isCancelMenuOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsCancelMenuOpen(false);
                      onRequestCancelInventory();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <i className="bi bi-x-circle" aria-hidden="true" />
                    Cancelar inventário
                  </button>
                </div>
              )}
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar inventário"
              title="Fechar inventário"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {showCount && <div
        className="max-w-5xl mx-auto w-full text-sm font-bold text-slate-500 dark:text-slate-400"
        role="status"
        aria-live="polite"
      >
        <span className="text-emerald-600 dark:text-emerald-400">{displayedCount}</span>{' '}
        {countLabel}
      </div>}
    </div>
  );
};
