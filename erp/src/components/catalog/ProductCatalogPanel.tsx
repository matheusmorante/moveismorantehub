import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import './ProductCatalogPanel.css';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Category } from '@/pages/utils/categoryService';
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
  type SupportCatalogProduct,
  type SupportCatalogVariation,
} from './supportCatalogService';

const CACHE_TIME = 5 * 60 * 1000;
const SEARCH_DEBOUNCE = 350;
const CATALOG_BASE_URL = 'https://www.moveismorante.com.br';
const PDF_LIMIT_WITH_IMAGES_NOTICE = 20;

type CatalogItem = ProductCatalogPrepareInput['items'][number];
type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;
type CategoryRelation = { parent_id: string; child_id: string };
type CategoryOption = Pick<Category, 'id' | 'name' | 'slug'>;
type PreviewTab = 'cards' | 'link' | 'pdf';
type CatalogPresentation = 'fullscreen' | 'modal' | 'drawer';

interface ProductCatalogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectionPrepared?: (selection: ProductCatalogPrepareInput, catalogUrl: string | null) => void;
  onPdfPrepared?: (file: File) => boolean;
  selectionActionLabel?: string;
  availableSpaceRef?: React.RefObject<HTMLElement | null>;
}

const flattenCategories = (
  categories: CategoryOption[],
  relations: CategoryRelation[],
): Array<{ category: CategoryOption; depth: number }> => {
  const allowed = new Set(categories.map((category) => category.id));
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map<string, string[]>();
  const childIds = new Set<string>();
  for (const relation of relations) {
    if (!allowed.has(relation.child_id) || !allowed.has(relation.parent_id)) continue;
    childIds.add(relation.child_id);
    children.set(relation.parent_id, [...(children.get(relation.parent_id) || []), relation.child_id]);
  }

  const sortIds = (ids: string[]) => ids.sort((a, b) =>
    (byId.get(a)?.name || '').localeCompare(byId.get(b)?.name || '', 'pt-BR')
  );
  const result: Array<{ category: CategoryOption; depth: number }> = [];
  const visited = new Set<string>();
  const addTree = (id: string, depth: number) => {
    if (visited.has(id)) return;
    const category = byId.get(id);
    if (!category) return;
    visited.add(id);
    result.push({ category, depth });
    for (const childId of sortIds([...(children.get(id) || [])])) addTree(childId, depth + 1);
  };

  for (const category of categories) {
    if (!childIds.has(category.id)) addTree(category.id, 0);
  }
  for (const category of categories) addTree(category.id, 0);
  return result;
};

const scopeKey = (scope: Pick<BulkScope, 'filters'>) =>
  JSON.stringify([scope.filters.categoryId, scope.filters.search.trim().toLocaleLowerCase(), scope.filters.brand]);

const priceOf = (product: SupportCatalogProduct, variation?: SupportCatalogVariation) => {
  const promoPrice = Number(variation?.promoPrice ?? product.promoPrice ?? 0);
  const unitPrice = Number(variation?.price ?? product.price ?? 0);
  return promoPrice > 0 ? promoPrice : unitPrice;
};

const productImageOf = (product: SupportCatalogProduct, variation?: SupportCatalogVariation) =>
  variation?.imageUrl || product.imageUrl || '';

const makeCatalogItem = (
  product: SupportCatalogProduct,
  variation?: SupportCatalogVariation,
): CatalogItem | null => {
  if (!product.id || !product.name) return null;
  return {
    productId: product.id,
    ...(variation?.id ? { variationId: variation.id } : {}),
    name: product.title || product.name,
    ...(variation?.name ? { variationName: variation.name } : {}),
    ...(product.slug ? { slug: product.slug } : {}),
    price: priceOf(product, variation),
    ...(productImageOf(product, variation) ? { imageUrl: productImageOf(product, variation) } : {}),
  };
};

const itemKey = (item: Pick<CatalogItem, 'productId' | 'variationId'>) =>
  `${item.productId}:${item.variationId || ''}`;

