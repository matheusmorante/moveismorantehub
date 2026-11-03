import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, PackagePlus, RotateCcw, X } from 'lucide-react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getReceiptItemsMovementList } from './receiptBadgeContent';
import type { ReceiptBadgeContentResult } from './receiptBadgeContent';

interface ReceiptMovementDetailsModalProps {
  readonly content: ReceiptBadgeContentResult;
  readonly receipt: GoodsReceipt;
  readonly hasMovement: boolean;
  readonly isReversed: boolean;
  readonly onClose: () => void;
}

export const ReceiptMovementDetailsModal: React.FC<ReceiptMovementDetailsModalProps> = ({
  content,
  receipt,
  hasMovement,
  isReversed,
  onClose,
}) => {
  useBodyScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const itemsMovement = getReceiptItemsMovementList(receipt);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar detalhes da movimentação do recebimento"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-movement-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${content.badgeColorClass}`}>
              <PackagePlus className="h-5 w-5" />
              {isReversed ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-800 text-white ring-2 ring-white dark:ring-slate-900">
                  <RotateCcw className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              ) : hasMovement ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-800 text-white ring-2 ring-white dark:ring-slate-900">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              <h2 id="receipt-movement-title" className="text-sm font-black text-slate-900 dark:text-white">
                Movimentação do recebimento
              </h2>
              <p className={`mt-0.5 text-xs font-bold ${content.statusTextColor}`}>
                {content.statusLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes da movimentação"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {content.explanation}
          </p>

          {itemsMovement.length > 0 ? (
            <section className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-1">
                <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Itens do recebimento ({itemsMovement.length})
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Entrada
                </span>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {itemsMovement.map((item, index) => (
                  <article
                    key={`${item.productId || item.description}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Quantidade: <strong className="text-slate-700 dark:text-slate-200">{item.quantity}</strong>
                      </p>
                    </div>
                    <span
                      title={item.tooltip}
                      className={`max-w-32 rounded-md border px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide ${item.statusBadgeClass}`}
                    >
                      {item.statusLabel}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Nenhum item registrado neste recebimento.
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
};
