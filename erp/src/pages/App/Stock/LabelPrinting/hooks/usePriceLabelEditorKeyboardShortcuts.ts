import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

type MovableLayerKey = Exclude<PriceLabelLayerKey, null | 'background'>;
type Position = { x: number; y: number };
type PositionSetter = Dispatch<SetStateAction<Position>>;

interface UsePriceLabelEditorKeyboardShortcutsParams {
  isOpen: boolean;
  selectedElement: PriceLabelLayerKey;
  setTitlePos: PositionSetter;
  setDePricePorGroupPos: PositionSetter;
  setDePos: PositionSetter;
  setNormalPricePos: PositionSetter;
  setPorPos: PositionSetter;
  setCurrencyPos: PositionSetter;
  setPromoPricePos: PositionSetter;
  setCentsPos: PositionSetter;
  setInstallmentsPos: PositionSetter;
}

export function usePriceLabelEditorKeyboardShortcuts({
  isOpen,
  selectedElement,
  setTitlePos,
  setDePricePorGroupPos,
  setDePos,
  setNormalPricePos,
  setPorPos,
  setCurrencyPos,
  setPromoPricePos,
  setCentsPos,
  setInstallmentsPos,
}: UsePriceLabelEditorKeyboardShortcutsParams) {
  const positionSetters = useMemo<Record<MovableLayerKey, PositionSetter>>(
    () => ({
      title: setTitlePos,
      dePricePorGroup: setDePricePorGroupPos,
      deText: setDePos,
      normalPrice: setNormalPricePos,
      porText: setPorPos,
      currencySymbol: setCurrencyPos,
      promoPrice: setPromoPricePos,
      cents: setCentsPos,
      installments: setInstallmentsPos,
    }),
    [
      setTitlePos,
      setDePricePorGroupPos,
      setDePos,
      setNormalPricePos,
      setPorPos,
      setCurrencyPos,
      setPromoPricePos,
      setCentsPos,
      setInstallmentsPos,
    ]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

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
  }, [isOpen, selectedElement, positionSetters]);
}
