import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

type MovableLayerKey = Exclude<PriceLabelLayerKey, null | 'background'>;
type Position = { x: number; y: number };
type PositionSetter = Dispatch<SetStateAction<Position>>;

interface UsePriceLabelEditorKeyboardShortcutsParams {
  isOpen: boolean;
  selectedElement: PriceLabelLayerKey;
  onUndo: () => void;
  onRedo: () => void;
  positionSetters: Record<MovableLayerKey, PositionSetter>;
}

export function usePriceLabelEditorKeyboardShortcuts({
  isOpen,
  selectedElement,
  onUndo,
  onRedo,
  positionSetters,
}: UsePriceLabelEditorKeyboardShortcutsParams) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isInput) return;
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (isInput) return;
        e.preventDefault();
        onRedo();
        return;
      }

      if (!selectedElement || selectedElement === 'background') return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (isInput) return;

      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
      const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
      const setPosition = positionSetters[selectedElement];
      setPosition((position) => ({ x: position.x + dx, y: position.y + dy }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedElement, onUndo, onRedo, positionSetters]);
}
