import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { isProductDraft } from '../../../../../shared-utils/productDraftSnapshot';
import {
  productListFormSchema,
  type ProductListPageSize,
} from '../../../../../shared-utils/listingFormSchemas';
import { validateCatalogPublication } from '../../../../../shared-utils/catalogPublicationValidation';
import { getProductCatalogMutationFailureNotice } from '../../../../../shared-utils/productCatalogPermission';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  isProductVariationSearchTooBroadError,
} from '../../../../../shared-utils/productListSearch';
import {
  DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
  canShowMobileTestProducts,
  resolveMobileProductListResetState,
  resolveMobileProductStatusFilter,
} from '../domain/mobileProductListFilters';
import {
  createMobileProductListRequestGuard,
  retryMobileProductListReadOnce,
  resolveMobileProductListPageAfterResult,
  resolveMobileProductListRequestIndicators,
  resolveMobileProductListRequestPage,
  shouldClearMobileProductListSnapshot,
} from '../domain/mobileProductListRequest';
import { applyMobileProductCatalogStatusToList } from '../domain/mobileProductListCatalogStatus';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';
import {
  fetchMobileProductTechnicalFields,
  type MobileProductTechnicalField,
} from '../services/mobileProductTechnicalService';
import {
  deleteMobileProduct,
  saveMobileProduct,
  toggleMobileProductCatalog,
} from '../services/mobileProductMutationService';
import { triggerMobileProductMetaCatalogSync } from '../services/mobileProductMetaCatalogSyncService';
import { useMobileProductListSearch } from './useMobileProductListSearch';
import { useMobileProductActivationActions } from './useMobileProductActivationActions';
import { useMobileProductTrashActions } from './useMobileProductTrashActions';

const DEFAULT_ITEMS_PER_PAGE: ProductListPageSize = 15;

