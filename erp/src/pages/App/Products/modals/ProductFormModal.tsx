import React from "react";
import { createPortal } from "react-dom";
import Product from '@/pages/types/product.type';
import { toast } from "react-toastify";

// Modular Components
import VariationFormModal from "./VariationFormModal";
import CategorySearchModal from "../CategorySearchModal";
import ProductConversionModal from "../components/modals/ProductConversionModal";
import { ProductFormHeader } from '../components/ProductFormHeader';
import { ProductSaveResultModal } from '../components/modals/ProductSaveResultModal';
import { ProductFormFooter } from '../components/ProductFormFooter';

// Modular Tab Components
import ProductGeneralTab from "../components/tabs/ProductGeneralTab";
import ProductVariationsTab from "../components/tabs/ProductVariationsTab";
import ProductEcommerceTab from "../components/tabs/ProductEcommerceTab";
import ProductInventoryTab from "../components/tabs/ProductInventoryTab";
import ProductFiscalTab from "../components/tabs/ProductFiscalTab";
import ProductTechnicalTab from "../components/tabs/ProductTechnicalTab";

// Orchestrator Hook
import { useProductFormModal, UseProductFormModalProps } from '../hooks/useProductFormModal';

export type ProductFormModalProps = UseProductFormModalProps;

const ProductFormModal: React.FC<ProductFormModalProps> = (props) => {
    const { isOpen, onClose, product, onSuccess } = props;

    const {
        activeTab,
        setActiveTab,
        activeEcommerceSubTab,
        setActiveEcommerceSubTab,
        loading,
        saveResult,
        setSaveResult,
        validationErrors,
        setValidationErrors,
        isCategorySearchOpen,
        setIsCategorySearchOpen,
        suppliers,
        availableCategories,
        isConversionModalOpen,
        setIsConversionModalOpen,
        formData,
        setFormData,
        isService,
        isDraftProduct,
        ecomStatus,
        pricing,
        ai,
        variations,
        draft,
        images,
        navigateToRequirementField,
        handleSubmit,
        handleCloseWithAutoSave,
        handleCategorySelect,
    } = useProductFormModal(props);

    if (!isOpen) return null;

    const formTabs = [
        { id: 'geral', label: 'Cadastro Geral' },
        !isService && { id: 'ecommerce', label: 'Fotos' },
        !isService && { id: 'technical', label: 'Informações Técnicas' },
        !isService && { id: 'estoque', label: 'Estoque e Precificação' },
        !isService && { id: 'variacoes', label: 'Variações' },
        { id: 'fiscal', label: 'Tributário / NF' },
    ].filter(Boolean) as { id: typeof activeTab; label: string }[];

    const currentTabIdx = formTabs.findIndex(t => t.id === activeTab);
    const isLastStep = currentTabIdx === formTabs.length - 1;
    const nextTabObj = formTabs[currentTabIdx + 1];

    return createPortal(
        <div className="fixed inset-0 z-[1000010] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseWithAutoSave} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border border-slate-100 dark:border-slate-800">
                <ProductFormHeader
                    product={product}
                    formData={formData}
                    ecomStatus={ecomStatus}
                    isService={isService}
                    navigateToRequirementField={navigateToRequirementField}
                    handleCloseWithAutoSave={handleCloseWithAutoSave}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    validationErrors={validationErrors}
                />

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {activeTab === 'geral' && (
                        <ProductGeneralTab
                            onOpenCategorySearch={() => setIsCategorySearchOpen(true)}
                            isService={isService}
                            formData={formData}
                            setFormData={setFormData}
                            availableCategories={availableCategories}
                            validationErrors={validationErrors}
                            setValidationErrors={setValidationErrors}
                            isGeneratingCategory={ai.isGeneratingCategory}
                        />
                    )}

                    {activeTab === 'ecommerce' && (
                        <ProductEcommerceTab
                            formData={formData}
                            setFormData={setFormData}
                            activeEcommerceSubTab={activeEcommerceSubTab}
                            setActiveEcommerceSubTab={setActiveEcommerceSubTab}
                            isDraggingPhoto={images.isDraggingPhoto}
                            setIsDraggingPhoto={images.setIsDraggingPhoto}
                            handleFileChange={images.handleFileChange}
                            removingPhoto={images.removingPhoto}
                            removePhoto={images.removePhoto}
                            handleGenerateAIDescription={ai.handleGenerateAIDescription}
                            isGeneratingDescription={ai.isGeneratingDescription}
                            handleGenerateMarketplaceTitle={ai.handleGenerateMarketplaceTitle}
                            isGeneratingTitle={ai.isGeneratingTitle}
                        />
                    )}

                    {activeTab === 'technical' && (
                        <ProductTechnicalTab
                            formData={formData}
                            setFormData={setFormData}
                            validationErrors={validationErrors}
                        />
                    )}

                    {activeTab === 'estoque' && (
                        <ProductInventoryTab
                            formData={formData}
                            setFormData={setFormData}
                            suppliers={suppliers}
                            validationErrors={validationErrors}
                            discountPercent={pricing.discountPercent}
                            discountFixed={pricing.discountFixed}
                            onDiscountPercentChange={pricing.handleDiscountPercentChange}
                            onDiscountFixedChange={pricing.handleDiscountFixedChange}
                            onPriceChange={pricing.handlePriceChange}
                            onPromoPriceChange={pricing.handlePromoPriceFieldChange}
                            onSuggestPrices={ai.handleSuggestPrices}
                            isSuggestingPrices={ai.isSuggestingPrices}
                        />
                    )}

                    {activeTab === 'variacoes' && (
                        <ProductVariationsTab
                            formData={formData}
                            setFormData={setFormData}
                            onAddVariation={variations.addVariation}
                            onEditVariation={variations.setEditingVariationId}
                            onRemoveVariation={variations.removeVariation}
                            validationErrors={validationErrors}
                            onOpenConversionModal={() => setIsConversionModalOpen(true)}
                        />
                    )}

                    {activeTab === 'fiscal' && (
                        <ProductFiscalTab
                            formData={formData}
                            setFormData={setFormData}
                            isNcmAutoEnabled={ai.isNcmAutoEnabled}
                            toggleNcmAuto={ai.toggleNcmAuto}
                            isGeneratingNCM={ai.isGeneratingNCM}
                        />
                    )}
                </div>

                <ProductFormFooter
                    isDraftProduct={isDraftProduct}
                    canSaveDraft={draft.canSaveDraft}
                    isSavingDraft={draft.isSavingDraft}
                    loading={loading}
                    isAiProcessing={ai.isAiProcessing}
                    isLastStep={isLastStep}
                    onSaveDraft={() => draft.saveDraftManually(formData)}
                    onClose={onClose}
                    onNextStep={() => {
                        if (nextTabObj) setActiveTab(nextTabObj.id as any);
                    }}
                    onSubmit={() => handleSubmit()}
                />

                {variations.editingVariationId && formData.variations?.some(v => v.id === variations.editingVariationId || String(v.id) === String(variations.editingVariationId)) && (
                    <VariationFormModal
                        isOpen={Boolean(variations.editingVariationId)}
                        onClose={() => {
                            const pendingVariationId = variations.pendingNewVariationIdRef.current;
                            if (pendingVariationId) {
                                setFormData(prev => ({
                                    ...prev,
                                    variations: prev.variations?.filter(v => v.id !== pendingVariationId && String(v.id) !== String(pendingVariationId))
                                }));
                                variations.pendingNewVariationIdRef.current = null;
                            }
                            variations.setEditingVariationId(null);
                        }}
                        parentId={formData.id}
                        parentProduct={formData as any}
                        variation={formData.variations?.find(v => v.id === variations.editingVariationId || String(v.id) === String(variations.editingVariationId)) || null}
                        onSave={(updatedVar) => {
                            variations.pendingNewVariationIdRef.current = null;
                            setFormData(prev => ({
                                ...prev,
                                variations: prev.variations?.map(v => (v.id === updatedVar.id || String(v.id) === String(updatedVar.id)) ? updatedVar : v)
                            }));
                            variations.setEditingVariationId(null);
                        }}
                    />
                )}

                {isCategorySearchOpen && (
                    <CategorySearchModal
                        isOpen={isCategorySearchOpen}
                        onClose={() => setIsCategorySearchOpen(false)}
                        categories={availableCategories}
                        selectedIds={formData.categoryIds || []}
                        onSelect={handleCategorySelect}
                    />
                )}
                
                {isConversionModalOpen && (
                    <ProductConversionModal
                        isOpen={isConversionModalOpen}
                        onClose={() => setIsConversionModalOpen(false)}
                        formData={formData}
                        onConvert={(updated) => {
                            setFormData(updated);
                            setActiveTab('variacoes');
                            toast.success("Produto convertido! O código e estoque agora estão na primeira variação.");
                        }}
                    />
                )}

                <ProductSaveResultModal
                    saveResult={saveResult}
                    onCloseModal={() => setSaveResult(null)}
                    onSuccess={onSuccess}
                    onCloseForm={onClose}
                    setFormData={setFormData}
                />
            </div>
        </div>,
        document.body
    );
};

export default ProductFormModal;
