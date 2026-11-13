import React from 'react';

interface ProductCatalogHeaderProps {
  mode: 'picker' | 'preview';
  selectedCount: number;
  messageItemCount: number;
  onBackToPicker: () => void;
  onClose: () => void;
}

export const ProductCatalogHeader: React.FC<ProductCatalogHeaderProps> = ({
  mode,
  selectedCount,
  messageItemCount,
  onBackToPicker,
  onClose,
}) => {
  return (
    <header className="catalog-dialog-header flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div>
        {mode === 'preview' && (
          <button
            type="button"
            onClick={onBackToPicker}
            className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar ao catálogo
          </button>
        )}
        <h2 id="support-product-catalog-title" className="text-lg font-bold">
          {mode === 'picker' ? 'Catálogo de produtos' : 'Prévia da seleção'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {mode === 'picker'
            ? `${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}`
            : `${messageItemCount} produto${messageItemCount === 1 ? '' : 's'} na seleção`}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar catálogo"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </header>
  );
};
