import { useState, useEffect, useMemo } from "react";
import Product from "../../../types/product.type";
import { 
    subscribeToProducts, 
    moveToTrash, 
    restoreProduct, 
    permanentDeleteProduct, 
    updateProduct,
    bulkMoveToTrash,
    bulkRestoreProducts,
    bulkPermanentDeleteProducts
} from '@/pages/utils/productService';
import { toast } from "react-toastify";

export const useProducts = (filters?: any) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(300);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const refresh = () => setRefreshSignal(prev => prev + 1);

    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data);
            setLoading(false);
        }, filters?.showTrash);

        return () => unsubscribe();
    }, [refreshSignal, filters?.showTrash]);

    // Reset pagination and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedProducts([]);
    }, [filters]);

    const filteredProducts = useMemo(() => {
        const showTrash = filters?.showTrash || false;
        const isDraft = filters?.isDraft || false;

        return products
            .filter(product => {
                // Filter by Deleted or Draft status
                if (showTrash) {
                    if (!product.deleted) return false;
                } else {
                    // Always show active/draft items that are not deleted in the main list
                    if (product.deleted) return false;
                    
                    // If the user explicitly requested drafts (via isDraft filter), 
                    // we can still respect it, but the default main list now Includes them.
                    if (isDraft && !product.isDraft) return false;
                }

                if (!filters) return true;

                const searchTerm = filters.search?.toLowerCase() || "";
                if (!searchTerm) {
                    const categoryMatch = !filters.category ||
                        product.category === filters.category ||
                        (filters.category === "Serviços" && product.itemType === "service") ||
                        (filters.category === "Produtos" && product.itemType === "product");
                    const activeMatch = filters.activeOnly === undefined || product.active === filters.activeOnly;
                    return categoryMatch && activeMatch;
                }

                // BUSCA DINÂMICA: Se o produto é um pai, ele bate se ele mesmo ou qualquer filho bater
                // Se o produto é um filho (independente), ele bate se ele mesmo ou o pai bater
                const matchesSelf = (product.description || "").toLowerCase().includes(searchTerm) || 
                                   (product.code || "").toLowerCase().includes(searchTerm);
                
                let matchesChildren = false;
                if (!product.parentId) {
                    // Match no JSON de variações
                    matchesChildren = product.variations?.some((v: any) => 
                        (v.name || "").toLowerCase().includes(searchTerm) || 
                        (v.sku || "").toLowerCase().includes(searchTerm)
                    ) || false;
                    
                    // Match em variações independentes
                    if (!matchesChildren) {
                        matchesChildren = products.some(p => p.parentId === product.id && (
                            p.description.toLowerCase().includes(searchTerm) || 
                            p.code?.toLowerCase().includes(searchTerm)
                        ));
                    }
                } else {
                    // Se for filho, verifica se o pai bate
                    const parent = products.find(p => p.id === product.parentId);
                    if (parent) {
                        matchesChildren = (parent.description || "").toLowerCase().includes(searchTerm) || 
                                          (parent.code || "").toLowerCase().includes(searchTerm);
                    }
                }

                const searchMatch = matchesSelf || matchesChildren;

                const categoryMatch = !filters.category ||
                    product.category === filters.category ||
                    (filters.category === "Serviços" && product.itemType === "service") ||
                    (filters.category === "Produtos" && product.itemType === "product");

                const activeMatch = filters.activeOnly === undefined || product.active === filters.activeOnly;

                return searchMatch && categoryMatch && activeMatch;
            })
            .sort((a, b) => {
                let comparison = 0;
                const sortBy = filters?.sortBy || 'description';

                if (sortBy === "description") {
                    comparison = (a.description || "").localeCompare(b.description || "");
                } else if (sortBy === "unitPrice") {
                    comparison = (a.unitPrice || 0) - (b.unitPrice || 0);
                } else if (sortBy === "stock") {
                    comparison = (a.stock || 0) - (b.stock || 0);
                } else if (sortBy === "code") {
                    comparison = (a.code || "").localeCompare(b.code || "");
                } else if (sortBy === "createdAt") {
                    comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                } else if (sortBy === "category") {
                    comparison = (a.category || "").localeCompare(b.category || "");
                }

                const sortOrder = filters?.sortOrder || 'asc';
                return sortOrder === "asc" ? comparison : -comparison;
            });
    }, [products, filters]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const totalItems = filteredProducts.length;

    const transformedProducts = useMemo(() => {
        const flattened: any[] = [];
        const parents = filteredProducts.filter(p => !p.isVariation);
        const independentVars = filteredProducts.filter(p => p.isVariation);

        parents.forEach(product => {
            // Parent Row
            const variationsFromIndependent = independentVars.filter(v => v.parentId === product.id);
            const actuallyHasVariations = product.hasVariations || variationsFromIndependent.length > 0;
            
            // Se tem variações, o pai não exibe código/sku (vira apenas um agrupador)
            flattened.push({ 
                ...product, 
                isParent: actuallyHasVariations,
                code: actuallyHasVariations ? "" : product.code 
            });

            // 1. Child Rows from JSON field
            if (product.hasVariations && product.variations) {
                product.variations.forEach((v: any, index: number) => {
                    const child = {
                        ...product,
                        id: `${product.id}_${v.sku || index}`,
                        sku: v.sku,
                        code: v.sku, // Garantir que a coluna 'C├│digo' use o SKU da varia├º├úo
                        description: v.name,
                        unitPrice: typeof v.unitPrice !== 'undefined' ? v.unitPrice : v.unit_price,
                        costPrice: typeof v.costPrice !== 'undefined' ? v.costPrice : (typeof v.cost_price !== 'undefined' ? v.cost_price : product.costPrice),
                        stock: v.stock,
                        active: v.active,
                        images: v.images || [],
                        parentImages: product.images || [],
                        isVariation: true,
                        parentId: product.id,
                        categoryIds: product.categoryIds,
                        category: product.category,
                        unit: product.unit
                    };
                    flattened.push({
                        ...child,
                        displayName: v.name // Já costuma ser apenas os atributos no JSON
                    });
                });
            }

            // 2. Child Rows from independent items (e.g. from imports)
            variationsFromIndependent.forEach(v => {
                // Avoid double showing if SKU matches one from JSON
                // Independent products use 'code' as their SKU/Code
                const vCode = v.code || v.sku; 
                if (product.variations?.some((jv: any) => jv.sku === vCode)) return;

                flattened.push({
                    ...v,
                    sku: vCode, 
                    code: vCode,
                    isVariation: true,
                    parentId: product.id,
                    description: v.description,
                    // Para variações independentes, tentamos mostrar apenas o que não está no título do pai
                    displayName: v.description.toLowerCase().startsWith(product.description.toLowerCase()) 
                        ? v.description.substring(product.description.length).trim().replace(/^[-/]\s*/, '')
                        : v.description
                });
            });
        });

        // 3. Variations whose parent is NOT in the list (orphans)
        independentVars.forEach(v => {
            const parentInList = parents.some(p => p.id === v.parentId);
            if (!parentInList) {
                flattened.push({
                    ...v,
                    isVariation: true,
                    isOrphan: true
                });
            }
        });

        return flattened;
    }, [filteredProducts]);

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return transformedProducts.slice(start, start + itemsPerPage);
    }, [transformedProducts, currentPage, itemsPerPage]);

    const handleDelete = async (id: string) => {
        const toastId = toast.loading("Movendo para a lixeira...");
        try {
            await moveToTrash(id);
            toast.update(toastId, { render: "Produto movido para a lixeira.", type: "info", isLoading: false, autoClose: 3000 });
        } catch (error: any) {
            toast.update(toastId, { render: error.message || "Erro ao excluir produto.", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await restoreProduct(id);
            toast.success("Produto restaurado com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao restaurar produto.");
        }
    };

    const handlePermanentDelete = async (id: string) => {
        if (window.confirm("Certeza que deseja excluir DEFINITIVAMENTE este produto?")) {
            const toastId = toast.loading("Excluindo permanentemente...");
            try {
                await permanentDeleteProduct(id);
                toast.update(toastId, { render: "Produto excluído permanentemente.", type: "success", isLoading: false, autoClose: 3000 });
            } catch (error: any) {
                toast.update(toastId, { render: error.message || "Erro na exclusão definitiva.", type: "error", isLoading: false, autoClose: 3000 });
            }
        }
    };

    const handleBulkTrash = async () => {
        if (selectedProducts.length === 0) return;
        const toastId = toast.loading("Movendo itens selecionados para a lixeira...");
        setLoading(true);
        try {
            const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
            const result = await bulkMoveToTrash(realIds);
            
            if (result.successCount > 0) {
                toast.update(toastId, { 
                    render: `${result.successCount} produto(s) movido(s) para a lixeira.`, 
                    type: "info", 
                    isLoading: false, 
                    autoClose: 3000 
                });
            } else {
                toast.dismiss(toastId);
            }
            
            if (result.errorCount > 0) {
                result.errors.forEach(err => toast.warning(err));
            }
            setSelectedProducts([]);
        } catch (error) {
            toast.update(toastId, { render: "Erro ao processar exclusão em massa.", type: "error", isLoading: false, autoClose: 3000 });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkRestore = async () => {
        if (selectedProducts.length === 0) return;
        setLoading(true);
        try {
            const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
            await bulkRestoreProducts(realIds);
            toast.success(`${realIds.length} produto(s) restaurado(s) com sucesso!`);
            setSelectedProducts([]);
        } catch (error) {
            toast.error("Erro ao restaurar produtos selecionados.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPermanentDelete = async () => {
        if (selectedProducts.length === 0) return;
        if (window.confirm(`Excluir DEFINITIVAMENTE ${selectedProducts.length} produto(s)?`)) {
            const toastId = toast.loading("Excluindo itens selecionados permanentemente...");
            setLoading(true);
            try {
                const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
                const result = await bulkPermanentDeleteProducts(realIds);
                
                if (result.successCount > 0) {
                    toast.update(toastId, { 
                        render: `${result.successCount} produto(s) excluído(s) permanentemente.`, 
                        type: "success", 
                        isLoading: false, 
                        autoClose: 3000 
                    });
                } else {
                    toast.dismiss(toastId);
                }
                
                if (result.errorCount > 0) {
                    result.errors.forEach(err => toast.warning(err));
                }
                
                setSelectedProducts([]);
            } catch (error) {
                toast.update(toastId, { render: "Erro na exclusão definitiva em massa.", type: "error", isLoading: false, autoClose: 3000 });
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleSelection = (id: string) => {
        const product = transformedProducts.find(p => p.id === id);

        setSelectedProducts(prev => {
            let next = [...prev];
            const isSelected = prev.includes(id);

            if (product?.isParent) {
                // Cascading selection for parent
                const childIds = transformedProducts.filter(p => p.parentId === id).map(p => p.id!);
                if (isSelected) {
                    next = next.filter(sid => sid !== id && !childIds.includes(sid));
                } else {
                    next = [...new Set([...next, id, ...childIds])];
                }
            } else if (product?.isVariation) {
                // Logic for variation
                if (isSelected) {
                    next = next.filter(sid => sid !== id);
                    // Unselect parent if child is unselected
                    next = next.filter(sid => sid !== product.parentId);
                } else {
                    next.push(id);
                    // Select parent if ALL children are selected
                    const siblingIds = transformedProducts.filter(p => p.parentId === product.parentId).map(p => p.id!);
                    const allSiblingsSelected = siblingIds.every(sid => next.includes(sid));
                    if (allSiblingsSelected) {
                        next.push(product.parentId);
                    }
                }
            } else {
                // Normal product
                if (isSelected) {
                    next = next.filter(sid => sid !== id);
                } else {
                    next.push(id);
                }
            }
            return next;
        });
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

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateProduct(id, { active: !currentStatus });
            toast.success(`Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
        } catch (error) {
            toast.error("Erro ao alterar status do produto.");
        }
    };

    return {
        products: paginatedProducts,
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        loading,
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
        refresh
    };
};
