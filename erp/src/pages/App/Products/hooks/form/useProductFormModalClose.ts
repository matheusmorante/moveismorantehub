import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type Product from '../../../../types/product.type';
import { serializeProductFormForDirtyCheck } from '../../utils/form/productFormDirtyCheck';
import { isDraftSaveEligible } from './rules/productDraftRules';
import type { ProductDraftAutoSaveStatus } from './useProductFormDraft';

interface UseProductFormModalCloseParams {
  formData: Partial<Product>;
  isProductCreation: boolean;
  isDraftProduct: boolean;
  hasChanged: MutableRefObject<boolean>;
  initialFormDataRef: MutableRefObject<string>;
  draftSaveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  autoSaveDraft: (data: Partial<Product>) => Promise<boolean>;
  getDraftSnapshotWithoutPendingVariation: () => Partial<Product>;
  autoSaveStatus: ProductDraftAutoSaveStatus;
  onDraftSaved?: () => void;
  onClose: () => void;
  setIsDiscardChangesConfirmOpen: Dispatch<SetStateAction<boolean>>;
}

export function useProductFormModalClose({
  formData,
  isProductCreation,
  isDraftProduct,
  hasChanged,
  initialFormDataRef,
  draftSaveTimerRef,
  autoSaveDraft,
  getDraftSnapshotWithoutPendingVariation,
  autoSaveStatus,
  onDraftSaved,
  onClose,
  setIsDiscardChangesConfirmOpen,
}: UseProductFormModalCloseParams) {
  const handleCloseWithAutoSave = useCallback(async () => {
    const canSaveDraft = isDraftSaveEligible(formData);
    const isBasicallyEmpty = isProductCreation && !canSaveDraft;
    let hasUnsavedFormChanges = hasChanged.current;
    if (initialFormDataRef.current) {
      try {
        const initialData = JSON.parse(initialFormDataRef.current) as Partial<Product>;
        hasUnsavedFormChanges =
          serializeProductFormForDirtyCheck(formData) !==
          serializeProductFormForDirtyCheck(initialData);
      } catch {
        // Fall back to the interaction flag if a legacy snapshot cannot be parsed.
      }
    }

    if (isDraftProduct && canSaveDraft) {
      const hasScheduledSave = draftSaveTimerRef.current !== null;
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      if (
        hasUnsavedFormChanges ||
        hasScheduledSave ||
        autoSaveStatus === 'saving' ||
        autoSaveStatus === 'error'
      ) {
        const saved = await autoSaveDraft(getDraftSnapshotWithoutPendingVariation());
        if (!saved) return;
      }
      onDraftSaved?.();
      onClose();
      return;
    }

    if (hasUnsavedFormChanges && !isBasicallyEmpty) {
      setIsDiscardChangesConfirmOpen(true);
    } else {
      onClose();
    }
  }, [
    hasChanged,
    onClose,
    onDraftSaved,
    isProductCreation,
    isDraftProduct,
    formData,
    autoSaveDraft,
    getDraftSnapshotWithoutPendingVariation,
    autoSaveStatus,
  ]);

  const cancelDiscardChanges = useCallback(() => {
    setIsDiscardChangesConfirmOpen(false);
  }, []);

  const confirmDiscardChanges = useCallback(() => {
    setIsDiscardChangesConfirmOpen(false);
    onClose();
  }, [onClose]);

  return {
    handleCloseWithAutoSave,
    cancelDiscardChanges,
    confirmDiscardChanges,
  };
}
