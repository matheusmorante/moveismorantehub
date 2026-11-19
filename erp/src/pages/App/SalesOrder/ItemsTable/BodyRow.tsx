import React from 'react';
import { createPortal } from 'react-dom';
import { requestConfirmation } from '@/components/shared/confirmationService';
import Product, { Variation } from '../../../types/product.type';
import Item from '../../../types/items.type';
import { ValidationErrors } from '../../../utils/validations';
import { getNonStockOrigin } from '@/pages/utils/saleInventoryRules';
import { useBodyRowPricing } from './useBodyRowPricing';
import { BodyRowMobile } from './BodyRowMobile';
import { BodyRowDesktop } from './BodyRowDesktop';
import { useSettings, getSettings } from '@/pages/utils/settingsService';
import { requiresAssemblyResponsible } from '../../../../../../shared-utils/commercialOrderRules';
import { fetchSelectableDeep } from '../hooks/productSearchDeepFetch';
import { toast } from 'react-toastify';
import './BudgetItemEditor.css';

interface Props {
  item: Item;
  onChange: (idx: number, key: keyof Item, value: string | number) => void;
  onBatchChange: (idx: number, changes: Partial<Item>) => void;
  onToggleDiscountType: () => void;
  onDelete: () => void;
  idx: number;
  displayNumber?: string;
  isCompositionComponent?: boolean;
  deliveryMethod: 'delivery' | 'pickup';
  errors: ValidationErrors;
  isMobile?: boolean;
  isTablet?: boolean;
  isNarrowMobile?: boolean;
  compactDesktop?: boolean;
  onSelectProduct: (idx: number, product: Product, variation?: Variation) => void;
  isBudget?: boolean;
  useItemEditorModal?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  highlightAsTemporary?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  autoFocusDescription?: boolean;
  onAutoExpand?: () => void;
  onDescriptionBlur?: () => void;
}

