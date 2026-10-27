import React from 'react';
import ShowTestDataToggle from '@/components/shared/ShowTestDataToggle';

export interface ProductsTopToolbarProps {
  mode: 'standard' | 'composition';
  searchInput: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  isAdministrator: boolean;
  hasTestProducts: boolean;
  showTestProducts: boolean;
  onShowTestProductsChange: (checked: boolean) => void;
  showMergedProducts: boolean;
  onShowMergedProductsChange: (checked: boolean) => void;
  canManageProducts: boolean;
  isActionsMenuOpen: boolean;
  setIsActionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  menuRef: React.RefObject<HTMLDivElement>;
  onNewProduct: () => void;
  onNewComposition: () => void;
  onOpenFilters: () => void;
  onToggleActiveOnly: () => void;
  activeOnly?: boolean;
}

export const ProductsTopToolbar: React.FC<ProductsTopToolbarProps> = ({
  mode,
  searchInput,
  onSearchChange,
  onSearchKeyDown,
  onClearSearch,
  isAdministrator,
  hasTestProducts,
  showTestProducts,
  onShowTestProductsChange,
  showMergedProducts,
  onShowMergedProductsChange,
  canManageProducts,
  isActionsMenuOpen,
  setIsActionsMenuOpen,
  menuRef,
  onNewProduct,
  onNewComposition,
  onOpenFilters,
  onToggleActiveOnly,
  activeOnly,
}) => {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 px-0.5 sm:px-1">
      <div className="flex flex-wrap items-center gap-2 w-full">
        {/* Search input with debounced typing and quick clear */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <i
            className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder={
              mode === 'composition'
                ? 'Pesquisar composições (mín. 3 caracteres)...'
                : 'Pesquisar produtos (mín. 3 caracteres)...'
            }
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="w-full pl-12 pr-10 py-1.5 bg-transparent border-x-0 border-t-0 border-b-2 border-slate-200 dark:border-slate-800 rounded-none focus:ring-0 focus:border-blue-500 outline-none transition-colors text-sm font-medium dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          {searchInput && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title="Limpar pesquisa"
              aria-label="Limpar pesquisa"
            >
              <i className="bi bi-x-lg text-xs" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Toggles */}
        {isAdministrator && hasTestProducts && (
          <ShowTestDataToggle
            checked={showTestProducts}
            onChange={onShowTestProductsChange}
            compact
          />
        )}

        {/* Actions Dropdown Menu */}
        <div className="flex gap-2 ml-auto shrink-0 items-center" ref={menuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                aria-label="Ações de produtos"
                aria-expanded={isActionsMenuOpen}
                className="w-11 h-11 xl:w-8 xl:h-8 flex items-center justify-center !bg-transparent !border-0 !rounded-none !shadow-none text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors active:scale-95"
                title="Opções"
              >
                <i className="bi bi-three-dots-vertical text-lg" />
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {canManageProducts && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onNewProduct();
                          setIsActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i className="bi bi-plus-lg" />
                        </div>
                        {mode === 'composition' ? 'Nova Composição' : 'Novo Produto'}
                      </button>

                      {mode === 'standard' && (
                        <button
                          type="button"
                          onClick={() => {
                            onNewComposition();
                            setIsActionsMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-3 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i className="bi bi-boxes" />
                          </div>
                          Novo Produto Composto
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    aria-pressed={showMergedProducts}
                    onClick={() => {
                      onShowMergedProductsChange(!showMergedProducts);
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                        showMergedProducts
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <i className="bi bi-bezier2" />
                    </div>
                    {showMergedProducts ? 'Ocultar Mesclados' : 'Mostrar Mesclados'}
                  </button>

                  {canManageProducts && mode === 'composition' && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenFilters();
                        setIsActionsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i className="bi bi-funnel" />
                      </div>
                      Filtros
                    </button>
                  )}

                  {canManageProducts && (
                    <>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4" />
                      <button
                        type="button"
                        onClick={() => {
                          onToggleActiveOnly();
                          setIsActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                            activeOnly === false
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <i
                            className={`bi ${activeOnly === false ? 'bi-eye' : 'bi-eye-slash'}`}
                          />
                        </div>
                        {activeOnly === false ? 'Ocultar Inativos' : 'Mostrar Inativos'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsTopToolbar;
