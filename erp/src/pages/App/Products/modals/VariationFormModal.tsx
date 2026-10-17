import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import type Product from '../../../types/product.type';
import type { Variation } from '../../../types/product.type';
import ManageAttributesModal from '../components/modals/attributes/ManageAttributesModal';
import VariationPhotosTab from '../components/tabs/images/VariationPhotosTab';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
import { useVariationForm } from '../hooks/variation/useVariationForm';
import type { VariationFormOperationGuard } from '../hooks/variation/variationForm.types';
import { VariationIdentificationTab } from '../components/variationTabs/VariationIdentificationTab';
import { VariationPricingTab } from '../components/variationTabs/VariationPricingTab';
import { VariationTechnicalTab } from '../components/variationTabs/VariationTechnicalTab';
import { VariationDescriptionTab } from '../components/variationTabs/VariationDescriptionTab';
import { VariationCompositionItemsTab } from '../components/variationTabs/VariationCompositionItemsTab';
import { checkERPLegibility, checkEcomLegibility } from '../domain/productLegibilityRules';
import { isStockistOnlyProfile } from '@/pages/utils/accessRoles';
import {
  getVariationFormTabs,
  INHERITED_DATA_TABS,
  VariationModalHeader,
  VariationModalTabsNav,
  VariationInheritedNotice,
  VariationModalFooter,
  VariationModalFeedbackBanners,
} from '../components/variationModal';

export interface VariationFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly parentId?: string;
  readonly parentProduct: Product;
  readonly variation: Variation | null;
  readonly onSuccess?: () => void;
  readonly onSave?: (updatedVariation: Variation) => void | boolean | Promise<void | boolean>;
  readonly canMarkTestArtifact?: boolean;
  readonly isTestArtifact?: boolean;
  readonly onTestArtifactChange?: (enabled: boolean) => void;
  readonly onReplaceImageGlobal?: (oldUrl: string, newUrl: string) => void | boolean | Promise<void | boolean>;
}

/**
 * Modal para criação e edição de variações de produtos.
 * Segue os princípios de Clean Code e SOLID:
 * - Responsabilidade Única (SRP): Atua como camada de apresentação visual, delegando
 *   a lógica de estado para `useVariationForm` e decompondo a interface em
 *   subcomponentes modulares e reutilizáveis (Header, TabsNav, Feedback, Notice, Footer).
 */
export const VariationFormModal: React.FC<VariationFormModalProps> = (props) => {
  const { user } = useAuth();
  const guards = useRef(new Map<string, VariationFormOperationGuard>());
  const identity = JSON.stringify([
    props.parentProduct.parentId || props.parentId || props.parentProduct.id,
    props.variation?.id || 'new',
    user?.id,
  ]);
  if (!guards.current.has(identity)) {
    guards.current.set(identity, { pending: null, error: '' });
  }

  return props.isOpen ? (
    <VariationFormSession
      key={identity}
      {...props}
      operationGuard={guards.current.get(identity)!}
    />
  ) : null;
};

const VariationFormSession: React.FC<
  VariationFormModalProps & { operationGuard: VariationFormOperationGuard }
