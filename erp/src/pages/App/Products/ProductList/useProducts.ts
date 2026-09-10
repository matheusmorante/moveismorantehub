import { useState, useEffect, useMemo, useCallback } from "react";
import Product from "../../../types/product.type";
import { 
    fetchProductsPage,
    activateProduct, 
} from '@/pages/utils/productService';
import { toast } from "react-toastify";
import { flattenProductsForList } from './productListTransformers';
import { toggleProductSelection } from './productSelection';
import { updateProductActivationState } from './productActivationState';
import { updateProductCatalogState } from './productCatalogState';
import { validateErpActivationRequirements } from './useProductsActivationValidation';
import { persistProductActiveState } from './useProductsActivePersistence';
import { 
    resolveCatalogEntities, 
    validateCatalogPublication, 
    persistCatalogStatus 
} from './useProductsCatalogActions';
import { 
    discardProductDraft, 
    deactivateSingleProduct, 
    deleteProductPermanently, 
    executeBulkTrash, 
    executeBulkRestore, 
    executeBulkPermanentDelete 
} from './useProductsDeletionActions';

export const useProducts = (filters?: any) => {
    // ═══════════════════════════════════════════════
    // SERVER PAGINATION state (Backend Supabase .range)
    // ═══════════════════════════════════════════════
    const [serverProducts, setServerProducts] = useState<Product[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [serverLoading, setServerLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const refresh = () => setRefreshSignal(prev => prev + 1);

    const removeRestoredProductsFromTrash = useCallback((ids: string[]) => {
        const restoredIds = new Set(ids.map(String));
        setServerProducts(previous => previous.filter(product => !restoredIds.has(String(product.id))));
        if (filters?.showTrash) {
            setServerTotal(previous => Math.max(0, previous - restoredIds.size));
        }
    }, [filters?.showTrash]);

    // ─── Server pagination fetch ───────────────────
    const fetchPage = useCallback(async (page: number, perPage: number) => {
        setServerLoading(true);
        try {
            const hasSearch = Boolean(filters?.search && filters.search.trim().length > 0);
            const result = await fetchProductsPage(page, perPage, {
                showTrash: filters?.showTrash,
                search: filters?.search,
                category: filters?.category,
                activeOnly: hasSearch ? undefined : filters?.activeOnly,
                status: filters?.status,
                isDraft: filters?.isDraft,
                includeDeactivated: filters?.includeDeactivated,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            });
            setServerProducts(result.data);
            setServerTotal(result.total);
        } finally {
            setServerLoading(false);
        }
    }, [filters?.showTrash, filters?.search, filters?.category, filters?.activeOnly, filters?.status, filters?.isDraft, filters?.includeDeactivated, filters?.sortBy, filters?.sortOrder]);

    // Fetch on page/perPage/filters/refresh change
    useEffect(() => {
        fetchPage(currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage, fetchPage, refreshSignal]);

    // Reset pagination and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedProducts([]);
    }, [filters?.search, filters?.category, filters?.activeOnly, filters?.status, filters?.isDraft, filters?.includeDeactivated, filters?.showTrash]);

    const serverTransformed = useMemo(() => flattenProductsForList(serverProducts).filter((product: any) => {
        return filters?.includeMergedVariations === true || !product.isVariation || !product.mergedToVariationId;
    }), [serverProducts, filters?.includeMergedVariations]);

    const totalItems = serverTotal;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const paginatedProducts = serverTransformed;

    // ─── Ações de exclusão e ativação ───────────────────
    const handleDelete = async (id: string) => {
        const targetProduct = serverProducts.find(p => String(p.id) === String(id) || String((p as any).realId) === String(id));
        const isDraft = Boolean(targetProduct?.is_draft) || targetProduct?.status === 'draft' || Boolean((targetProduct as any)?.isDraft);

        if (isDraft) {
            await discardProductDraft(id, refresh);
        } else {
            await deactivateSingleProduct(id, refresh);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await activateProduct(id);
            refresh();
            toast.success("Produto ativado com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao ativar produto.");
        }
    };

    const handlePermanentDelete = async (id: string) => {
        await deleteProductPermanently(id, refresh);
    };

    const handleBulkTrash = async () => {
        await executeBulkTrash(selectedProducts, refresh, setSelectedProducts, setServerLoading);
    };

    const handleBulkRestore = async () => {
        await executeBulkRestore(selectedProducts, refresh, removeRestoredProductsFromTrash, setSelectedProducts, setServerLoading);
    };

    const handleBulkPermanentDelete = async () => {
        await executeBulkPermanentDelete(selectedProducts, refresh, setSelectedProducts, setServerLoading);
    };

    // ─── Seleção ───────────────────
    const toggleSelection = (id: string) => {
        setSelectedProducts(previous => toggleProductSelection(previous, id, serverTransformed));
    };

    const selectAll = () => {
        const allIdsOnPage = paginatedProducts.map(p => p.id!).filter(Boolean);
        const allSelected = allIdsOnPage.every(id => selectedProducts.includes(id));

        if (allSelected) {
            setSelectedProducts(prev => prev.filter(id => !allIdsOnPage.includes(id)));
        } else {
            const newSelections = allIdsOnPage.filter(id => !selectedProducts.includes(id));
            setSelectedProducts(prev => [...prev, ...newSelections]);
        }
    };

    const clearSelection = () => setSelectedProducts([]);

    // ─── Alternância de Ativo/Inativo ERP ───────────────────
    const toggleActive = async (id: string, currentStatus: boolean) => {
        const newActive = !currentStatus;

        if (newActive) {
            const validation = validateErpActivationRequirements(id, serverProducts, serverProducts);
            if (!validation.isValid) {
                if (validation.errorMessage?.includes("rascunho")) {
                    toast.warning(validation.errorMessage);
                } else {
                    toast.error(validation.errorMessage);
                }
                return;
            }
        }

        // Atualização otimista
        setServerProducts(previous => updateProductActivationState(previous, id, newActive));
        toast.success(`Produto ${newActive ? 'ativado' : 'desativado'} com sucesso!`);

        try {
            await persistProductActiveState(id, newActive, serverProducts, serverProducts);
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            toast.error("Erro ao alterar status do produto no banco.");
            // Reverte em caso de erro
            setServerProducts(previous => updateProductActivationState(previous, id, currentStatus));
        }
    };

    // ─── Catálogo Digital ───────────────────
    const deactivateCatalog = async (id: string) => {
        try {
            const { parentProduct, variation, isVariation } = await resolveCatalogEntities(id, serverProducts);
            const currentStatus = isVariation ? (variation.status || 'published') : (parentProduct?.status || 'published');
            const newStatus = currentStatus === 'published' ? 'hidden' : 'published';

            if (newStatus === 'published') {
                const validation = validateCatalogPublication(parentProduct, variation, isVariation);
                if (!validation.isValid) {
                    if (validation.errorMessage?.includes("rascunho")) {
                        toast.warning(validation.errorMessage);
                    } else {
                        toast.error(validation.errorMessage);
                    }
                    return;
                }
            }

            // Atualização otimista
            setServerProducts(previous => updateProductCatalogState(previous, id, newStatus));

            if (isVariation) {
                toast.success(`Variação ${newStatus === 'published' ? 'publicada! Adicionada ao Feed Meta CSV.' : 'ocultada! Removida do Feed Meta CSV.'}`);
            } else {
                toast.success(`Catálogo Digital: Produto ${newStatus === 'published' ? 'publicado' : 'ocultado'} com sucesso! 🚀`);
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
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        loading: serverLoading,
        isServerPagination: true,
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
        refresh: () => fetchPage(currentPage, itemsPerPage),
    };
};
