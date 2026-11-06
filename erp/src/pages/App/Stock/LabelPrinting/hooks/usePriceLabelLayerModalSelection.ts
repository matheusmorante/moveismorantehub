import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

interface UsePriceLabelLayerModalSelectionParams {
  previousSelectedRef: { current: PriceLabelLayerKey };
  setSelectedElement: Dispatch<SetStateAction<PriceLabelLayerKey>>;
  setSelectedElements: Dispatch<SetStateAction<Set<PriceLabelLayerKey>>>;
  setIsLayersModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function usePriceLabelLayerModalSelection({
  previousSelectedRef,
  setSelectedElement,
  setSelectedElements,
  setIsLayersModalOpen,
}: UsePriceLabelLayerModalSelectionParams) {
  return useCallback(
    (key: PriceLabelLayerKey, isShift: boolean) => {
      if (isShift) {
        setSelectedElements((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          if (next.size > 0) {
            const arr = Array.from(next);
            const last = arr[arr.length - 1];
            setSelectedElement(last);
            previousSelectedRef.current = last;
          } else {
            setSelectedElement(null);
            previousSelectedRef.current = null;
          }
          return next;
        });
      } else {
        setSelectedElement(key);
        setSelectedElements(new Set([key]));
        previousSelectedRef.current = key;
        setIsLayersModalOpen(false);
      }
    },
    [previousSelectedRef, setSelectedElement, setSelectedElements, setIsLayersModalOpen]
  );
}
