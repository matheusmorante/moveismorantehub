import React from 'react';
import { ProductFilters as ProductFiltersType, ProductVisibilitySettings, Variation } from '../../types/product';
import ProductList from './ProductList';
import ProductFilters from './ProductFilters';
import ProductFormModal from './ProductFormModal';
import VariationFormModal from './VariationFormModal';
import PriceHistoryModal from './PriceHistoryModal';
import StockLaunchModal from '../Stock/components/StockLaunchModal';
import { supabase } from '../../utils/supabaseConfig';
import { calculateVariationCatalogStats } from './ProductList/registeredVariationCount';
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

const Products: React.FC = () => {
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

    const [isTrashOpen, setIsTrashOpen] = React.useState(false);
    const [isDraftsOpen, setIsDraftsOpen] = React.useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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
        } catch (err) {
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

    const activeFilters = React.useMemo(() => ({ ...filters, showTrash: false, activeOnly: true, isDraft: false }), [filters]);
    const trashFilters = React.useMemo(() => ({ ...filters, showTrash: true, activeOnly: false, isDraft: false }), [filters]);
    const draftFilters = React.useMemo(() => ({ ...filters, showTrash: false, isDraft: true, activeOnly: undefined }), [filters]);

    const currentFilters = isDraftsOpen ? draftFilters : isTrashOpen ? trashFilters : activeFilters;
    const currentTitle = isDraftsOpen ? "Rascunhos de Produtos" : isTrashOpen ? "Produtos Desativados" : undefined;
    const handleCloseSpecialView = isDraftsOpen ? () => setIsDraftsOpen(false) : isTrashOpen ? () => setIsTrashOpen(false) : undefined;

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
                                    placeholder={isDraftsOpen ? "Pesquisar rascunhos..." : isTrashOpen ? "Pesquisar produtos desativados..." : "Pesquisar produtos ativos..."}
                                    value={filters.search || ""}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                            </div>

                            {/* Botão de Filtros - Oculto em Telas Maiores (>= xl) já que os filtros ficam na Sidebar Direita Sanfonada */}
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`xl:hidden flex items-center gap-2 px-4 py-3 rounded-2xl transition-all shadow-sm font-bold text-[10px] uppercase tracking-widest border shrink-0 ${isSidebarOpen
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600'
                                    }`}
                                title="Filtros Avançados"
                            >
                                <i className={`bi ${isSidebarOpen ? 'bi-funnel-fill' : 'bi-funnel'}`}></i>
                                <span>Filtros</span>
                            </button>

                            <div className="flex gap-2 ml-auto shrink-0 items-center">
                                {/* Botão para Abrir Rascunhos */}
                                <button
                                    onClick={() => {
                                        setIsDraftsOpen(prev => !prev);
                                        setIsTrashOpen(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all shadow-sm font-bold text-xs tracking-wide whitespace-nowrap active:scale-95 border ${isDraftsOpen 
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20' 
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                    }`}
                                    title="Ver Rascunhos de Produtos em andamento"
                                >
                                    <i className="bi bi-file-earmark-text text-amber-500 text-sm"></i>
                                    <span>Rascunhos</span>
                                    {catalogStats.drafts > 0 && (
                                        <span className="ml-0.5 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-black rounded-full">
                                            {catalogStats.drafts}
                                        </span>
                                    )}
                                </button>

                                {/* Botão para Abrir Produtos Desativados */}
                                <button
                                    onClick={() => {
                                        setIsTrashOpen(prev => !prev);
                                        setIsDraftsOpen(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all shadow-sm font-bold text-xs tracking-wide whitespace-nowrap active:scale-95 border ${isTrashOpen 
                                        ? 'bg-slate-700 text-white border-slate-800' 
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                    }`}
                                    title="Ver Produtos Desativados no ERP"
                                >
                                    <i className="bi bi-slash-circle text-rose-500 text-sm"></i>
                                    <span>Produtos Desativados</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setEditingProduct(null);
                                        setInitialFormData(null);
                                        setIsFormModalOpen(true);
                                    }}
                                    className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl transition-all shadow-lg shadow-emerald-500/30 font-black text-xs tracking-wide whitespace-nowrap active:scale-95 border border-emerald-400/30"
                                >
                                    <i className="bi bi-plus-lg text-sm font-black" />
                                    <span>Novo Produto</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section: Product Table (Esquerda) + Sidebar Direita (Sanfonada) */}
                    <div className="flex gap-6 flex-1 items-start">
                        {/* Conteúdo Principal: Tabela de Produtos (Esquerda/Centro) */}
                        <div className="flex-1 min-w-0">
                            <ProductList
                                filters={currentFilters}
                                title={currentTitle}
                                onCloseTrash={handleCloseSpecialView}
                                visibilitySettings={visibilitySettings}
                                onEdit={(p: any) => {
                                    if (p.isVariation) {
                                        setVariationParentProduct(p);
                                        const varIdStr = p.variationId ? String(p.variationId).toLowerCase() : '';
                                        const pSkuStr = p.sku ? String(p.sku).trim().toLowerCase() : '';
                                        const actualVariation = p.variations?.find((v: Variation) => {
                                            const vIdStr = v.id ? String(v.id).toLowerCase() : '';
                                            const vSkuStr = v.sku ? String(v.sku).trim().toLowerCase() : '';
                                            if (varIdStr && vIdStr && varIdStr === vIdStr) return true;
                                            if (pSkuStr && vSkuStr && pSkuStr === vSkuStr) return true;
                                            return false;
                                        });
                                        const realId = p.variationId || (p.id && p.id.includes('_') ? p.id.split('_').slice(1).join('_') : p.id);
                                        setEditingVariation(actualVariation || { ...p, id: realId });
                                        setIsVariationModalOpen(true);
                                    } else {
                                        setEditingProduct(p);
                                        setIsFormModalOpen(true);
                                    }
                                }}
                                onShowHistory={(p) => { setHistoryProduct(p); setIsHistoryModalOpen(true); }}
                                onLaunchStock={(p: any) => {
                                    if (p.isVariation) {
                                        const varIdStr = p.variationId ? String(p.variationId).toLowerCase() : '';
                                        const pSkuStr = p.sku ? String(p.sku).trim().toLowerCase() : '';
                                        const actualVariation = p.variations?.find((v: Variation) => {
                                            const vIdStr = v.id ? String(v.id).toLowerCase() : '';
                                            const vSkuStr = v.sku ? String(v.sku).trim().toLowerCase() : '';
                                            if (varIdStr && vIdStr && varIdStr === vIdStr) return true;
                                            if (pSkuStr && vSkuStr && pSkuStr === vSkuStr) return true;
                                            return false;
                                        });
                                        const realId = p.variationId || (p.id && p.id.includes('_') ? p.id.split('_').slice(1).join('_') : p.id);
                                        setStockLaunchTarget({ variation: actualVariation || { ...p, id: realId } });
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
                                            Resumo dos Produtos
                                        </h4>
                                    </div>
                                    <i className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${accordionOpen.summary ? 'rotate-180' : ''}`} />
                                </button>

                                {accordionOpen.summary && (
                                    <div className="flex flex-col gap-2 mt-3 animate-fade-in">
                                        <button 
                                            type="button"
                                            onClick={() => { setIsTrashOpen(false); setIsDraftsOpen(false); }}
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
                                                onClick={() => { setIsTrashOpen(false); setIsDraftsOpen(false); }}
                                                className="p-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-left transition-colors"
                                            >
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Publicados</span>
                                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                                    {catalogStats.published}
                                                </span>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => { setIsTrashOpen(true); setIsDraftsOpen(false); }}
                                                className="p-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-left transition-colors"
                                            >
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Desativados</span>
                                                <span className="text-base font-black text-rose-500 dark:text-rose-400 mt-0.5 block">
                                                    {catalogStats.disabled}
                                                </span>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => { setIsDraftsOpen(true); setIsTrashOpen(false); }}
                                                className="col-span-2 p-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-left transition-colors"
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

                            {/* TÓPICO 3: Visibilidade de Colunas (Sanfona) */}
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('columns')}
                                    className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                                            <i className="bi bi-eye-fill" />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                            Visibilidade das Colunas
                                        </h4>
                                    </div>
                                    <i className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${accordionOpen.columns ? 'rotate-180' : ''}`} />
                                </button>

                                {accordionOpen.columns && (
                                    <div className="grid grid-cols-1 gap-1 mt-3 animate-fade-in">
                                        {[
                                            { key: 'code', label: 'SKU / Código' },
                                            { key: 'description', label: 'Título do Produto' },
                                            { key: 'category', label: 'Categoria' },
                                            { key: 'createdAt', label: 'Data de Criação' },
                                            { key: 'unitPrice', label: 'Preço de Venda' },
                                            { key: 'stock', label: 'Estoque' },
                                            { key: 'status', label: 'Canais de Venda' },
                                            { key: 'actions', label: 'Ações da Linha' },
                                        ].map((col) => (
                                            <button
                                                key={col.key}
                                                onClick={() => toggleVisibility(col.key as keyof ProductVisibilitySettings)}
                                                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left outline-none"
                                            >
                                                <span className={`text-xs font-bold ${visibilitySettings[col.key as keyof ProductVisibilitySettings] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                                                    {col.label}
                                                </span>
                                                <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${visibilitySettings[col.key as keyof ProductVisibilitySettings] ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                    <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${visibilitySettings[col.key as keyof ProductVisibilitySettings] ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* TÓPICO 4: Produtos Desativados (Sanfona) */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('shortcuts')}
                                    className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                                            <i className="bi bi-slash-circle" />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                            Produtos Desativados
                                        </h4>
                                    </div>
                                    <i className={`bi bi-chevron-down text-slate-400 text-xs transition-transform duration-200 ${accordionOpen.shortcuts ? 'rotate-180' : ''}`} />
                                </button>

                                {accordionOpen.shortcuts && (
                                    <div className="mt-3 animate-fade-in">
                                        <button
                                            onClick={() => setIsTrashOpen(true)}
                                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <i className="bi bi-eye-slash text-amber-500" />
                                                <span>Ver Produtos Desativados</span>
                                            </div>
                                            <i className="bi bi-chevron-right text-slate-400 text-xs" />
                                        </button>
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
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <i className="bi bi-funnel-fill text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Filtros Avançados</h3>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                            >
                                <i className="bi bi-x-lg text-sm" />
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
