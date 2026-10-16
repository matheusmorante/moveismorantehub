import React from 'react';
import type { VariationTabId } from '../../hooks/variation/variationForm.types';
import { type TabDefinition, INHERITED_DATA_TABS } from './variationModalTabs';

interface VariationModalTabsNavProps {
  readonly tabs: readonly TabDefinition[];
  readonly activeTab: VariationTabId;
  readonly isSingleExistingVariation: boolean;
  readonly disabled: boolean;
  readonly onSelectTab: (tabId: VariationTabId) => void;
}

export const VariationModalTabsNav: React.FC<VariationModalTabsNavProps> = ({
  tabs,
  activeTab,
  isSingleExistingVariation,
  disabled,
  onSelectTab,
}) => {
  return (
    <div
      className="px-4 sm:px-6 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 z-10 overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: 'none' }}
    >
      <div
        className="flex items-center gap-4 sm:gap-6 min-w-max"
        role="tablist"
        aria-label="Abas da variação"
      >
        {tabs.map((tab) => {
          const isInheritedDataTab =
            isSingleExistingVariation && INHERITED_DATA_TABS.includes(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onSelectTab(tab.id)}
              disabled={disabled}
              className={`py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border-b-2 transition-all shrink-0 whitespace-nowrap ${
                isInheritedDataTab ? 'opacity-50' : ''
              } ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 cursor-pointer'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer'
              }`}
            >
              <i className={`bi ${tab.icon}`} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
