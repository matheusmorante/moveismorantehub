import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import './ProductCatalogPanel.css';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { flattenCategories, type CategoryOption, type CategoryRelation } from './productCatalogCategoryTree';
import { buildProductCatalogUrl } from '../../../../shared-utils/productCatalogLinks';
import {
  productCatalogFiltersSchema,
  productCatalogPrepareSchema,
  type ProductCatalogFiltersInput,
  type ProductCatalogPrepareInput,
} from '../../../../shared-utils/productCatalogFormSchemas';
import {
  fetchSupportCatalogMetadata,
  fetchSupportCatalogPage,
  fetchSupportCatalogProductDetails,
  supportCatalogCacheContext,
} from './supportCatalogService';
import {
  generateCatalogPdf,
  type CatalogItem,
} from './productCatalogPresentation';
import { ProductCatalogPreview, type ProductCatalogPreviewTab } from './ProductCatalogPreview';
import { ProductCatalogCategorySidebar } from './ProductCatalogCategorySidebar';
import { ProductCatalogFilterToolbar } from './ProductCatalogFilterToolbar';
import { createProductCatalogSelectionActions } from './productCatalogSelection';
import { getProductCatalogPresentation, type CatalogPresentation } from './productCatalogPresentationMode';
import {
  itemKey,
  makeCatalogItem,
} from './productCatalogItems';
import { ProductCatalogSingleProductCard, ProductCatalogVariationCard } from './ProductCatalogProductCards';

const CACHE_TIME = 5 * 60 * 1000;
const SEARCH_DEBOUNCE = 350;
const PDF_LIMIT_WITH_IMAGES_NOTICE = 20;

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;
type PreviewTab = ProductCatalogPreviewTab;

interface ProductCatalogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectionPrepared?: (selection: ProductCatalogPrepareInput, catalogUrl: string | null) => void;
  onPdfPrepared?: (file: File) => boolean;
  selectionActionLabel?: string;
  availableSpaceRef?: React.RefObject<HTMLElement | null>;
}

