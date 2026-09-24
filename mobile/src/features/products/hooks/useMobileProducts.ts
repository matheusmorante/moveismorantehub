import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';
import {
  toggleMobileProductCatalog,
  toggleMobileProductActive,
  deleteMobileProduct,
  saveMobileProduct,
} from '../services/mobileProductMutationService';

const ITEMS_PER_PAGE = 15;

export function useMobileProducts(mode: 'standard' | 'composition' = 'standard') {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'draft'>('all');
  const [showDeactivated, setShowDeactivated] = useState(false);
  // O ERP exibe variações fundidas na lista para preservar o histórico;
  // elas permanecem somente leitura e sem ações operacionais.
  const [showMerged, setShowMerged] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadProducts = useCallback(async (pull = false, page = currentPage) => {
    pull ? setRefreshing(true) : setLoading(true);
    setLoadError(null);
    try {
      const { data, total } = await fetchMobileProductsPage(page, ITEMS_PER_PAGE, {
        search: searchTerm,
        statusFilter,
        // O ERP suspende o filtro de ativo durante uma busca para permitir
        // localizar também itens desativados pelo nome/código/SKU.
        includeDeactivated: showDeactivated || statusFilter === 'disabled' || Boolean(searchTerm.trim()),
        includeMerged: showMerged,
        category: categoryFilter || undefined,
        catalogStatus: catalogStatusFilter,
        itemType: mode,
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
  }, [currentPage, searchTerm, statusFilter, categoryFilter, catalogStatusFilter, showDeactivated, showMerged, mode]);

  useEffect(() => {
    loadProducts(false, currentPage);
  }, [currentPage, loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, catalogStatusFilter, showDeactivated, showMerged, mode]);

  const handleToggleCatalog = async (productId: string, currentStatus: string, isVar = false, varId?: string) => {
    const targetProd = products.find(p => p.id === productId);
    if (targetProd && (targetProd.isDraft || targetProd.is_draft || targetProd.status === 'draft')) {
      Alert.alert('Produto em Rascunho', 'Termine o cadastramento deste produto para poder publicá-lo no Catálogo.');
      return;
    }
    if (currentStatus !== 'published' && targetProd) {
      const variation = isVar ? (targetProd.allVariations || []).find((v: any) => String(v.id) === String(varId)) : null;
      const effective: any = variation ? {
        ...targetProd,
        ...variation,
        title: variation.title || variation.marketplaceTitle || targetProd.title || targetProd.marketplaceTitle || targetProd.name,
        description: variation.syncDescription !== false ? (targetProd.description || targetProd.name) : (variation.description || targetProd.description || targetProd.name),
        unitPrice: variation.syncUnitPrice !== false ? (targetProd.unitPrice ?? targetProd.unit_price ?? targetProd.price) : (variation.price ?? variation.unitPrice),
        images: variation.image_url ? String(variation.image_url).split(',').filter(Boolean) : (targetProd.images || []),
        width: variation.syncWidth !== false ? (targetProd.width) : variation.width,
        height: variation.syncHeight !== false ? (targetProd.height) : variation.height,
        depth: variation.syncDepth !== false ? (targetProd.depth) : variation.depth,
      } : targetProd;
      const errors: string[] = [];
      const hasVariations = Boolean(effective.has_variations || effective.hasVariations || (effective.allVariations || []).length);
      if (String(effective.title || effective.marketplaceTitle || '').trim().length < 2) errors.push('título do catálogo');
      if (String(effective.ecommerceDescription || effective.ecommerce_description || effective.description || '').trim().length < 2) errors.push('descrição do catálogo');
      if (!hasVariations && Number(effective.unitPrice ?? effective.unit_price ?? effective.price ?? 0) <= 0) errors.push('preço de venda');
      if (!(effective.categoryIds || []).length && !effective.category_id && !effective.category) errors.push('categoria');
      if (!(Array.isArray(effective.images) && effective.images.length > 0)) errors.push('foto');
      if (effective.itemType !== 'service' && effective.item_type !== 'service' && [effective.width, effective.height, effective.depth].some((value: any) => Number(value) <= 0 || value == null || value === '')) {
        errors.push('dimensões');
      }
      if (errors.length > 0) {
        Alert.alert('Produto não pode ser publicado', `Preencha os requisitos do ERP: ${errors.join(', ')}.`);
        return;
      }
    }
    try {
      const next = await toggleMobileProductCatalog(productId, currentStatus, isVar, varId);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          if (isVar && varId) {
            const nextVars = (p.allVariations || []).map((v: any) => v.id === varId ? { ...v, status: next } : v);
            return { ...p, allVariations: nextVars };
          }
          return { ...p, status: next };
        }
        return p;
      }));
    } catch (err) {
      console.warn('Erro ao alterar catálogo:', err);
    }
  };

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    const parentProd = products.find(p => p.id === productId);
    const variationParent = parentProd ? null : products.find(p => (p.allVariations || []).some((v: any) => String(v.id) === String(productId)));
    const targetProd = parentProd || variationParent;
    const targetVariation = variationParent?.allVariations?.find((v: any) => String(v.id) === String(productId));
    const isVariation = Boolean(targetVariation);
    if (targetProd && (targetProd.isDraft || targetProd.is_draft || targetProd.status === 'draft')) {
      Alert.alert('Produto em Rascunho', 'Termine o cadastramento deste produto para poder ativá-lo no ERP.');
      return;
    }
    if (!currentActive && targetProd) {
      const missing: string[] = [];
      if (!String(targetProd.name || targetProd.description || '').trim() || String(targetProd.name || targetProd.description || '').trim().length < 2) missing.push('nome');
      if (!targetProd.category && !(targetProd.categoryIds || []).length && !targetProd.category_id) missing.push('categoria');
      if (!targetProd.mainSupplierId && !targetProd.supplierId && !targetProd.supplier_id) missing.push('fornecedor');
      const variations = isVariation ? [targetVariation] : (Array.isArray(targetProd.allVariations) ? targetProd.allVariations : []);
      const isComposition = targetProd.item_type === 'composition' || targetProd.itemType === 'composition' || targetProd.is_combo === true || targetProd.isCombo === true;
      if (isComposition) {
        const componentCount = variations.reduce((total: number, variation: any) => {
          const items = variation.combo_items || variation.comboItems;
          return total + (Array.isArray(items) ? items.length : 0);
        }, 0);
        const fallbackItems = targetProd.combo_items || targetProd.comboItems;
        if (Math.max(componentCount, Array.isArray(fallbackItems) ? fallbackItems.length : 0) < 2) missing.push('pelo menos 2 componentes');
      } else if (variations.length === 0 && Number(targetProd.unitPrice ?? targetProd.unit_price ?? targetProd.price ?? 0) <= 0) {
        missing.push('preço de venda');
      }
      if (missing.length > 0) {
        Alert.alert('Produto incompleto', `Preencha os requisitos do ERP: ${missing.join(', ')}.`);
        return;
      }
    }
    try {
      const next = await toggleMobileProductActive(targetProd.id, currentActive, isVariation, targetVariation?.id);
      setProducts(prev => prev.map(p => {
        if (p.id !== targetProd.id) return p;
        if (isVariation) {
          const nextVars = (p.allVariations || []).map((v: any) => String(v.id) === String(targetVariation.id) ? { ...v, active: next } : v);
          return { ...p, allVariations: nextVars, active: nextVars.some((v: any) => v.active !== false) };
        }
        return { ...p, active: next };
      }));
    } catch (err) {
      console.warn('Erro ao alternar ativo:', err);
    }
  };

  const handleDelete = async (productId: string, isDraft = false) => {
    try {
      await deleteMobileProduct(productId, isDraft);
      setProducts(prev => prev.filter(p => p.id !== productId));
      setTotalItems(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Erro ao excluir:', err);
    }
  };

  const handleSave = async (productData: any) => {
    await saveMobileProduct(productData);
    await loadProducts(false, currentPage);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  return {
    products,
    loading,
    loadError,
    refreshing,
    searchTerm,
    statusFilter,
    showDeactivated,
    showMerged,
    categoryFilter,
    catalogStatusFilter,
    currentPage,
    totalItems,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    setSearchTerm,
    setStatusFilter,
    setShowDeactivated,
    setShowMerged,
    setCategoryFilter,
    setCatalogStatusFilter,
    setCurrentPage,
    refresh: () => loadProducts(true),
    handleToggleCatalog,
    handleToggleActive,
    handleDelete,
    handleSave,
  };
}
