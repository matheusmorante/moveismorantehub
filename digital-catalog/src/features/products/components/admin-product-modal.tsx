'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cloud, ArrowLeft, ArrowRight } from 'lucide-react';
import { CategoriesManagerModal } from '@/features/categories/components/categories-manager-modal';
import { AdminProductModalProps, Product, ProductFormData, TempVariation } from './admin-modal/types';
import { useAdminProductData } from './admin-modal/hooks/useAdminProductData';
import { useAdminProductSave } from './admin-modal/hooks/useAdminProductSave';
import { Step1Photos } from './admin-modal/steps/Step1Photos';
import { Step2Identification } from './admin-modal/steps/Step2Identification';
import { Step3TechnicalSheet } from './admin-modal/steps/Step3TechnicalSheet';
import { Step4Variations } from './admin-modal/steps/Step4Variations';
import { VariationFormModal } from './admin-modal/dialogs/VariationFormModal';
import { AttributeManagerModal } from './admin-modal/dialogs/AttributeManagerModal';
import { ImageActionModal } from './admin-modal/dialogs/ImageActionModal';
import { toast } from 'sonner';
import { processAndUploadSingleProductImage } from './admin-modal/utils/productImageUploadUtils';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { storefrontImageUploadFormSchema } from '@/shared-utils/storefrontProductFormSchemas';

export type { AdminProductModalProps };

const initialFormData: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  price: '',
  promo_price: '',
  is_salvado: false,
  opportunity_id: null,
  category_ids: [],
  width: '',
  depth: '',
  height: '',
  depth_use_length: false,
  images: [],
};

