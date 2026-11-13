import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ProductCatalogPanel.css';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { buildProductCatalogUrl } from '../../../../shared-utils/productCatalogLinks';
import type { ProductCatalogPrepareInput } from '../../../../shared-utils/productCatalogFormSchemas';
import {
  generateCatalogPdf,
  type CatalogItem,
} from './productCatalogPresentation';
import { ProductCatalogPreview, type ProductCatalogPreviewTab } from './ProductCatalogPreview';
import { ProductCatalogCategorySidebar } from './ProductCatalogCategorySidebar';
import { ProductCatalogFilterToolbar } from './ProductCatalogFilterToolbar';
import { createProductCatalogSelectionActions } from './productCatalogSelection';
import type { CatalogPresentation } from './productCatalogPresentationMode';
import { useProductCatalogPresentationObserver } from './useProductCatalogPresentationObserver';
import { useProductCatalogForms } from './hooks/useProductCatalogForms';
import { useProductCatalogData } from './hooks/useProductCatalogData';
import { ProductCatalogHeader } from './components/ProductCatalogHeader';
import { ProductCatalogProductList } from './components/ProductCatalogProductList';
import { ProductCatalogPickerFooter } from './components/ProductCatalogPickerFooter';
import { resolveCatalogEffectiveItems } from './productCatalogResolution';

const PDF_LIMIT_WITH_IMAGES_NOTICE = 20;

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;
type PreviewTab = ProductCatalogPreviewTab;

interface ProductCatalogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectionPrepared?: (selection: ProductCatalogPrepareInput, catalogUrl: string | null) => void;
  onSendSelection?: (selection: ProductCatalogPrepareInput) => Promise<boolean>;
  canSendSelection?: boolean;
  sendDisabledReason?: string;
  isSendingSelection?: boolean;
  onPdfPrepared?: (file: File) => boolean;
  selectionActionLabel?: string;
  availableSpaceRef?: React.RefObject<HTMLElement | null>;
}

