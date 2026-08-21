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
import { toast } from "react-toastify";
import { supabase } from '@/pages/utils/supabaseConfig';

export const useProducts = (filters?: any) => {
    // Detect desktop (>= 1024px = lg) for server-side pagination
    const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
    useEffect(() => {
        const handler = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    const isLargeScreen = windowWidth >= 1024;

    // ═══════════════════════════════════════════════
    // SERVER PAGINATION state (desktop)
    // ═══════════════════════════════════════════════
    const [serverProducts, setServerProducts] = useState<Product[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [serverLoading, setServerLoading] = useState(false);

    // ═══════════════════════════════════════════════
    // LOCAL cache state (mobile / tablet)
    // ═══════════════════════════════════════════════
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const refresh = () => setRefreshSignal(prev => prev + 1);

    // ─── Server pagination fetch ───────────────────
    const fetchPage = useCallback(async (page: number, perPage: number) => {
        setServerLoading(true);
        try {
            const result = await fetchProductsPage(page, perPage, {
                showTrash: filters?.showTrash,
                search: filters?.search,
                category: filters?.category,
                activeOnly: filters?.activeOnly,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            });
            setServerProducts(result.data);
            setServerTotal(result.total);
        } finally {
            setServerLoading(false);
        }
    }, [filters?.showTrash, filters?.search, filters?.category, filters?.activeOnly, filters?.sortBy, filters?.sortOrder]);

    // Fetch when desktop + page/perPage/filters change
    useEffect(() => {
        if (!isLargeScreen) return;
        fetchPage(currentPage, itemsPerPage);
    }, [isLargeScreen, currentPage, itemsPerPage, fetchPage]);

    // ─── Local subscription (mobile/tablet) ────────
    useEffect(() => {
        if (isLargeScreen) return; // Skip for desktop
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data);
            setLoading(false);
        }, filters?.showTrash);
        return () => unsubscribe();
    }, [isLargeScreen, refreshSignal, filters?.showTrash]);

    // Reset pagination and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedProducts([]);
    }, [filters]);

    const filteredProducts = useMemo(() => {
        const showTrash = filters?.showTrash || false;
        return products
            .filter(product => {
                // Filter by deleted status. All products are visible regardless
                // of whether they are active in a channel.
                if (showTrash) {
                    if (!product.deleted) return false;
                } else {
                    if (product.deleted) return false;
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
        if (!isLargeScreen) return [];
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
                    const isStandardSku = v.sku && typeof v.sku === 'string' && v.sku.startsWith(`${parentSku}-`);
                    const varSku = isStandardSku ? v.sku : `${parentSku}-${String(index + 1).padStart(2, '0')}`;
                    allVars.push({
                        ...product,
                        id: `${product.id}_${varSku || index}`,
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
                    const isStandardSku = v.sku && typeof v.sku === 'string' && v.sku.startsWith(`${parentSku}-`);
                    const varSku = isStandardSku ? v.sku : `${parentSku}-${String(index + 1).padStart(2, '0')}`;
                    flattened.push({
                        ...product,
                        id: `${product.id}_${varSku || index}`,
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
    }, [serverProducts, isLargeScreen]);

    // Totais e páginas dependem do modo
    const totalItems = isLargeScreen ? serverTotal : filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Flatten para modo LOCAL (mobile/tablet) — igual à lógica anterior
    const transformedProducts = useMemo(() => {
        if (isLargeScreen) return []; // Não usado em desktop
        const flattened: any[] = [];
        const parents = filteredProducts.filter(p => !p.isVariation);
        const independentVars = filteredProducts.filter(p => p.isVariation);

        parents.forEach((product, pIdx) => {
            const variationsFromIndependent = independentVars.filter(v => v.parentId === product.id);
            const hasJsonVariations = Array.isArray(product.variations) && product.variations.length > 0;
            const actuallyHasVariations = Boolean(product.hasVariations) || hasJsonVariations || variationsFromIndependent.length > 0;
            const parentSku = product.sku || product.code || String(pIdx + 1).padStart(6, '0');

            const allVars: any[] = [];
            if (product.hasVariations && product.variations) {
                product.variations.forEach((v: any, index: number) => {
                    const isStandardSku = v.sku && typeof v.sku === 'string' && v.sku.startsWith(`${parentSku}-`);
                    const varSku = isStandardSku ? v.sku : `${parentSku}-${String(index + 1).padStart(2, '0')}`;
                    allVars.push({
                        ...product, id: `${product.id}_${varSku || index}`, sku: varSku, code: varSku,
                        description: v.name,
                        unitPrice: (v.syncUnitPrice || typeof v.unitPrice === 'undefined' || v.unitPrice === null || v.unitPrice === 0) ? product.unitPrice : v.unitPrice,
                        costPrice: (v.syncCostPrice || typeof v.costPrice === 'undefined' || v.costPrice === null || v.costPrice === 0) ? product.costPrice : v.costPrice,
                        stock: (typeof v.stock !== 'undefined' && v.stock !== null) ? v.stock : 0,
                        active: v.active, status: v.status || product.status,
                        images: parseVariationImages(v.image_url, v.images), parentImages: product.images || [],
                        isVariation: true, parentId: product.id, categoryIds: product.categoryIds,
                        category: product.category, unit: product.unit, attributes: v.attributes, displayName: v.name,
                    });
                });
            }
            if (!hasJsonVariations && variationsFromIndependent.length > 0) {
                variationsFromIndependent.forEach(v => {
                    const vCode = v.code || v.sku;
                    if (product.variations?.some((jv: any) => jv.sku === vCode || String(jv.id) === String(v.id))) return;
                    allVars.push({ ...v, sku: vCode, code: vCode, isVariation: true, parentId: product.id, description: v.description,
                        displayName: v.description.toLowerCase().startsWith(product.description.toLowerCase())
                            ? v.description.substring(product.description.length).trim().replace(/^[-/]\s*/, '') : v.description });
                });
            }

            flattened.push({ ...product, sku: parentSku, code: parentSku, isParent: actuallyHasVariations, allVariations: allVars });

            if (product.hasVariations && product.variations) {
                product.variations.forEach((v: any, index: number) => {
                    const isStandardSku = v.sku && typeof v.sku === 'string' && v.sku.startsWith(`${parentSku}-`);
                    const varSku = isStandardSku ? v.sku : `${parentSku}-${String(index + 1).padStart(2, '0')}`;
                    flattened.push({
                        ...product, id: `${product.id}_${varSku || index}`, sku: varSku, code: varSku,
                        description: v.name, displayName: v.name,
                        unitPrice: (v.syncUnitPrice || typeof v.unitPrice === 'undefined' || v.unitPrice === null || v.unitPrice === 0) ? product.unitPrice : v.unitPrice,
                        costPrice: (v.syncCostPrice || typeof v.costPrice === 'undefined' || v.costPrice === null || v.costPrice === 0) ? product.costPrice : v.costPrice,
                        stock: (typeof v.stock !== 'undefined' && v.stock !== null) ? v.stock : 0,
                        active: v.active, status: v.status || product.status,
                        images: parseVariationImages(v.image_url, v.images), parentImages: product.images || [],
                        isVariation: true, parentId: product.id, categoryIds: product.categoryIds, category: product.category, unit: product.unit,
                    });
                });
            }
            if (!hasJsonVariations && variationsFromIndependent.length > 0) {
                variationsFromIndependent.forEach(v => {
                    const vCode = v.code || v.sku;
                    if (product.variations?.some((jv: any) => jv.sku === vCode || String(jv.id) === String(v.id))) return;
                    flattened.push({ ...v, sku: vCode, code: vCode, isVariation: true, parentId: product.id, description: v.description,
                        displayName: v.description.toLowerCase().startsWith(product.description.toLowerCase())
                            ? v.description.substring(product.description.length).trim().replace(/^[-/]\s*/, '') : v.description });
                });
            }
        });

        independentVars.forEach(v => {
            const parentInList = parents.some(p => p.id === v.parentId);
            if (!parentInList) flattened.push({ ...v, isVariation: true, isOrphan: true });
        });

        return flattened;
    }, [filteredProducts, isLargeScreen]);

    // paginatedProducts: servidor já entrega a página certa; local faz slice
    const paginatedProducts = useMemo(() => {
        if (isLargeScreen) return serverTransformed;
        const start = (currentPage - 1) * itemsPerPage;
        return transformedProducts.slice(start, start + itemsPerPage);
    }, [isLargeScreen, serverTransformed, transformedProducts, currentPage, itemsPerPage]);


    const handleDelete = async (id: string) => {
        const toastId = toast.loading("Desativando produto...");
        try {
            await moveToTrash(id);
            toast.update(toastId, { render: "Produto desativado com sucesso.", type: "info", isLoading: false, autoClose: 3000 });
        } catch (error: any) {
            toast.update(toastId, { render: error.message || "Erro ao desativar produto.", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await restoreProduct(id);
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
        const toastId = toast.loading("Desativando itens selecionados...");
        setLoading(true);
        try {
            const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
            const result = await bulkMoveToTrash(realIds);
            
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
            const newActive = !currentStatus;

            if (newActive) {
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
                            const isVPriceValid = (v.syncUnitPrice || Number(v.unitPrice || 0) > 0 || Number(parent.unitPrice || 0) > 0);
                            const isVCostPriceValid = (v.syncCostPrice || Number(v.costPrice || 0) > 0 || Number(parent.costPrice || 0) > 0);
                            const isVarEligible = (parent.description || '').trim().length >= 2 &&
                                isVPriceValid &&
                                (parent.categoryIds || []).length > 0 &&
                                Boolean(parent.mainSupplierId) &&
                                isVCostPriceValid;

                            if (!isVarEligible) {
                                toast.error('Preencha os requisitos do ERP (preço de custo, preço de venda, fornecedor e categoria no pai) antes de ativar esta variação.');
                                return;
                            }
                        }
                    }
                } else {
                    const productToActivate = products.find(product => String(product.id) === String(id));
                    const isErpEligible = productToActivate &&
                        (productToActivate.description || '').trim().length >= 2 &&
                        Number(productToActivate.unitPrice || 0) > 0 &&
                        (productToActivate.categoryIds || []).length > 0 &&
                        Boolean(productToActivate.mainSupplierId) &&
                        Number(productToActivate.costPrice || 0) > 0;

                    if (!isErpEligible) {
                        toast.error('Preencha os requisitos do ERP (preço de custo, preço de venda, fornecedor e categoria) antes de ativar este produto.');
                        return;
                    }
                }
            }

            // 1. Caso seja uma variação do array JSON (ex: 'parentId_sku')
            if (id.includes('_')) {
                const [parentId, ...skuParts] = id.split('_');
                const targetSku = skuParts.join('_');
                const parent = products.find(p => p.id === parentId);
                if (parent && parent.variations) {
                    const newVariations = parent.variations.map((v: any, index: number) => {
                        const vSku = v.sku || index;
                        if (String(vSku) === String(targetSku)) {
                            return { ...v, active: newActive };
                        }
                        return v;
                    });
                    await updateProduct(parentId, { variations: newVariations });
                    toast.success(`Variação ${newActive ? 'ativada' : 'desativada'} com sucesso!`);
                    refresh();
                    return;
                }
            }

            // 2. Caso seja um produto pai ou produto regular
            const parentProduct = products.find(p => p.id === id);
            if (parentProduct) {
                const updatePayload: Partial<Product> = { active: newActive };

                // Atualizar o status de todas as variações internas (array JSON)
                if (parentProduct.variations && parentProduct.variations.length > 0) {
                    updatePayload.variations = parentProduct.variations.map((v: any) => ({
                        ...v,
                        active: newActive
                    }));
                }

                await updateProduct(id, updatePayload);

                // Atualizar produtos filhos independentes vinculados via parentId
                const independentChildren = products.filter(p => p.parentId === id);
                for (const child of independentChildren) {
                    if (child.id) {
                        await updateProduct(child.id, { active: newActive });
                    }
                }

                toast.success(`Produto ${newActive ? 'ativado' : 'desativado'} com sucesso!`);
                refresh();
                return;
            }

            await updateProduct(id, { active: newActive });
            toast.success(`Produto ${newActive ? 'ativado' : 'desativado'} com sucesso!`);
            refresh();
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            toast.error("Erro ao alterar status do produto.");
        }
    };

    const deactivateCatalog = async (id: string) => {
        try {
            const [possibleParentId, ...skuParts] = id.split('_');
            const targetSku = skuParts.join('_');
            const isEmbeddedVariation = skuParts.length > 0;
            const parentProduct = isEmbeddedVariation
                ? products.find(product => String(product.id) === String(possibleParentId))
                : products.find(product => String(product.id) === String(id));

            let currentStatus = 'published';

            if (isEmbeddedVariation && parentProduct?.variations) {
                const variation = parentProduct.variations.find((item: any, index: number) => {
                    const sku = item.sku || `${parentProduct.sku || parentProduct.code}-${String(index + 1).padStart(2, '0')}`;
                    return String(sku) === targetSku;
                });
                currentStatus = variation?.status || 'published';
            } else if (parentProduct) {
                currentStatus = parentProduct.status || 'published';
            }

            const newStatus = currentStatus === 'published' ? 'hidden' : 'published';

            if (newStatus === 'published') {
                if (isEmbeddedVariation && parentProduct?.variations) {
                    const variation = parentProduct.variations.find((item: any, index: number) => {
                        const sku = item.sku || `${parentProduct.sku || parentProduct.code}-${String(index + 1).padStart(2, '0')}`;
                        return String(sku) === targetSku;
                    });
                    const hasImages = (variation?.images && variation.images.length > 0) || (parentProduct.images && parentProduct.images.length > 0);
                    const hasPrice = (variation?.syncUnitPrice || Number(variation?.unitPrice || 0) > 0 || Number(parentProduct.unitPrice || 0) > 0);
                    const isEligible = hasPrice && hasImages && (parentProduct.description || '').trim().length >= 2;

                    if (!isEligible) {
                        toast.error('Preencha os requisitos do Catálogo (preço maior que zero e pelo menos uma imagem) antes de publicar esta variação.');
                        return;
                    }
                } else if (parentProduct) {
                    const hasImages = parentProduct.images && parentProduct.images.length > 0;
                    const hasPrice = Number(parentProduct.unitPrice || 0) > 0;
                    const isEligible = hasPrice && hasImages && (parentProduct.description || '').trim().length >= 2;

                    if (!isEligible) {
                        toast.error('Preencha os requisitos do Catálogo (preço maior que zero e pelo menos uma imagem) antes de publicar este produto.');
                        return;
                    }
                }
            }

            // Variações internas têm o ID visual "idDoPai_SKU"
            if (isEmbeddedVariation && parentProduct?.variations) {
                const variation = parentProduct.variations.find((item: any, index: number) => {
                    const sku = item.sku || `${parentProduct.sku || parentProduct.code}-${String(index + 1).padStart(2, '0')}`;
                    return String(sku) === targetSku;
                });
                if (!variation?.id) throw new Error('Variação não encontrada.');

                await updateProduct(parentProduct.id!, {
                    variations: parentProduct.variations.map((item: any) =>
                        String(item.id) === String(variation.id) ? { ...item, status: newStatus } : item
                    )
                });
                
                const isVarIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variation.id);
                if (isVarIdUUID) {
                    const { error } = await supabase
                        .from('product_variations')
                        .update({ status: newStatus })
                        .eq('id', variation.id);
                    if (error) throw error;
                }

                toast.success(`Variação ${newStatus === 'published' ? 'publicada! Adicionada ao Feed Meta CSV.' : 'ocultada! Removida do Feed Meta CSV.'}`);
                refresh();
                return;
            }

            const isProdIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (isProdIdUUID) {
                const { error: productError } = await supabase
                    .from('products')
                    .update({ status: newStatus })
                    .eq('id', id)
                    .select('id')
                    .single();
                if (productError) throw productError;
            }

            // Mantém o cache da lista coerente enquanto ela é recarregada.
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

            const independentChildren = products.filter(product => String(product.parentId) === String(id));
            await Promise.all(independentChildren
                .filter(child => child.id)
                .map(child => updateProduct(child.id!, { status: newStatus })));

            toast.success(`Produto ${newStatus === 'published' ? 'publicado! Adicionado ao Feed Meta CSV.' : 'ocultado! Removido do Feed Meta CSV.'}`);
            refresh();
        } catch (error) {
            console.error('Erro ao alternar catálogo:', error);
            toast.error('Erro ao alterar status no Catálogo Digital / Feed Meta CSV.');
        }
    };

    return {
        products: isLargeScreen ? serverProducts : products,
        paginatedProducts,
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        loading: isLargeScreen ? serverLoading : loading,
        isServerPagination: isLargeScreen,
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
        refresh: isLargeScreen ? () => fetchPage(currentPage, itemsPerPage) : refresh,
    };
};
