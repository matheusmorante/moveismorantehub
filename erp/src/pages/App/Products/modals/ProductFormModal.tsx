import React from "react";
import { createPortal } from "react-dom";
import Product from "../../../types/product.type";

// Modular UI Components
import VariationFormModal from "./VariationFormModal";
import CategorySearchModal from "../components/modals/CategorySearchModal";
import ProductConversionModal from "../components/modals/ProductConversionModal";
import { ProductFormHeader } from '../components/ProductFormHeader';
import { ProductFormFooter } from '../components/ProductFormFooter';
import { ProductSaveResultModal } from '../components/modals/ProductSaveResultModal';

// Modular Tab Components
import ProductGeneralTab from "../components/tabs/ProductGeneralTab";
import ProductVariationsTab from "../components/tabs/ProductVariationsTab";
import ProductEcommerceTab from "../components/tabs/ProductEcommerceTab";
import ProductInventoryTab from "../components/tabs/ProductInventoryTab";
import ProductFiscalTab from "../components/tabs/ProductFiscalTab";
import ProductTechnicalTab from "../components/tabs/ProductTechnicalTab";

// Orchestrator Hook
import { useProductFormModal } from "../hooks/useProductFormModal";

export interface ProductFormModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly product?: Product | null;
    readonly initialData?: Partial<Product> | null;
    readonly initialTab?: 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal';
    readonly openAddVariationOnOpen?: boolean;
    readonly onSuccess?: (newProduct: Product) => void;
    readonly onSave?: (savedProduct?: Product) => void | Promise<void>;
    readonly isQuickRegister?: boolean;
}

/**
 * Modal principal de criação e edição de produtos.
 * Segue os princípios de Clean Code e SOLID:
 * - Responsabilidade Única (SRP): Atua exclusivamente como casca visual (apresentação),
 *   delegando toda a orquestração e regras para `useProductFormModal`.
 * - Composição modular de abas, header, footer e submodais especializados.
 */
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
        handleCloseVariationModal,
        handleSaveVariation,
        handleConvertProduct,
        variationsInUse,
        handleNextStep,
        isLastStep
    } = useProductFormModal(props);

    if (!isOpen) return null;

    return createPortal(
        <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="product-form-title"
            tabIndex={-1}
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden"
        >
            <button 
                type="button" 
                aria-label="Fechar formulário de produto" 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full" 
                onClick={handleCloseWithAutoSave} 
            />
            
            <div onPaste={images.handlePaste} className="relative bg-white dark:bg-slate-900 w-full h-full m-0 p-0 rounded-none shadow-none flex flex-col overflow-hidden animate-in fade-in duration-200 border-0">
                <ProductFormHeader
                    product={product}
                    isDraftProduct={isDraftProduct}
                    formData={formData}
                    ecomStatus={ecomStatus}
                    isService={isService}
                    navigateToRequirementField={navigateToRequirementField}
                    handleCloseWithAutoSave={handleCloseWithAutoSave}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    validationErrors={validationErrors}
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
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

                    {!isService && activeTab === 'ecommerce' && (
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

                    {!isService && activeTab === 'technical' && (
                        <ProductTechnicalTab
                            formData={formData}
                            setFormData={setFormData}
                            handleImproveDescriptionWithAI={ai.handleImproveDescriptionWithAI}
                            isImprovingDescription={ai.isImprovingDescription}
                            validationErrors={validationErrors}
                        />
                    )}

                    {!isService && activeTab === 'estoque' && (
                        <ProductInventoryTab
                            formData={formData}
                            setFormData={setFormData}
                            suppliers={suppliers}
                            discountPercent={pricing.discountPercent}
                            discountFixed={pricing.discountFixed}
                            setDiscountPercent={pricing.setDiscountPercent}
                            setDiscountFixed={pricing.setDiscountFixed}
                            handlePriceChange={pricing.handlePriceChange}
                            handleDiscountPercentChange={pricing.handleDiscountPercentChange}
                            handleDiscountFixedChange={pricing.handleDiscountFixedChange}
                            handlePromoPriceFieldChange={pricing.handlePromoPriceFieldChange}
                            validationErrors={validationErrors}
                            setValidationErrors={setValidationErrors}
                            handleSuggestPrices={ai.handleSuggestPrices}
                            isSuggestingPrices={ai.isSuggestingPrices}
                            suggestPricesResults={ai.suggestPricesResults ? { low: ai.suggestPricesResults.low, medium: ai.suggestPricesResults.medium, high: ai.suggestPricesResults.high } : null}
                        />
                    )}

                    {!isService && activeTab === 'variacoes' && (
                        <ProductVariationsTab
                            formData={formData}
                            setFormData={setFormData}
                            editingVariationComboId={variations.editingVariationComboId}
                            setEditingVariationComboId={variations.setEditingVariationComboId}
                            editingVariationId={variations.editingVariationId}
                            setEditingVariationId={variations.setEditingVariationId}
                            onEdit={(id) => variations.setEditingVariationId(id)}
                            addVariation={variations.addVariation}
                            removeVariation={variations.removeVariation}
                            variationsInUse={variationsInUse}
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
                    onClose={handleCloseWithAutoSave}
                    onNextStep={handleNextStep}
                    onSubmit={() => handleSubmit()}
                />

                {variations.editingVariationId && formData.variations?.some(v => v.id === variations.editingVariationId || String(v.id) === String(variations.editingVariationId)) && (
                    <VariationFormModal
                        isOpen={!!variations.editingVariationId}
                        onClose={handleCloseVariationModal}
                        parentId={formData.id}
                        parentProduct={formData as any}
                        variation={formData.variations?.find(v => v.id === variations.editingVariationId || String(v.id) === String(variations.editingVariationId)) || null}
                        onSave={handleSaveVariation}
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
                        onConvert={handleConvertProduct}
                    />
                )}

                <ProductSaveResultModal
                    saveResult={saveResult}
                    onCloseModal={() => setSaveResult(null)}
                    onSuccess={onSuccess || (props.onSave ? ((p) => { props.onSave?.(p); }) : undefined)}
                    onCloseForm={onClose}
                    setFormData={setFormData}
                />
            </div>
        </div>,
        document.body
    );
};

export default ProductFormModal;
