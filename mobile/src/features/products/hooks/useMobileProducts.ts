import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { productListFormSchema } from '../../../../../shared-utils/listingFormSchemas';
import { validateCatalogPublication } from '../../../../../shared-utils/catalogPublicationValidation';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  isProductVariationSearchTooBroadError,
  PRODUCT_LIST_SEARCH_DEBOUNCE_MS,
} from '../../../../../shared-utils/productListSearch';
import { validateProductActivationRequirements } from '../../../../../shared-utils/productActivationValidation';
import {
  DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
  resolveAppliedMobileProductSearch,
  resolveMobileProductStatusFilter,
} from '../domain/mobileProductListFilters';
import {
  createMobileProductListRequestGuard,
  resolveMobileProductListRequestPage,
} from '../domain/mobileProductListRequest';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';
import {
  fetchMobileProductTechnicalFields,
  type MobileProductTechnicalField,
} from '../services/mobileProductTechnicalService';
import {
  deleteMobileProduct,
  moveMobileProductToTrash,
  restoreMobileProductFromTrash,
  saveMobileProduct,
  toggleMobileProductActive,
  toggleMobileProductCatalog,
} from '../services/mobileProductMutationService';

const ITEMS_PER_PAGE = 15;

export function useMobileProducts(
  mode: 'standard' | 'composition' = 'standard',
  enabled = true,
  canViewCompositions = false
) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.searchTerm);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'draft'>(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.statusFilter
  );
  const [showDeactivated, setShowDeactivated] = useState(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.showDeactivated
  );
  const [showTrash, setShowTrashState] = useState(false);
  const [showMergedProducts, setShowMergedProducts] = useState(false);
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
  const [totalItems, setTotalItems] = useState(0);
  const loadRequestGuardRef = useRef(createMobileProductListRequestGuard());
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
  });
  const previousRequestFiltersKeyRef = useRef(requestFiltersKey);
  const requestPage = resolveMobileProductListRequestPage(
    currentPage,
    requestFiltersKey,
    previousRequestFiltersKeyRef.current,
  );
  const { validateValues: validateList } = useZodForm(productListFormSchema, { page: currentPage, search: appliedSearchTerm, statusFilter, category: categoryFilter, catalogStatus: catalogStatusFilter, itemType: mode, generalType: generalTypeFilter, includeDeactivated: showDeactivated, showTrash });
  useEffect(() => {
    const trimmedSearch = searchTerm.trim();
    const nextSearch = resolveAppliedMobileProductSearch(searchTerm);
    if (nextSearch === appliedSearchTerm) return;

    if (trimmedSearch.length > 0) {
      const timeout = setTimeout(
        () => setAppliedSearchTerm(nextSearch),
        PRODUCT_LIST_SEARCH_DEBOUNCE_MS
      );
      return () => clearTimeout(timeout);
    }

    setAppliedSearchTerm(nextSearch);
  }, [searchTerm, appliedSearchTerm]);

  const loadProducts = useCallback(
    async (pull = false, page = 1) => {
      const requestId = loadRequestGuardRef.current.begin();
      if (!enabled) {
        setProducts([]);
        setTotalItems(0);
        setLoadError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      pull ? setRefreshing(true) : setLoading(true);
      setLoadError(null);
      try {
        const values = await validateList({ page, search: appliedSearchTerm, statusFilter, category: categoryFilter, catalogStatus: catalogStatusFilter, itemType: mode, generalType: generalTypeFilter, includeDeactivated: showDeactivated, showTrash },
          (errors) => {
            if (loadRequestGuardRef.current.isCurrent(requestId)) {
              setLoadError(Object.values(flattenFormErrors(errors))[0]);
            }
          });
        if (!loadRequestGuardRef.current.isCurrent(requestId)) return;
        if (!values) return;
        const { data, total } = await fetchMobileProductsPage(values.page, ITEMS_PER_PAGE, {
          search: values.search,
          statusFilter: resolveMobileProductStatusFilter(values.statusFilter, values.search),
          // O ERP suspende o filtro de ativo durante uma busca para permitir
          // localizar também itens desativados pelo nome/código/SKU.
          includeDeactivated:
            values.includeDeactivated || values.statusFilter === 'disabled' || Boolean(values.search),
          // Itens mesclados ficam ocultos por padrão, a menos que o usuário ative showMergedProducts
          includeMerged: showMergedProducts,
          category: values.category || undefined,
          catalogStatus: values.catalogStatus,
          itemType: values.itemType,
          generalType: values.itemType === 'standard' ? values.generalType : 'all',
          canViewCompositions,
          showTrash: values.showTrash,
          // A lista precisa distinguir erro de consulta de uma consulta sem resultados,
          // como no ERP, que chama fetchProductsPage com throwOnError habilitado.
          throwOnError: true,
        });
        if (!loadRequestGuardRef.current.isCurrent(requestId)) return;
        setProducts(data);
        setTotalItems(total);
      } catch (err) {
        if (!loadRequestGuardRef.current.isCurrent(requestId)) return;
        console.warn('[useMobileProducts] Erro ao carregar:', err);
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
      validateList,
    ]
  );

  useEffect(() => {
    const filtersChanged = previousRequestFiltersKeyRef.current !== requestFiltersKey;
    if (filtersChanged) {
      previousRequestFiltersKeyRef.current = requestFiltersKey;
      setCurrentPage(1);
    }

    if (enabled) {
      loadProducts(false, requestPage);
    } else {
      loadRequestGuardRef.current.invalidate();
      setProducts([]);
      setTotalItems(0);
      setLoadError(null);
      setLoading(false);
    }
    return () => {
      loadRequestGuardRef.current.invalidate();
    };
  }, [enabled, loadProducts, requestFiltersKey, requestPage]);

  const resetFilters = useCallback(() => {
    setSearchTerm(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.searchTerm);
    setAppliedSearchTerm(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.searchTerm);
    setStatusFilter(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.statusFilter);
    setShowDeactivated(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.showDeactivated);
    setCategoryFilter(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.categoryFilter);
    setCatalogStatusFilter(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.catalogStatusFilter);
    setGeneralTypeFilter(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.generalTypeFilter);
    setCurrentPage(1);
  }, []);

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
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === productId) {
            if (isVar && varId) {
              const nextVars = (p.allVariations || []).map((v: any) =>
                v.id === varId ? { ...v, status: next } : v
              );
              const parentStatus = nextVars.some((variation: any) => variation.status === 'published')
                ? 'published'
                : 'hidden';
              return { ...p, status: parentStatus, allVariations: nextVars, variations: nextVars };
            }
            const nextVars = (p.allVariations || []).map((variation: any) =>
              variation.isVirtual ? { ...variation, status: next } : variation
            );
            return {
              ...p,
              status: next,
              allVariations: nextVars,
              variations: nextVars,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.warn('Erro ao alterar catálogo:', err);
    }
  };

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    const parentProd = products.find((p) => p.id === productId);
    const variationParent = parentProd
      ? null
      : products.find((p) =>
          (p.allVariations || []).some((v: any) => String(v.id) === String(productId))
        );
    const targetProd = parentProd || variationParent;
    const targetVariation = variationParent?.allVariations?.find(
      (v: any) => String(v.id) === String(productId)
    );
    const isVariation = Boolean(targetVariation && !targetVariation.isVirtual);
    if (!currentActive && targetProd) {
      const activationProduct = {
        ...targetProd,
        id: String(targetProd.id),
        name: targetProd.name || targetProd.title || '',
        unitPrice: Number(targetProd.unitPrice ?? targetProd.unit_price ?? targetProd.price ?? 0),
        categoryIds:
          targetProd.categoryIds ||
          (Array.isArray(targetProd.product_categories)
            ? targetProd.product_categories.map((relation: any) => relation.category_id).filter(Boolean)
            : targetProd.category_id
              ? [targetProd.category_id]
              : []),
        supplierId: targetProd.supplierId || targetProd.supplier_id || '',
        mainSupplierId: targetProd.mainSupplierId || targetProd.main_supplier_id || '',
        isDraft: Boolean(targetProd.isDraft || targetProd.is_draft || targetProd.status === 'draft'),
        isCombo: Boolean(targetProd.isCombo || targetProd.is_combo),
        comboItems: targetProd.comboItems || targetProd.combo_items || [],
        variations: (targetProd.allVariations || targetProd.variations || []).map((variation: any) => ({
          ...variation,
          syncUnitPrice: variation.syncUnitPrice !== false,
          unitPrice: Number(variation.unitPrice ?? variation.price ?? variation.unit_price ?? 0),
          comboItems: variation.comboItems || variation.combo_items || [],
        })),
      };
      const validationId = isVariation && targetVariation
        ? `${targetProd.id}_${targetVariation.sku || targetVariation.id}`
        : String(targetProd.id);
      const validation = validateProductActivationRequirements(
        validationId,
        [activationProduct],
        [activationProduct]
      );
      if (!validation.isValid) {
        Alert.alert(
          validation.errorMessage?.includes('rascunho') ? 'Produto em Rascunho' : 'Produto incompleto',
          validation.errorMessage || 'Preencha os requisitos do ERP antes de ativar.'
        );
        return;
      }
    }
    try {
      const next = await toggleMobileProductActive(
        targetProd.id,
        currentActive,
        isVariation,
        targetVariation?.id
      );
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== targetProd.id) return p;
          if (targetVariation?.isVirtual) {
            const nextVars = (p.allVariations || []).map((variation: any) =>
              String(variation.id) === String(targetVariation.id)
                ? { ...variation, active: next }
                : variation
            );
            return {
              ...p,
              allVariations: nextVars,
              variations: nextVars,
              active: next,
            };
          }
          if (isVariation) {
            const nextVars = (p.allVariations || []).map((v: any) =>
              String(v.id) === String(targetVariation.id) ? { ...v, active: next } : v
            );
            return {
              ...p,
              allVariations: nextVars,
              active: nextVars.some((v: any) => v.active !== false),
            };
          }
          const nextVars = (p.allVariations || []).map((variation: any) =>
            variation.isVirtual ? { ...variation, active: next } : variation
          );
          return {
            ...p,
            active: next,
            allVariations: nextVars,
            variations: nextVars,
          };
        })
      );
    } catch (err) {
      console.warn('Erro ao alternar ativo:', err);
      Alert.alert(
        'Não foi possível alterar o status do produto',
        err instanceof Error ? err.message : 'Atualize a lista e tente novamente.'
      );
      void loadProducts(true, currentPage);
    }
  };

  const handleDelete = async (productId: string, isDraft = false) => {
    try {
      await deleteMobileProduct(productId, isDraft);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setTotalItems((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Erro ao excluir:', err);
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

  const handleMoveToTrash = async (productId: string) => {
    try {
      await moveMobileProductToTrash(productId);
      await loadProducts(true, currentPage);
    } catch (error: any) {
      Alert.alert('Não foi possível mover para a lixeira', error?.message || 'Tente novamente.');
    }
  };

  const handleRestoreFromTrash = async (productId: string) => {
    try {
      await restoreMobileProductFromTrash(productId);
      await loadProducts(true, currentPage);
    } catch (error: any) {
      Alert.alert('Não foi possível restaurar o produto', error?.message || 'Tente novamente.');
    }
  };

  const handleSave = useCallback(async (productData: any) => {
    const productId = await saveMobileProduct(productData);
    await loadProducts(false, currentPage);
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

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  return {
    products,
    loading,
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
    currentPage,
    totalItems,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    setSearchTerm,
    resetFilters,
    setStatusFilter,
    setShowDeactivated,
    setShowTrash,
    setCategoryFilter,
    setCatalogStatusFilter,
    setGeneralTypeFilter,
    setShowMergedProducts,
    onToggleMergedProducts: () => setShowMergedProducts((prev) => !prev),
    setCurrentPage,
    refresh,
    handleToggleCatalog,
    handleToggleActive,
    handleDelete,
    handleMoveToTrash,
    handleRestoreFromTrash,
    handleSave,
    handleAutoSave,
  };
}
