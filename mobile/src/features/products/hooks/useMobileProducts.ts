import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { productListFormSchema } from '../../../../../shared-utils/listingFormSchemas';
import { validateCatalogPublication } from '../../../../../shared-utils/catalogPublicationValidation';
import {
  canShowMobileTestProducts,
  resolveAppliedMobileProductSearch,
  resolveMobileProductStatusFilter,
} from '../domain/mobileProductListFilters';
import { getMobileEffectiveVariationPrice } from '../domain/productRegistrationRules';
import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';
import {
  deleteMobileProduct,
  saveMobileProduct,
  toggleMobileProductActive,
  toggleMobileProductCatalog,
} from '../services/mobileProductMutationService';

const ITEMS_PER_PAGE = 15;

export function useMobileProducts(
  mode: 'standard' | 'composition' = 'standard',
  enabled = true,
  isAdministrator = false
) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'draft'>('all');
  const [showDeactivated, setShowDeactivated] = useState(true);
  const [showTestProducts, setShowTestProducts] = useState(false);
  const [showMergedProducts, setShowMergedProducts] = useState(false);
  const [generalTypeFilter, setGeneralTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'published' | 'hidden'>(
    'all'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { validateValues: validateList } = useZodForm(productListFormSchema, { page: currentPage, search: appliedSearchTerm, statusFilter, category: categoryFilter, catalogStatus: catalogStatusFilter, itemType: mode, generalType: generalTypeFilter, includeDeactivated: showDeactivated });
  const showTestProductsForCurrentRole = canShowMobileTestProducts(
    isAdministrator,
    showTestProducts
  );

  useEffect(() => {
    if (!isAdministrator && showTestProducts) setShowTestProducts(false);
  }, [isAdministrator, showTestProducts]);

  useEffect(() => {
    const nextSearch = resolveAppliedMobileProductSearch(searchTerm, appliedSearchTerm);
    if (nextSearch === appliedSearchTerm) return;

    if (searchTerm.trim().length >= 3) {
      const timeout = setTimeout(() => setAppliedSearchTerm(nextSearch), 250);
      return () => clearTimeout(timeout);
    }

    setAppliedSearchTerm(nextSearch);
  }, [searchTerm, appliedSearchTerm]);

  const loadProducts = useCallback(
    async (pull = false, page = currentPage) => {
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
        const values = await validateList({ page, search: appliedSearchTerm, statusFilter, category: categoryFilter, catalogStatus: catalogStatusFilter, itemType: mode, generalType: generalTypeFilter, includeDeactivated: showDeactivated },
          (errors) => setLoadError(Object.values(flattenFormErrors(errors))[0]));
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
        });
        setProducts(data);
        setTotalItems(total);
      } catch (err) {
        console.warn('[useMobileProducts] Erro ao carregar:', err);
        setLoadError('Não foi possível carregar as informações. Tente novamente.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      currentPage,
      appliedSearchTerm,
      statusFilter,
      categoryFilter,
      catalogStatusFilter,
      generalTypeFilter,
      showDeactivated,
      showMergedProducts,
      mode,
      enabled,
      validateList,
    ]
  );

  useEffect(() => {
    if (enabled) {
      loadProducts(false, currentPage);
    } else {
      setProducts([]);
      setTotalItems(0);
      setLoadError(null);
      setLoading(false);
    }
  }, [currentPage, enabled, loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    appliedSearchTerm,
    statusFilter,
    categoryFilter,
    catalogStatusFilter,
    generalTypeFilter,
    showTestProducts,
    showDeactivated,
    showMergedProducts,
    mode,
  ]);

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
      const validation = validateCatalogPublication(targetProd, variation, isVar);
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
              return { ...p, allVariations: nextVars };
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
    if (
      targetProd &&
      (targetProd.isDraft || targetProd.is_draft || targetProd.status === 'draft')
    ) {
      Alert.alert(
        'Produto em Rascunho',
        'Termine o cadastramento deste produto para poder ativá-lo no ERP.'
      );
      return;
    }
    if (!currentActive && targetProd) {
      const productKind = targetProd.productKind || targetProd.product_kind;
      if (
        ['salvado', 'usado'].includes(productKind) ||
        ['salvado', 'usado'].includes(targetProd.condition) ||
        targetProd.is_salvado
      ) {
        Alert.alert(
          'Produto Desativado no ERP',
          'Produtos com origem diferente de Convencional permanecem desativados no ERP.'
        );
        return;
      }
      const missing: string[] = [];
      if (
        !String(targetProd.name || targetProd.description || '').trim() ||
        String(targetProd.name || targetProd.description || '').trim().length < 2
      )
        missing.push('nome');
      if (!targetProd.category && !(targetProd.categoryIds || []).length && !targetProd.category_id)
        missing.push('categoria');
      if (!targetProd.mainSupplierId && !targetProd.supplierId && !targetProd.supplier_id)
        missing.push('fornecedor');
      const variations = isVariation
        ? [targetVariation]
        : Array.isArray(targetProd.allVariations)
          ? targetProd.allVariations
          : [];
      const isComposition =
        targetProd.item_type === 'composition' ||
        targetProd.itemType === 'composition' ||
        targetProd.is_combo === true ||
        targetProd.isCombo === true;
      if (isComposition) {
        const componentCount = variations.reduce((total: number, variation: any) => {
          const items = variation.combo_items || variation.comboItems;
          return total + (Array.isArray(items) ? items.length : 0);
        }, 0);
        const fallbackItems = targetProd.combo_items || targetProd.comboItems;
        if (Math.max(componentCount, Array.isArray(fallbackItems) ? fallbackItems.length : 0) < 2)
          missing.push('pelo menos 2 componentes');
      } else if (
        variations.length > 0
          ? !variations.some(
              (variation: any) => getMobileEffectiveVariationPrice(targetProd, variation) > 0
            )
          : Number(targetProd.unitPrice ?? targetProd.unit_price ?? targetProd.price ?? 0) <= 0
      ) {
        missing.push('preço de venda');
      }
      if (missing.length > 0) {
        Alert.alert('Produto incompleto', `Preencha os requisitos do ERP: ${missing.join(', ')}.`);
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

  const handleSave = async (productData: any) => {
    await saveMobileProduct(productData);
    await loadProducts(false, currentPage);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const hasTestProducts = products.some(isTestProduct);
  const visibleProducts = showTestProductsForCurrentRole
    ? products
    : products.filter((product) => !isTestProduct(product));

  return {
    products: visibleProducts,
    loading,
    loadError,
    refreshing,
    searchTerm,
    statusFilter,
    showDeactivated,
    categoryFilter,
    catalogStatusFilter,
    generalTypeFilter,
    showTestProducts: showTestProductsForCurrentRole,
    hasTestProducts,
    showMergedProducts,
    currentPage,
    totalItems,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    setSearchTerm,
    setStatusFilter,
    setShowDeactivated,
    setCategoryFilter,
    setCatalogStatusFilter,
    setGeneralTypeFilter,
    setShowTestProducts,
    setShowMergedProducts,
    onToggleMergedProducts: () => setShowMergedProducts((prev) => !prev),
    setCurrentPage,
    refresh: () => loadProducts(true),
    handleToggleCatalog,
    handleToggleActive,
    handleDelete,
    handleSave,
  };
}
