import type React from 'react';
import { useCallback } from 'react';

interface UseProductDraftCaptureOptions {
  editingVariationId: string | null;
  scheduleDraftAutoSave: () => void;
}

/**
 * Hook de captura de eventos do DOM para autosave do rascunho de produto.
 * Isola a lógica de delegação de eventos (blur, change de select e clique em opções de busca)
 * evitando que o componente visual `ProductFormModal` se preocupe com detalhes de baixo nível do DOM.
 */
export function useProductDraftCapture({
  editingVariationId,
  scheduleDraftAutoSave,
}: UseProductDraftCaptureOptions) {
  const handleDraftFieldBlurCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        !editingVariationId &&
        target instanceof HTMLElement &&
        !target.closest('[data-variation-modal]') &&
        target.matches('input:not([type="file"]), textarea, select, [role="combobox"]')
      ) {
        scheduleDraftAutoSave();
      }
    },
    [scheduleDraftAutoSave, editingVariationId]
  );

  const handleDraftSelectChangeCapture = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      if (
        event.target instanceof HTMLSelectElement &&
        !editingVariationId &&
        !event.target.closest('[data-variation-modal]')
      ) {
        scheduleDraftAutoSave();
      }
    },
    [scheduleDraftAutoSave, editingVariationId]
  );

  const handleDraftSearchOptionClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        event.target instanceof Element &&
        !editingVariationId &&
        !event.target.closest('[data-variation-modal]') &&
        event.target.closest('[role="option"]')
      ) {
        scheduleDraftAutoSave();
      }
    },
    [scheduleDraftAutoSave, editingVariationId]
  );

  return {
    handleDraftFieldBlurCapture,
    handleDraftSelectChangeCapture,
    handleDraftSearchOptionClickCapture,
  };
}
