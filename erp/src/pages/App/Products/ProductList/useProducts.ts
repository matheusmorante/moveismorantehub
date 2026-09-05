import { useState, useEffect, useMemo, useCallback } from "react";
import Product from "../../../types/product.type";
import { 
    subscribeToProducts, 
    fetchProductsPage,
    moveToTrash, 
    restoreProduct, 
    permanentDeleteProduct, 
    deleteProduct,
    updateProduct,
    bulkMoveToTrash,
    bulkRestoreProducts,
    bulkPermanentDeleteProducts,
    parseVariationImages
} from '@/pages/utils/productService';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { toast } from "react-toastify";
import { supabase } from '@/pages/utils/supabaseConfig';

export const useProducts = (filters?: any) => {
    // ═══════════════════════════════════════════════
    // SERVER PAGINATION state (Backend Supabase .range)
    // ═══════════════════════════════════════════════
    const [serverProducts, setServerProducts] = useState<Product[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [serverLoading, setServerLoading] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const isServerPagination = true;

    const refresh = () => setRefreshSignal(prev => prev + 1);

    const removeRestoredProductsFromTrash = useCallback((ids: string[]) => {
        const restoredIds = new Set(ids.map(String));

        setServerProducts(previous => previous.filter(product => !restoredIds.has(String(product.id))));
        if (filters?.showTrash) {
            setServerTotal(previous => Math.max(0, previous - restoredIds.size));
        }
    }, [filters?.showTrash]);

    const removeDeactivatedProductsFromActiveList = useCallback((ids: string[]) => {
        const deactivatedIds = new Set(ids.map(String));

        setServerProducts(previous => previous.filter(product => !deactivatedIds.has(String(product.id))));
        if (!filters?.showTrash) {
            setServerTotal(previous => Math.max(0, previous - deactivatedIds.size));
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
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            });
            setServerProducts(result.data);
            setServerTotal(result.total);
        } finally {
            setServerLoading(false);
        }
    }, [filters?.showTrash, filters?.search, filters?.category, filters?.activeOnly, filters?.status, filters?.isDraft, filters?.sortBy, filters?.sortOrder]);

    // Fetch on page/perPage/filters/refresh change
    useEffect(() => {
        fetchPage(currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage, fetchPage, refreshSignal]);

    // Reset pagination and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedProducts([]);
    }, [filters]);

    const filteredProducts = useMemo(() => {
        return products
            .filter(product => {
                const isDraft = Boolean(product.isDraft) || product.status === 'draft';
                const isActive = !isDraft && product.active !== false && !product.deleted;
                const isDeactivated = !isDraft && (product.active === false || product.deleted);

                if (filters?.isDraft === true) {
                    if (!isDraft) return false;
                } else if (filters?.isDraft === false) {
                    if (isDraft) return false;
                } else if (filters?.showTrash || filters?.activeOnly === false) {
                    if (!isDeactivated) return false;
                } else if (filters?.activeOnly === true) {
                    if (!isActive) return false;
                }

                const searchTerm = normalizeSearchTerm(filters.search || "");
                if (!searchTerm) {
                    const categoryMatch = !filters.category ||
                        product.category === filters.category ||
                        (filters.category === "Serviços" && product.itemType === "service") ||
                        (filters.category === "Produtos" && product.itemType === "product");
                    const activeMatch = filters.activeOnly === undefined || product.active === filters.activeOnly;
                    return categoryMatch && activeMatch;
                }

                // BUSCA DINÂMICA: Filtra EXCLUSIVAMENTE pelo campo de nome ('name') do produto ou variação (insensível a acentos)
                const checkStringMatch = (str?: string) => normalizeSearchTerm(str || "").includes(searchTerm);

                const matchesSelf = checkStringMatch(product.name);
                
                let matchesChildren = false;
                if (!product.parentId) {
                    // Match no nome das variações
                    matchesChildren = product.variations?.some((v: any) => checkStringMatch(v.name)) || false;
                    
                    // Match em variações independentes
                    if (!matchesChildren) {
                        matchesChildren = products.some(p => p.parentId === product.id && checkStringMatch(p.name));
                    }
                } else {
                    // Se for filho, verifica se o nome do pai bate
                    const parent = products.find(p => p.id === product.parentId);
                    if (parent) {
                        matchesChildren = checkStringMatch(parent.name);
                    }
                }

                const searchMatch = matchesSelf || matchesChildren;

                const categoryMatch = !filters.category ||
                    product.category === filters.category ||
                    (filters.category === "Serviços" && product.itemType === "service") ||
                    (filters.category === "Produtos" && product.itemType === "product");

                const activeMatch = searchTerm ? true : (filters.activeOnly === undefined || product.active === filters.activeOnly);

                return searchMatch && categoryMatch && activeMatch;
            })
            .sort((a, b) => {
                let comparison = 0;
                const sortBy = filters?.sortBy || 'createdAt';

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

                const sortOrder = filters?.sortOrder || 'desc';
                return sortOrder === "asc" ? comparison : -comparison;
            });
    }, [products, filters]);

    // Modos paralelos: servidor usa serverProducts, local usa transformedProducts
    const serverTransformed = useMemo(() => {
        // Para server pagination, os produtos já vêm da página correta
        // mas ainda precisamos fazer o flatten de variações JSON
        const flattened: any[] = [];
        serverProducts.forEach((product, pIdx) => {
            const parentSku = product.sku || product.code || String(pIdx + 1).padStart(6, '0');
            const hasJsonVariations = Array.isArray(product.variations) && product.variations.length > 0;
            const isParent = Boolean(product.hasVariations) || hasJsonVariations;

            const allVars: any[] = [];
            if (hasJsonVariations) {
                product.variations!.forEach((v: any, index: number) => {
                    const varSku = (v.sku && String(v.sku).trim()) ? normalizeVariationSku(String(v.sku).trim()) : `${parentSku}-${String(index + 1).padStart(2, '0')}`;
                    allVars.push({
                        ...product,
                        id: `${product.id}_${varSku || index}`,
                        variationId: v.id, // ID real da variação no banco (usado para inventory_moves)
                        sku: varSku,
                        code: varSku,
                        description: v.name,
                        unitPrice: (v.syncUnitPrice || typeof v.unitPrice === 'undefined' || v.unitPrice === null || v.unitPrice === 0) ? product.unitPrice : v.unitPrice,
                        costPrice: (v.syncCostPrice || typeof v.costPrice === 'undefined' || v.costPrice === null || v.costPrice === 0) ? product.costPrice : v.costPrice,
                        stock: (typeof v.stock !== 'undefined' && v.stock !== null) ? v.stock : 0,
                        active: v.active,
                        status: v.status || product.status,
                        images: parseVariationImages(v.image_url, v.images),
                        parentImages: product.images || [],
                        isVariation: true,
                        parentId: product.id,
                        displayName: v.name,
                    });
                });
            }

            flattened.push({ ...product, sku: parentSku, code: parentSku, isParent, allVariations: allVars });

            if (hasJsonVariations) {
                product.variations!.forEach((v: any, index: number) => {
                    const varSku = (v.sku && String(v.sku).trim()) ? normalizeVariationSku(String(v.sku).trim()) : `${parentSku}-${String(index + 1).padStart(2, '0')}`;
                    flattened.push({
                        ...product,
                        id: `${product.id}_${varSku || index}`,
                        variationId: v.id, // ID real da variação no banco (usado para inventory_moves)
                        sku: varSku,
                        code: varSku,
                        description: v.name,
                        displayName: v.name,
                        unitPrice: (v.syncUnitPrice || typeof v.unitPrice === 'undefined' || v.unitPrice === null || v.unitPrice === 0) ? product.unitPrice : v.unitPrice,
                        costPrice: (v.syncCostPrice || typeof v.costPrice === 'undefined' || v.costPrice === null || v.costPrice === 0) ? product.costPrice : v.costPrice,
                        stock: (typeof v.stock !== 'undefined' && v.stock !== null) ? v.stock : 0,
                        active: v.active,
                        status: v.status || product.status,
                        images: parseVariationImages(v.image_url, v.images),
                        parentImages: product.images || [],
                        isVariation: true,
                        parentId: product.id,
                    });
                });
            }
        });
        return flattened;
    }, [serverProducts]);

    // Totais e páginas dependem do modo backend
    const totalItems = serverTotal;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // paginatedProducts: o servidor já entrega os produtos da página atual
    const paginatedProducts = serverTransformed;


    const handleDelete = async (id: string) => {
        const targetProduct = serverProducts.find(p => String(p.id) === String(id) || String((p as any).realId) === String(id));
        const isDraft = Boolean(targetProduct?.is_draft) || targetProduct?.status === 'draft' || Boolean((targetProduct as any)?.isDraft);

        if (isDraft) {
            const confirmed = window.confirm(
                "Deseja descartar este rascunho permanentemente?\n\nEsta ação não poderá ser desfeita."
            );
            if (!confirmed) return;

            const toastId = toast.loading("Descartando rascunho...");
            try {
                await supabase.from('product_variations').delete().eq('product_id', id);
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (error) {
                    await supabase.from('products').update({ deleted: true, active: false }).eq('id', id);
                }
                refresh();
                toast.update(toastId, { render: "Rascunho descartado com sucesso!", type: "success", isLoading: false, autoClose: 3000 });
            } catch (error: any) {
                toast.update(toastId, { render: error.message || "Erro ao descartar rascunho.", type: "error", isLoading: false, autoClose: 3000 });
            }
            return;
        }

        const confirmed = window.confirm(
            "Desativar este produto?\n\nEle permanecerá na lista com a etiqueta de 'Desativado'."
        );
        if (!confirmed) return;

        const toastId = toast.loading("Desativando produto...");
        try {
            await deactivateProduct(id);
            refresh();
            toast.update(toastId, { render: "Produto desativado com sucesso.", type: "info", isLoading: false, autoClose: 3500 });
        } catch (error: any) {
            toast.update(toastId, { render: error.message || "Erro ao desativar produto.", type: "error", isLoading: false, autoClose: 3000 });
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
        const toastId = toast.loading("Verificando e excluindo produto...");
        try {
            const result = await deleteProduct(id);
            if (result.success) {
                toast.update(toastId, { render: "Produto excluído com sucesso!", type: "success", isLoading: false, autoClose: 3000 });
                refresh();
            } else {
                toast.update(toastId, { render: result.message || "Não foi possível excluir o produto.", type: "error", isLoading: false, autoClose: 5000 });
            }
        } catch (error: any) {
            toast.update(toastId, { render: error.message || "Erro ao tentar excluir produto.", type: "error", isLoading: false, autoClose: 5000 });
        }
    };

    const handleBulkTrash = async () => {
        if (selectedProducts.length === 0) return;
        const confirmed = window.confirm(
            `Desativar ${selectedProducts.length} produto(s)?`
        );
        if (!confirmed) return;

        const toastId = toast.loading("Desativando itens selecionados...");
        setLoading(true);
        try {
            const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
            const result = await bulkMoveToTrash(realIds);
            refresh();
            
            if (result.successCount > 0) {
                toast.update(toastId, { 
                    render: `${result.successCount} produto(s) desativado(s) com sucesso.`,
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
            toast.update(toastId, { render: "Erro ao desativar produtos em massa.", type: "error", isLoading: false, autoClose: 3000 });
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
            removeRestoredProductsFromTrash(realIds);
            refresh();
            toast.success(`${realIds.length} produto(s) ativado(s) com sucesso!`);
            setSelectedProducts([]);
        } catch (error) {
            toast.error("Erro ao ativar produtos selecionados.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPermanentDelete = async () => {
        if (selectedProducts.length === 0) return;
        const toastId = toast.loading("Excluindo produtos selecionados...");
        setLoading(true);
        let successCount = 0;
        let errors: string[] = [];

        try {
            const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
            for (const id of realIds) {
                const res = await deleteProduct(id);
                if (res.success) {
                    successCount++;
                } else if (res.message) {
                    errors.push(res.message);
                }
            }

            if (successCount > 0) {
                toast.update(toastId, { render: `${successCount} produto(s) excluído(s) permanentemente.`, type: "success", isLoading: false, autoClose: 3000 });
                refresh();
            } else {
                toast.dismiss(toastId);
            }

            if (errors.length > 0) {
                // Exibir o primeiro erro representativo
                toast.error(errors[0]);
            }
            setSelectedProducts([]);
        } catch (error: any) {
            toast.update(toastId, { render: "Erro ao excluir produtos em massa.", type: "error", isLoading: false, autoClose: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const product = serverTransformed.find(p => p.id === id);

        setSelectedProducts(prev => {
            let next = [...prev];
            const isSelected = prev.includes(id);

            if (product?.isParent) {
                // Cascading selection for parent
                const childIds = serverTransformed.filter(p => p.parentId === id).map(p => p.id!);
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
                    const siblingIds = serverTransformed.filter(p => p.parentId === product.parentId).map(p => p.id!);
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
        const newActive = !currentStatus;

            if (newActive) {
                // Bloqueio rigoroso para Rascunhos: não pode ativar no ERP
                if (id.includes('_')) {
                    const [parentId] = id.split('_');
                    const parent = serverProducts.find(p => String(p.id) === String(parentId)) || products.find(p => String(p.id) === String(parentId));
                    const isParentDraft = Boolean(parent?.is_draft) || parent?.status === 'draft' || Boolean((parent as any)?.isDraft);
                    if (isParentDraft) {
                        toast.warning("Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP.");
                        return;
                    }
                } else {
                    const targetProduct = serverProducts.find(p => String(p.id) === String(id)) || products.find(p => String(p.id) === String(id));
                    const isDraft = Boolean(targetProduct?.is_draft) || targetProduct?.status === 'draft' || Boolean((targetProduct as any)?.isDraft);
                    if (isDraft) {
                        toast.warning("Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP.");
                        return;
                    }
                }

                if (id.includes('_')) {
                    const [parentId, ...skuParts] = id.split('_');
                    const targetSku = skuParts.join('_');
                    const parent = products.find(p => p.id === parentId);
                    if (parent && parent.variations) {
                        const v = parent.variations.find((item: any, idx: number) => {
                            const sku = item.sku || `${parent.sku || parent.code}-${String(idx + 1).padStart(2, '0')}`;
                            return String(sku) === targetSku;
                        });
                        if (v) {
                            const missingFields: string[] = [];
                            const isVPriceValid = (v.syncUnitPrice || Number(v.unitPrice || 0) > 0 || Number(parent.unitPrice || 0) > 0);
                            
                            if (!(parent.description || '').trim() || (parent.description || '').trim().length < 2) {
                                missingFields.push('nome do produto no pai');
                            }
                            if (!isVPriceValid) {
                                missingFields.push('preço de venda');
                            }
                            if (!(parent.categoryIds || []).length && !parent.category) {
                                missingFields.push('categoria no pai');
                            }
                            if (!parent.mainSupplierId && !parent.supplierId) {
                                missingFields.push('fornecedor no pai');
                            }

                            if (missingFields.length > 0) {
                                toast.error(`Preencha os requisitos do ERP (${missingFields.join(', ')}) antes de ativar esta variação.`);
                                return;
                            }
                        }
                    }
                } else {
                    const productToActivate = products.find(product => String(product.id) === String(id));
                    if (productToActivate) {
                        const missingFields: string[] = [];
                        const isParent = productToActivate.isParent || (productToActivate.variations && productToActivate.variations.length > 0);

                        if (!(productToActivate.name || productToActivate.description || '').trim() || (productToActivate.name || productToActivate.description || '').trim().length < 2) {
                            missingFields.push('nome do produto');
                        }
                        if (!isParent && (!productToActivate.unitPrice || Number(productToActivate.unitPrice) <= 0)) {
                            missingFields.push('preço de venda');
                        }
                        if (!(productToActivate.categoryIds || []).length && !productToActivate.category) {
                            missingFields.push('categoria');
                        }
                        if (!productToActivate.mainSupplierId && !productToActivate.supplierId) {
                            missingFields.push('fornecedor');
                        }

                        if (missingFields.length > 0) {
                            toast.error(`Preencha os requisitos do ERP (${missingFields.join(', ')}) antes de ativar este produto.`);
                            return;
                        }
                    }
                }
            }

        // ⚡ Atualização Otimista Imediata no estado local (sem recarregar a tela nem flicker)
        setServerProducts(previous => previous.map(p => {
            if (String(p.id) === String(id)) {
                const updatedVars = p.variations?.map((v: any) => ({ ...v, active: newActive }));
                return { ...p, active: newActive, variations: updatedVars || p.variations };
            }
            if (id.includes('_')) {
                const [parentId, ...skuParts] = id.split('_');
                const targetSku = skuParts.join('_');
                if (String(p.id) === String(parentId) && p.variations) {
                    const updatedVars = p.variations.map((v: any, index: number) => {
                        const vSku = v.sku || index;
                        if (String(vSku) === String(targetSku) || String(v.id) === String(targetSku)) {
                            return { ...v, active: newActive };
                        }
                        return v;
                    });
                    return { ...p, variations: updatedVars };
                }
            }
            if (p.variations?.some((v: any) => String(v.id) === String(id))) {
                const updatedVars = p.variations.map((v: any) =>
                    String(v.id) === String(id) ? { ...v, active: newActive } : v
                );
                return { ...p, variations: updatedVars };
            }
            if (String(p.parentId) === String(id)) {
                return { ...p, active: newActive };
            }
            return p;
        }));

        toast.success(`Produto ${newActive ? 'ativado' : 'desativado'} com sucesso!`);

        try {
            // 1. Caso seja uma variação do array JSON (ex: 'parentId_sku')
            if (id.includes('_')) {
                const [parentId, ...skuParts] = id.split('_');
                const targetSku = skuParts.join('_');
                const parent = products.find(p => p.id === parentId) || serverProducts.find(p => p.id === parentId);
                if (parent && parent.variations) {
                    const newVariations = parent.variations.map((v: any, index: number) => {
                        const vSku = v.sku || index;
                        if (String(vSku) === String(targetSku)) {
                            return { ...v, active: newActive };
                        }
                        return v;
                    });
                    await updateProduct(parentId, { variations: newVariations });
                    return;
                }
            }

            // 2. Caso seja uma variação com ID direto no banco ou variação interna
            const targetProduct = serverProducts.find(p => String(p.id) === String(id));
            if (!targetProduct) {
                for (const parent of serverProducts) {
                    if (Array.isArray(parent.variations)) {
                        const vIndex = parent.variations.findIndex((v: any) => String(v.id) === String(id));
                        if (vIndex !== -1) {
                            const updatedVariations = [...parent.variations];
                            updatedVariations[vIndex] = { ...updatedVariations[vIndex], active: newActive };
                            await updateProduct(parent.id!, { variations: updatedVariations });
                            
                            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                            if (isUUID) {
                                await supabase.from('product_variations').update({ active: newActive }).eq('id', id);
                            }
                            return;
                        }
                    }
                }
                return;
            }

            // 3. Caso seja um produto pai ou produto regular
            const parentProduct = products.find(p => p.id === id) || targetProduct;
            if (parentProduct) {
                const updatePayload: Partial<Product> = { active: newActive };

                if (parentProduct.variations && parentProduct.variations.length > 0) {
                    updatePayload.variations = parentProduct.variations.map((v: any) => ({
                        ...v,
                        active: newActive
                    }));
                }

                await updateProduct(id, updatePayload);

                const independentChildren = serverProducts.filter(p => p.parentId === id);
                for (const child of independentChildren) {
                    if (child.id) {
                        await updateProduct(child.id, { active: newActive });
                    }
                }
                return;
            }

            await updateProduct(id, { active: newActive });
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            toast.error("Erro ao alterar status do produto no banco.");
            // Reverte em caso de erro
            setServerProducts(previous => previous.map(p => {
                if (String(p.id) === String(id)) {
                    const revertedVars = p.variations?.map((v: any) => ({ ...v, active: currentStatus }));
                    return { ...p, active: currentStatus, variations: revertedVars || p.variations };
                }
                if (id.includes('_')) {
                    const [parentId, ...skuParts] = id.split('_');
                    const targetSku = skuParts.join('_');
                    if (String(p.id) === String(parentId) && p.variations) {
                        const revertedVars = p.variations.map((v: any, index: number) => {
                            const vSku = v.sku || index;
                            if (String(vSku) === String(targetSku) || String(v.id) === String(targetSku)) {
                                return { ...v, active: currentStatus };
                            }
                            return v;
                        });
                        return { ...p, variations: revertedVars };
                    }
                }
                if (p.variations?.some((v: any) => String(v.id) === String(id))) {
                    const revertedVars = p.variations.map((v: any) =>
                        String(v.id) === String(id) ? { ...v, active: currentStatus } : v
                    );
                    return { ...p, variations: revertedVars };
                }
                return p;
            }));
        }
    };

    const deactivateCatalog = async (id: string) => {
        try {
            const [possibleParentId, ...skuParts] = id.split('_');
            const targetSku = skuParts.join('_');
            const isCompoundId = skuParts.length > 0;

            let parentProduct: Product | undefined;
            let variation: any = undefined;

            // 1. Procurar em serverProducts por ID composto (possibleParentId)
            if (isCompoundId) {
                parentProduct = serverProducts.find(p => String(p.id) === String(possibleParentId));
                if (parentProduct && Array.isArray(parentProduct.variations)) {
                    variation = parentProduct.variations.find((item: any, index: number) => {
                        if (String(item.id) === targetSku) return true;
                        if (String(index) === targetSku) return true;
                        const rawSku = item.sku || '';
                        const genSku = `${parentProduct!.sku || parentProduct!.code || ''}-${String(index + 1).padStart(2, '0')}`;
                        if (rawSku && String(rawSku) === targetSku) return true;
                        if (genSku === targetSku) return true;
                        if (normalizeVariationSku(rawSku) === normalizeVariationSku(targetSku)) return true;
                        if (normalizeVariationSku(genSku) === normalizeVariationSku(targetSku)) return true;
                        return false;
                    });
                }
            }

            // 2. Procurar em serverProducts se id for diretamente o ID ou SKU de uma variação
            if (!variation) {
                for (const p of serverProducts) {
                    if (Array.isArray(p.variations)) {
                        const found = p.variations.find((v: any) => 
                            String(v.id) === String(id) || 
                            String(v.id) === targetSku ||
                            String(v.sku) === String(id) ||
                            normalizeVariationSku(v.sku || '') === normalizeVariationSku(id)
                        );
                        if (found) {
                            parentProduct = p;
                            variation = found;
                            break;
                        }
                    }
                }
            }

            // 3. Fallback: procurar no Supabase se não estiver na página atual em memória
            if (isCompoundId && !variation) {
                const { data: dbProd } = await supabase.from('products').select('*, product_variations(*)').eq('id', possibleParentId).maybeSingle();
                if (dbProd) {
                    parentProduct = dbProd;
                    const vars = (dbProd as any).product_variations || (dbProd as any).variations || [];
                    variation = vars.find((item: any, index: number) => {
                        if (String(item.id) === targetSku) return true;
                        const rawSku = item.sku || '';
                        const genSku = `${dbProd.code || ''}-${String(index + 1).padStart(2, '0')}`;
                        return normalizeVariationSku(rawSku) === normalizeVariationSku(targetSku) ||
                               normalizeVariationSku(genSku) === normalizeVariationSku(targetSku);
                    });
                }
            } else if (!variation) {
                const { data: dbVar } = await supabase.from('product_variations').select('*, products(*)').eq('id', id).maybeSingle();
                if (dbVar) {
                    variation = dbVar;
                    parentProduct = (dbVar as any).products;
                }
            }

            // 4. Se ainda não for variação, verifica se é produto simples/pai
            if (!parentProduct) {
                parentProduct = serverProducts.find(p => String(p.id) === String(id));
            }

            const isVariation = Boolean(variation);
            const currentStatus = isVariation ? (variation.status || 'published') : (parentProduct?.status || 'published');
            const newStatus = currentStatus === 'published' ? 'hidden' : 'published';

            if (newStatus === 'published') {
                const isDraft = Boolean(parentProduct?.is_draft) || parentProduct?.status === 'draft' || Boolean((parentProduct as any)?.isDraft);
                if (isDraft) {
                    toast.warning("Este produto é um rascunho. Termine o cadastramento para poder publicá-lo no Catálogo.");
                    return;
                }

                if (isVariation) {
                    const hasImages = (variation?.images && variation.images.length > 0) || 
                                      (variation?.image_url && String(variation.image_url).trim().length > 0) ||
                                      (parentProduct?.images && parentProduct.images.length > 0);
                    const hasPrice = (variation?.syncUnitPrice || Number(variation?.unitPrice || 0) > 0 || Number(parentProduct?.unitPrice || 0) > 0);
                    const isEligible = hasPrice && hasImages && (parentProduct?.description || (parentProduct as any)?.name || '').trim().length >= 2;

                    if (!isEligible) {
                        toast.error('Preencha os requisitos do Catálogo (preço maior que zero e pelo menos uma imagem) antes de publicar esta variação.');
                        return;
                    }
                } else if (parentProduct) {
                    const hasImages = parentProduct.images && parentProduct.images.length > 0;
                    const hasPrice = Number(parentProduct.unitPrice || 0) > 0;
                    const isEligible = hasPrice && hasImages && (parentProduct.description || (parentProduct as any)?.name || '').trim().length >= 2;

                    if (!isEligible) {
                        toast.error('Preencha os requisitos do Catálogo (preço maior que zero e pelo menos uma imagem) antes de publicar este produto.');
                        return;
                    }
                }
            }

            // ⚡ Atualização Otimista Imediata no estado local (sem recarregar a tela nem flicker)
            setServerProducts(previous => previous.map(p => {
                if (isCompoundId && String(p.id) === String(possibleParentId) && p.variations) {
                    const updatedVars = p.variations.map((item: any, index: number) => {
                        const rawSku = item.sku || '';
                        const genSku = `${p.sku || p.code || ''}-${String(index + 1).padStart(2, '0')}`;
                        if (
                            String(item.id) === targetSku ||
                            String(index) === targetSku ||
                            (rawSku && String(rawSku) === targetSku) ||
                            genSku === targetSku ||
                            normalizeVariationSku(rawSku) === normalizeVariationSku(targetSku) ||
                            normalizeVariationSku(genSku) === normalizeVariationSku(targetSku)
                        ) {
                            return { ...item, status: newStatus };
                        }
                        return item;
                    });
                    return { ...p, variations: updatedVars };
                }
                if (p.variations?.some((v: any) => String(v.id) === String(id) || String(v.sku) === String(id))) {
                    const updatedVars = p.variations.map((v: any) =>
                        (String(v.id) === String(id) || String(v.sku) === String(id)) ? { ...v, status: newStatus } : v
                    );
                    return { ...p, variations: updatedVars };
                }
                if (String(p.id) === String(id)) {
                    const updatedVars = p.variations?.map((v: any) => ({ ...v, status: newStatus }));
                    return { ...p, status: newStatus, variations: updatedVars || p.variations };
                }
                if (String(p.parentId) === String(id)) {
                    return { ...p, status: newStatus };
                }
                return p;
            }));

            if (isVariation) {
                toast.success(`Variação ${newStatus === 'published' ? 'publicada! Adicionada ao Feed Meta CSV.' : 'ocultada! Removida do Feed Meta CSV.'}`);
            } else {
                toast.success(`Catálogo Digital: Produto ${newStatus === 'published' ? 'publicado' : 'ocultado'} com sucesso! 🚀`);
            }

            // Persistência em background
            if (isVariation && variation) {
                if (parentProduct?.id && Array.isArray(parentProduct.variations)) {
                    await updateProduct(parentProduct.id, {
                        variations: parentProduct.variations.map((item: any) =>
                            String(item.id) === String(variation.id) ? { ...item, status: newStatus } : item
                        )
                    });
                }
                
                const isVarIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variation.id);
                if (isVarIdUUID) {
                    const { error } = await supabase
                        .from('product_variations')
                        .update({ status: newStatus })
                        .eq('id', variation.id);
                    if (error) throw error;
                }
                return;
            }

            const isProdIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (isProdIdUUID) {
                const { error: productError } = await supabase
                    .from('products')
                    .update({ status: newStatus })
                    .eq('id', id);
                if (productError) throw productError;
            }

            await updateProduct(id, { status: newStatus });

            if (parentProduct?.variations?.length) {
                await updateProduct(id, {
                    variations: parentProduct.variations.map((variation: any) => ({ ...variation, status: newStatus }))
                });
            }

            if (isProdIdUUID) {
                const { error: variationsError } = await supabase
                    .from('product_variations')
                    .update({ status: newStatus })
                    .eq('product_id', id);
                if (variationsError) throw variationsError;
            }

            const independentChildren = serverProducts.filter(product => String(product.parentId) === String(id));
            await Promise.all(independentChildren
                .filter(child => child.id)
                .map(child => updateProduct(child.id!, { status: newStatus })));
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
