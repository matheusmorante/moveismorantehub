import React from 'react';
import Product from '../../../../types/product.type';
import { ProductFormReadinessIndicators } from './ProductFormReadinessIndicators';
import { ProductFormTabsNavigation } from './ProductFormTabsNavigation';
import type { ProductFormTabId, ProductTabItem } from './ProductFormTabsNavigation';
export type { ProductFormTabId, ProductTabItem } from './ProductFormTabsNavigation';

interface ProductFormHeaderProps {
  readonly product?: Product | null;
  readonly isDraftProduct?: boolean;
  readonly isStockistOnly?: boolean;
  readonly formData: Partial<Product>;
  readonly ecomStatus: { isLegible: boolean; checks: Record<string, boolean> };
  readonly isService: boolean;
  readonly navigateToRequirementField: (fieldKey: string) => void;
  readonly handleCloseWithAutoSave: () => void;
  readonly activeTab: ProductFormTabId;
  readonly setActiveTab: (tab: ProductFormTabId) => void;
  readonly validationErrors?: Record<string, boolean>;
}

export const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({
  product,
  isDraftProduct = false,
  isStockistOnly = false,
  formData,
  ecomStatus,
  isService,
  navigateToRequirementField,
  handleCloseWithAutoSave,
  activeTab,
  setActiveTab,
  validationErrors = {},
}) => {
  const legacyItemType = 'item_type' in formData ? formData.item_type : undefined;
  const isComposition = formData.itemType === 'composition' || legacyItemType === 'composition';

  const formTabs: readonly ProductTabItem[] = [
    { id: 'geral', label: 'Informações Básicas', icon: 'bi-info-circle' },
    ...(!isService
      ? [
          ...(!isStockistOnly
            ? [{ id: 'ecommerce' as const, label: 'Galeria', icon: 'bi-images' }]
            : []),
          { id: 'technical' as const, label: 'Características', icon: 'bi-gear' },
          ...(!isStockistOnly
            ? [{ id: 'description' as const, label: 'Descrição', icon: 'bi-file-text' }]
            : []),
          { id: 'estoque' as const, label: 'Estoque e Precificação', icon: 'bi-box-seam' },
          { id: 'variacoes' as const, label: 'Variações', icon: 'bi-grid-3x3-gap' },
        ]
      : []),
    ...(!isComposition
      ? [{ id: 'fiscal' as const, label: 'Tributário / NF', icon: 'bi-file-earmark-text' }]
      : []),
  ];

  return (
    <>
      <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0 bg-white dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4 flex-wrap">
          <h2 className="min-w-0 text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {isDraftProduct
              ? product?.id
                ? 'Continuar Cadastramento'
                : 'Cadastro de Produto'
              : product
                ? 'Editar Produto'
                : 'Cadastro de Produto'}
          </h2>

          <ProductFormReadinessIndicators
            formData={formData}
            ecomStatus={ecomStatus}
            isService={isService}
            isStockistOnly={isStockistOnly}
            navigateToRequirementField={navigateToRequirementField}
          />
        </div>
        <button
          type="button"
          onClick={handleCloseWithAutoSave}
          aria-label="Fechar formulário"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all self-end sm:self-auto cursor-pointer"
        >
          <i className="bi bi-x-lg text-lg" aria-hidden="true" />
        </button>
      </div>

      <ProductFormTabsNavigation
        tabs={formTabs}
        formData={formData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        validationErrors={validationErrors}
      />
    </>
  );
};
