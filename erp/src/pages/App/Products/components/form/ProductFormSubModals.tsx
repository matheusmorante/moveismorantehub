import React from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import VariationFormModal from '../../modals/VariationFormModal';
import CategorySearchModal from '../modals/product/CategorySearchModal';
import ProductConversionModal from '../modals/product/ProductConversionModal';
import { ProductSaveResultModal } from '../modals/product/ProductSaveResultModal';
import ProductAiCharacteristicsModal from '../../modals/ProductAiCharacteristicsModal';

interface ProductFormSubModalsProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly variations: {
    editingVariationId: string | null;
    editingVariationIssue?: { fieldKey: string; message: string } | null;
  };
  readonly isStockistOnly: boolean;
  readonly canPublishToCatalog: boolean;
  readonly canToggleTestArtifact: boolean;
  readonly isTestArtifact: boolean;
  readonly setIsTestArtifact: (enabled: boolean) => void;
  readonly handleCloseVariationModal: () => void;
  readonly handleSaveVariation: (variation: Variation) => Promise<boolean>;
  readonly handleReplaceImageGlobal: (oldUrl: string, newUrl: string) => void | boolean | Promise<void | boolean>;
  readonly isCategorySearchOpen: boolean;
  readonly setIsCategorySearchOpen: (open: boolean) => void;
  readonly availableCategories: any[];
  readonly handleCategorySelect: (categoryId: string) => void;
  readonly isConversionModalOpen: boolean;
  readonly setIsConversionModalOpen: (open: boolean) => void;
  readonly handleConvertProduct: (updated: Partial<Product>) => void | Promise<void>;
  readonly saveResult: any;
  readonly setSaveResult: (result: any) => void;
  readonly onSuccess?: (newProduct: Product) => void | boolean | Promise<void | boolean>;
  readonly onSave?: (savedProduct?: Product) => void | Promise<void>;
  readonly onClose: () => void;
  readonly isAiCharacteristicsModalOpen?: boolean;
  readonly setIsAiCharacteristicsModalOpen?: (open: boolean) => void;
  readonly aiCharacteristicsInitialMode?: 'web_search' | 'descriptive_text';
}

export const ProductFormSubModals: React.FC<ProductFormSubModalsProps> = ({
  formData,
  setFormData,
  variations,
  isStockistOnly,
  canPublishToCatalog,
  canToggleTestArtifact,
  isTestArtifact,
  setIsTestArtifact,
  handleCloseVariationModal,
  handleSaveVariation,
  handleReplaceImageGlobal,
  isCategorySearchOpen,
  setIsCategorySearchOpen,
  availableCategories,
  handleCategorySelect,
  isConversionModalOpen,
  setIsConversionModalOpen,
  handleConvertProduct,
  saveResult,
  setSaveResult,
  onSuccess,
  onSave,
  onClose,
  isAiCharacteristicsModalOpen = false,
  setIsAiCharacteristicsModalOpen,
  aiCharacteristicsInitialMode = 'web_search',
}) => {
  const currentEditingVariation = variations.editingVariationId
    ? formData.variations?.find(
        (v) =>
          v.id === variations.editingVariationId ||
          String(v.id) === String(variations.editingVariationId)
      ) || null
    : null;

  return (
    <>
      {variations.editingVariationId && currentEditingVariation && (
        <VariationFormModal
          isOpen={Boolean(variations.editingVariationId)}
          onClose={handleCloseVariationModal}
          parentId={formData.id}
          parentProduct={formData as any}
          variation={currentEditingVariation}
          initialValidationError={variations.editingVariationIssue || undefined}
          onSave={handleSaveVariation}
          onReplaceImageGlobal={handleReplaceImageGlobal}
          canMarkTestArtifact={canToggleTestArtifact}
          isTestArtifact={isTestArtifact}
          onTestArtifactChange={setIsTestArtifact}
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
        canPublishToCatalog={canPublishToCatalog}
        onCloseModal={() => setSaveResult(null)}
        onSuccess={
          onSuccess ||
          (onSave
            ? (p) => onSave?.(p)
            : undefined)
        }
        onCloseForm={onClose}
        setFormData={setFormData}
      />

      <ProductAiCharacteristicsModal
        isOpen={isAiCharacteristicsModalOpen}
        onClose={() => setIsAiCharacteristicsModalOpen?.(false)}
        formData={formData}
        setFormData={setFormData}
        categoryName={
          availableCategories?.find((cat: any) =>
            formData.categoryIds?.includes(cat.id)
          )?.name || (formData as any).category || ''
        }
        initialMode={aiCharacteristicsInitialMode}
      />
    </>
  );
};