export function useMobileProducts(
  mode: 'standard' | 'composition' = 'standard',
  enabled = true,
  canViewCompositions = false,
  isAdministrator = false,
  profileReady = true,
) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const {
    searchTerm,
    appliedSearchTerm,
    setSearchTerm,
    submitSearchTerm,
    resetSearchTerm,
  } = useMobileProductListSearch();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'draft'>(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.statusFilter
  );
  const [showDeactivated, setShowDeactivated] = useState(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.showDeactivated
  );
  const [showTrash, setShowTrashState] = useState(false);
  const [showMergedProducts, setShowMergedProducts] = useState(false);
  const [showTestProducts, setShowTestProducts] = useState(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.showTestProducts
  );
  const canShowTestProducts = canShowMobileTestProducts(isAdministrator, showTestProducts);
  const [generalTypeFilter, setGeneralTypeFilter] = useState<'all' | 'product' | 'service'>(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.generalTypeFilter
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.categoryFilter
  );
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'published' | 'hidden'>(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.catalogStatusFilter
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage: ProductListPageSize = DEFAULT_ITEMS_PER_PAGE;
  const [totalItems, setTotalItems] = useState(0);
  const loadRequestGuardRef = useRef(createMobileProductListRequestGuard());
  const successfulSnapshotKeyRef = useRef<string | null>(null);
  const reloadCurrentProductPageRef = useRef<() => Promise<void>>(async () => undefined);
  const requestFiltersKey = JSON.stringify({
    search: appliedSearchTerm,
    statusFilter,
    category: categoryFilter,
    catalogStatus: catalogStatusFilter,
    generalType: generalTypeFilter,
    includeDeactivated: showDeactivated,
    includeMerged: showMergedProducts,
    itemType: mode,
    canViewCompositions,
    showTrash,
    showTestProducts: canShowTestProducts,
    showMergedProducts,
    itemsPerPage,
  });
  const previousRequestFiltersKeyRef = useRef(requestFiltersKey);
  const requestPage = resolveMobileProductListRequestPage(
    currentPage,
    requestFiltersKey,
    previousRequestFiltersKeyRef.current,
  );
  const { validateValues: validateList } = useZodForm(productListFormSchema, {
    page: currentPage,
    itemsPerPage,
    search: appliedSearchTerm,
    statusFilter,
    category: categoryFilter,
    catalogStatus: catalogStatusFilter,
    itemType: mode,
    generalType: generalTypeFilter,
    includeDeactivated: showDeactivated,
    showTrash,
    showTestProducts: canShowTestProducts,
    showMergedProducts,
  });
  const loadProducts = useCallback(
    async (pull = false, page = 1) => {
      const requestId = loadRequestGuardRef.current.begin();
      const requestedSnapshotKey = JSON.stringify([requestFiltersKey, page]);
      if (!enabled || !profileReady) {
        setProducts([]);
        setTotalItems(0);
        successfulSnapshotKeyRef.current = null;
        setLoadError(null);
        setLoading(enabled && !profileReady);
        setRefreshing(false);
        return;
      }
      const requestIndicators = resolveMobileProductListRequestIndicators(pull);
      if (requestIndicators.loading) setLoading(true);
      setRefreshing(requestIndicators.refreshing);
      setLoadError(null);
      try {
        const values = await validateList(
          {
            page,
            itemsPerPage,
            search: appliedSearchTerm,
            statusFilter,
            category: categoryFilter,
            catalogStatus: catalogStatusFilter,
            itemType: mode,
            generalType: generalTypeFilter,
            includeDeactivated: showDeactivated,
            showTrash,
            showTestProducts: canShowTestProducts,
            showMergedProducts,
          },
          (errors) => {
            if (loadRequestGuardRef.current.isCurrent(requestId)) {
              setLoadError(Object.values(flattenFormErrors(errors))[0]);
            }
          }
        );
        if (!loadRequestGuardRef.current.isCurrent(requestId)) return;
        if (!values) {
          if (
            shouldClearMobileProductListSnapshot(
              successfulSnapshotKeyRef.current,
              requestedSnapshotKey,
            )
          ) {
            setProducts([]);
            setTotalItems(0);
          }
          return;
        }
        const { data, total } = await retryMobileProductListReadOnce(
          () => fetchMobileProductsPage(values.page, values.itemsPerPage, {
            search: values.search,
            statusFilter: resolveMobileProductStatusFilter(values.statusFilter, values.search),
            // O ERP suspende ativo/desativado na busca e não adiciona um filtro
            // de rascunhos, exceto quando Rascunhos foi selecionado explicitamente.
            includeDeactivated:
              values.includeDeactivated || values.statusFilter === 'disabled' || Boolean(values.search),
            // Itens mesclados ficam ocultos por padrão, a menos que o usuário ative showMergedProducts
            includeMerged: values.showMergedProducts,
            category: values.category || undefined,
            catalogStatus: values.catalogStatus,
            itemType: values.itemType,
            generalType: values.itemType === 'standard' ? values.generalType : 'all',
            canViewCompositions,
            showTrash: values.showTrash,
            showTestProducts: values.showTestProducts,
            sortBy: 'updatedAt',
            // A lista precisa distinguir erro de consulta de uma consulta sem resultados,
            // como no ERP, que chama fetchProductsPage com throwOnError habilitado.
            throwOnError: true,
          }),
          () => loadRequestGuardRef.current.isCurrent(requestId),
        );
        if (!loadRequestGuardRef.current.isCurrent(requestId)) return;
        setProducts(data);
        setTotalItems(total);
        successfulSnapshotKeyRef.current = requestedSnapshotKey;
      } catch (err) {
        if (!loadRequestGuardRef.current.isCurrent(requestId)) return;
        console.warn('[useMobileProducts] Erro ao carregar:', err);
        if (
          shouldClearMobileProductListSnapshot(
            successfulSnapshotKeyRef.current,
            requestedSnapshotKey,
          )
        ) {
          setProducts([]);
          setTotalItems(0);
        }
        setLoadError(
          isProductVariationSearchTooBroadError(err)
            ? err.message
            : 'Não foi possível carregar os produtos.'
        );
      } finally {
        if (loadRequestGuardRef.current.isCurrent(requestId)) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      appliedSearchTerm,
      statusFilter,
      categoryFilter,
      catalogStatusFilter,
      generalTypeFilter,
      showDeactivated,
      showTrash,
      showMergedProducts,
      mode,
      canViewCompositions,
      enabled,
      profileReady,
      requestFiltersKey,
      canShowTestProducts,
      itemsPerPage,
      validateList,
    ]
  );

  useEffect(() => {
    reloadCurrentProductPageRef.current = () => loadProducts(true, currentPage);
  }, [currentPage, loadProducts]);

  useEffect(() => {
    const filtersChanged = previousRequestFiltersKeyRef.current !== requestFiltersKey;
    if (filtersChanged) {
      previousRequestFiltersKeyRef.current = requestFiltersKey;
      setCurrentPage(1);
    }

    if (enabled && profileReady) {
      loadProducts(false, requestPage);
    } else {
      loadRequestGuardRef.current.invalidate();
      setProducts([]);
      setTotalItems(0);
      successfulSnapshotKeyRef.current = null;
      setLoadError(null);
      setLoading(enabled && !profileReady);
      setRefreshing(false);
    }
    return () => {
      loadRequestGuardRef.current.invalidate();
    };
  }, [enabled, loadProducts, profileReady, requestFiltersKey, requestPage]);

  const resetFilters = useCallback(() => {
    const resetState = resolveMobileProductListResetState({
      showTestProducts,
      showMergedProducts,
    });
    resetSearchTerm(resetState.searchTerm);
    setStatusFilter(resetState.statusFilter);
    setShowDeactivated(resetState.showDeactivated);
    setCategoryFilter(resetState.categoryFilter);
    setCatalogStatusFilter(resetState.catalogStatusFilter);
    setGeneralTypeFilter(resetState.generalTypeFilter);
    setShowTestProducts(resetState.showTestProducts);
    setShowMergedProducts(resetState.showMergedProducts);
    setCurrentPage(resetState.currentPage);
  }, [resetSearchTerm, showMergedProducts, showTestProducts]);

  const handleToggleCatalog = async (
    productId: string,
    currentStatus: string,
    isVar = false,
    varId?: string
  ) => {
    const targetProd = products.find((p) => p.id === productId);
    const variation = isVar
      ? (targetProd?.allVariations || []).find((v: any) => String(v.id) === String(varId))
      : null;

    if (currentStatus !== 'published' && targetProd) {
      let categoryRequirements: MobileProductTechnicalField[] | null;
      try {
        categoryRequirements = await withTimeout(
          fetchMobileProductTechnicalFields({ requireCategoryLinks: true }),
          15000,
          null,
          'produto:verificar-requisitos-do-catalogo'
        );
        if (!categoryRequirements) throw new Error('Requisitos de categoria indisponíveis.');
      } catch {
        Alert.alert(
          'Verificação indisponível',
          'Não foi possível verificar as características obrigatórias da categoria. O produto não foi publicado.'
        );
        return;
      }

      const validation = validateCatalogPublication(
        targetProd,
        variation,
        isVar,
        categoryRequirements
      );
      if (!validation.isValid) {
        Alert.alert(
          validation.errorMessage?.includes('rascunho')
            ? 'Produto em Rascunho'
            : 'Produto não pode ser publicado',
          validation.errorMessage || 'Preencha os requisitos do catálogo antes de publicar.'
        );
        return;
      }
    }
    try {
      const next = await toggleMobileProductCatalog(productId, currentStatus, isVar, varId);
      // O ERP invalida a consulta ativa após persistir. Recarregue a chave/página
      // atuais para remover famílias que deixaram de satisfazer o filtro publicado
      // e para recalcular contagem e paginação antes de aplicar o fallback otimista.
      await reloadCurrentProductPageRef.current();
      setProducts((previous) =>
        applyMobileProductCatalogStatusToList(previous, productId, next, isVar, varId)
      );
    } catch (err) {
      console.warn('Erro ao alterar catálogo:', err);
      const failureNotice = getProductCatalogMutationFailureNotice(err);
      Alert.alert(failureNotice.title, failureNotice.message);
    }
  };

  const { handleToggleActive } = useMobileProductActivationActions({
    products,
    setProducts,
    currentPage,
    loadProducts,
  });

  const handleDelete = async (productId: string, isDraft = false) => {
    try {
      await deleteMobileProduct(productId, isDraft);
      const realId = String(productId).split('_')[0];
      setProducts((prev) => prev.filter((product) => String(product.id).split('_')[0] !== realId));
      setTotalItems((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Erro ao excluir:', err);
      Alert.alert(
        isDraft ? 'Não foi possível descartar o rascunho' : 'Não foi possível excluir o produto',
        err instanceof Error ? err.message : 'Atualize a lista e tente novamente.'
      );
    }
  };

  const setShowTrash = useCallback((value: boolean | ((previous: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(showTrash) : value;
    if (next === showTrash) return;
    setShowTrashState(next);
    setCurrentPage(1);
    setStatusFilter('all');
    setCatalogStatusFilter('all');
    setGeneralTypeFilter('all');
    setShowDeactivated(true);
  }, [showTrash]);

  const { handleMoveToTrash, handleRestoreFromTrash } = useMobileProductTrashActions({
    currentPage,
    loadProducts,
  });

  const handleSave = useCallback(async (productData: any) => {
    const productId = await saveMobileProduct(productData);
    if (!isProductDraft(productData)) {
      triggerMobileProductMetaCatalogSync(productId);
    }
    // Aguarda a revalidação para o editor só fechar depois que a lista refletir o
    // produto salvo. Falhas de leitura continuam tratadas separadamente do save.
    await loadProducts(true, currentPage);
    return productId;
  }, [currentPage, loadProducts]);

  const handleAutoSave = useCallback(
    (productData: any) =>
      saveMobileProduct(productData, { returnVersionAcknowledgement: true }),
    []
  );

  const refresh = useCallback(
    () => loadProducts(true, currentPage),
    [currentPage, loadProducts]
  );
  const retry = useCallback(
    () => loadProducts(false, currentPage),
    [currentPage, loadProducts]
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const hasSuccessfulCurrentPageSnapshot =
    successfulSnapshotKeyRef.current === JSON.stringify([requestFiltersKey, currentPage]);
  const pageAfterCurrentResult = resolveMobileProductListPageAfterResult(
    currentPage,
    totalPages,
    hasSuccessfulCurrentPageSnapshot,
  );

  useEffect(() => {
    if (pageAfterCurrentResult !== currentPage) setCurrentPage(pageAfterCurrentResult);
  }, [currentPage, pageAfterCurrentResult]);

  return {
    products: profileReady ? products : [],
    loading: loading || (enabled && !profileReady),
    loadError,
    refreshing,
    searchTerm,
    statusFilter,
    showDeactivated,
    showTrash,
    categoryFilter,
    catalogStatusFilter,
    generalTypeFilter,
    showMergedProducts,
    showTestProducts: canShowTestProducts,
    currentPage,
    totalItems: profileReady ? totalItems : 0,
    totalPages,
    itemsPerPage,
    setSearchTerm,
    submitSearchTerm,
    resetFilters,
    setStatusFilter,
    setShowDeactivated,
    setShowTrash,
    setCategoryFilter,
    setCatalogStatusFilter,
    setGeneralTypeFilter,
    setShowMergedProducts,
    onToggleTestProducts: () => setShowTestProducts((value) => !value),
    onToggleMergedProducts: () => setShowMergedProducts((prev) => !prev),
    setCurrentPage,
    refresh,
    retry,
    handleToggleCatalog,
    handleToggleActive,
    handleDelete,
    handleMoveToTrash,
    handleRestoreFromTrash,
    handleSave,
    handleAutoSave,
  };
}