const catalogItemUrl = (item: CatalogItem) => {
  if (!item.slug) {
    const params = new URLSearchParams({ i: `${item.productId}~${item.variationId || ''}` });
    return `${CATALOG_BASE_URL}/selecionados?${params.toString()}`;
  }
  const url = new URL(`/produto/${encodeURIComponent(item.slug)}`, CATALOG_BASE_URL);
  if (item.variationId) url.searchParams.set('var', item.variationId);
  return url.toString();
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const loadPdfImage = async (imageUrl: string): Promise<string | null> => {
  if (!imageUrl) return null;
  try {
    const absoluteUrl = new URL(imageUrl, CATALOG_BASE_URL).toString();
    const response = await fetch(absoluteUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, image.naturalWidth);
      canvas.height = Math.max(1, image.naturalHeight);
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
};

const generateCatalogPdf = async (
  items: CatalogItem[],
  hidePrices: boolean,
  onProgress: (progress: number) => void,
  onPdfPrepared?: (file: File) => boolean,
) => {
  const { jsPDF } = await import('jspdf');
  const images: Array<string | null> = Array.from({ length: items.length }, () => null);
  let cursor = 0;
  let completed = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      images[index] = await loadPdfImage(items[index].imageUrl || '');
      completed += 1;
      onProgress(Math.round((completed / Math.max(items.length, 1)) * 100));
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, items.length) }, () => worker()));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  items.forEach((item, index) => {
    if (index > 0 && index % 2 === 0) pdf.addPage();
    const y = 14 + (index % 2) * 137;
    const title = [item.name, item.variationName].filter(Boolean).join(' · ');
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, y, pageWidth - 28, 126, 4, 4, 'S');
    if (images[index]) pdf.addImage(images[index]!, 'JPEG', 20, y + 7, 66, 68, undefined, 'FAST');
    else {
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(20, y + 7, 66, 68, 3, 3, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Imagem indisponível', 53, y + 43, { align: 'center', maxWidth: 60 });
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(pdf.splitTextToSize(title, pageWidth - 125).slice(0, 3), 94, y + 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    const description = item.description ? plainText(item.description) : 'Consulte mais detalhes no catálogo digital.';
    pdf.text(pdf.splitTextToSize(description, pageWidth - 125).slice(0, 6), 94, y + 38);
    if (!hidePrices) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(22, 101, 52);
      pdf.text(formatPrice(item.price), 94, y + 91);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(pdf.splitTextToSize(catalogItemUrl(item), pageWidth - 125).slice(0, 2), 94, y + 105);
  });
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Móveis Morante · ${page}/${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
  const missingImages = images.filter((image) => image === null).length;
  if (onPdfPrepared) {
    const file = new File([pdf.output('blob') as Blob], 'catalogo-moveis-morante.pdf', { type: 'application/pdf' });
    return { missingImages, addedToComposer: onPdfPrepared(file) };
  }
  pdf.save('catalogo-moveis-morante.pdf');
  return { missingImages, addedToComposer: false };
};

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
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
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
  const brand = rawFilters.brand || '';
  const applyFilters = useCallback(() => {
    void filterForm.handleSubmit((values) => setFilters(values))();
  }, [filterForm.handleSubmit]);
  const updateCategoryFilter = (value: string) => {
    filterForm.setValue('categoryId', value || null, { shouldDirty: true, shouldValidate: true });
    applyFilters();
  };
  const updateBrandFilter = (value: string) => {
    filterForm.setValue('brand', value, { shouldDirty: true, shouldValidate: true });
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
      if (viewportWidth < 640) {
        setPresentation('fullscreen');
        return;
      }
      if (viewportWidth >= 1440) {
        const drawerWidth = viewportWidth >= 1920
          ? Math.min(900, Math.max(800, viewportWidth * 0.44))
          : Math.min(760, Math.max(680, viewportWidth * 0.46));
        setPresentation(contentWidth >= drawerWidth + 360 ? 'drawer' : 'modal');
        return;
      }
      setPresentation('modal');
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
  const brands = metadataQuery.data?.brands || [];
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
  const metadataError = metadataQuery.isError ? 'Não foi possível carregar categorias e filtros. Tente atualizar.' : '';
  const error = selectionError || metadataError || (catalogQuery.isError ? 'Não foi possível carregar os produtos. Tente novamente.' : '');

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

  const hasMatchingBulkScope = Boolean(
    bulkScope && scopeKey(bulkScope) === scopeKey(currentScope)
  );
  const expandedProductIsVisible = Boolean(expandedProductId && products.some((product) => product.id === expandedProductId));
  const productDetailsQuery = useQuery({
    queryKey: [
      'customer-support-catalog-product-details',
      ...supportCatalogCacheContext(),
      metadataQuery.data?.userId || 'anonymous',
      expandedProductId,
    ],
    queryFn: ({ signal }) => fetchSupportCatalogProductDetails([expandedProductId!], signal),
    enabled: isOpen && mode === 'picker' && expandedProductIsVisible && !hasMatchingBulkScope,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
  });
  const selectedCount = Math.max(0, (bulkScope?.total || 0) - (bulkScope?.excludedProductIds.length || 0)) + selectedItems.size;
  const onPrepare = prepareForm.handleSubmit((values) => {
    setPrepared(values);
    setHidePrices(values.hidePrices);
    setPreviewTab('cards');
    setPreviewFeedback('');
    setMode('preview');
  });

  const toggleBulkSelection = () => {
    if (hasMatchingBulkScope) {
      setBulkScope(null);
      setPrepared(null);
      return;
    }
    if (bulkScope) {
      setSelectionError('Remova a seleção em lote atual antes de selecionar outra lista inteira.');
      return;
    }
    if (total === 0) return;
    setBulkScope({ ...currentScope });
    setSelectionError('');
    setPrepared(null);
  };

  const toggleBulkProduct = (productId: string) => {
    if (!bulkScope || !hasMatchingBulkScope) return;
    const isExcluded = bulkScope.excludedProductIds.includes(productId);
    if (!isExcluded && bulkScope.excludedProductIds.length >= 100) {
      setSelectionError('Você pode remover até 100 produtos desta seleção em lote. Refine os filtros para remover um grupo maior.');
      return;
    }
    setBulkScope((current) => current ? {
      ...current,
      excludedProductIds: isExcluded
        ? current.excludedProductIds.filter((id) => id !== productId)
        : [...current.excludedProductIds, productId],
    } : null);
    setSelectedItems((current) => new Map(Array.from(current.entries()).filter(([, item]) => item.productId !== productId)));
    setPrepared(null);
    setSelectionError('');
  };

  const toggleProduct = (item: CatalogItem, productId = item.productId) => {
    if (hasMatchingBulkScope && bulkScope) {
      toggleBulkProduct(productId);
      return;
    }
    const key = itemKey(item);
    if (!selectedItems.has(key) && selectedItems.size >= 500) {
      setSelectionError('A seleção individual chegou ao limite de 500 itens. Selecione uma lista completa por categoria.');
      return;
    }
    setSelectedItems((previous) => {
      const next = new Map(previous);
      if (next.has(key)) next.delete(key);
      else next.set(key, item);
      return next;
    });
    setPrepared(null);
    setSelectionError('');
  };

  const clearSelection = () => {
    setSelectedItems(new Map());
    setBulkScope(null);
    setSelectionError('');
    setPrepared(null);
    prepareForm.clearErrors('items');
  };

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
  const selectedItemsPreview = Array.from(selectedItems.entries()).slice(0, 8);
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
    if (prepared.items.length > PDF_LIMIT_WITH_IMAGES_NOTICE &&
        !window.confirm(`Você selecionou ${prepared.items.length} produtos. O PDF vai baixar imagens e pode levar alguns minutos. Gerar agora?`)) return;
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
                <aside className="catalog-category-rail" aria-label="Categorias do catálogo">
                  <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Categorias</p>
                  <button type="button" aria-pressed={!categoryId} onClick={() => updateCategoryFilter('')} className={`catalog-category-option ${!categoryId ? 'is-active' : ''}`}>
                    <span>Todos</span><span>{!categoryId ? total : ''}</span>
                  </button>
                  {flattenedCategories.map(({ category, depth }) => (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={categoryId === category.id}
                      onClick={() => updateCategoryFilter(category.id)}
                      style={{ paddingLeft: `${12 + Math.min(depth, 5) * 12}px` }}
                      className={`catalog-category-option ${categoryId === category.id ? 'is-active' : ''}`}
                    >
                      <span className="truncate">{category.name}</span>
                    </button>
                  ))}
                </aside>

                <section className="catalog-results-pane" aria-label="Produtos do catálogo">
                  <div className="catalog-filter-toolbar">
                    <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
                      <i className="bi bi-search text-slate-400" aria-hidden="true" />
                      <input
                        {...filterForm.register('search')}
                        value={search}
                        maxLength={100}
                        placeholder="Pesquisar produtos..."
                        aria-label="Pesquisar produtos do catálogo"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                      {search && <button type="button" aria-label="Limpar pesquisa" onClick={() => filterForm.setValue('search', '', { shouldDirty: true, shouldValidate: true })} className="text-slate-400 hover:text-slate-700"><i className="bi bi-x-circle-fill" /></button>}
                    </label>
                    <div className="catalog-filter-selects">
                      <label className="sr-only" htmlFor="support-catalog-category">Categoria</label>
                      <select id="support-catalog-category" value={categoryId} onChange={(event) => updateCategoryFilter(event.target.value)} className="catalog-mobile-category h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                        <option value="">Todas as categorias</option>
                        {flattenedCategories.map(({ category, depth }) => (
                          <option key={category.id} value={category.id}>{`${'　'.repeat(depth)}${depth ? '↳ ' : ''}${category.name}`}</option>
                        ))}
                      </select>
                      <label className="sr-only" htmlFor="support-catalog-brand">Marca</label>
                      <select id="support-catalog-brand" value={brand} onChange={(event) => updateBrandFilter(event.target.value)} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                        <option value="">Todas as marcas</option>
                        {brands.map((brandName) => <option key={brandName} value={brandName}>{brandName}</option>)}
                      </select>
                    </div>
                    {metadataError && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{metadataError}</p>}
                    {metadataQuery.isLoading && <p className="text-xs text-slate-400">Carregando categorias e marcas…</p>}
                    {metadataQuery.isError && <button type="button" onClick={() => void metadataQuery.refetch()} className="text-left text-xs font-semibold text-amber-700 underline dark:text-amber-300">Tentar carregar filtros novamente</button>}
                    <button
                      type="button"
                      onClick={toggleBulkSelection}
                      disabled={isSearchDebouncing || (!hasMatchingBulkScope && (total === 0 || isLoading || Boolean(bulkScope)))}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${hasMatchingBulkScope ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                    >
                      <i className={`bi ${hasMatchingBulkScope ? 'bi-check-square-fill' : 'bi-check2-square'}`} aria-hidden="true" />
                      {hasMatchingBulkScope
                        ? `Lista selecionada (${Math.max(0, (bulkScope?.total || 0) - (bulkScope?.excludedProductIds.length || 0))}) · remover seleção`
                        : bulkScope
                          ? 'Remova a seleção em lote atual para escolher outra lista'
                          : `Selecionar todos desta ${categoryId ? 'categoria' : 'lista'} (${total})`}
                    </button>
                    {bulkScope && !hasMatchingBulkScope && (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        <span>Seleção em lote mantida: {Math.max(0, bulkScope.total - bulkScope.excludedProductIds.length)} produtos · {bulkScope.categoryName}. Você pode selecionar itens avulsos neste filtro.</span>
                        <button type="button" onClick={() => { setBulkScope(null); setPrepared(null); }} aria-label="Remover seleção em lote" className="shrink-0 underline">Remover</button>
                      </div>
                    )}
                  </div>

                  <div className="catalog-products-pane">
                    <div className="flex shrink-0 items-center justify-between px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{isSearchDebouncing ? 'Atualizando pesquisa…' : `${total} produto${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}</span>
                      <span>Preços públicos atuais</span>
                    </div>
                    <div ref={catalogListRef} className="catalog-product-list">
                      {error && (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                          <p>{error}</p>
                          {catalogQuery.isError && <button type="button" onClick={() => void catalogQuery.refetch()} className="mt-2 font-semibold underline">Tentar novamente</button>}
                        </div>
                      )}
                      {isLoading && Array.from({ length: 6 }, (_, index) => (
                        <div key={`catalog-skeleton-${index}`} aria-hidden="true" className="flex animate-pulse gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                          <span className="h-16 w-16 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                          <span className="flex-1 space-y-2 pt-1"><span className="block h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-800" /><span className="block h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" /><span className="block h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" /></span>
                        </div>
                      ))}
                      {products.map((product) => {
                        const supportsVariants = Boolean(product.hasVariations);
                        const isExpanded = expandedProductId === product.id;
                        const productDetails = isExpanded
                          ? productDetailsQuery.data?.find((details) => details.productId === product.id)
                          : null;
                        const publicVariations = supportsVariants
                          ? productDetails?.variations || []
                          : product.variations || [];
                        const simpleItem = supportsVariants ? null : makeCatalogItem(product, publicVariations[0]);
                        const isBulkProduct = hasMatchingBulkScope && Boolean(bulkScope)
                          && !bulkScope!.excludedProductIds.includes(product.id);
                        const selectedManualItemCount = Array.from(selectedItems.values()).filter((item) => item.productId === product.id).length;
                        const isSelected = isBulkProduct || selectedManualItemCount > 0
                          || Boolean(simpleItem && selectedItems.has(itemKey(simpleItem)));
                        const image = productImageOf(product, supportsVariants ? undefined : publicVariations[0]);
                        const toggleThisProduct = () => {
                          if (hasMatchingBulkScope && bulkScope) {
                            const isExcluded = bulkScope.excludedProductIds.includes(product.id);
                            if (isExcluded && selectedManualItemCount > 0) {
                              setSelectedItems((current) => new Map(Array.from(current.entries()).filter(([, item]) => item.productId !== product.id)));
                              setPrepared(null);
                            } else toggleBulkProduct(product.id);
                          } else if (simpleItem) toggleProduct(simpleItem, product.id);
                        };
                        return (
                          <article key={product.id} className={`catalog-product-card rounded-2xl border p-3 transition-colors ${isSelected ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                            <div className="flex gap-3">
                              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isSearchDebouncing || (!hasMatchingBulkScope && (supportsVariants || !simpleItem || (!isSelected && selectedItems.size >= 500)))}
                                  onChange={toggleThisProduct}
                                  aria-label={`${hasMatchingBulkScope ? 'Incluir ou remover' : 'Selecionar'} ${product.name || 'produto'}`}
                                  className="mt-1 h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed"
                                />
                                {image ? (
                                  <img src={image} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800" />
                                ) : (
                                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><i className="bi bi-image" aria-hidden="true" /></div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h3 className="line-clamp-2 text-sm font-semibold">{product.title || product.name}</h3>
                                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{product.category || 'Sem categoria'}{product.brand ? ` · ${product.brand}` : ''}</p>
                                  {!supportsVariants && <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(priceOf(product, publicVariations[0]))}</p>}
                                </div>
                              </label>
                              {supportsVariants && !hasMatchingBulkScope && (
                                <button type="button" aria-expanded={isExpanded} onClick={() => setExpandedProductId((current) => current === product.id ? null : product.id)} className="shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 underline dark:text-emerald-300">
                                  {isExpanded ? 'Ocultar variações' : 'Escolher variação'}
                                </button>
                              )}
                              {supportsVariants && hasMatchingBulkScope && <span className="shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Produto</span>}
                            </div>
                            {supportsVariants && hasMatchingBulkScope && <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800">Todas as variações ativas entram juntas nesta seleção.</p>}
                            {supportsVariants && isExpanded && !hasMatchingBulkScope && (
                              <div className="mt-3 grid gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                                {productDetailsQuery.isLoading && <p role="status" className="animate-pulse rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">Carregando variações…</p>}
                                {productDetailsQuery.isError && <div role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Não foi possível carregar as variações. <button type="button" onClick={() => void productDetailsQuery.refetch()} className="font-semibold underline">Tentar novamente</button></div>}
                                {publicVariations.map((variation) => {
                                  const item = makeCatalogItem(product, variation);
                                  if (!item) return null;
                                  const selected = selectedItems.has(itemKey(item));
                                  const attributes = Array.isArray(variation.attributes) ? variation.attributes : [];
                                  const variationLabel = variation.name || attributes.map((attribute: any) => String(attribute?.value || '')).filter(Boolean).join(' / ') || 'Variação';
                                  return (
                                    <label key={variation.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${selected ? 'bg-emerald-100/80 dark:bg-emerald-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                      <input type="checkbox" checked={selected} disabled={isSearchDebouncing} onChange={() => toggleProduct(item, product.id)} className="h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-50" />
                                      <span className="min-w-0 flex-1 truncate">{variationLabel}</span>
                                      <span className="font-semibold">{formatPrice(item.price)}</span>
                                    </label>
                                  );
                                })}
                                {!productDetailsQuery.isLoading && !productDetailsQuery.isError && publicVariations.length === 0 && <p className="px-2 py-2 text-xs text-slate-500">Nenhuma variação ativa disponível.</p>}
                              </div>
                            )}
                          </article>
                        );
                      })}
                      {!isLoading && products.length === 0 && !error && <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">Nenhum produto ativo disponível com esses filtros.</div>}
                      <div ref={loadMoreRef} aria-hidden="true" className="h-px w-full" />
                      {isLoadingNext && <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" /> Carregando mais produtos…</div>}
                      {catalogQuery.hasNextPage && !isLoadingNext && <button type="button" onClick={() => void catalogQuery.fetchNextPage({ cancelRefetch: false })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Carregar mais produtos</button>}
                    </div>
            </div>

                </section>

                <aside className="catalog-selection-summary" aria-label="Resumo dos produtos selecionados">
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold">Seleção</h3>
                      <p className="text-xs text-slate-500">{selectedCount} produto{selectedCount === 1 ? '' : 's'}</p>
                    </div>
                    <button type="button" onClick={clearSelection} disabled={selectedCount === 0} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">Limpar</button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                    {bulkScope && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                        <p className="text-sm font-semibold">Todos os resultados atuais</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Até {bulkScope.total} produtos · {bulkScope.categoryName}</p>
                        {(bulkScope.filters.search || bulkScope.filters.brand) && <p className="mt-1 text-[11px] text-slate-500">Filtros: {[bulkScope.filters.search && `pesquisa “${bulkScope.filters.search}”`, bulkScope.filters.brand].filter(Boolean).join(' · ')}</p>}
                        {bulkScope.excludedProductIds.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{bulkScope.excludedProductIds.length} produto(s) removido(s) da lista.</p>}
                        <p className="mt-2 text-[11px] text-slate-500">No envio, a lista será recalculada com os produtos que corresponderem aos filtros naquele momento.</p>
                        <button type="button" onClick={() => { setBulkScope(null); setPrepared(null); }} className="mt-2 text-xs font-semibold text-emerald-800 underline dark:text-emerald-200">Desfazer seleção</button>
                      </div>
                    )}
                    {selectedItemsPreview.length ? (
                      <>
                        {selectedItemsPreview.map(([key, item]) => (
                          <article key={key} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800"><i className="bi bi-image" aria-hidden="true" /></span>}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">{[item.name, item.variationName].filter(Boolean).join(' · ')}</p>
                              <p className="text-[11px] text-slate-500">{formatPrice(item.price)}</p>
                            </div>
                            <button type="button" aria-label={`Remover ${item.name} da seleção`} onClick={() => { setSelectedItems((current) => { const next = new Map(current); next.delete(key); return next; }); setPrepared(null); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><i className="bi bi-x-lg text-xs" aria-hidden="true" /></button>
                          </article>
                        ))}
                        {selectedItems.size > selectedItemsPreview.length && <p className="px-1 text-xs text-slate-500">Mais {selectedItems.size - selectedItemsPreview.length} produto{selectedItems.size - selectedItemsPreview.length === 1 ? '' : 's'} selecionado{selectedItems.size - selectedItemsPreview.length === 1 ? '' : 's'}.</p>}
                      </>
                    ) : !bulkScope ? (
                      <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">Selecione produtos para revisar aqui.</p>
                    ) : null}
                  </div>
                </aside>
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
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              {(['cards', 'link', 'pdf'] as PreviewTab[]).map((tab) => (
                <button key={tab} type="button" onClick={() => setPreviewTab(tab)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${previewTab === tab ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {tab === 'cards' ? 'Produtos' : tab === 'link' ? 'Link do catálogo' : 'PDF'}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
                <span className="font-medium">Ocultar preços na prévia e no PDF</span>
                <input type="checkbox" checked={hidePrices} onChange={(event) => setHidePrices(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
              </label>

              {previewTab === 'cards' && (
                <>
                  {onSelectionPrepared && (
                    <fieldset className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                      <legend className="px-1 text-sm font-bold">Como enviar pelo WhatsApp</legend>
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                        <input
                          type="radio"
                          value="link"
                          {...prepareForm.register('deliveryMode')}
                          className="mt-0.5 accent-emerald-600"
                        />
                        <span><strong>Link do catálogo</strong><span className="mt-0.5 block text-xs text-slate-500">Mantém a seleção completa, inclusive listas grandes.</span></span>
                      </label>
                      <label className={`flex items-start gap-2 rounded-xl p-3 text-sm ${canUseNativeDelivery ? 'cursor-pointer bg-slate-50 dark:bg-slate-900' : 'cursor-not-allowed bg-slate-100 opacity-60 dark:bg-slate-900/60'}`}>
                        <input
                          type="radio"
                          value="native"
                          disabled={!canUseNativeDelivery}
                          {...prepareForm.register('deliveryMode')}
                          className="mt-0.5 accent-emerald-600"
                        />
                        <span><strong>{nativeProductCount === 1 ? 'Card de produto nativo' : 'Lista nativa de produtos'}</strong><span className="mt-0.5 block text-xs text-slate-500">Exibe foto, nome e preço do catálogo conectado à conta do WhatsApp.</span></span>
                      </label>
                      {nativeDisabledReason && <p className="text-xs text-amber-700 dark:text-amber-300">{nativeDisabledReason}</p>}
                      <p className="text-xs text-slate-500">Os produtos precisam estar sincronizados e publicados no catálogo da Meta. O envio nativo exige a janela de atendimento aberta.</p>
                    </fieldset>
                  )}
                  {preparedSelection.bulkScope && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                      <p className="text-sm font-bold">Seleção dinâmica da lista</p>
                      <p className="mt-1 text-sm">Até {Math.max(0, preparedSelection.bulkScope.total - preparedSelection.bulkScope.excludedProductIds.length)} produtos {preparedSelection.bulkScope.filters.categoryId ? `de ${preparedSelection.bulkScope.categoryName}` : 'com os filtros escolhidos'}.</p>
                      <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">No envio, serão considerados os produtos que corresponderem a estes filtros naquele momento. O servidor revalidará os preços e a disponibilidade.</p>
                    </div>
                  )}
                  {preparedSelection.items.map((item) => (
                    <article key={itemKey(item)} className="flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-xl bg-slate-100 object-cover dark:bg-slate-800" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><i className="bi bi-image" /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{item.name}</p>
                        {item.variationName && <p className="text-xs text-slate-500">{item.variationName}</p>}
                        {!hidePrices && <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(item.price)}</p>}
                        <a href={catalogItemUrl(item)} target="_blank" rel="noreferrer" className="mt-1 inline-block truncate text-xs text-blue-700 underline dark:text-blue-300">Abrir produto no catálogo</a>
                      </div>
                    </article>
                  ))}
                  {(!preparedSelection.items.length && !preparedSelection.bulkScope) && <p className="text-sm text-slate-500">Nenhum produto nesta seleção.</p>}
                  {onSelectionPrepared && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">Os produtos serão adicionados como anexos pendentes no compositor. Nenhuma mensagem será enviada nesta etapa.</p>}
                  {onSelectionPrepared && !canAddSelectionToConversation && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Esta seleção é grande demais para gerar um link do catálogo. Divida em grupos menores ou selecione uma categoria para compartilhar a lista completa.</p>}
                </>
              )}

              {previewTab === 'link' && (
                <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><i className="bi bi-link-45deg text-2xl" aria-hidden="true" /></div>
                  <h3 className="text-base font-bold">Link da seleção no catálogo</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">O cliente poderá navegar pelos produtos selecionados. A lista de categoria é preservada no link, mesmo quando há mais itens do que os carregados na tela.</p>
                  {activeLink ? (
                    <>
                      <input readOnly value={activeLink} aria-label="Link da seleção do catálogo" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
                      <button type="button" onClick={() => void handleCopy(activeLink, 'Link do catálogo copiado.')} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Copiar link</button>
                    </>
                  ) : (
                    <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">A seleção é grande demais para um link confiável. Selecione uma categoria inteira ou divida os produtos em grupos menores.</p>
                  )}
                  {hidePrices && <p className="text-xs text-amber-700 dark:text-amber-300">O preço fica oculto nesta lista; o catálogo público pode exibir o preço atual nas páginas individuais.</p>}
                </div>
              )}

              {previewTab === 'pdf' && (
                <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><i className="bi bi-file-earmark-pdf text-2xl" aria-hidden="true" /></div>
                  <h3 className="text-base font-bold">Catálogo em PDF</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Gera páginas com foto, nome, descrição e preço público vigente dos produtos selecionados.</p>
                  {preparedSelection.bulkScope ? (
                    <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">Uma seleção de lista completa pode conter centenas de itens. Use o link do catálogo para manter o escopo completo; o PDF está disponível para itens escolhidos individualmente.</p>
                  ) : (
                    <button type="button" onClick={() => void handlePdf()} disabled={!preparedSelection.items.length || isGeneratingPdf} className="w-full rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
                      {isGeneratingPdf ? `Gerando PDF… ${pdfProgress}%` : onPdfPrepared ? 'Adicionar PDF à conversa' : 'Gerar e baixar PDF'}
                    </button>
                  )}
                  {previewFeedback && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{previewFeedback}</p>}
                </div>
              )}
              {previewFeedback && previewTab !== 'pdf' && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{previewFeedback}</p>}
            </div>
            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
              <span className="text-xs text-slate-500">A seleção só será aplicada ao confirmar abaixo.</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Fechar</button>
                {onSelectionPrepared && <button type="button" disabled={!canAddSelectionToConversation} onClick={() => { onSelectionPrepared(preparedSelection, activeLink); onClose(); }} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{selectionActionLabel}</button>}
              </div>
            </footer>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
};
