import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Product from '../../../../../types/product.type';
import type { ProductListFilters } from '../../types';
import { fetchProductsPage, activateProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';
import { flattenProductsForList } from '../../utils/catalog/productListTransformers';
import { toggleProductSelection } from '../../utils/selection/productSelection';
import { updateProductActivationState } from '../../utils/activation/productActivationState';
import { updateProductCatalogState } from '../../utils/catalog/productCatalogState';
import { validateErpActivationRequirements } from '../activation/useProductsActivationValidation';
import { persistProductActiveState } from '../activation/useProductsActivePersistence';
import { isTestProduct } from '@/pages/utils/hmlTestData';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import {
  resolveCatalogEntities,
  validateCatalogPublication,
  persistCatalogStatus,
} from '../actions/useProductsCatalogActions';
import {
  discardProductDraft,
  deactivateSingleProduct,
  deleteProductPermanently,
  executeBulkTrash,
  executeBulkRestore,
  executeBulkPermanentDelete,
} from '../actions/useProductsDeletionActions';

export const useProducts = (filters?: ProductListFilters) => {
  const { profile } = useAuth();
  const canDeleteProducts = canPerform(
    'deleteProducts',
    profile ? getProfileRoles(profile) : []
  );
  // ═══════════════════════════════════════════════
  // SERVER PAGINATION state (TanStack Query + Backend Supabase .range)
  // ═══════════════════════════════════════════════
  const queryClient = useQueryClient();
  const [serverProducts, setServerProducts] = useState<Product[]>([]);
  const [serverTotal, setServerTotal] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const queryFilters = useMemo(() => {
    const hasSearch = Boolean(filters?.search && filters.search.trim().length > 0);
    return {
      showTrash: filters?.showTrash,
      search: filters?.search,
      category: filters?.category,
      activeOnly: hasSearch ? undefined : filters?.activeOnly,
      status: filters?.status,
      isDraft: filters?.isDraft,
      includeDeactivated: hasSearch ? true : (filters?.includeDeactivated ?? true),
      itemType: filters?.itemType,
      excludeItemType: filters?.excludeItemType,
      sortBy: filters?.sortBy,
      sortOrder: filters?.sortOrder,
    };
  }, [
    filters?.showTrash,
    filters?.search,
    filters?.category,
    filters?.activeOnly,
    filters?.status,
    filters?.isDraft,
    filters?.includeDeactivated,
    filters?.itemType,
    filters?.excludeItemType,
    filters?.sortBy,
    filters?.sortOrder,
  ]);

  const { data: queryResult, isLoading: serverLoading } = useQuery({
    queryKey: ['products', queryFilters, currentPage, itemsPerPage],
    queryFn: () => fetchProductsPage(currentPage, itemsPerPage, queryFilters),
    staleTime: 60 * 1000, // 1 minuto de cache fresco
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (queryResult) {
      setServerProducts(queryResult.data);
      setServerTotal(queryResult.total);
    }
  }, [queryResult]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [queryClient]);

  const removeRestoredProductsFromTrash = useCallback(
    (ids: string[]) => {
      const restoredIds = new Set(ids.map(String));
      setServerProducts((previous) =>
        previous.filter((product) => !restoredIds.has(String(product.id)))
      );
      if (filters?.showTrash) {
        setServerTotal((previous) => Math.max(0, previous - restoredIds.size));
      }
    },
    [filters?.showTrash]
  );

  // Reset pagination and selection when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedProducts([]);
  }, [
    filters?.search,
    filters?.category,
    filters?.activeOnly,
    filters?.status,
    filters?.isDraft,
    filters?.includeDeactivated,
    filters?.itemType,
    filters?.excludeItemType,
    filters?.showTrash,
    filters?.showTestProducts,
  ]);

  const serverTransformed = useMemo(
    () =>
      flattenProductsForList(serverProducts)
        .map((product) => {
          if (product.isParent && product.allVariations) {
            return {
              ...product,
              allVariations: product.allVariations.filter(
                (variation) =>
                  filters?.includeMergedVariations === true || !variation.mergedToVariationId
              ),
            };
          }
          return product;
        })
        .filter((product) => {
          return (
            filters?.includeMergedVariations === true ||
            !product.isVariation ||
            !product.mergedToVariationId
          );
        })
        .filter((product) => Boolean(filters?.showTestProducts) || !isTestProduct(product)),
    [serverProducts, filters?.includeMergedVariations, filters?.showTestProducts]
  );

  const totalItems = serverTotal;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedProducts = serverTransformed;
  const hasTestProducts = useMemo(
    () => flattenProductsForList(serverProducts).some(isTestProduct),
    [serverProducts]
  );

  // ─── Ações de exclusão e ativação ───────────────────
  const handleDelete = async (id: string) => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite excluir ou desativar produtos.');
      return;
    }
    const targetProduct = serverProducts.find(
      (p) => String(p.id) === String(id) || String((p as any).realId) === String(id)
    );
    const isDraft = Boolean(targetProduct?.isDraft) || targetProduct?.status === 'draft';

    if (isDraft) {
      await discardProductDraft(id, refresh);
    } else {
      await deactivateSingleProduct(id, refresh);
    }
  };

  const handleRestore = async (id: string) => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite reativar produtos.');
      return;
    }
    try {
      await activateProduct(id);
      refresh();
      toast.success('Produto ativado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao ativar produto.');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite excluir produtos.');
      return;
    }
    await deleteProductPermanently(id, refresh);
  };

  const handleBulkTrash = async () => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite excluir ou desativar produtos.');
      return;
    }
    await executeBulkTrash(selectedProducts, refresh, setSelectedProducts, setServerLoading);
  };

  const handleBulkRestore = async () => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite reativar produtos.');
      return;
    }
    await executeBulkRestore(
      selectedProducts,
      refresh,
      removeRestoredProductsFromTrash,
      setSelectedProducts,
      setServerLoading
    );
  };

  const handleBulkPermanentDelete = async () => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite excluir produtos.');
      return;
    }
    await executeBulkPermanentDelete(
      selectedProducts,
      refresh,
      setSelectedProducts,
      setServerLoading
    );
  };

  // ─── Seleção ───────────────────
  const toggleSelection = (id: string) => {
    setSelectedProducts((previous) => toggleProductSelection(previous, id, serverTransformed));
  };

  const selectAll = () => {
    const allIdsOnPage = paginatedProducts.map((p) => p.id!).filter(Boolean);
    const allSelected = allIdsOnPage.every((id) => selectedProducts.includes(id));

    if (allSelected) {
      setSelectedProducts((prev) => prev.filter((id) => !allIdsOnPage.includes(id)));
    } else {
      const newSelections = allIdsOnPage.filter((id) => !selectedProducts.includes(id));
      setSelectedProducts((prev) => [...prev, ...newSelections]);
    }
  };

  const clearSelection = () => setSelectedProducts([]);

  // ─── Alternância de Ativo/Inativo ERP ───────────────────
  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!canDeleteProducts) {
      toast.error('Seu perfil não permite excluir ou desativar produtos.');
      return;
    }
    const newActive = !currentStatus;

    if (newActive) {
      const validation = validateErpActivationRequirements(id, serverProducts, serverProducts);
      if (!validation.isValid) {
        if (validation.errorMessage?.includes('rascunho')) {
          toast.warning(validation.errorMessage);
        } else {
          toast.error(validation.errorMessage);
        }
        return;
      }
    }

    // Atualização otimista
    setServerProducts((previous) => updateProductActivationState(previous, id, newActive));

    try {
      await persistProductActiveState(id, newActive, serverProducts, serverProducts);
      toast.success(`Produto ${newActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do produto no banco.');
      // Reverte em caso de erro
      setServerProducts((previous) => updateProductActivationState(previous, id, currentStatus));
    }
  };

  // ─── Catálogo Digital ───────────────────
  const deactivateCatalog = async (id: string) => {
    try {
      const { parentProduct, variation, isVariation } = await resolveCatalogEntities(
        id,
        serverProducts
      );
      const currentStatus = isVariation
        ? variation.status || parentProduct?.status || 'hidden'
        : parentProduct?.status || 'hidden';
      const newStatus = currentStatus === 'published' ? 'hidden' : 'published';

      if (newStatus === 'published') {
        const validation = validateCatalogPublication(parentProduct, variation, isVariation);
        if (!validation.isValid) {
          if (validation.errorMessage?.includes('rascunho')) {
            toast.warning(validation.errorMessage);
          } else {
            toast.error(validation.errorMessage);
          }
          return;
        }
      }

      // Atualização otimista
      setServerProducts((previous) => updateProductCatalogState(previous, id, newStatus));

      if (isVariation) {
        toast.success(
          `Variação ${newStatus === 'published' ? 'publicada! Adicionada ao Feed Meta CSV.' : 'ocultada! Removida do Feed Meta CSV.'}`
        );
      } else {
        toast.success(
          `Catálogo Digital: Produto ${newStatus === 'published' ? 'publicado' : 'ocultado'} com sucesso! 🚀`
        );
      }

      await persistCatalogStatus(id, newStatus, parentProduct, variation, serverProducts);
    } catch (error) {
      console.error('Erro ao alternar catálogo:', error);
      toast.error('Erro ao alterar status no Catálogo Digital.');
    }
  };

  return {
    products: serverProducts,
    paginatedProducts,
    hasTestProducts,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    setItemsPerPage,
    loading: serverLoading,
    isServerPagination: true,
    canDeleteProducts,
    handleDelete,
    handleRestore,
    handlePermanentDelete,
    selectedProducts,
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkTrash,
    handleBulkRestore,
    handleBulkPermanentDelete,
    toggleActive,
    deactivateCatalog,
    refresh,
  };
};
