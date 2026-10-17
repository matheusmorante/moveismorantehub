import React from 'react';
import ProductFilters, { ProductFiltersData } from '../ProductFilters';

export interface ProductMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Partial<ProductFiltersData>;
  setFilters: React.Dispatch<React.SetStateAction<Partial<ProductFiltersData>>>;
  clearSearchInput: () => void;
}

export const ProductMobileFilterDrawer: React.FC<ProductMobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  clearSearchInput,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-filters-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in lg:hidden"
    >
      <button
        type="button"
        aria-label="Fechar filtros avançados"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md cursor-default border-0 p-0 m-0 w-full h-full"
        onClick={onClose}
      />
      <div
        className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center"
              aria-hidden="true"
            >
              <i className="bi bi-funnel-fill text-lg" />
            </div>
            <div>
              <h3
                id="mobile-filters-title"
                className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider"
              >
                Filtros Avançados
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer"
          >
            <i className="bi bi-x-lg text-sm" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <ProductFilters
            filters={filters}
            setFilters={setFilters}
            onResetSearch={clearSearchInput}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductMobileFilterDrawer;
