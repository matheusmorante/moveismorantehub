import React from 'react';
import { ProductFilters as ProductFiltersType, ProductVisibilitySettings, Variation } from '../../types/product';
import ProductList from './ProductList';
import ProductFilters from './ProductFilters';
import ProductFormModal from './modals/ProductFormModal';
import VariationFormModal from './modals/VariationFormModal';
import PriceHistoryModal from './modals/PriceHistoryModal';
import StockLaunchModal from '../Stock/components/StockLaunchModal';
import { supabase } from '../../utils/supabaseConfig';
import { calculateVariationCatalogStats } from './ProductList/utils/registeredVariationCount';
import { resolveProductVariation } from './utils/resolveProductVariation';
const categoryTree = undefined;

const defaultVisibility: ProductVisibilitySettings = {
    code: true,
    description: true,
    category: true,
    createdAt: true,
    unitPrice: true,
    stock: true,
    status: true,
    actions: true,
};

interface ProductsProps {
    mode?: 'standard' | 'composition';
}

const Products: React.FC<ProductsProps> = ({ mode = 'standard' }) => {
    const [filters, setFilters] = React.useState<ProductFiltersType>({});
    const [visibilitySettings, setVisibilitySettings] = React.useState<ProductVisibilitySettings>(defaultVisibility);
    const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState<any | null>(null);
    const [initialFormData, setInitialFormData] = React.useState<any | null>(null);

    const [isVariationModalOpen, setIsVariationModalOpen] = React.useState(false);
    const [editingVariation, setEditingVariation] = React.useState<Variation | null>(null);
    const [variationParentProduct, setVariationParentProduct] = React.useState<any | null>(null);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
    const [historyProduct, setHistoryProduct] = React.useState<any | null>(null);

    const [isStockModalOpen, setIsStockModalOpen] = React.useState(false);
    const [stockLaunchTarget, setStockLaunchTarget] = React.useState<{ product?: any; variation?: Variation } | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsActionsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [accordionOpen, setAccordionOpen] = React.useState<{
        summary: boolean;
        filters: boolean;
        columns: boolean;
        shortcuts: boolean;
    }>({
        summary: true,
        filters: true,
        columns: true,
        shortcuts: true
    });

    const toggleAccordion = (key: keyof typeof accordionOpen) => {
        setAccordionOpen(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [catalogStats, setCatalogStats] = React.useState({
        total: 0,
        published: 0,
        disabled: 0,
        drafts: 0
    });

    const fetchStats = React.useCallback(async () => {
        try {
            const { data: allProducts } = await supabase
                .from('products')
                .select('id, status, active, is_draft, deleted, product_variations(id, sku, status, active)')
                .eq('deleted', false);

            const stats = calculateVariationCatalogStats(allProducts || []);
            setCatalogStats(stats);
        } catch (err: unknown) {
            console.error('Erro ao carregar estatísticas dos produtos:', err);
        }
    }, []);

    React.useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const productListRef = React.useRef<{ refresh: () => void }>(null);
    const trashListRef = React.useRef<{ refresh: () => void }>(null);

    const toggleVisibility = (column: keyof ProductVisibilitySettings) => {
        setVisibilitySettings(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };

    const handleSort = (_field: string, _direction: 'asc' | 'desc') => {
        // Ordenação gerenciada internamente pela ProductList
    };

    const currentFilters = React.useMemo(() => ({
        ...filters,
        showTrash: false,
        activeOnly: filters.activeOnly,
        isDraft: filters.isDraft
    }), [filters]);
    const currentTitle = filters.isDraft ? (mode === 'composition' ? "Rascunhos de Composições" : "Rascunhos de Produtos") : undefined;
    const handleCloseSpecialView = filters.isDraft ? () => setFilters(prev => ({ ...prev, isDraft: undefined })) : undefined;

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative pb-16">
            <div className="flex-1 flex flex-col min-w-0 p-0.5 sm:p-2 lg:p-6 xl:p-8">
                <div className="flex flex-col gap-3 sm:gap-6 flex-1 min-h-0">
                    {/* Header Actions Container */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 px-0.5 sm:px-1">
                        <div className="flex flex-wrap items-center gap-3 w-full">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600"></i>
                                <input
                                    type="text"
                                    placeholder={mode === 'composition' ? "Pesquisar composições..." : "Pesquisar produtos..."}
                                    value={filters.search || ""}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                            </div>

                            <div className="flex gap-2 ml-auto shrink-0 items-center" ref={menuRef}>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl transition-all shadow-sm active:scale-95"
                                        title="Opções"
                                    >
                                        <i className="bi bi-three-dots-vertical text-lg" />
                                    </button>

                                    {isActionsMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                            <button
                                                onClick={() => {
                                                    setEditingProduct(null);
                                                    setInitialFormData(mode === 'composition' ? { itemType: 'composition' } : null);
                                                    setIsFormModalOpen(true);
                                                    setIsActionsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <i className="bi bi-plus-lg" />
                                                </div>
                                                {mode === 'composition' ? 'Nova Composição' : 'Novo Produto'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsSidebarOpen(true);
                                                    setIsActionsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <i className="bi bi-funnel" />
                                                </div>
                                                Filtros
                                            </button>

                                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4"></div>

                                            <button
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, activeOnly: prev.activeOnly === false ? true : false }));
                                                    setIsActionsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${filters.activeOnly === false ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    <i className={`bi ${filters.activeOnly === false ? 'bi-eye' : 'bi-eye-slash'}`} />
                                                </div>
                                                {filters.activeOnly === false ? 'Ocultar Inativos' : 'Mostrar Inativos'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Product Table (Esquerda) + Sidebar Direita (Sanfonada) */}
                    <div className="flex gap-6 flex-1 items-start">
                        {/* Conteúdo Principal: Tabela de Produtos (Esquerda/Centro) */}
                        <div className="flex-1 min-w-0">
                            <ProductList
                                mode={mode}
                                filters={currentFilters}
                                title={currentTitle}
                                onCloseTrash={handleCloseSpecialView}
                                visibilitySettings={visibilitySettings}
                                onEdit={(p: any) => {
                                    if (p.isVariation) {
                                        setVariationParentProduct(p);
                                        setEditingVariation(resolveProductVariation(p));
                                        setIsVariationModalOpen(true);
                                    } else {
                                        setEditingProduct(p);
                                        setIsFormModalOpen(true);
                                    }
                                }}
                                onShowHistory={(p) => { setHistoryProduct(p); setIsHistoryModalOpen(true); }}
                                onLaunchStock={(p: any) => {
                                    if (p.isVariation) {
                                        setStockLaunchTarget({ variation: resolveProductVariation(p) });
                                    } else {
                                        setStockLaunchTarget({ product: p });
                                    }
                                    setIsStockModalOpen(true);
                                }}
                                onToggleColumn={toggleVisibility}
                                onSort={handleSort}
                                categoryTree={categoryTree}
                                ref={productListRef}
                                onRefresh={() => {
                                    productListRef.current?.refresh();
                                    fetchStats();
                                }}
                            />
                        </div>

                        <div className="hidden xl:block w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm p-4 space-y-4">
                            
                            {/* TÓPICO 1: Resumo do Catálogo (Sanfona) */}
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('summary')}
                                    className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                            <i className="bi bi-pie-chart-fill" />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                            {mode === 'composition' ? 'Resumo das Composições' : 'Resumo dos Produtos'}
                                        </h4>
                                    </div>
                                    <i className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${accordionOpen.summary ? 'rotate-180' : ''}`} />
                                </button>

                                {accordionOpen.summary && (
                                    <div className="flex flex-col gap-2 mt-3 animate-fade-in">
                                        <button 
                                            type="button"
                                            onClick={() => { setIsTrashOpen(false); setFilters(prev => ({ ...prev, activeOnly: undefined, isDraft: undefined })); }}
                                            className="w-full p-3 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <i className="bi bi-boxes text-blue-600 dark:text-blue-400 text-sm" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">Total de Cadastrados</span>
                                            </div>
                                            <span className="text-base font-black text-blue-800 dark:text-blue-300">
                                                {catalogStats.total}
                                            </span>
                                        </button>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => { setIsTrashOpen(false); setFilters(prev => ({ ...prev, activeOnly: true, isDraft: undefined })); }}
                                                className={`p-3 rounded-2xl border text-left transition-colors ${filters.activeOnly === true && !filters.isDraft ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800'}`}
                                            >
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Publicados</span>
                                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                                    {catalogStats.published}
                                                </span>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, activeOnly: prev.activeOnly === false ? undefined : false, isDraft: undefined }));
                                                }}
                                                className={`p-3 rounded-2xl border text-left transition-colors ${filters.activeOnly === false ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800'}`}
                                            >
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Desativados</span>
                                                <span className="text-base font-black text-rose-500 dark:text-rose-400 mt-0.5 block">
                                                    {catalogStats.disabled}
                                                </span>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => { setFilters(prev => ({ ...prev, isDraft: prev.isDraft === true ? undefined : true, activeOnly: undefined })); }}
                                                className={`col-span-2 p-3 rounded-2xl border flex items-center justify-between text-left transition-colors ${filters.isDraft === true ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-sm' : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/60 dark:border-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <i className="bi bi-file-earmark-text text-amber-500 text-sm" />
                                                    <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">Rascunhos (Em Cadastro)</span>
                                                </div>
                                                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                                    {catalogStats.drafts}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* TÓPICO 2: Filtros Avançados (Sanfona) */}
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('filters')}
                                    className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                                            <i className="bi bi-funnel-fill" />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                            Filtros
                                        </h4>
                                    </div>
                                    <i className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${accordionOpen.filters ? 'rotate-180' : ''}`} />
                                </button>

                                {accordionOpen.filters && (
                                    <div className="mt-3 animate-fade-in">
                                        <ProductFilters filters={filters} setFilters={setFilters} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Filtros para Mobile (< lg) */}
            {isSidebarOpen && (
                <div 
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-filters-title"
                    onKeyDown={(e) => { if (e.key === 'Escape') setIsSidebarOpen(false); }}
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in lg:hidden"
                >
                    <button
                        type="button"
                        aria-label="Fechar filtros avançados"
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md cursor-default border-0 p-0 m-0 w-full h-full"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div 
                        className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center" aria-hidden="true">
                                    <i className="bi bi-funnel-fill text-lg" />
                                </div>
                                <div>
                                    <h3 id="mobile-filters-title" className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Filtros Avançados</h3>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                aria-label="Fechar filtros"
                                onClick={() => setIsSidebarOpen(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                            >
                                <i className="bi bi-x-lg text-sm" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <ProductFilters filters={filters} setFilters={setFilters} />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                            >
                                Aplicar Filtros
                            </button>
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
                    fetchStats();
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
                onClose={() => {
                    setIsVariationModalOpen(false);
                    setEditingVariation(null);
                    setVariationParentProduct(null);
                    productListRef.current?.refresh();
                    fetchStats();
                }}
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
