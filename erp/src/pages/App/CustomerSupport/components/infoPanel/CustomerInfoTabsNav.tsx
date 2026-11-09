import React from 'react';

export type PanelTab = 'customer' | 'orders' | 'budgets' | 'media';

interface CustomerInfoTabsNavProps {
  activeTab: PanelTab;
  onSelectTab: (tab: PanelTab) => void;
  ordersCount: number;
}

export const CustomerInfoTabsNav: React.FC<CustomerInfoTabsNavProps> = ({
  activeTab,
  onSelectTab,
  ordersCount,
}) => {
  return (
    <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-bold shrink-0">
      <button
        type="button"
        onClick={() => onSelectTab('customer')}
        className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
          activeTab === 'customer'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        Cliente
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('orders')}
        className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
          activeTab === 'orders'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        Pedidos
        {ordersCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] flex items-center justify-center">
            {ordersCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('budgets')}
        className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
          activeTab === 'budgets'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        Orçamentos
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('media')}
        className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
          activeTab === 'media'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        Mídias
      </button>
    </div>
  );
};
