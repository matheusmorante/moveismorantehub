import React from 'react';

export interface PurchaseItemsEntrySectionProps {
  isReceiptMode: boolean;
  hasError: boolean;
  supplierId?: string;
  onAddNewItemRow: () => void;
}

export const PurchaseItemsEntrySection = ({
  isReceiptMode,
  hasError,
  supplierId,
  onAddNewItemRow,
}: PurchaseItemsEntrySectionProps) => {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
      <div className="flex min-h-8 items-center gap-2">
        <i className="bi bi-box-seam-fill text-sm leading-none text-emerald-600" />
        <h3 className="text-xs font-black uppercase leading-none tracking-widest text-slate-700 dark:text-slate-200">
          {isReceiptMode ? 'Itens do Recebimento' : 'Itens do Pedido'}
        </h3>
        {!supplierId && (
          <span className="text-[10px] font-bold text-amber-500 ml-2">
            (Selecione o fornecedor acima primeiro)
          </span>
        )}
        {hasError && (
          <span className="text-[10px] font-bold text-red-500 ml-2">
            {isReceiptMode
              ? 'Adicione pelo menos um item ao recebimento.'
              : 'Adicione pelo menos um item ao pedido de compra.'}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onAddNewItemRow}
        disabled={!supplierId}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        title={
          !supplierId
            ? 'Selecione o fornecedor acima primeiro'
            : 'Adicionar Item'
        }
      >
        <i className="bi bi-plus-lg text-sm" />
        <span>Adicionar Item</span>
      </button>
    </div>
  );
};