export const ProductCatalogPanel: React.FC<ProductCatalogPanelProps> = ({
  isOpen,
  onClose,
  onSelectionPrepared,
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
  const [filters, setFilters] = useState<ProductCatalogFiltersInput>({ categoryId: null, search: '', brand: '' });
  const [selectionError, setSelectionError] = useState('');
  const [prepared, setPrepared] = useState<ProductCatalogPrepareInput | null>(null);
  const [hidePrices, setHidePrices] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [previewFeedback, setPreviewFeedback] = useState('');
  const catalogListRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const filterForm = useForm<ProductCatalogFiltersInput>({
    resolver: zodResolver(productCatalogFiltersSchema),
    defaultValues: { categoryId: null, search: '', brand: '' },
  });
  const rawFilters = useWatch({ control: filterForm.control });
  const search = rawFilters.search || '';
  const categoryId = rawFilters.categoryId || '';
  const applyFilters = useCallback(() => {
    void filterForm.handleSubmit((values) => setFilters(values))();
  }, [filterForm.handleSubmit]);
  const updateCategoryFilter = (value: string) => {
    filterForm.setValue('categoryId', value || null, { shouldDirty: true, shouldValidate: true });
    applyFilters();
  };
  const prepareForm = useForm<z.input<typeof productCatalogPrepareSchema>, unknown, ProductCatalogPrepareInput>({
    resolver: zodResolver(productCatalogPrepareSchema),
    defaultValues: { items: [], bulkScope: null, hidePrices: false, deliveryMode: 'link' },
  });
  const deliveryMode = useWatch({ control: prepareForm.control, name: 'deliveryMode' }) || 'link';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;

    const availableSpace = availableSpaceRef?.current || null;
    const measurePresentation = () => {
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const contentWidth = availableSpace?.getBoundingClientRect().width || viewportWidth;
      setPresentation(getProductCatalogPresentation(viewportWidth, contentWidth));
    };

    measurePresentation();
    window.addEventListener('resize', measurePresentation);
    window.visualViewport?.addEventListener('resize', measurePresentation);
    const observer = availableSpace && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measurePresentation)
      : null;
    if (observer && availableSpace) observer.observe(availableSpace);

    return () => {
      window.removeEventListener('resize', measurePresentation);
      window.visualViewport?.removeEventListener('resize', measurePresentation);
      observer?.disconnect();
    };
  }, [availableSpaceRef, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    const timer = window.setTimeout(applyFilters, SEARCH_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [applyFilters, search]);

  const metadataQuery = useQuery({
    queryKey: ['customer-support-catalog-metadata', ...supportCatalogCacheContext()],
    queryFn: ({ signal }) => fetchSupportCatalogMetadata(signal),
    enabled: isOpen,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
  });
  const categories = (metadataQuery.data?.categories || []) as CategoryOption[];
  const relations = (metadataQuery.data?.relations || []) as CategoryRelation[];
  const flattenedCategories = useMemo(() => flattenCategories(categories, relations), [categories, relations]);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const catalogQuery = useInfiniteQuery({
    queryKey: [
      'customer-support-catalog-products',
      ...supportCatalogCacheContext(),
      metadataQuery.data?.userId || 'anonymous',
      filters.categoryId,
      filters.search,
      filters.brand,
    ],
    queryFn: ({ pageParam, signal }) => fetchSupportCatalogPage(filters, Number(pageParam), signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined,
    enabled: isOpen && mode === 'picker' && Boolean(metadataQuery.data),
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
  });
  const pages = catalogQuery.data?.pages || [];
  const products = pages.flatMap((result) => result.products);
  const total = pages[0]?.totalCount || 0;
  const isSearchDebouncing = search.trim() !== filters.search;
  const isLoading = metadataQuery.isLoading || catalogQuery.isLoading;
  const isLoadingNext = catalogQuery.isFetchingNextPage;
  const metadataError = metadataQuery.isError ? 'Não foi possível carregar as categorias. Tente atualizar.' : '';
  const error = selectionError || metadataError || (catalogQuery.isError ? 'Não foi possível carregar os produtos. Tente novamente.' : '');

  const variationProductBatches = useMemo(() => {
    return pages.flatMap((page) => {
      const productIds = page.products.filter((product) => product.hasVariations).map((product) => product.id);
      return productIds.length ? [productIds] : [];
    });
  }, [pages]);
  const productDetailsQueries = useQueries({
    queries: variationProductBatches.map((productIds) => ({
      queryKey: [
        'customer-support-catalog-product-details',
        ...supportCatalogCacheContext(),
        metadataQuery.data?.userId || 'anonymous',
        productIds,
      ],
      queryFn: ({ signal }) => fetchSupportCatalogProductDetails(productIds, signal),
      enabled: isOpen && mode === 'picker',
      staleTime: CACHE_TIME,
      gcTime: CACHE_TIME,
      retry: 1,
    })),
  });
  const productDetailsById = useMemo(
    () => new Map(productDetailsQueries.flatMap((query) => query.data || []).map((details) => [details.productId, details] as const)),
    [productDetailsQueries],
  );
  const hasProductDetailsError = productDetailsQueries.some((query) => query.isError);

  useEffect(() => {
    const root = catalogListRef.current;
    const target = loadMoreRef.current;
    if (!isOpen || mode !== 'picker' || !root || !target || !catalogQuery.hasNextPage || isLoadingNext) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void catalogQuery.fetchNextPage({ cancelRefetch: false });
    }, { root, rootMargin: '180px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isOpen, mode, catalogQuery.hasNextPage, catalogQuery.fetchNextPage, isLoadingNext]);

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
    prepareForm.setValue('items', Array.from(selectedItems.values()));
    prepareForm.setValue('bulkScope', bulkScope);
    prepareForm.setValue('hidePrices', hidePrices);
    void onPrepare();
  };

  const activePrepared = prepared || {
    items: Array.from(selectedItems.values()),
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
  const nativeProductCount = preparedSelection.items.length;
  const nativeDisabledReason = preparedSelection.bulkScope
    ? 'Seleções por categoria inteira devem ser compartilhadas por link.'
    : nativeProductCount > 30
      ? 'A lista nativa aceita até 30 produtos. Reduza a seleção ou use o link.'
      : hidePrices
        ? 'Os cards nativos exibem o preço publicado no catálogo da Meta. Desative “Ocultar preços” para usá-los.'
        : '';
  const canUseNativeDelivery = nativeProductCount > 0 && nativeProductCount <= 30 && !preparedSelection.bulkScope && !hidePrices;
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
        <header className="catalog-dialog-header flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            {mode === 'preview' && (
              <button type="button" onClick={() => setMode('picker')} className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar ao catálogo
              </button>
            )}
            <h2 id="support-product-catalog-title" className="text-lg font-bold">
              {mode === 'picker' ? 'Catálogo de produtos' : 'Prévia da seleção'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'picker'
                ? `${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}`
                : `${messageItemCount} produto${messageItemCount === 1 ? '' : 's'} na seleção`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar catálogo" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        {mode === 'picker' ? (
          <>
            <div className="catalog-picker-container min-h-0 flex-1">
              <div className="catalog-picker-layout">
                <ProductCatalogCategorySidebar
                  categoryId={categoryId}
                  flattenedCategories={flattenedCategories}
                  onCategoryChange={updateCategoryFilter}
                />
                <section className="catalog-results-pane" aria-label="Produtos do catálogo">
                  <ProductCatalogFilterToolbar
                    filterForm={filterForm}
                    search={search}
                    categoryId={categoryId}
                    flattenedCategories={flattenedCategories}
                    onCategoryChange={updateCategoryFilter}
                    metadataError={metadataError}
                    isMetadataLoading={metadataQuery.isLoading}
                    hasMetadataError={metadataQuery.isError}
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
                    <div ref={catalogListRef} className="catalog-product-list">
                      {error && (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                          <p>{error}</p>
                          {catalogQuery.isError && <button type="button" onClick={() => void catalogQuery.refetch()} className="mt-2 font-semibold underline">Tentar novamente</button>}
                        </div>
                      )}
                      {hasProductDetailsError && (
                        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                          <p>Não foi possível carregar algumas variações.</p>
                          <button type="button" onClick={() => void Promise.all(productDetailsQueries.map((query) => query.refetch()))} className="mt-2 font-semibold underline">Tentar carregar novamente</button>
                        </div>
                      )}
                      {isLoading && Array.from({ length: 6 }, (_, index) => (
                        <div key={`catalog-skeleton-${index}`} aria-hidden="true" className="flex animate-pulse gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                          <span className="h-16 w-16 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                          <span className="flex-1 space-y-2 pt-1"><span className="block h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-800" /><span className="block h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" /><span className="block h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" /></span>
                        </div>
                      ))}
                      {products.map((product) => {
                        if (product.hasVariations) {
                          const productDetails = productDetailsById.get(product.id);
                          const detailsQueryIndex = variationProductBatches.findIndex((batch) => batch.includes(product.id));
                          const detailsQuery = productDetailsQueries[detailsQueryIndex];
                          if (!productDetails || productDetails.variations.length === 0) {
                            return (
                              <div key={`variations-${product.id}`} role={detailsQuery?.isLoading ? 'status' : detailsQuery?.isError ? 'alert' : undefined} className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700">
                                {detailsQuery?.isLoading ? 'Carregando variações…' : detailsQuery?.isError ? 'Variações indisponíveis no momento.' : 'Nenhuma variação ativa disponível.'}
                              </div>
                            );
                          }

                          return (
                            <React.Fragment key={`variations-${product.id}`}>
                              {productDetails.variations.map((variation) => {
                                const item = makeCatalogItem(product, variation);
                                if (!item) return null;
                                const isBulkProduct = hasMatchingBulkScope && Boolean(bulkScope)
                                  && !bulkScope!.excludedProductIds.includes(product.id);
                                const isSelected = isBulkProduct || selectedItems.has(itemKey(item));
                                return (
                                  <ProductCatalogVariationCard
                                    key={itemKey(item)}
                                    product={product}
                                    variation={variation}
                                    item={item}
                                    isBulkProduct={isBulkProduct}
                                    isSelected={isSelected}
                                    disabled={isSearchDebouncing}
                                    onToggle={() => toggleProduct(item, product.id)}
                                  />
                                );
                              })}
                            </React.Fragment>
                          );
                        }

                        const simpleItem = makeCatalogItem(product, product.variations?.[0]);
                        const isBulkProduct = hasMatchingBulkScope && Boolean(bulkScope)
                          && !bulkScope!.excludedProductIds.includes(product.id);
                        const isSelected = isBulkProduct || Boolean(simpleItem && selectedItems.has(itemKey(simpleItem)));
                        return (
                          <ProductCatalogSingleProductCard
                            key={product.id}
                            product={product}
                            hasMatchingBulkScope={hasMatchingBulkScope}
                            isSelected={isSelected}
                            disabled={isSearchDebouncing || (!simpleItem || (!isSelected && selectedItems.size >= 500))}
                            onToggle={() => toggleProductCard(product.id, isSelected ? 1 : 0, simpleItem)}
                          />
                        );
                      })}
                      {!isLoading && products.length === 0 && !error && <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">Nenhum produto ativo disponível com esses filtros.</div>}
                      <div ref={loadMoreRef} aria-hidden="true" className="h-px w-full" />
                      {isLoadingNext && <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" /> Carregando mais produtos…</div>}
                      {catalogQuery.hasNextPage && !isLoadingNext && <button type="button" onClick={() => void catalogQuery.fetchNextPage({ cancelRefetch: false })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Carregar mais produtos</button>}
                    </div>
            </div>

                </section>

              </div>
            </div>

            <footer className="catalog-picker-footer flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="catalog-picker-footer-count min-w-0">
                <p className="text-sm font-bold">{selectedCount} produto{selectedCount === 1 ? '' : 's'} selecionado{selectedCount === 1 ? '' : 's'}</p>
                {bulkScope && <p className="truncate text-xs text-slate-500">Todos de {bulkScope.categoryName} no momento do envio</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={clearSelection} disabled={selectedCount === 0} className="catalog-footer-clear rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">Limpar</button>
                <button type="button" onClick={handlePrepare} disabled={selectedCount === 0} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Continuar com {selectedCount} produto{selectedCount === 1 ? '' : 's'}</button>
              </div>
            </footer>
            {prepareForm.formState.errors.items && <p role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-200">{prepareForm.formState.errors.items.message}</p>}
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
