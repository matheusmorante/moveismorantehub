import React from 'react';
import type { ProductCatalogPrepareInput } from '../../../../../shared-utils/productCatalogFormSchemas';

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;

interface ProductCatalogPickerFooterProps {
  selectedCount: number;
  bulkScope: BulkScope | null;
  onSendSelection?: (selection: ProductCatalogPrepareInput) => Promise<boolean>;
  canSendSelection: boolean;
  sendDisabledReason: string;
  isSendingSelection: boolean;
  onClear: () => void;
  onSubmit: () => void;
  itemsError?: string;
}

export const ProductCatalogPickerFooter: React.FC<ProductCatalogPickerFooterProps> = ({
  selectedCount,
  bulkScope,
  onSendSelection,
  canSendSelection,
  sendDisabledReason,
  isSendingSelection,
  onClear,
  onSubmit,
  itemsError,
}) => {
  return (
    <>
      <footer className="catalog-picker-footer flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="catalog-picker-footer-count min-w-0">
          <p className="text-sm font-bold">
            {selectedCount} produto{selectedCount === 1 ? '' : 's'} selecionado{selectedCount === 1 ? '' : 's'}
          </p>
          {bulkScope && (
            <p className="truncate text-xs text-slate-500">
              Todos de {bulkScope.categoryName} no momento do envio
            </p>
          )}
          {onSendSelection && !canSendSelection && sendDisabledReason && (
            <p role="status" className="mt-1 max-w-sm text-xs text-amber-700 dark:text-amber-300">
              {sendDisabledReason}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={selectedCount === 0}
            className="catalog-footer-clear rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={selectedCount === 0 || isSendingSelection || (Boolean(onSendSelection) && !canSendSelection)}
            aria-busy={isSendingSelection}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSendingSelection ? (
              <>
                <i className="bi bi-arrow-repeat mr-1 animate-spin" aria-hidden="true" />
                Enviando…
              </>
            ) : onSendSelection ? (
              `Enviar ${selectedCount} produto${selectedCount === 1 ? '' : 's'} ao cliente`
            ) : (
              `Continuar com ${selectedCount} produto${selectedCount === 1 ? '' : 's'}`
            )}
          </button>
        </div>
      </footer>
      {itemsError && (
        <p
          role="alert"
          className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-200"
        >
          {itemsError}
        </p>
      )}
    </>
  );
};
