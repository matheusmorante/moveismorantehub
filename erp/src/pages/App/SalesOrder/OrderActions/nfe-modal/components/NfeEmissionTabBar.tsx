import React from 'react';
import type { NfeTabId } from '../types/nfeEmission.types';

export interface TabConfig {
  id: NfeTabId;
  label: string;
  icon: string;
}

export const NFE_EMISSION_TABS: readonly TabConfig[] = [
  {
    id: 'general',
    label: 'Informações Gerais',
    icon: 'bi-info-circle-fill',
  },
  {
    id: 'customer',
    label: 'Informações do Cliente',
    icon: 'bi-person-fill',
  },
  {
    id: 'items',
    label: 'Itens',
    icon: 'bi-box-seam-fill',
  },
  {
    id: 'transport',
    label: 'Transporte',
    icon: 'bi-truck',
  },
  {
    id: 'payment',
    label: 'Pagamento',
    icon: 'bi-credit-card-2-front-fill',
  },
] as const;

export interface NfeEmissionTabBarProps {
  activeTab: NfeTabId;
  onTabChange: (tabId: NfeTabId) => void;
}

export const NfeEmissionTabBar: React.FC<NfeEmissionTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Abas da emissão fiscal"
      className="flex shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 custom-scrollbar sm:gap-2 sm:px-6"
    >
      {NFE_EMISSION_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold whitespace-nowrap outline-none transition-all ${
              isActive
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-300 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i className={`bi ${tab.icon} text-sm`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default NfeEmissionTabBar;
