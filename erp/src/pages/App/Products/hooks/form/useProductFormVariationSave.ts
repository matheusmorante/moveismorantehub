import { useCallback } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { toast } from 'react-toastify';
import type { z } from 'zod';
import { flattenFormErrors } from '@/hooks/useZodForm';
import { saveVariation } from '@/pages/utils/productService';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { createProductVariationFormSchema } from '../../../../../../../shared-utils/productVariationValidation';
import { getEnteredProductName } from './rules/productDraftRules';

type VariationFormSchema = ReturnType<typeof createProductVariationFormSchema>;
type VariationFormInput = z.input<VariationFormSchema>;
type VariationFormOutput = z.output<VariationFormSchema>;

type ValidateSavedVariation = <TResult>(
  nextValues: VariationFormInput,
  onValid: (data: VariationFormOutput) => TResult | Promise<TResult>,
  onInvalid?: (errors: FieldErrors<VariationFormInput>) => void,
) => Promise<TResult | false>;

interface UseProductFormVariationSaveParams {
  validateSavedVariation: ValidateSavedVariation;
  latestFormDataRef: React.MutableRefObject<Partial<Product>>;
  autoSaveDraft: (data: Partial<Product>) => Promise<boolean>;
  isDraftProduct: boolean;
  pendingNewVariationIdRef: React.MutableRefObject<string | null>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  setEditingVariationId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingVariationIssue?: React.Dispatch<
    React.SetStateAction<{ fieldKey: string; message: string } | null>
  >;
  draftSaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export const PRODUCT_FORM_ERROR_TOAST_OPTIONS = { autoClose: 8000 } as const;

export function useProductFormVariationSave({
  validateSavedVariation,
  latestFormDataRef,
  autoSaveDraft,
  isDraftProduct,
  pendingNewVariationIdRef,
  setFormData,
  setEditingVariationId,
  setEditingVariationIssue,
  draftSaveTimerRef,
}: UseProductFormVariationSaveParams) {
  return useCallback(
    async (updatedVariation: Variation): Promise<boolean> => {
      return (await validateSavedVariation({ ...updatedVariation }, async (values) => {
        const updatedVar = values as Variation;
        const current = latestFormDataRef.current;
        const sku = updatedVar.sku?.trim().toLocaleUpperCase();
        const duplicateSku = (current.variations || []).some(
          (item) =>
            Boolean(sku) &&
            String(item.id) !== String(updatedVar.id) &&
            item.sku?.trim().toLocaleUpperCase() === sku
        );
        if (duplicateSku) {
          toast.error(
            `O SKU "${updatedVar.sku}" já está em uso em outra variação.`,
            PRODUCT_FORM_ERROR_TOAST_OPTIONS
          );
          return false;
        }

        const alreadyPresent = (current.variations || []).some(
          (item) => String(item.id) === String(updatedVar.id)
        );
        const nextVariations = alreadyPresent
          ? current.variations?.map((item) =>
              String(item.id) === String(updatedVar.id) ? updatedVar : item
            ) || []
          : [...(current.variations || []), updatedVar];
        const next: Partial<Product> = {
          ...current,
          hasVariations:
            nextVariations.length > 1 || Boolean(current.isDraft && current.hasVariations),
          variations: nextVariations,
        };

        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;

        try {
          if (isDraftProduct) {
            const saved = await autoSaveDraft(next);
            if (!saved && getEnteredProductName(next)) return false;
            latestFormDataRef.current = next;
            setFormData(next);
          } else {
            const productId = String(current.parentId || current.id || '');
            if (!productId)
              throw new Error('O produto precisa estar salvo antes de cadastrar a variação.');
            await saveVariation(productId, updatedVar);
            latestFormDataRef.current = next;
            setFormData(next);
          }
          pendingNewVariationIdRef.current = null;
          setEditingVariationId(null);
          setEditingVariationIssue?.(null);
          return true;
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Erro ao salvar a variação.',
            PRODUCT_FORM_ERROR_TOAST_OPTIONS
          );
          console.error('[ProductForm] Falha ao salvar variação concluída:', error);
          return false;
        }
      }, (errors) =>
        toast.error(Object.values(flattenFormErrors(errors))[0], PRODUCT_FORM_ERROR_TOAST_OPTIONS)
      )) === true;
    },
    [
      autoSaveDraft,
      draftSaveTimerRef,
      isDraftProduct,
      latestFormDataRef,
      pendingNewVariationIdRef,
      setEditingVariationId,
      setEditingVariationIssue,
      setFormData,
      validateSavedVariation,
    ]
  );
}
