import React from 'react';

interface ItemsTableTabsBarProps {
  readonly activeTab: 'products' | 'services';
  readonly productsCount: number;
  readonly servicesCount: number;
  readonly onSelectTab: (tab: 'products' | 'services') => void;
  readonly onAddCurrent: () => void;
}

export const ItemsTableTabsBar: React.FC<ItemsTableTabsBarProps> = ({
  activeTab,
  productsCount,
  servicesCount,
  onSelectTab,
  onAddCurrent,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2.5 flex-wrap">
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <button
          type="button"
          onClick={() => onSelectTab('products')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'products'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <i className="bi bi-box-seam text-xs" />
          <span>Produtos</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'products'
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {productsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('services')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'services'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <i className="bi bi-tools text-xs" />
          <span>Serviços</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'services'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {servicesCount}
          </span>
        </button>
      </div>

      {/* Botão de Adicionar contextual à aba ativa */}
      <button
        type="button"
        onClick={onAddCurrent}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
          activeTab === 'services'
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
        }`}
      >
        <i className="bi bi-plus-lg text-xs" />
        <span>{activeTab === 'services' ? 'Adicionar serviço' : 'Adicionar produto'}</span>
      </button>
    </div>
  );
};