> = (props) => {
  const { isOpen, parentProduct, variation } = props;
  const { profile } = useAuth();
  const isStockistOnly = isStockistOnlyProfile(profile);

  const isSingleVariation = variation
    ? (parentProduct.variations || []).length === 1
    : (parentProduct.variations || []).length === 0;
  const isSingleExistingVariation = Boolean(variation) && isSingleVariation;

  const {
    loading,
    error,
    blocked,
    referenceErrors,
    referenceLoading,
    retryReferences,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    allParentImages,
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
    handleSubmit,
    handleClose,
    handleReplaceImageGlobal,
    handleCropPhoto,
    onImageProcessingChange,
  } = useVariationForm({ ...props, isStockistOnly });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('[data-product-image-cropper]')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        void handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleClose]);

  if (!isOpen || !formData) return null;

  const effectiveProductForValidation: Partial<Product> = {
    ...parentProduct,
    mainSupplierId: parentProduct.mainSupplierId || parentProduct.supplierId || 'inherited',
    description: formData.name || parentProduct.name || parentProduct.description,
    unitPrice: formData.syncUnitPrice
      ? parentProduct.unitPrice
      : formData.unitPrice || parentProduct.unitPrice,
    images:
      formData.images && formData.images.length > 0
        ? formData.images
        : parentProduct.images || [],
  };

  const erpStatus = checkERPLegibility(effectiveProductForValidation);
  const ecomStatus = checkEcomLegibility(effectiveProductForValidation);

  const isCompositionProduct =
    parentProduct.itemType === 'composition' ||
    (parentProduct as any).item_type === 'composition';

  const formTabs = getVariationFormTabs(isCompositionProduct, isStockistOnly);

  const showInheritedDataNotice =
    isSingleExistingVariation && INHERITED_DATA_TABS.includes(activeTab);

  return createPortal(
    <div className="fixed inset-0 z-[1000020] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <button
        type="button"
        aria-label="Fechar modal"
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-md cursor-default"
        onClick={handleClose}
        disabled={loading}
      />

      <div
        data-variation-modal
        role="dialog"
        aria-modal="true"
        aria-labelledby="variation-form-modal-title"
        className="product-form-fullscreen relative bg-white dark:bg-slate-900 w-full max-w-5xl h-[100dvh] sm:h-[calc(100dvh-2rem)] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-0 sm:border border-slate-100 dark:border-slate-800 z-10"
      >
        <VariationModalHeader
          variation={variation}
          parentProduct={parentProduct}
          loading={loading}
          isStockistOnly={isStockistOnly}
          erpStatus={erpStatus}
          ecomStatus={ecomStatus}
          onClose={handleClose}
        />

        <VariationModalTabsNav
          tabs={formTabs}
          activeTab={activeTab}
          isSingleExistingVariation={isSingleExistingVariation}
          disabled={loading || blocked}
          onSelectTab={setActiveTab}
        />

        {/* Corpo do Formulário */}
        <div className="relative flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 custom-scrollbar min-h-0">
          <VariationModalFeedbackBanners
            loading={loading}
            error={error}
            referenceLoading={referenceLoading}
            referenceErrors={referenceErrors}
            onRetryReferences={retryReferences}
          />

          <div
            className={
              showInheritedDataNotice
                ? 'pointer-events-none select-none opacity-30 grayscale'
                : ''
            }
          >
            <fieldset
              disabled={showInheritedDataNotice || loading || blocked}
              aria-hidden={showInheritedDataNotice}
              className="m-0 min-w-0 border-0 p-0"
            >
              {activeTab === 'identificacao' && (
                <VariationIdentificationTab
                  formData={formData}
                  setFormData={setFormData}
                  parentProduct={parentProduct}
                  dbAttributes={dbAttributes}
                  dbAttributeValues={dbAttributeValues}
                  setIsManageAttributesOpen={setIsManageAttributesOpen}
                  getDefaultVariationName={getDefaultVariationName}
                  getDefaultVariationTitle={getDefaultVariationTitle}
                  fetchDbAttributes={fetchDbAttributes}
                  isSingleVariation={isSingleVariation}
                />
              )}

              {!isStockistOnly && activeTab === 'fotos' && (
                <VariationPhotosTab
                  images={(formData.images && formData.images.length > 0
                    ? formData.images
                    : allParentImages.length > 0
                      ? allParentImages
                      : parentProduct?.images || []
                  ).slice(0, MAX_VARIATION_IMAGES)}
                  parentImages={
                    allParentImages.length > 0 ? allParentImages : parentProduct?.images || []
                  }
                  isSingleVariation={isSingleVariation}
                  onChangeImages={(newImages) =>
                    setFormData((prev) =>
                      prev ? { ...prev, images: newImages.slice(0, MAX_VARIATION_IMAGES) } : null
                    )
                  }
                  onReplaceImageGlobal={handleReplaceImageGlobal}
                  onCropPhoto={handleCropPhoto}
                  onProcessingChange={onImageProcessingChange}
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
                  isSingleVariation={isSingleVariation}
                />
              )}

              {activeTab === 'tecnico' && (
                <VariationTechnicalTab
                  formData={formData}
                  setFormData={setFormData}
                  parentProduct={parentProduct}
                  handleChange={handleChange}
                  requiredFieldsOnly={isStockistOnly}
                  isSingleVariation={isSingleVariation}
                />
              )}

              {!isStockistOnly && activeTab === 'descricao' && (
                <VariationDescriptionTab
                  formData={formData}
                  setFormData={setFormData}
                  parentProduct={parentProduct}
                  handleChange={handleChange}
                  isSingleVariation={isSingleVariation}
                />
              )}

              {activeTab === 'compostos' && (
                <VariationCompositionItemsTab
                  formData={formData}
                  setFormData={setFormData}
                  parentProduct={parentProduct}
                />
              )}
            </fieldset>
          </div>

          {showInheritedDataNotice && <VariationInheritedNotice />}
        </div>

        <VariationModalFooter
          variation={variation}
          loading={loading}
          blocked={blocked}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />

        <ManageAttributesModal
          isOpen={isManageAttributesOpen}
          onClose={() => {
            setIsManageAttributesOpen(false);
            void fetchDbAttributes();
          }}
        />
      </div>
    </div>,
    document.body
  );
};

export default VariationFormModal;
