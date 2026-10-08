import React from 'react';
import Product from '../../../../types/product.type';
import type { ProductFormTabKey } from '../../utils/form/productRequirementNavigation';

export type ProductFormTabId = ProductFormTabKey;

export interface ProductTabItem {
  id: ProductFormTabId;
  label: string;
  icon: string;
}

interface ProductFormTabsNavigationProps {
  readonly tabs: readonly ProductTabItem[];
  readonly formData: Partial<Product>;
  readonly activeTab: ProductFormTabId;
  readonly setActiveTab: (tab: ProductFormTabId) => void;
  readonly validationErrors: Record<string, boolean>;
}

export const ProductFormTabsNavigation: React.FC<ProductFormTabsNavigationProps> = ({
  tabs,
  formData,
  activeTab,
  setActiveTab,
  validationErrors,
}) => (
  <div className="px-6 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10 overflow-x-auto scrollbar-none">
    <div className="flex gap-6 min-w-max" role="tablist" aria-label="Abas do formulário de produto">
      {tabs.map((tab) => {
        const hasTabErrors =
          (tab.id === 'geral' && (validationErrors.name || validationErrors.categoryIds)) ||
          (tab.id === 'estoque' &&
            (validationErrors.unitPrice || validationErrors.mainSupplierId)) ||
          (tab.id === 'variacoes' && validationErrors.variationsImages);

        const hasCategory = (formData.categoryIds || []).length > 0;
        const hasProductName = String(formData.name || '').trim().length >= 2;
        const hasRequiredTechnicalValues = !validationErrors.technicalValues;
        const isTabDisabled =
          (tab.id === 'technical' && !hasCategory) ||
          (tab.id === 'description' &&
            (!hasCategory || !hasProductName || !hasRequiredTechnicalValues));

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={isTabDisabled}
            disabled={isTabDisabled}
            onClick={() => !isTabDisabled && setActiveTab(tab.id)}
            title={
              isTabDisabled
                ? 'Selecione pelo menos uma categoria em Informações Básicas para habilitar as Características'
                : undefined
            }
            className={`py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              isTabDisabled
                ? 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                : hasTabErrors
                  ? (
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-red-200 text-red-500 cursor-pointer'
                    )
                  : (
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer'
                    )
            }`}
          >
            {tab.icon && <i className={`bi ${tab.icon}`} aria-hidden="true" />}
            <span>{tab.label}</span>
            {isTabDisabled && (
              <i
                className="bi bi-lock-fill text-[10px] text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              />
            )}
            {hasTabErrors && !isTabDisabled && (
              <i
                className="bi bi-exclamation-circle-fill text-red-500 text-xs animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  </div>
);