const BodyRow: React.FC<Props> = ({
  item,
  onChange,
  onBatchChange,
  onToggleDiscountType,
  onDelete,
  idx,
  displayNumber,
  isCompositionComponent,
  deliveryMethod,
  errors,
  isMobile,
  isTablet,
  isNarrowMobile,
  compactDesktop,
  onSelectProduct,
  isBudget,
  useItemEditorModal: itemEditorModalEnabled = false,
  isReturn,
  hideHandling,
  highlightAsTemporary,
  isExpanded = true,
  onToggleExpand,
  autoFocusDescription = false,
  onAutoExpand,
  onDescriptionBlur,
}) => {
  const isService = item.itemType === 'service';
  const useItemEditorModal = itemEditorModalEnabled && !isCompositionComponent;
  const toggleItemDialog = useItemEditorModal ? onToggleExpand : undefined;
  const shouldShowStockOrigin = !isService && !isBudget && !isReturn;
  const nonStockOrigin = getNonStockOrigin(item);
  const shouldHideHandling = Boolean(isService || hideHandling || isBudget || isReturn);
  const isLinkedProduct = Boolean(
    !isService &&
      item.description?.trim() &&
      item.productId &&
      !item.isTemporaryProduct &&
      !nonStockOrigin
  );
  const isTemporaryProduct = Boolean(
    !isService && item.description?.trim() && (!item.productId || nonStockOrigin)
  );
  const showTemporaryProductLabel = Boolean(
    shouldShowStockOrigin &&
      !item.isComboItem &&
      item.condition === 'novo' &&
      item.description?.trim() &&
      !item.productId?.trim()
  );

  const errorKey = `item_${idx}_description`;
  const error = errors[errorKey];
  const handlingErrorKey = `item_${idx}_handlingType`;
  const handlingError = !isService && errors[handlingErrorKey];
  const assemblyResponsibleRequired =
    !shouldHideHandling &&
    !item.isComboItem &&
    requiresAssemblyResponsible(item.handlingType, deliveryMethod);
  const assemblyResponsibleError = assemblyResponsibleRequired
    ? errors[`item_${idx}_assemblyResponsible`]
    : undefined;
  const stockOriginErrorKey = `item_${idx}_stockOrigin`;
  const stockOriginError = !isService && errors[stockOriginErrorKey];
  const itemHasError = Boolean(
    error || handlingError || stockOriginError || assemblyResponsibleError
  );

  const handleStockOriginChange = (rawCondition: string) => {
    if (isLinkedProduct) return;
    const condition = rawCondition as Item['condition'];
    if (condition === 'salvado' || condition === 'usado') {
      onBatchChange(idx, {
        condition,
        productId: undefined,
        variationId: undefined,
        isTemporaryProduct: true,
      });
      return;
    }
    onBatchChange(idx, { condition: condition || '', isTemporaryProduct: item.isTemporaryProduct });
  };

  const handleHandlingChange = (handlingType: string) => {
    onBatchChange(idx, {
      handlingType,
      ...(!requiresAssemblyResponsible(handlingType, deliveryMethod)
        ? { assemblyResponsible: '' }
        : {}),
    });
  };

  const handleDelete = async () => {
    if (useItemEditorModal && !await requestConfirmation({
      title: isBudget ? 'Remover item do orçamento?' : 'Remover item da venda?',
      message: `Deseja remover “${item.description || (isService ? 'serviço sem descrição' : 'produto sem descrição')}” ${isBudget ? 'deste orçamento' : 'desta venda'}?`,
      confirmLabel: 'Remover item',
      cancelLabel: 'Manter item',
      type: 'danger',
    })) return;
    onDelete();
  };

  const settings =
    (typeof useSettings === 'function' ? useSettings() : undefined) ??
    (typeof getSettings === 'function' ? getSettings() : ({} as any));

  const pricing = useBodyRowPricing({
    item,
    idx,
    onChange,
    onBatchChange,
  });

  const compositionSelectionPending = React.useRef(false);
  const handleCatalogProductSelect = async (
    targetIndex: number,
    product: Product,
    variation?: Variation
  ) => {
    const isComposition =
      product.itemType === 'composition' ||
      Boolean((product as any).isComposition || product.isCombo || (product as any).is_combo);
    if (!isComposition) {
      onSelectProduct(targetIndex, product, variation);
      return;
    }
    if (compositionSelectionPending.current) return;

    compositionSelectionPending.current = true;
    try {
      const composition = {
        ...product,
        itemType: 'composition' as const,
      };
      const selected = await fetchSelectableDeep({
        p: composition,
        v: variation,
        key: `${product.id || product.code || 'composition'}-${variation?.id || 'base'}`,
        isComposition: true,
        shallowRow: (product as any).autocompleteSearchRow,
      });
      const components =
        (selected.variation as any)?.items ||
        (selected.product as any).items ||
        (selected.product.variations?.[0] as any)?.items;
      if (!components?.length) {
        throw new Error('A composição selecionada não possui produtos vinculados.');
      }
      onSelectProduct(targetIndex, selected.product, selected.variation);
    } catch (error) {
      const productName = product.name || product.description || 'Produto composto';
      if (error instanceof Error && error.message.includes('não possui componentes cadastrados')) {
        toast.error(
          `“${productName}” está sem componentes vinculados. Complete a composição no cadastro do produto antes de adicioná-la ao pedido.`
        );
      } else {
        console.error('[ItemsTable] Falha ao carregar produto composto:', error);
        toast.error('Não foi possível carregar os produtos componentes. Confira a composição e tente novamente.');
      }
    } finally {
      compositionSelectionPending.current = false;
    }
  };

  const sharedProps = {
    item,
    idx,
    displayNumber,
    isCompositionComponent: Boolean(isCompositionComponent || item.compositionGroup),
    deliveryMethod,
    settings,
    isBudget,
    useItemEditorModal,
    isReturn,
    isTablet,
    isNarrowMobile,
    compactDesktop,
    hideHandling,
    shouldHideHandling,
    highlightAsTemporary,
    isExpanded,
    onToggleExpand,
    autoFocusDescription,
    onAutoExpand,
    onDescriptionBlur,
    pricing,
    onChange,
    onBatchChange,
    onToggleDiscountType,
    onDelete: handleDelete,
    onSelectProduct: handleCatalogProductSelect,
    handleStockOriginChange,
    handleHandlingChange,
    isService,
    shouldShowStockOrigin,
    isLinkedProduct,
    showTemporaryProductLabel,
    itemHasError,
    error,
    handlingError,
    assemblyResponsibleRequired,
    assemblyResponsibleError,
    stockOriginError,
  };

  const renderRow = (expanded: boolean) => {
    const rowProps = { ...sharedProps, isExpanded: expanded };
    return isMobile ? <BodyRowMobile {...rowProps} /> : <BodyRowDesktop {...rowProps} />;
  };

  if (toggleItemDialog) {
    const closeEditor = () => {
      const focusedField = document.activeElement;
      if (focusedField instanceof HTMLElement) focusedField.blur();
      pricing.commitPendingField();
      requestAnimationFrame(toggleItemDialog);
    };

    return (
      <>
        {renderRow(false)}
        {isExpanded && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeEditor();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`budget-item-title-${idx}`}
              className="flex h-[100dvh] max-h-none w-full max-w-none flex-col overflow-hidden rounded-none bg-white shadow-2xl dark:bg-slate-900 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:rounded-2xl"
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !event.defaultPrevented) closeEditor();
              }}
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 id={`budget-item-title-${idx}`} className="font-bold text-slate-900 dark:text-white">
                    Editar item {displayNumber}
                  </h2>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    isService
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}>
                    {isService ? 'Serviço' : 'Produto'}
                  </span>
                </div>
                <button
                  type="button"
                  autoFocus={!autoFocusDescription}
                  aria-label="Fechar edição do item"
                  onClick={closeEditor}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </header>
              <div className="budget-item-editor min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-4 dark:bg-slate-900 sm:p-6">
                <BodyRowMobile {...sharedProps} isExpanded inItemDialog />
              </div>
            </section>
          </div>,
          document.body
        )}
      </>
    );
  }

  return renderRow(isExpanded);
};

export default BodyRow;
