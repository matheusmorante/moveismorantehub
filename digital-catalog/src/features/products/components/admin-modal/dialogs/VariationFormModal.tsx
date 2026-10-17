'use client';

import React from 'react';
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
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DbAttribute, DbAttributeValue, ProductFormData, TempVariation } from '../types';
import { useVariationFormModal } from '../hooks/useVariationFormModal';
import { VariationStep1Photos } from './variation-steps/VariationStep1Photos';
import { VariationStep2PricingAttributes } from './variation-steps/VariationStep2PricingAttributes';
import { VariationStep3DimensionsDescription } from './variation-steps/VariationStep3DimensionsDescription';

export interface VariationFormModalProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly initialVariation: TempVariation | null;
  readonly editingIndex: number | null;
  readonly productFormData: ProductFormData;
  readonly dbAttributes: readonly DbAttribute[];
  readonly dbAttributeValues: readonly DbAttributeValue[];
  readonly onSave: (variation: TempVariation, index: number | null) => void;
  readonly onOpenFastCreate: () => void;
}

export function VariationFormModal({
  isOpen,
  onOpenChange,
  initialVariation,
  editingIndex,
  productFormData,
  dbAttributes,
  dbAttributeValues,
  onSave,
  onOpenFastCreate,
}: VariationFormModalProps) {
  const {
    varStep,
    setVarStep,
    varFormState,
    setVarFormState,
    varDiscountPercent,
    setVarDiscountPercent,
    varDiscountFixed,
    setVarDiscountFixed,
    handleVarPriceChange,
    handleVarDiscountPercentChange,
    handleVarDiscountFixedChange,
    handleVarPromoPriceFieldChange,
    handleSaveVarForm,
  } = useVariationFormModal({
    isOpen,
    initialVariation,
    editingIndex,
    productFormData,
    dbAttributes,
    onSave,
    onOpenChange,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 border-none shadow-2xl bg-white gap-0
          w-full h-[100dvh] max-h-[100dvh] rounded-none flex flex-col
          sm:rounded-[24px] sm:w-[90vw] sm:h-[85vh] sm:max-h-[750px] sm:max-w-[650px]"
      >
        <form
          noValidate
          onSubmit={handleSaveVarForm}
          className="flex flex-col h-full min-h-0 overflow-hidden"
        >
          <DialogHeader className="p-4 md:p-6 bg-primary text-white space-y-2 flex-shrink-0 relative">
            <div className="flex justify-between items-start pr-6">
              <div className="space-y-0.5">
                <DialogTitle className="text-base md:text-xl font-black tracking-tight flex items-center gap-1.5">
                  {editingIndex !== null ? 'Editar Variação' : 'Nova Variação'}
                  <span className="text-xs font-normal opacity-80">
                    | {productFormData.name || 'Produto Pai'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/70 text-xs font-medium">
                  Configure os dados específicos desta variação.
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className="text-white border-white/40 bg-white/10 px-2 py-0.5 font-bold shrink-0 text-xs"
              >
                {varStep}/3
              </Badge>
            </div>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVarStep(s)}
                  className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold border-b-4 transition-all hover:bg-white/5 rounded-t-lg ${
                    varStep === s
                      ? 'border-white text-white bg-white/10'
                      : 'border-white/20 text-white/60 hover:text-white/90'
                  }`}
                >
                  {s === 1
                    ? '1. Foto Vinculada'
                    : s === 2
                      ? '2. Identificação & Preço'
                      : '3. Ficha Técnica'}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {varStep === 1 && (
              <VariationStep1Photos
                images={productFormData.images}
                varFormState={varFormState}
                setVarFormState={setVarFormState}
              />
            )}

            {varStep === 2 && (
              <VariationStep2PricingAttributes
                productFormData={productFormData}
                varFormState={varFormState}
                setVarFormState={setVarFormState}
                dbAttributes={dbAttributes}
                dbAttributeValues={dbAttributeValues}
                varDiscountPercent={varDiscountPercent}
                setVarDiscountPercent={setVarDiscountPercent}
                varDiscountFixed={varDiscountFixed}
                setVarDiscountFixed={setVarDiscountFixed}
                onOpenFastCreate={onOpenFastCreate}
                handleVarPriceChange={handleVarPriceChange}
                handleVarDiscountPercentChange={handleVarDiscountPercentChange}
                handleVarDiscountFixedChange={handleVarDiscountFixedChange}
                handleVarPromoPriceFieldChange={handleVarPromoPriceFieldChange}
              />
            )}

            {varStep === 3 && (
              <VariationStep3DimensionsDescription
                productFormData={productFormData}
                varFormState={varFormState}
                setVarFormState={setVarFormState}
              />
            )}
          </div>

          <DialogFooter className="p-4 md:p-6 bg-gray-50 border-t flex flex-row items-center justify-between gap-3 flex-shrink-0">
            <div>
              {varStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVarStep(varStep - 1)}
                  className="h-10 px-4 font-bold border-2 hover:bg-white"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-10 px-4 font-bold text-gray-500 hover:text-red-500 hover:bg-red-50"
                >
                  Cancelar
                </Button>
              )}
            </div>
            {varStep < 3 ? (
              <Button
                type="button"
                onClick={() => setVarStep(varStep + 1)}
                className="h-10 px-6 font-bold"
              >
                Próximo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="h-10 px-6 font-bold bg-green-600 hover:bg-green-700">
                Salvar Variação
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
