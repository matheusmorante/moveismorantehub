import type React from 'react';
import { synchronizeMobileProductFormCompositionItems } from '../domain/mobileProductCompositionItems';
import type { MobileProductFormErrorNavigation } from '../domain/mobileProductFormErrorNavigation';
import { ProductFormBasicTab } from '../modals/tabs/ProductFormBasicTab';
import { ProductFormCompositionTab } from '../modals/tabs/ProductFormCompositionTab';
import { ProductFormDescriptionTab } from '../modals/tabs/ProductFormDescriptionTab';
import { ProductFormFiscalTab } from '../modals/tabs/ProductFormFiscalTab';
import { ProductFormPhotosTab } from '../modals/tabs/ProductFormPhotosTab';
import { ProductFormPricesTab } from '../modals/tabs/ProductFormPricesTab';
import { ProductFormTechnicalTab } from '../modals/tabs/ProductFormTechnicalTab';
import { ProductFormVariationsTab } from '../modals/tabs/ProductFormVariationsTab';
import type { TabId } from './productFormTabs';

interface ProductFormTabContentProps {
  activeTab: TabId;
  formData: any;
  setFormData: (fn: any) => void;
  product?: any | null;
  dark: boolean;
  isStockistOnly: boolean;
  canManageCategories: boolean;
  canConfigureProductTaxes: boolean;
  showInboundCostPrice: boolean;
  nameError: boolean;
  setNameError: (value: boolean) => void;
  categoryError: boolean;
  setCategoryError: (value: boolean) => void;
  costPriceError: boolean;
  setCostPriceError: (value: boolean) => void;
  unitPriceError: boolean;
  setUnitPriceError: (value: boolean) => void;
  supplierError: boolean;
  setSupplierError: (value: boolean) => void;
  ncmError: boolean;
  variationValidationTarget: MobileProductFormErrorNavigation | null;
  clearVariationValidationTarget: () => void;
  handleCategoryNamesResolved: (resolvedIds: string[], names: string[]) => void;
  jev: {
    suggestion: any;
    isClassifying: boolean;
    onFieldFocus: (fieldName: string) => void;
    onFieldBlur: (fieldName: string) => void;
    acceptSuggestion: () => Promise<unknown> | void;
    rejectSuggestion: () => void;
  };
}

/** Renderiza o conteúdo da aba ativa dentro do formulário mobile de produto. */
export const ProductFormTabContent: React.FC<ProductFormTabContentProps> = ({
  activeTab,
  formData,
  setFormData,
  product,
  dark,
  isStockistOnly,
  canManageCategories,
  canConfigureProductTaxes,
  showInboundCostPrice,
  nameError,
  setNameError,
  categoryError,
  setCategoryError,
  costPriceError,
  setCostPriceError,
  unitPriceError,
  setUnitPriceError,
  supplierError,
  setSupplierError,
  ncmError,
  variationValidationTarget,
  clearVariationValidationTarget,
  handleCategoryNamesResolved,
  jev,
}) => {
  switch (activeTab) {
    case 'geral':
      return (
        <ProductFormBasicTab
          formData={formData}
          setFormData={setFormData}
          dark={dark}
          isExistingProduct={Boolean(product?.id)}
          isStockistOnly={isStockistOnly}
          canManageCategories={canManageCategories}
          nameError={nameError}
          onNameValidationCleared={() => setNameError(false)}
          categoryError={categoryError}
          onCategoryValidationCleared={() => setCategoryError(false)}
          onCategoryNamesResolved={handleCategoryNamesResolved}
          onFieldFocus={jev.onFieldFocus}
          onFieldBlur={jev.onFieldBlur}
        />
      );
    case 'fotos':
      return isStockistOnly ? null : (
        <ProductFormPhotosTab formData={formData} setFormData={setFormData} dark={dark} />
      );
    case 'technical':
      return (
        <ProductFormTechnicalTab
          formData={formData}
          setFormData={setFormData}
          dark={dark}
          requiredFieldsOnly={isStockistOnly}
        />
      );
    case 'description':
      return isStockistOnly ? null : (
        <ProductFormDescriptionTab
          formData={formData}
          setFormData={setFormData}
          dark={dark}
          onFieldFocus={jev.onFieldFocus}
          onFieldBlur={jev.onFieldBlur}
        />
      );
    case 'estoque':
      return (
        <ProductFormPricesTab
          formData={formData}
          setFormData={setFormData}
          dark={dark}
          showInboundCostPrice={showInboundCostPrice}
          costPriceError={costPriceError}
          onCostPriceValidationCleared={() => setCostPriceError(false)}
          unitPriceError={unitPriceError}
          onUnitPriceValidationCleared={() => setUnitPriceError(false)}
          supplierError={supplierError}
          onSupplierValidationCleared={() => setSupplierError(false)}
        />
      );
    case 'variacoes':
      return (
        <ProductFormVariationsTab
          formData={formData}
          setFormData={setFormData}
          dark={dark}
          isExistingProduct={Boolean(product?.id)}
          isStockistOnly={isStockistOnly}
          selectedVariationId={product?.selectedVariationId}
          validationTarget={variationValidationTarget}
          onValidationTargetHandled={clearVariationValidationTarget}
        />
      );
    case 'composicao':
      return (
        <ProductFormCompositionTab
          formData={formData}
          setFormData={(update) =>
            setFormData((previous: any) => {
              const next = update(previous);
              return synchronizeMobileProductFormCompositionItems(
                next,
                Array.isArray(next.comboItems) ? next.comboItems : []
              );
            })
          }
          dark={dark}
          supplierId={formData.mainSupplierId || formData.supplierId}
        />
      );
    case 'fiscal':
      return (
        <ProductFormFiscalTab
          formData={formData}
          setFormData={setFormData}
          dark={dark}
          canConfigureProductTaxes={canConfigureProductTaxes}
          isStockistOnly={isStockistOnly}
          hasNcmError={ncmError}
          ncmSuggestion={jev.suggestion}
          isClassifyingNcm={jev.isClassifying}
          onAcceptNcmSuggestion={jev.acceptSuggestion}
          onRejectNcmSuggestion={jev.rejectSuggestion}
        />
      );
  }
};
