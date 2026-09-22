import React from 'react';
import Product from '../../../types/product.type';
import { checkERPLegibility } from '../utils/productLegibilityRules';

export type ProductFormTabId = 'geral' | 'ecommerce' | 'technical' | 'estoque' | 'variacoes' | 'fiscal' | 'ambientes';

export interface ProductTabItem {
    id: ProductFormTabId;
    label: string;
    icon: string;
}

interface ProductFormHeaderProps {
    readonly product?: Product | null;
    readonly isDraftProduct?: boolean;
    readonly formData: Partial<Product>;
    readonly ecomStatus: { isLegible: boolean; checks: Record<string, boolean> };
    readonly isService: boolean;
    readonly navigateToRequirementField: (fieldKey: string) => void;
    readonly handleCloseWithAutoSave: () => void;
    readonly activeTab: string;
    readonly setActiveTab: (tab: ProductFormTabId) => void;
    readonly validationErrors?: Record<string, boolean>;
}

export const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({
    product,
    isDraftProduct = false,
    formData,
    ecomStatus,
    isService,
    navigateToRequirementField,
    handleCloseWithAutoSave,
    activeTab,
    setActiveTab,
    validationErrors = {}
}) => {
    const erpStatus = checkERPLegibility(formData);
    const isComposition = formData.itemType === 'composition' || (formData as any).item_type === 'composition';

    const formTabs: readonly ProductTabItem[] = [
        { id: 'geral', label: 'Cadastro Geral', icon: '' },
        ...(!isService ? [
            { id: 'ecommerce' as const, label: 'Fotos', icon: 'bi-images' },
            { id: 'technical' as const, label: 'Características', icon: 'bi-info-circle' },
            { id: 'estoque' as const, label: 'Estoque e Precificação', icon: 'bi-box-seam' },
            { id: 'variacoes' as const, label: 'Variações', icon: 'bi-grid-3x3-gap' },
        ] : []),
        ...(!isComposition ? [{ id: 'fiscal' as const, label: 'Tributário / NF', icon: 'bi-file-earmark-text' }] : []),
    ];

    return (
        <>
            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {isDraftProduct
                            ? (product?.id ? 'Continuar Cadastramento' : 'Cadastro de Produto')
                            : (product ? 'Editar Produto' : 'Cadastro de Produto')}
                    </h2>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Pílula de Requisitos do ERP */}
                        <div className="relative group cursor-help">
                            <div className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${erpStatus.isLegible ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-400 dark:border-blue-900/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900/30'}`}>
                                <span>ERP: {erpStatus.isLegible ? 'Ativo' : 'Pendente'}</span>
                            </div>

                            <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requisitos do ERP (Cadastro / Ativação)</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-3">💡 Clique em qualquer item pendente para ir direto ao campo.</p>
                                <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <li onClick={() => navigateToRequirementField('name')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${erpStatus.checks.description ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}></i>
                                            <span className={erpStatus.checks.description ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Nome do Produto (Mínimo 2 letras)</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    <li onClick={() => navigateToRequirementField('unitPrice')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${erpStatus.checks.unitPrice ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}></i>
                                            <span className={erpStatus.checks.unitPrice ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Preço de Venda &gt; R$ 0 (ou Variações)</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    <li onClick={() => navigateToRequirementField('categoryIds')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${erpStatus.checks.categories ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}></i>
                                            <span className={erpStatus.checks.categories ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Pelo menos 1 Categoria</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    <li onClick={() => navigateToRequirementField('mainSupplierId')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${erpStatus.checks.supplier ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}></i>
                                            <span className={erpStatus.checks.supplier ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Pelo menos 1 Fornecedor</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Pílula de Requisitos do Catálogo */}
                        <div className="relative group cursor-help">
                            <div className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${formData.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                                <span>Catálogo: {formData.status === 'published' ? 'Publicado' : 'Ocultado'}</span>
                            </div>

                            <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requisitos do Catálogo</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-3">💡 Clique em qualquer item pendente para ir direto ao campo.</p>
                                <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <li onClick={() => navigateToRequirementField('marketplaceTitle')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${ecomStatus.checks.marketplaceTitle ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                            <span className={ecomStatus.checks.marketplaceTitle ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Título do Produto (Catálogo)</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    <li onClick={() => navigateToRequirementField('unitPrice')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${ecomStatus.checks.unitPrice ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                            <span className={ecomStatus.checks.unitPrice ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Preço de Venda &gt; R$ 0</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    <li onClick={() => navigateToRequirementField('images')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${ecomStatus.checks.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                            <span className={ecomStatus.checks.images ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Pelo menos 1 Foto principal</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    <li onClick={() => navigateToRequirementField('categories')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                        <div className="flex items-center gap-2">
                                            <i className={`bi ${ecomStatus.checks.categories ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                            <span className={ecomStatus.checks.categories ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Pelo menos 1 Categoria</span>
                                        </div>
                                        <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
                                    </li>
                                    {!isService && (
                                        <li onClick={() => navigateToRequirementField('dimensions')} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item">
                                            <div className="flex items-center gap-2">
                                                <i className={`bi ${ecomStatus.checks.dimensions ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}></i>
                                                <span className={ecomStatus.checks.dimensions ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 font-bold'}>Dimensões físicas (L x A x P)</span>
                                            </div>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <button 
                    type="button"
                    onClick={handleCloseWithAutoSave} 
                    aria-label="Fechar formulário"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all self-end sm:self-auto cursor-pointer"
                >
                    <i className="bi bi-x-lg text-lg" aria-hidden="true" />
                </button>
            </div>

            <div className="px-6 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10 overflow-x-auto scrollbar-none">
                <div className="flex gap-6 min-w-max" role="tablist" aria-label="Abas do formulário de produto">
                    {formTabs.map((tab) => {
                        const hasTabErrors =
                            (tab.id === 'geral' && (validationErrors.name || validationErrors.categoryIds)) ||
                            (tab.id === 'estoque' && (validationErrors.unitPrice || validationErrors.mainSupplierId)) ||
                            (tab.id === 'variacoes' && validationErrors.variationsImages);

                        const hasCategory = (formData.categoryIds || []).length > 0;
                        const isTabDisabled = tab.id === 'technical' && !hasCategory;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-disabled={isTabDisabled}
                                disabled={isTabDisabled}
                                onClick={() => !isTabDisabled && setActiveTab(tab.id)}
                                title={isTabDisabled ? 'Selecione pelo menos uma categoria no Cadastro Geral para habilitar as Características' : undefined}
                                className={`py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                                    isTabDisabled
                                        ? 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                                        : hasTabErrors
                                        ? (activeTab === tab.id ? 'border-red-500 text-red-600' : 'border-red-200 text-red-500 cursor-pointer')
                                        : (activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer')
                                }`}
                            >
                                {tab.icon && <i className={`bi ${tab.icon}`} aria-hidden="true" />}
                                <span>{tab.label}</span>
                                {isTabDisabled && <i className="bi bi-lock-fill text-[10px] text-slate-300 dark:text-slate-600" aria-hidden="true" />}
                                {hasTabErrors && !isTabDisabled && <i className="bi bi-exclamation-circle-fill text-red-500 text-xs animate-pulse" aria-hidden="true" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
