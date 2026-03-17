import React, { useState, useEffect, useRef } from "react";

import ProductFilters from "./ProductFilters";
import ProductList from "./ProductList";
import ProductFormModal from "./ProductFormModal";
import Product, { ProductVisibilitySettings } from "../../types/product.type";
import { Link } from "react-router-dom";
import PriceHistoryModal from "./PriceHistoryModal";
import { cleanupOldDrafts } from '@/pages/utils/productService';
import { toast } from "react-toastify";
import VariationFormModal from "./VariationFormModal";
import StockLaunchModal from "../Stock/components/StockLaunchModal";
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { Variation } from "../../types/product.type";
import { ProductListRef } from "./ProductList";

interface ProductFiltersData {
    search: string;
    category: string;
    activeOnly: boolean | undefined;
    sortBy: "description" | "unitPrice" | "stock" | "code" | "createdAt" | "category";
    sortOrder: "asc" | "desc";
    showTrash?: boolean;
}

const Products = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isDraftOpen, setIsDraftOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [categoryTree, setCategoryTree] = useState<any>(null);
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

    const productListRef = useRef<ProductListRef>(null);
    const trashListRef = useRef<ProductListRef>(null);


    // Variation Modal State
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
    const [editingVariation, setEditingVariation] = useState<Variation | null>(null);
    const [variationParentProduct, setVariationParentProduct] = useState<Product | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    useEffect(() => {
        cleanupOldDrafts();
    }, []);

    // Stock Launch Modal State
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockLaunchTarget, setStockLaunchTarget] = useState<{product?: Product, variation?: Variation} | null>(null);

    React.useEffect(() => {
        const loadCategoryData = async () => {
            try {
                const data = await fetchGroupsAndCategories();
                setCategoryTree(data);
            } catch (err) {
                console.error("Erro ao carregar hierarquia de categorias:", err);
            }
        };
        loadCategoryData();
    }, []);

    const [filters, setFilters] = useState<ProductFiltersData>({
        search: "",
        category: "",
        activeOnly: undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
    });

    const [visibilitySettings, setVisibilitySettings] = useState<ProductVisibilitySettings>({
        code: true,
        description: true,
        category: true,
        unitPrice: true,
        costPrice: true,
        stock: true,
        createdAt: true,
        actions: true,
    });

    const toggleVisibility = (column: keyof ProductVisibilitySettings) => {
        setVisibilitySettings((prev: ProductVisibilitySettings) => ({ ...prev, [column]: !prev[column] }));
    };

    const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
        setFilters((prev: ProductFiltersData) => ({
            ...prev,
            sortBy: sortBy as any,
            sortOrder
        }));
    };

    const activeFilters = React.useMemo(() => ({ ...filters, showTrash: false, isDraft: false }), [filters]);
    const trashFilters = React.useMemo(() => ({ ...filters, showTrash: true, isDraft: false }), [filters]);
    const draftFilters = React.useMemo(() => ({ ...filters, showTrash: false, isDraft: true }), [filters]);

    const handleDuplicate = (product: Product) => {
        // Deep clone to avoid mutating the original product
        const duplicate: any = JSON.parse(JSON.stringify(product));
        
        // Clear primary identifiers
        delete duplicate.id;
        delete duplicate.code;
        delete duplicate.createdAt;
        delete duplicate.updatedAt;
        
        // Reset stock and status
        duplicate.stock = 0;
        duplicate.initialStock = 0;
        duplicate.isDraft = true;
        duplicate.active = true;
        duplicate.description = `${duplicate.description} (Cópia)`;
        
        // Clear variation specific identifiers
        if (duplicate.variations && duplicate.variations.length > 0) {
            duplicate.variations = duplicate.variations.map((v: any) => ({
                ...v,
                id: Math.random().toString(36).substr(2, 9), // Temp ID for UI mapping
                sku: "", // Clear SKU so user provides a new one
                stock: 0,
                initialStock: 0,
                initialStockEntries: []
            }));
        }

        setEditingProduct(null);
        setInitialFormData(duplicate);
        setIsFormModalOpen(true);
        toast.info("Produto duplicado! Revise os dados e salve para concluir.");
    };

    return (
        <div className="flex -m-4 xl:-m-8 h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
            {/* Sidebar for Filters */}
            <div className={`transition-all duration-300 ease-in-out border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 absolute md:relative z-30 h-full ${isSidebarOpen ? 'w-[calc(100vw-32px)] md:w-80 shadow-2xl md:shadow-none' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
                <div className="md:hidden flex justify-end p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2">
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>
                <ProductFilters filters={filters} setFilters={setFilters} />
            </div>
            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && <div className="md:hidden fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-10">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-4 xl:gap-0">
                    <div className="flex items-start xl:items-center gap-4 xl:gap-6">
                        <div>
                            <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Produtos e Serviços
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                                Catálogo de Produtos, Serviços e Gestão de Estoque
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 relative">
                        <Link
                            to="/app/configuracoes"
                            className="flex items-center justify-center p-3 xl:p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all h-full"
                            title="Configurar Campos Obrigatórios"
                        >
                            <i className="bi bi-gear-fill text-lg xl:text-xl" />
                        </Link>
                        <button
                            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl xl:rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto mt-2 xl:mt-0"
                            title="Opções de Novo Item"
                        >
                            <i className="bi bi-plus-lg text-lg xl:text-xl" />
                            Novo Item
                            <i className={`bi bi-chevron-down ml-1 transition-transform ${isNewMenuOpen ? 'rotate-180' : ''}`}></i>
                        </button>

                        {isNewMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsNewMenuOpen(false)} />
                                <div className="absolute top-[calc(100%+8px)] right-0 w-52 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl py-2 shadow-2xl flex flex-col z-50 animate-slide-up">
                                    <h4 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Escolha o Tipo</h4>
                                    
                                    <button
                                        onClick={() => { setIsNewMenuOpen(false); setEditingProduct(null); setInitialFormData({ itemType: 'product' }); setIsFormModalOpen(true); }}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left outline-none group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <i className="bi bi-box-seam" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Produto</span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Item físico padrão</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setIsNewMenuOpen(false); setEditingProduct(null); setInitialFormData({ itemType: 'service' }); setIsFormModalOpen(true); }}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left outline-none group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <i className="bi bi-tools" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Serviço</span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Sem controle de estoque</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setIsNewMenuOpen(false); setEditingProduct(null); setInitialFormData({ itemType: 'product', isCombo: true }); setIsFormModalOpen(true); }}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left outline-none group border-t border-slate-100 dark:border-slate-800 mt-1"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <i className="bi bi-layers-fill" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Combo</span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Kit de vários produtos</span>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Header Actions Container */}
                    <div className="flex justify-between items-center px-2">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border ${isSidebarOpen
                                    ? 'bg-white text-blue-600 border-blue-100 dark:bg-slate-900 dark:border-blue-900/30'
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                                    }`}
                            >
                                <i className={`bi ${isSidebarOpen ? 'bi-funnel-fill' : 'bi-funnel'}`}></i>
                                Filtros
                            </button>

                            <button
                                onClick={() => { setIsTrashOpen(true); setIsDraftOpen(false); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border ${isTrashOpen ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500'}`}
                            >
                                <i className="bi bi-trash"></i>
                                Lixeira
                            </button>

                            <button
                                onClick={() => { setIsDraftOpen(!isDraftOpen); setIsTrashOpen(false); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border ${isDraftOpen
                                    ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30'
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800 hover:text-amber-500'
                                    }`}
                            >
                                <i className={`bi ${isDraftOpen ? 'bi-file-earmark-text-fill' : 'bi-file-earmark-text'}`}></i>
                                Rascunhos
                            </button>


                            <Link
                                to="/registrations/variations"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border bg-white text-indigo-600 border-indigo-200 dark:bg-slate-900 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            >
                                <i className="bi bi-ui-radios"></i>
                                Gerenciar Variações e Valores
                            </Link>

                        </div>

                        <div className="flex gap-3">

                            <div className="relative">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest ${showSettings
                                        ? 'border-blue-200 text-blue-600 dark:border-blue-800'
                                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                                        }`}
                                >
                                    <i className={`bi ${showSettings ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                                    Visualização
                                </button>

                                {showSettings && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                                        <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-slide-up">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Colunas da Tabela</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { key: 'code', label: 'Código' },
                                                    { key: 'description', label: 'Título do Produto' },
                                                    { key: 'category', label: 'Categoria' },
                                                    { key: 'createdAt', label: 'Data Criação' },
                                                    { key: 'costPrice', label: 'Preço de Custo' },
                                                    { key: 'unitPrice', label: 'Preço de Venda' },
                                                    { key: 'stock', label: 'Estoque' },
                                                    { key: 'actions', label: 'Ações' },
                                                ].map((col) => (
                                                    <button
                                                        key={col.key}
                                                        onClick={() => toggleVisibility(col.key as keyof ProductVisibilitySettings)}
                                                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition-all group outline-none"
                                                    >
                                                        <span className={`text-[11px] font-bold ${visibilitySettings[col.key as keyof ProductVisibilitySettings] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'}`}>
                                                            {col.label}
                                                        </span>
                                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${visibilitySettings[col.key as keyof ProductVisibilitySettings] ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                            <div className={`w-3 h-3 bg-white dark:bg-slate-300 rounded-full transition-transform ${visibilitySettings[col.key as keyof ProductVisibilitySettings] ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 rounded-none md:rounded-3xl shadow-none md:shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-visible md:overflow-hidden md:border border-slate-100 dark:border-slate-800 transition-colors">
                <ProductList
                    filters={isTrashOpen ? trashFilters : isDraftOpen ? draftFilters : activeFilters}
                    visibilitySettings={visibilitySettings}
                    onEdit={(p: any) => {
                        if (p.isVariation) {
                            setVariationParentProduct(p);
                            const actualVariation = p.variations?.find((v: Variation) => v.sku === p.sku);
                            setEditingVariation(actualVariation || (p as any));
                            setIsVariationModalOpen(true);
                        } else {
                            setEditingProduct(p);
                            setIsFormModalOpen(true);
                        }
                    }}
                    onShowHistory={(p) => { setHistoryProduct(p); setIsHistoryModalOpen(true); }}
                    onLaunchStock={(p: any) => {
                        if (p.isVariation) {
                            const actualVariation = p.variations?.find((v: Variation) => v.sku === p.sku);
                            setStockLaunchTarget({ variation: actualVariation || p });
                        } else {
                            setStockLaunchTarget({ product: p });
                        }
                        setIsStockModalOpen(true);
                    }}
                    onToggleColumn={toggleVisibility}
                    onSort={handleSort}
                    onDuplicate={handleDuplicate}
                    categoryTree={categoryTree}
                    ref={productListRef}
                    onRefresh={() => productListRef.current?.refresh()}
                />



                    </div>
                </div>
            </div>

            {/* Trash Modal */}
            {isTrashOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTrashOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-[80vh] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                                    Produtos Desativados
                                </h2>
                                <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">Gerencie produtos e serviços desativados (Lixeira)</p>
                            </div>
                            <button onClick={() => setIsTrashOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <i className="bi bi-x-lg text-xl"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <ProductList
                                onEdit={(p: any) => {
                                    if (p.isVariation) {
                                        setVariationParentProduct(p);
                                        const actualVariation = p.variations?.find((v: Variation) => v.sku === p.sku);
                                        setEditingVariation(actualVariation || (p as any));
                                        setIsVariationModalOpen(true);
                                    } else {
                                        setEditingProduct(p);
                                        setIsFormModalOpen(true);
                                    }
                                }}
                                onShowHistory={(p) => { setHistoryProduct(p); setIsHistoryModalOpen(true); }}
                                onLaunchStock={(p: any) => {
                                    if (p.isVariation) {
                                        const actualVariation = p.variations?.find((v: Variation) => v.sku === p.sku);
                                        setStockLaunchTarget({ variation: actualVariation || p });
                                    } else {
                                        setStockLaunchTarget({ product: p });
                                    }
                                    setIsStockModalOpen(true);
                                }}
                                filters={trashFilters}
                                visibilitySettings={visibilitySettings}
                                onToggleColumn={toggleVisibility}
                                onSort={handleSort}
                                categoryTree={categoryTree}
                                title="Produtos Desativados"
                                onCloseTrash={() => setIsTrashOpen(false)}
                                ref={trashListRef}
                                onRefresh={() => productListRef.current?.refresh()}
                            />

                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <ProductFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setEditingProduct(null); setInitialFormData(null); }}
                onSuccess={() => {
                    productListRef.current?.refresh();
                    trashListRef.current?.refresh();
                }}
                product={editingProduct}
                initialData={initialFormData}
            />

            <PriceHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => { setIsHistoryModalOpen(false); setHistoryProduct(null); }}
                product={historyProduct}
            />

            <VariationFormModal
                isOpen={isVariationModalOpen}
                onClose={() => { setIsVariationModalOpen(false); setEditingVariation(null); setVariationParentProduct(null); }}
                parentId={variationParentProduct?.parentId || ""}
                parentProduct={variationParentProduct || {} as any}
                variation={editingVariation}
            />

            <StockLaunchModal
                isOpen={isStockModalOpen}
                onClose={() => { setIsStockModalOpen(false); setStockLaunchTarget(null); }}
                targetProduct={stockLaunchTarget?.product || null}
                targetVariation={stockLaunchTarget?.variation}
            />
        </div>
    );
};

export default Products;