import { useState, useEffect, useMemo } from "react";
import Product from "../../../types/product.type";
import { subscribeToProducts, moveToTrash, restoreProduct, permanentDeleteProduct, updateProduct } from '@/pages/utils/productService';
import { toast } from "react-toastify";

export const useProducts = (filters?: any) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
                } else if (isDraft) {
                    if (!product.isDraft || product.deleted) return false;
                } else {
                    if (product.deleted || product.isDraft) return false;
                }

                if (!filters) return true;

                const searchMatch = !filters.search ||
                    product.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                    product.code?.toLowerCase().includes(filters.search.toLowerCase());

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
                        description: v.syncDescription ? `${product.description} - ${v.name}` : v.name,
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
                    flattened.push(child);
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
                    code: vCode, // Garantir consist├¬ncia na exibi├º├úo do c├│digo
                    isVariation: true,
                    parentId: product.id,
                    description: v.description.includes(product.description) ? v.description : `${product.description} - ${v.description}`
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
        await moveToTrash(id);
        toast.info("Produto movido para a lixeira.");
    };

    const handleRestore = async (id: string) => {
        await restoreProduct(id);
        toast.success("Produto restaurado com sucesso!");
    };

    const handlePermanentDelete = async (id: string) => {
        if (window.confirm("Certeza que deseja excluir DEFINITIVAMENTE este produto?")) {
            await permanentDeleteProduct(id);
            toast.success("Produto excluído permanentemente.");
        }
    };

    const handleBulkTrash = async () => {
        if (selectedProducts.length === 0) return;
        setLoading(true);
        try {
            // Filter out variation IDs (which are synthetic in this implementation for UI)
            const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
            await Promise.all(realIds.map(id => moveToTrash(id)));
            toast.info(`${realIds.length} produto(s) movido(s) para a lixeira.`);
            setSelectedProducts([]);
        } catch (error) {
            toast.error("Erro ao mover alguns produtos para a lixeira.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkRestore = async () => {
        if (selectedProducts.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(selectedProducts.map(id => restoreProduct(id)));
            toast.success(`${selectedProducts.length} produto(s) restaurado(s) com sucesso!`);
            setSelectedProducts([]);
        } catch (error) {
            toast.error("Erro ao restaurar alguns produtos.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPermanentDelete = async () => {
        if (selectedProducts.length === 0) return;
        if (window.confirm(`Excluir DEFINITIVAMENTE ${selectedProducts.length} produto(s)?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedProducts.map(id => permanentDeleteProduct(id)));
                toast.success(`${selectedProducts.length} produto(s) excluído(s) permanentemente.`);
                setSelectedProducts([]);
            } catch (error) {
                toast.error("Erro ao excluir alguns produtos.");
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleSelection = (id: string) => {
        const product = paginatedProducts.find(p => p.id === id);

        setSelectedProducts(prev => {
            let next = [...prev];
            const isSelected = prev.includes(id);

            if (product?.isParent) {
                // Cascading selection for parent
                const childIds = paginatedProducts.filter(p => p.parentId === id).map(p => p.id!);
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
                    const siblingIds = paginatedProducts.filter(p => p.parentId === product.parentId).map(p => p.id!);
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
        toggleActive
    };
};