export const ProductCatalogPanel: React.FC<ProductCatalogPanelProps> = ({
  isOpen,
  onClose,
  onSelectionPrepared,
  onSendSelection,
  canSendSelection = true,
  sendDisabledReason = '',
  isSendingSelection = false,
  onPdfPrepared,
  selectionActionLabel = 'Adicionar à conversa',
  availableSpaceRef,
}) => {
  const [mounted, setMounted] = useState(false);
  const [presentation, setPresentation] = useState<CatalogPresentation>('modal');
  const [mode, setMode] = useState<'picker' | 'preview'>('picker');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('cards');
  const [selectedItems, setSelectedItems] = useState<Map<string, CatalogItem>>(() => new Map());
  const [bulkScope, setBulkScope] = useState<BulkScope | null>(null);
  const [selectionError, setSelectionError] = useState('');
  const [prepared, setPrepared] = useState<ProductCatalogPrepareInput | null>(null);
  const [hidePrices, setHidePrices] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [previewFeedback, setPreviewFeedback] = useState('');

  const catalogListRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    filters,
    filterForm,
    search,
    categoryId,
    applyFilters,
    updateCategoryFilter,
    prepareForm,
    deliveryMode,
    isSearchDebouncing,
  } = useProductCatalogForms();

  const {
    metadataQuery,
    catalogQuery,
    flattenedCategories,
    selectedCategory,
    products,
    total,
    isLoading,
    isLoadingNext,
    metadataError,
    catalogError,
    variationProductBatches,
    productDetailsQueries,
    productDetailsById,
    hasProductDetailsError,
  } = useProductCatalogData({
    isOpen,
    mode,
    filters,
    categoryId,
    catalogListRef,
    loadMoreRef,
  });

  const error = selectionError || metadataError || catalogError;

  useEffect(() => setMounted(true), []);

  useProductCatalogPresentationObserver({ isOpen, availableSpaceRef, setPresentation });

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  const currentScope = useMemo<BulkScope>(() => ({
    selectionMode: 'all_matching',
    filters,
    categoryName: selectedCategory?.name || 'Todos os produtos',
    total,
    excludedProductIds: [],
  }), [filters, selectedCategory?.name, total]);

  const {
    hasMatchingBulkScope,
    selectedCount,
    toggleBulkSelection,
    toggleProduct,
    clearSelection,
    clearBulkSelection,
    toggleProductCard,
  } = createProductCatalogSelectionActions({
    selectedItems,
    setSelectedItems,
    bulkScope,
    setBulkScope,
    currentScope,
    total,
    setSelectionError,
    setPrepared,
    clearPreparedItemsError: () => prepareForm.clearErrors('items'),
  });

  const onPrepare = prepareForm.handleSubmit((values) => {
    setPrepared(values);
    setHidePrices(values.hidePrices);
    setPreviewTab('cards');
    setPreviewFeedback('');
    setMode('preview');
  });

  const handlePrepare = () => {
    const effectiveItems = resolveCatalogEffectiveItems(
      selectedItems,
      bulkScope,
      products,
      productDetailsById,
    );
    prepareForm.setValue('items', effectiveItems);
    prepareForm.setValue('bulkScope', bulkScope);
    prepareForm.setValue('hidePrices', hidePrices);

    const effectiveCount = bulkScope
      ? Math.max(0, bulkScope.total - bulkScope.excludedProductIds.length)
      : effectiveItems.length;
    const canSendNativeCards = effectiveCount > 0 && effectiveCount <= 30 && !hidePrices;
    prepareForm.setValue('deliveryMode', canSendNativeCards ? 'native' : 'link');

    if (!onSendSelection) {
      void onPrepare();
      return;
    }

    void prepareForm.handleSubmit(async (values) => {
      setSelectionError('');
      const sent = await onSendSelection({
        ...values,
        items: effectiveItems,
        deliveryMode: canSendNativeCards ? 'native' : 'link',
      });
      if (sent) onClose();
    })().catch((sendError: unknown) => {
      setSelectionError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar os produtos ao cliente.');
    });
  };

  const activePrepared = prepared || {
    items: resolveCatalogEffectiveItems(selectedItems, bulkScope, products, productDetailsById),
    bulkScope,
    hidePrices,
  };
  const preparedSelection: ProductCatalogPrepareInput = { ...activePrepared, hidePrices, deliveryMode };
  const activeLink = buildProductCatalogUrl({
    items: preparedSelection.items.map(({ productId, variationId }) => ({ productId, ...(variationId ? { variationId } : {}) })),
    bulkScope: preparedSelection.bulkScope,
    hidePrices,
  });
  const messageItemCount = Math.max(0, (preparedSelection.bulkScope?.total || 0) - (preparedSelection.bulkScope?.excludedProductIds.length || 0)) + preparedSelection.items.length;
  const nativeProductCount = preparedSelection.items.length || (preparedSelection.bulkScope
    ? Math.max(0, preparedSelection.bulkScope.total - preparedSelection.bulkScope.excludedProductIds.length)
    : 0);
  const nativeDisabledReason = nativeProductCount > 30
    ? 'A lista nativa aceita até 30 produtos. Reduza a seleção ou use o link.'
    : hidePrices
      ? 'Os cards nativos exibem o preço publicado no catálogo da Meta. Desative “Ocultar preços” para usá-los.'
      : '';
  const canUseNativeDelivery = nativeProductCount > 0 && nativeProductCount <= 30 && !hidePrices;
  const canAddSelectionToConversation = deliveryMode === 'native'
    ? canUseNativeDelivery
    : Boolean(activeLink) || (!preparedSelection.bulkScope && preparedSelection.items.length <= 8);

  const handleCopy = async (value: string, successText: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setPreviewFeedback(successText);
    } catch {
      setPreviewFeedback('Não foi possível copiar automaticamente. Selecione e copie o conteúdo manualmente.');
    }
  };

  const handlePdf = async () => {
    if (!prepared?.items.length || prepared.bulkScope) return;
    if (prepared.items.length > PDF_LIMIT_WITH_IMAGES_NOTICE && !await requestConfirmation({
      title: 'Gerar PDF do catálogo?',
      message: `Você selecionou ${prepared.items.length} produtos. O PDF vai baixar imagens e pode levar alguns minutos. Gerar agora?`,
      confirmLabel: 'Gerar PDF',
      type: 'warning',
    })) return;
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    setPreviewFeedback('');
    try {
      const { missingImages, addedToComposer } = await generateCatalogPdf(prepared.items, hidePrices, setPdfProgress, onPdfPrepared);
      if (onPdfPrepared) {
        if (!addedToComposer) {
          setPreviewFeedback('O PDF excedeu o limite de 4 MB ou o rascunho já tem 50 anexos. Reduza a seleção e tente novamente.');
          return;
        }
        onClose();
        return;
      }
      setPreviewFeedback(missingImages
        ? `PDF pronto. ${missingImages} produto(s) ficaram sem foto porque a imagem não estava acessível.`
        : 'PDF do catálogo pronto para compartilhar.');
    } catch {
      setPreviewFeedback('Não foi possível gerar o PDF. Verifique a conexão e tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={`catalog-overlay catalog-overlay--${presentation}`} data-presentation={presentation} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal={presentation !== 'drawer'}
        aria-labelledby="support-product-catalog-title"
        className="catalog-dialog flex min-h-0 w-full flex-col overflow-hidden bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100"
      >
        <ProductCatalogHeader
          mode={mode}
          selectedCount={selectedCount}
          messageItemCount={messageItemCount}
          onBackToPicker={() => setMode('picker')}
          onClose={onClose}
        />

        {mode === 'picker' ? (
          <>
            <div className="catalog-picker-container min-h-0 flex-1">
              <div className="catalog-picker-layout">
                <ProductCatalogCategorySidebar
                  categoryId={categoryId}
                  flattenedCategories={flattenedCategories}
                  onCategoryChange={updateCategoryFilter}
                />

                <section className="catalog-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/40">
                  <ProductCatalogFilterToolbar
                    filterForm={filterForm}
                    search={search}
                    categoryId={categoryId}
                    flattenedCategories={flattenedCategories}
                    onCategoryChange={updateCategoryFilter}
                    metadataError={metadataError}
                    isMetadataLoading={metadataQuery.isLoading}
                    hasMetadataError={Boolean(metadataQuery.isError)}
                    onRetryMetadata={() => void metadataQuery.refetch()}
                    bulkScope={bulkScope}
                    hasMatchingBulkScope={hasMatchingBulkScope}
                    onClearBulkSelection={clearBulkSelection}
                  />

                  <div className="catalog-products-pane">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{isSearchDebouncing ? 'Atualizando pesquisa…' : `${total} produto${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}</span>
                        <button
                          type="button"
                          onClick={toggleBulkSelection}
                          disabled={isSearchDebouncing || (!hasMatchingBulkScope && (total === 0 || isLoading || Boolean(bulkScope)))}
                          aria-pressed={hasMatchingBulkScope}
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1 py-1 text-[11px] font-semibold transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-emerald-300 ${hasMatchingBulkScope ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                          <i className={`bi ${hasMatchingBulkScope ? 'bi-check2-square' : 'bi-check2-all'}`} aria-hidden="true" />
                          {hasMatchingBulkScope
                            ? `Desfazer seleção (${Math.max(0, (bulkScope?.total || 0) - (bulkScope?.excludedProductIds.length || 0))})`
                            : bulkScope
                              ? 'Outra seleção em lote ativa'
                              : `Selecionar ${categoryId ? 'categoria' : 'todos'} (${total})`}
                        </button>
                      </div>
                      <span className="shrink-0">Preços públicos atuais</span>
                    </div>

                    <ProductCatalogProductList
                      catalogListRef={catalogListRef}
                      error={error}
                      hasProductDetailsError={hasProductDetailsError}
                      onRetryCatalog={() => void catalogQuery.refetch()}
                      onRetryProductDetails={() => void Promise.all(productDetailsQueries.map((query) => query.refetch()))}
                      isLoading={isLoading}
                      products={products}
                      productDetailsById={productDetailsById}
                      variationProductBatches={variationProductBatches}
                      productDetailsQueries={productDetailsQueries}
                      hasMatchingBulkScope={hasMatchingBulkScope}
                      bulkScope={bulkScope}
                      selectedItems={selectedItems}
                      isSearchDebouncing={isSearchDebouncing}
                      toggleProduct={toggleProduct}
                      toggleProductCard={toggleProductCard}
                      loadMoreRef={loadMoreRef}
                      isLoadingNext={isLoadingNext}
                      hasNextPage={Boolean(catalogQuery.hasNextPage)}
                      onFetchNextPage={() => void catalogQuery.fetchNextPage({ cancelRefetch: false })}
                    />
                  </div>
                </section>
              </div>
            </div>

            <ProductCatalogPickerFooter
              selectedCount={selectedCount}
              bulkScope={bulkScope}
              onSendSelection={onSendSelection}
              canSendSelection={canSendSelection}
              sendDisabledReason={sendDisabledReason}
              isSendingSelection={isSendingSelection}
              onClear={clearSelection}
              onSubmit={handlePrepare}
              itemsError={prepareForm.formState.errors.items?.message}
            />
          </>
        ) : (
          <ProductCatalogPreview
            activeTab={previewTab}
            onActiveTabChange={setPreviewTab}
            preparedSelection={preparedSelection}
            onHidePricesChange={setHidePrices}
            onSelectionPrepared={onSelectionPrepared}
            registerDeliveryMode={() => prepareForm.register('deliveryMode')}
            canUseNativeDelivery={canUseNativeDelivery}
            nativeProductCount={nativeProductCount}
            nativeDisabledReason={nativeDisabledReason}
            canAddSelectionToConversation={canAddSelectionToConversation}
            activeLink={activeLink}
            onCopy={handleCopy}
            onGeneratePdf={handlePdf}
            isGeneratingPdf={isGeneratingPdf}
            pdfProgress={pdfProgress}
            previewFeedback={previewFeedback}
            hasPdfDestination={Boolean(onPdfPrepared)}
            selectionActionLabel={selectionActionLabel}
            onClose={onClose}
          />
        )}
      </section>
    </div>,
    document.body,
  );
};
