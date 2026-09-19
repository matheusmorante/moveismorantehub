import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Product, { Variation } from '../../../types/product.type';
import ManageAttributesModal from '../components/modals/ManageAttributesModal';
import VariationPhotosTab from '../components/tabs/VariationPhotosTab';
import { useVariationForm } from '../hooks/useVariationForm';
import { VariationIdentificationTab } from '../components/variationTabs/VariationIdentificationTab';
import { VariationPricingTab } from '../components/variationTabs/VariationPricingTab';
import { VariationTechnicalTab } from '../components/variationTabs/VariationTechnicalTab';
import { VariationCompositionItemsTab } from '../components/variationTabs/VariationCompositionItemsTab';
import { checkERPLegibility, checkEcomLegibility } from '../utils/productLegibilityRules';

interface VariationFormModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly parentId?: string;
    readonly parentProduct: Product;
    readonly variation: Variation | null;
    readonly onSuccess?: () => void;
    readonly onSave?: (updatedVariation: Variation) => void;
}

type VariationTabId = 'identificacao' | 'fotos' | 'estoque' | 'tecnico' | 'compostos';

interface TabDefinition {
    readonly id: VariationTabId;
    readonly label: string;
    readonly icon: string;
}

const getFormTabs = (isComposition: boolean): readonly TabDefinition[] => {
    const tabs: TabDefinition[] = [
        { id: 'identificacao', label: 'Identificação e Atributos', icon: 'bi-info-circle' },
        { id: 'fotos', label: 'Fotos da Variação', icon: 'bi-images' },
    ];
    
    if (isComposition) {
        tabs.push({ id: 'compostos', label: 'Produtos Componentes', icon: 'bi-diagram-3' });
    }
    
    tabs.push({ id: 'estoque', label: 'Estoque e Precificação', icon: 'bi-box-seam' });
    tabs.push({ id: 'tecnico', label: 'Informações Técnicas', icon: 'bi-gear' });
    
    return tabs;
};

