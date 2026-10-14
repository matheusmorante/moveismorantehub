import type React from 'react';
import { useCallback, useEffect } from 'react';
import type Product from '@/pages/types/product.type';

export interface MoveProductToTrashModalProps {
  readonly isOpen: boolean;
  readonly product: Product | null;
  readonly isLoading?: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<void> | void;
}

export const MoveProductToTrashModal: React.FC<MoveProductToTrashModalProps> = ({
  isOpen,
  product,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !product) return null;

  const productName = product.name || product.title || product.description || 'Produto';
  const productCode = product.code || product.sku;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden z-10 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-to-trash-title"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-900/40 shadow-xs">
              <i className="bi bi-trash3 text-xl" />
            </div>

            <div className="flex-1 min-w-0">
              <h3
                id="move-to-trash-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Mover produto para lixeira?
              </h3>

              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                O produto e todas as suas variações serão movidos para a lixeira. Você poderá
                restaurá-los durante 30 dias.
              </p>

              <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                {productCode && (
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                    {productCode}
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {productName}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading && <i className="bi bi-arrow-repeat animate-spin text-sm" />}
            Mover para lixeira
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveProductToTrashModal;
