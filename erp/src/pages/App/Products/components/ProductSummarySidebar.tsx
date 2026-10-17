import React from 'react';
import ProductFilters, { ProductFiltersData } from '../ProductFilters';

export interface ProductSummarySidebarProps {
  mode: 'standard' | 'composition';
  accordionOpen: {
    summary: boolean;
    filters: boolean;
    columns: boolean;
    shortcuts: boolean;
  };
  toggleAccordion: (key: 'summary' | 'filters' | 'columns' | 'shortcuts') => void;
  summaryChannel: 'erp' | 'catalog';
  setSummaryChannel: (channel: 'erp' | 'catalog') => void;
  catalogStats: {
    total: number;
    published: number;
    hidden: number;
    active: number;
    disabled: number;
    drafts: number;
  };
  filters: Partial<ProductFiltersData>;
  setFilters: React.Dispatch<React.SetStateAction<Partial<ProductFiltersData>>>;
  clearSearchInput: () => void;
  onFilterTotal: () => void;
  onFilterActive: () => void;
  onFilterDisabled: () => void;
  onFilterDrafts: () => void;
}

export const ProductSummarySidebar: React.FC<ProductSummarySidebarProps> = ({
  mode,
  accordionOpen,
  toggleAccordion,
  summaryChannel,
  setSummaryChannel,
  catalogStats,
  filters,
  setFilters,
  clearSearchInput,
  onFilterTotal,
  onFilterActive,
  onFilterDisabled,
  onFilterDrafts,
}) => {
  return (
    <div className="hidden xl:block w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm p-4 space-y-4">
      {/* TÓPICO 1: Resumo do Catálogo (Sanfona) */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => toggleAccordion('summary')}
          className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              <i className="bi bi-pie-chart-fill" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {mode === 'composition' ? 'Resumo das Composições' : 'Resumo dos Produtos'}
            </h4>
          </div>
          <i
            className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${
              accordionOpen.summary ? 'rotate-180' : ''
            }`}
          />
        </button>

        {accordionOpen.summary && (
          <div className="flex flex-col gap-2 mt-3 animate-fade-in">
            {mode !== 'composition' && (
              <div
                role="tablist"
                aria-label="Canal do resumo"
                className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-950 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={summaryChannel === 'erp'}
                  onClick={() => setSummaryChannel('erp')}
                  className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    summaryChannel === 'erp'
                      ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  ERP
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={summaryChannel === 'catalog'}
                  onClick={() => setSummaryChannel('catalog')}
                  className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    summaryChannel === 'catalog'
                      ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Catálogo
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onFilterTotal}
              className="w-full p-3 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <i className="bi bi-boxes text-blue-600 dark:text-blue-400 text-sm" />
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  Total de Cadastrados
                </span>
              </div>
              <span className="text-base font-black text-blue-800 dark:text-blue-300">
                {catalogStats.total}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onFilterActive}
                className={`p-3 rounded-2xl border text-left transition-colors ${
                  (summaryChannel === 'erp'
                    ? filters.activeOnly === true && !filters.isDraft
                    : filters.status === 'published')
                    ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <span className="text-[9px] font-black uppercase text-slate-400 block">
                  {summaryChannel === 'erp' ? 'Ativos' : 'Publicados'}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {summaryChannel === 'erp' ? catalogStats.active : catalogStats.published}
                </span>
              </button>
              <button
                type="button"
                onClick={onFilterDisabled}
                className={`p-3 rounded-2xl border text-left transition-colors ${
                  (summaryChannel === 'erp'
                    ? filters.activeOnly === false
                    : filters.status === 'hidden')
                    ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
                    : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <span className="text-[9px] font-black uppercase text-slate-400 block">
                  {summaryChannel === 'erp' ? 'Desativados' : 'Ocultos'}
                </span>
                <span className="text-base font-black text-rose-500 dark:text-rose-400 mt-0.5 block">
                  {summaryChannel === 'erp' ? catalogStats.disabled : catalogStats.hidden}
                </span>
              </button>
              <button
                type="button"
                onClick={onFilterDrafts}
                className={`col-span-2 p-3 rounded-2xl border flex items-center justify-between text-left transition-colors ${
                  filters.isDraft === true
                    ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <i className="bi bi-file-earmark-text text-amber-500 text-sm" />
                  <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">
                    Rascunhos (Em Cadastro)
                  </span>
                </div>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  {catalogStats.drafts}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TÓPICO 2: Filtros Avançados (Sanfona) */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => toggleAccordion('filters')}
          className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
              <i className="bi bi-funnel-fill" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Filtros
            </h4>
          </div>
          <i
            className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${
              accordionOpen.filters ? 'rotate-180' : ''
            }`}
          />
        </button>

        {accordionOpen.filters && (
          <div className="mt-3 animate-fade-in">
            <ProductFilters
              filters={filters}
              setFilters={setFilters}
              onResetSearch={clearSearchInput}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSummarySidebar;
