import { useEffect, type Dispatch, type SetStateAction } from 'react';

type ProductFormKeyboardShortcutsOptions<TSaveResult> = {
  isOpen: boolean;
  isCategorySearchOpen: boolean;
  isConversionModalOpen: boolean;
  isDiscardChangesConfirmOpen: boolean;
  variations: { editingVariationId: string | null };
  saveResult: TSaveResult | null;
  setSaveResult: Dispatch<SetStateAction<TSaveResult | null>>;
  setIsCategorySearchOpen: Dispatch<SetStateAction<boolean>>;
  setIsConversionModalOpen: Dispatch<SetStateAction<boolean>>;
  cancelDiscardChanges: () => void;
  handleCloseWithAutoSave: () => void;
  handleSubmit: () => void;
};

export function useProductFormKeyboardShortcuts<TSaveResult>({
  isOpen,
  isCategorySearchOpen,
  isConversionModalOpen,
  isDiscardChangesConfirmOpen,
  variations,
  saveResult,
  setSaveResult,
  setIsCategorySearchOpen,
  setIsConversionModalOpen,
  cancelDiscardChanges,
  handleCloseWithAutoSave,
  handleSubmit,
}: ProductFormKeyboardShortcutsOptions<TSaveResult>) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (typeof document !== 'undefined' && document.querySelector('.swal2-container')) {
          return;
        }
        if (isDiscardChangesConfirmOpen) {
          cancelDiscardChanges();
          return;
        }
        if (saveResult) {
          setSaveResult(null);
          return;
        }
        if (isCategorySearchOpen) {
          setIsCategorySearchOpen(false);
          return;
        }
        if (isConversionModalOpen) {
          setIsConversionModalOpen(false);
          return;
        }
        if (variations.editingVariationId) {
          return;
        }
        handleCloseWithAutoSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (variations.editingVariationId) return;
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isCategorySearchOpen,
    isConversionModalOpen,
    isDiscardChangesConfirmOpen,
    variations,
    saveResult,
    handleCloseWithAutoSave,
    cancelDiscardChanges,
    handleSubmit,
  ]);
}
