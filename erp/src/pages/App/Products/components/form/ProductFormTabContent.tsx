import React from 'react';
import type Product from '../../../../types/product.type';
import ProductFiscalTab from '../tabs/fiscal/ProductFiscalTab';
import ProductDescriptionTab from '../tabs/ProductDescriptionTab';
import ProductEcommerceTab from '../tabs/ProductEcommerceTab';
import ProductGeneralTab from '../tabs/ProductGeneralTab';
import ProductInventoryTab from '../tabs/ProductInventoryTab';
import ProductVariationsTab from '../tabs/ProductVariationsTab';
import ProductTechnicalTab from '../tabs/technical/ProductTechnicalTab';

type EcommerceSubTab = 'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo';

interface ProductFormTabContentProps {
  readonly activeTab: string;
  readonly isService: boolean;
  readonly isStockistOnly: boolean;
  readonly isRegisteredProduct: boolean;
  readonly isExistingProduct: boolean;
  readonly canConfigureProductTaxes: boolean;
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly validationErrors: any;
  readonly setValidationErrors: React.Dispatch<React.SetStateAction<any>>;
  readonly availableCategories: any[];
  readonly suppliers: any[];
  readonly ai: any;
  readonly pricing: any;
  readonly jev: any;
  readonly variations: any;
  readonly images: any;
  readonly activeEcommerceSubTab: EcommerceSubTab;
  readonly setActiveEcommerceSubTab: React.Dispatch<React.SetStateAction<EcommerceSubTab>>;
  readonly onOpenCategorySearch: () => void;
  readonly scheduleDraftAutoSave: () => void;
  readonly deletingVariationId: string | null;
  readonly handleDeleteVariation: (id: string) => Promise<void>;
  readonly onOpenAiCharacteristicsModal?: (mode?: 'web_search' | 'descriptive_text') => void;
}

export const ProductFormTabContent: React.FC<ProductFormTabContentProps> = ({
  activeTab,
  isService,
  isStockistOnly,
  isRegisteredProduct,
  isExistingProduct,
  canConfigureProductTaxes,
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  availableCategories,
  suppliers,
  ai,
  pricing,
  jev,
  variations,
  images,
  activeEcommerceSubTab,
  setActiveEcommerceSubTab,
  onOpenCategorySearch,
  scheduleDraftAutoSave,
  deletingVariationId,
  handleDeleteVariation,
  onOpenAiCharacteristicsModal,
}) => {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-3 sm:p-4 lg:p-6">
      {activeTab === 'geral' && (
        <ProductGeneralTab
          onOpenCategorySearch={onOpenCategorySearch}
          isService={isService}
          isStockistOnly={isStockistOnly}
          formData={formData}
          setFormData={setFormData}
          onSetHasVariations={variations.setProductMode}
          availableCategories={availableCategories}
          validationErrors={validationErrors}
          setValidationErrors={setValidationErrors}
          isGeneratingCategory={ai.isGeneratingCategory}
          onOpenAiFillModal={onOpenAiCharacteristicsModal}
        />
      )}

      {!isStockistOnly && !isService && activeTab === 'ecommerce' && (
        <ProductEcommerceTab
          formData={formData}
          setFormData={setFormData}
          activeEcommerceSubTab={activeEcommerceSubTab}
          setActiveEcommerceSubTab={setActiveEcommerceSubTab}
          isDraggingPhoto={images.isDraggingPhoto}
          setIsDraggingPhoto={images.setIsDraggingPhoto}
          handleFileChange={images.handleFileChange}
          onImagesSaved={scheduleDraftAutoSave}
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
          categoryName={
            availableCategories
              ?.filter((cat: any) => formData.categoryIds?.includes(cat.id))
              .map((cat: any) => cat.name)
              .join(' ') || (formData as any).category || ''
          }
          requiredFieldsOnly={isStockistOnly}
          validationErrors={validationErrors}
        />
      )}

      {!isStockistOnly && !isService && activeTab === 'description' && (
        <ProductDescriptionTab
          formData={formData}
          setFormData={setFormData}
          onBlur={() => jev.onFieldBlur?.('description')}
          categoryName={
            availableCategories?.find((cat: any) =>
              formData.categoryIds?.includes(cat.id)
            )?.name || (formData as any).category || ''
          }
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
          suggestPricesResults={ai.suggestPricesResults}
        />
      )}

      {!isService && activeTab === 'variacoes' && (
        <ProductVariationsTab
          formData={formData}
          editingVariationComboId={variations.editingVariationComboId}
          setEditingVariationComboId={variations.setEditingVariationComboId}
          editingVariationId={variations.editingVariationId}
          setEditingVariationId={variations.setEditingVariationId}
          onEdit={(id) => variations.setEditingVariationId(id)}
          addVariation={variations.addVariation}
          removeVariation={variations.removeVariation}
          onDeleteVariation={isRegisteredProduct ? handleDeleteVariation : undefined}
          deletingVariationId={deletingVariationId}
          isRegisteredProduct={isRegisteredProduct}
          isExistingProduct={isExistingProduct}
          isConventionalProduct={formData.productKind === 'normal'}
        />
      )}

      {activeTab === 'fiscal' && (
        <ProductFiscalTab
          formData={formData}
          setFormData={setFormData}
          canConfigureProductTaxes={canConfigureProductTaxes}
          isStockistOnly={isStockistOnly}
          validationErrors={validationErrors}
          ncmSuggestion={jev.suggestion}
          onAcceptNcmSuggestion={jev.acceptSuggestion}
          onRejectNcmSuggestion={jev.rejectSuggestion}
        />
      )}
    </div>
  );
};