export const VariationFormModal: React.FC<VariationFormModalProps> = (props) => {
    const { isOpen, onClose, parentProduct, variation } = props;

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const {
        loading,
        activeTab,
        setActiveTab,
        formData,
        setFormData,
        allParentImages,
        diferenciarTitulo,
        setDiferenciarTitulo,
        dbAttributes,
        dbAttributeValues,
        isManageAttributesOpen,
        setIsManageAttributesOpen,
        fetchDbAttributes,
        varDiscountPercent,
        varDiscountFixed,
        getParentDiscountPercent,
        getParentDiscountFixed,
        getDefaultVariationName,
        getDefaultVariationTitle,
        handlePriceChange,
        handleDiscountPercentChange,
        handleDiscountFixedChange,
        handlePromoPriceFieldChange,
        handleChange,
        updateCost,
        handleSubmit
    } = useVariationForm(props);

    if (!isOpen || !formData) return null;

    const effectiveProductForValidation: Partial<Product> = {
        ...parentProduct,
        description: formData.name || parentProduct.name || parentProduct.description,
        unitPrice: formData.syncUnitPrice ? parentProduct.unitPrice : (formData.unitPrice || parentProduct.unitPrice),
        images: (formData.images && formData.images.length > 0) ? formData.images : (parentProduct.images || []),
    };

    const erpStatus = checkERPLegibility(effectiveProductForValidation);
    const ecomStatus = checkEcomLegibility(effectiveProductForValidation);

    return createPortal(
        <div className="fixed inset-0 z-[1000020] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <button 
                type="button" 
                aria-label="Fechar modal" 
                className="fixed inset-0 bg-slate-900/75 backdrop-blur-md cursor-default" 
                onClick={onClose} 
            />
            
            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="variation-form-modal-title"
                className="relative bg-white dark:bg-slate-900 w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 z-10"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div>
                            <h2 id="variation-form-modal-title" className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                {variation ? 'Editar Variação' : 'Adicionar Variação'}
                                <span className="text-slate-400 text-xs font-normal">| {parentProduct.name || parentProduct.description || 'Produto Pai'}</span>
                            </h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                Configure os dados específicos desta variação.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Pílula ERP */}
                            <div className="relative group cursor-help">
                                <div className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${erpStatus.isLegible ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-400 dark:border-blue-900/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900/30'}`}>
                                    <span>ERP: {erpStatus.isLegible ? 'Ativo' : 'Pendente'}</span>
                                </div>

                                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requisitos do ERP (Variação / Ativação)</p>
                                    <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                                        <li className="flex items-center gap-2 p-1 rounded-xl">
                                            <i className={`bi ${erpStatus.checks.description ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`} aria-hidden="true" />
                                            <span className={erpStatus.checks.description ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 font-bold'}>Nome / Identificação Válida</span>
                                        </li>
                                        <li className="flex items-center gap-2 p-1 rounded-xl">
                                            <i className={`bi ${erpStatus.checks.unitPrice ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`} aria-hidden="true" />
                                            <span className={erpStatus.checks.unitPrice ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 font-bold'}>Preço de Venda &gt; R$ 0</span>
                                        </li>
                                        <li className="flex items-center gap-2 p-1 rounded-xl">
                                            <i className={`bi ${erpStatus.checks.categories ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`} aria-hidden="true" />
                                            <span className={erpStatus.checks.categories ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 font-bold'}>Categoria (Herdada do Pai)</span>
                                        </li>
                                        <li className="flex items-center gap-2 p-1 rounded-xl">
                                            <i className={`bi ${erpStatus.checks.supplier ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`} aria-hidden="true" />
                                            <span className={erpStatus.checks.supplier ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 font-bold'}>Fornecedor (Herdado do Pai)</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Pílula Catálogo */}
                            <div className="relative group cursor-help">
                                <div className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${parentProduct.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                                    <span>Catálogo: {parentProduct.status === 'published' ? 'Publicado' : 'Ocultado'}</span>
                                </div>

                                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Requisitos para o Catálogo</p>
                                    <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                                        <li className="flex items-center gap-2 p-1 rounded-xl">
                                            <i className={`bi ${ecomStatus.checks.unitPrice ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`} aria-hidden="true" />
                                            <span className={ecomStatus.checks.unitPrice ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 font-bold'}>Preço de Venda &gt; R$ 0</span>
                                        </li>
                                        <li className="flex items-center gap-2 p-1 rounded-xl">
                                            <i className={`bi ${ecomStatus.checks.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`} aria-hidden="true" />
                                            <span className={ecomStatus.checks.images ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 font-bold'}>Fotos vinculadas (Pai ou Variação)</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        aria-label="Fechar"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all self-end sm:self-auto cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-lg" aria-hidden="true" />
                    </button>
                </div>

                {/* Sub-Header Navegação de Abas */}
                <div className="px-6 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10 overflow-x-auto scrollbar-none">
                    <div className="flex items-center gap-6" role="tablist" aria-label="Abas da variação">
                        {getFormTabs(parentProduct.itemType === 'composition' || (parentProduct as any).item_type === 'composition').map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                <i className={`bi ${tab.icon}`} aria-hidden="true" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Corpo do Formulário */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar min-h-0">
                    {activeTab === 'identificacao' && (
                        <VariationIdentificationTab
                            formData={formData}
                            setFormData={setFormData}
                            parentProduct={parentProduct}
                            diferenciarTitulo={diferenciarTitulo}
                            setDiferenciarTitulo={setDiferenciarTitulo}
                            dbAttributes={dbAttributes}
                            dbAttributeValues={dbAttributeValues}
                            setIsManageAttributesOpen={setIsManageAttributesOpen}
                            getDefaultVariationName={getDefaultVariationName}
                            getDefaultVariationTitle={getDefaultVariationTitle}
                            fetchDbAttributes={fetchDbAttributes}
                        />
                    )}

                    {activeTab === 'fotos' && (
                        <VariationPhotosTab
                            images={formData.images || []}
                            parentImages={allParentImages.length > 0 ? allParentImages : (parentProduct?.images || [])}
                            onChangeImages={(newImages) => setFormData((prev) => prev ? ({ ...prev, images: newImages }) : null)}
                        />
                    )}

                    {activeTab === 'estoque' && (
                        <VariationPricingTab
                            formData={formData}
                            setFormData={setFormData}
                            parentProduct={parentProduct}
                            varDiscountPercent={varDiscountPercent}
                            varDiscountFixed={varDiscountFixed}
                            getParentDiscountPercent={getParentDiscountPercent}
                            getParentDiscountFixed={getParentDiscountFixed}
                            handlePriceChange={handlePriceChange}
                            handleDiscountPercentChange={handleDiscountPercentChange}
                            handleDiscountFixedChange={handleDiscountFixedChange}
                            handlePromoPriceFieldChange={handlePromoPriceFieldChange}
                            updateCost={updateCost}
                        />
                    )}

                    {activeTab === 'tecnico' && (
                        <VariationTechnicalTab
                            formData={formData}
                            setFormData={setFormData}
                            parentProduct={parentProduct}
                            handleChange={handleChange}
                        />
                    )}

                    {activeTab === 'compostos' && (
                        <VariationCompositionItemsTab
                            formData={formData}
                            setFormData={setFormData}
                            parentProduct={parentProduct}
                        />
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Concluir'}
                    </button>
                </div>

                {/* Manage Global Attributes & Values Modal */}
                <ManageAttributesModal 
                    isOpen={isManageAttributesOpen} 
                    onClose={() => {
                        setIsManageAttributesOpen(false);
                        fetchDbAttributes();
                    }} 
                />
            </div>
        </div>,
        document.body
    );
};

export default VariationFormModal;