export function AdminProductModal({
  productId,
  isOpen,
  onOpenChange,
  onSuccess,
  initialVariationId,
}: AdminProductModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [autoSlug, setAutoSlug] = useState(true);
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountFixed, setDiscountFixed] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  // Variações
  const [productVariations, setProductVariations] = useState<TempVariation[]>([]);
  const [variationsEnabled, setVariationsEnabled] = useState(false);
  const [isVarFormOpen, setIsVarFormOpen] = useState(false);
  const [editingVarIndex, setEditingVarIndex] = useState<number | null>(null);

  // Modais auxiliares
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isCategoriesManagerOpen, setIsCategoriesManagerOpen] = useState(false);
  const [isFastCreateOpen, setIsFastCreateOpen] = useState(false);

  const resetForm = () => {
    setFormData(initialFormData);
    setAutoSlug(true);
    setDiscountPercent('');
    setDiscountFixed('');
    setCurrentProduct(null);
    setStep(1);
    setProductVariations([]);
    setVariationsEnabled(false);
    setActiveImageIndex(null);
    setIsCategoriesManagerOpen(false);
    setIsFastCreateOpen(false);
    setIsVarFormOpen(false);
    setEditingVarIndex(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else if (!productId) {
      resetForm();
    }
  }, [isOpen, productId]);

  const {
    categories,
    categoryRelationships,
    opportunities,
    dbAttributes,
    dbAttributeValues,
    fetchCategories,
    fetchDbAttributes,
    isLoaded,
  } = useAdminProductData({
    isOpen,
    productId,
    initialVariationId,
    setFormData,
    setDiscountPercent,
    setDiscountFixed,
    setProductVariations,
    setVariationsEnabled,
    setCurrentProduct,
    setStep,
    onOpenInitialVariation: (variation, index) => {
      setEditingVarIndex(index);
      setIsVarFormOpen(true);
    },
  });

  const {
    isSaving,
    setIsSaving,
    isAutoSaving,
    handleFinish,
  } = useAdminProductSave({
    formData,
    setFormData,
    productVariations,
    setProductVariations,
    variationsEnabled,
    currentProduct,
    setCurrentProduct,
    isOpen,
    isLoaded,
    onOpenChange,
    onSuccess,
  });

  const handleOpenAddVar = () => {
    setEditingVarIndex(null);
    setIsVarFormOpen(true);
  };

  const handleOpenEditVar = (index: number) => {
    setEditingVarIndex(index);
    setIsVarFormOpen(true);
  };

  const handleSaveVariation = (updatedVar: TempVariation, index: number | null) => {
    if (index !== null) {
      setProductVariations((prev) => {
        const updated = [...prev];
        updated[index] = updatedVar;
        return updated;
      });
    } else {
      setProductVariations((prev) => [...prev, updatedVar]);
    }
  };

  const handleSetImages = (
    imagesOrFn: string[] | ((prev: string[]) => string[])
  ) => {
    setFormData((prev) => ({
      ...prev,
      images: typeof imagesOrFn === 'function' ? imagesOrFn(prev.images) : imagesOrFn,
    }));
  };

  const uploadForm = useZodForm(storefrontImageUploadFormSchema, { files: [] });

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files?.length) return;
    const incomingFile = e.target.files[0];
    await uploadForm.validateAndRun(
      { files: [incomingFile] },
      async (validated) => {
        setIsSaving(true);
        const toastId = toast.loading('Substituindo imagem...');
        try {
          const publicUrl = await processAndUploadSingleProductImage(validated.files[0]);
          handleSetImages((prev) => {
            const next = [...prev];
            next[index] = publicUrl;
            return next;
          });
          toast.success('Imagem substituída!', { id: toastId });
        } catch (error: any) {
          toast.error('Erro na substituição: ' + error.message, { id: toastId });
        } finally {
          setIsSaving(false);
        }
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 border-none shadow-2xl bg-white gap-0
          w-full h-[100dvh] max-h-[100dvh] rounded-none flex flex-col
          sm:rounded-[32px] sm:w-[95vw] sm:h-[90vh] sm:max-h-[850px] sm:max-w-[850px]"
      >
        <form
          noValidate
          onSubmit={handleFinish}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
          className="flex flex-col h-full min-h-0 overflow-hidden"
        >
          <DialogHeader className="p-4 md:p-8 bg-primary text-white space-y-3 flex-shrink-0 relative">
            <div className="flex justify-between items-start pr-8">
              <div className="space-y-0.5">
                <DialogTitle className="text-lg md:text-2xl font-black tracking-tight flex items-center gap-2">
                  {currentProduct ? 'Editar Produto' : 'Novo Produto'}
                  {isAutoSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                  ) : (
                    <Cloud className="h-4 w-4 text-white/50" />
                  )}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/70 text-xs font-medium">
                  {isAutoSaving ? 'Sincronizando...' : 'Alterações salvas automaticamente.'}
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className="text-white border-white/40 bg-white/10 px-2 py-1 font-bold shrink-0 text-xs"
              >
                {step}/4
              </Badge>
            </div>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`flex-1 py-2 text-[10px] sm:text-xs font-bold border-b-4 transition-all hover:bg-white/5 rounded-t-lg ${
                    step === s
                      ? 'border-white text-white bg-white/10'
                      : 'border-white/20 text-white/60 hover:text-white/90'
                  }`}
                >
                  {s === 1
                    ? '1. Fotos'
                    : s === 2
                      ? '2. Identificação'
                      : s === 3
                        ? '3. Ficha Técnica'
                        : '4. Variações'}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {step === 1 && (
              <Step1Photos
                images={formData.images}
                setImages={handleSetImages}
                onOpenImageAction={(index) => setActiveImageIndex(index)}
                setIsSaving={setIsSaving}
              />
            )}

            {step === 2 && (
              <Step2Identification
                formData={formData}
                setFormData={setFormData}
                autoSlug={autoSlug}
                setAutoSlug={setAutoSlug}
                discountPercent={discountPercent}
                setDiscountPercent={setDiscountPercent}
                discountFixed={discountFixed}
                setDiscountFixed={setDiscountFixed}
                opportunities={opportunities}
                categories={categories}
                categoryRelationships={categoryRelationships}
                onOpenCategoriesManager={() => setIsCategoriesManagerOpen(true)}
              />
            )}

            {step === 3 && (
              <Step3TechnicalSheet formData={formData} setFormData={setFormData} />
            )}

            {step === 4 && (
              <Step4Variations
                variationsEnabled={variationsEnabled}
                setVariationsEnabled={setVariationsEnabled}
                productVariations={productVariations}
                setProductVariations={setProductVariations}
                formData={formData}
                onOpenAddVar={handleOpenAddVar}
                onOpenEditVar={handleOpenEditVar}
                onOpenFastCreate={() => setIsFastCreateOpen(true)}
              />
            )}
          </div>

          <DialogFooter className="p-4 md:p-8 bg-gray-50 border-t flex flex-row items-center justify-between gap-3 flex-shrink-0">
            <div>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="h-11 md:h-14 px-4 md:px-8 font-bold border-2 hover:bg-white transition-all"
                >
                  <ArrowLeft className="mr-1 md:mr-2 h-5 w-5" />
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-11 md:h-14 px-4 md:px-8 font-bold text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all rounded-xl border border-dashed border-gray-300 hover:border-red-200"
                >
                  Cancelar
                </Button>
              )}
            </div>
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="h-11 md:h-14 px-6 md:px-10 font-black text-base md:text-lg shadow-xl shadow-primary/20 rounded-xl md:rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Próximo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={isSaving || isAutoSaving}
                className="h-11 md:h-14 px-6 md:px-10 font-black text-base md:text-lg shadow-xl shadow-primary/20 rounded-xl md:rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-green-600 hover:bg-green-700"
              >
                {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Finalizar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Modal de Opções de Foto (Celular/Desktop) */}
      <ImageActionModal
        activeImageIndex={activeImageIndex}
        images={formData.images}
        onClose={() => setActiveImageIndex(null)}
        onReplaceImage={handleReplaceImage}
        onRemoveImage={(idx) => {
          handleSetImages((prev) => prev.filter((_, i) => i !== idx));
        }}
        onSetMainImage={(idx) => {
          handleSetImages((prev) => {
            const updated = [...prev];
            const [item] = updated.splice(idx, 1);
            return [item, ...updated];
          });
        }}
      />

      {/* Modal de Sub-formulário de Variação */}
      <VariationFormModal
        isOpen={isVarFormOpen}
        onOpenChange={setIsVarFormOpen}
        initialVariation={editingVarIndex !== null ? productVariations[editingVarIndex] : null}
        editingIndex={editingVarIndex}
        productFormData={formData}
        dbAttributes={dbAttributes}
        dbAttributeValues={dbAttributeValues}
        onSave={handleSaveVariation}
        onOpenFastCreate={() => setIsFastCreateOpen(true)}
      />

      {/* Modal Rápido de Gerenciamento de Atributos e Valores Globais (CRUD) */}
      <AttributeManagerModal
        isOpen={isFastCreateOpen}
        onOpenChange={setIsFastCreateOpen}
        dbAttributes={dbAttributes}
        dbAttributeValues={dbAttributeValues}
        fetchDbAttributes={fetchDbAttributes}
      />

      {/* Modal de Gerenciamento de Categorias */}
      <CategoriesManagerModal
        isOpen={isCategoriesManagerOpen}
        onOpenChange={setIsCategoriesManagerOpen}
        onSuccess={fetchCategories}
      />
    </Dialog>
  );
}
