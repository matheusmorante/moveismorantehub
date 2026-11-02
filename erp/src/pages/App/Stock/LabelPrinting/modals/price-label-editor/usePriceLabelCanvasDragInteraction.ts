import React, { useCallback, useRef } from 'react';
import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

export interface UsePriceLabelCanvasDragInteractionParams {
  active: React.MutableRefObject<boolean>;
  closing: React.MutableRefObject<boolean>;
  actionInFlight: React.MutableRefObject<boolean>;
  historyEditingAllowed: React.MutableRefObject<boolean>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  selectedElement: PriceLabelLayerKey;
  setSelectedElement: (layer: PriceLabelLayerKey) => void;
  selectedElements: Set<PriceLabelLayerKey>;
  setSelectedElements: React.Dispatch<React.SetStateAction<Set<PriceLabelLayerKey>>>;
  prevSelectedRef: React.MutableRefObject<PriceLabelLayerKey>;
  setActiveGuideX: (val: number | null) => void;
  setActiveGuideY: (val: number | null) => void;
  titlePos: { x: number; y: number };
  setTitlePos: (pos: { x: number; y: number }) => void;
  dePricePorGroupPos: { x: number; y: number };
  setDePricePorGroupPos: (pos: { x: number; y: number }) => void;
  dePos: { x: number; y: number };
  setDePos: (pos: { x: number; y: number }) => void;
  normalPricePos: { x: number; y: number };
  setNormalPricePos: (pos: { x: number; y: number }) => void;
  porPos: { x: number; y: number };
  setPorPos: (pos: { x: number; y: number }) => void;
  currencyPos: { x: number; y: number };
  setCurrencyPos: (pos: { x: number; y: number }) => void;
  promoPricePos: { x: number; y: number };
  setPromoPricePos: (pos: { x: number; y: number }) => void;
  centsPos: { x: number; y: number };
  setCentsPos: (pos: { x: number; y: number }) => void;
  installmentsPos: { x: number; y: number };
  setInstallmentsPos: (pos: { x: number; y: number }) => void;
  showTitle: boolean;
  showDe: boolean;
  showNormalPrice: boolean;
  showPor: boolean;
  showCurrency: boolean;
  showPromoPrice: boolean;
  showCents: boolean;
  showInstallments: boolean;
}

export function usePriceLabelCanvasDragInteraction({
  active,
  closing,
  actionInFlight,
  historyEditingAllowed,
  previewRef,
  selectedElement,
  setSelectedElement,
  selectedElements,
  setSelectedElements,
  prevSelectedRef,
  setActiveGuideX,
  setActiveGuideY,
  titlePos,
  setTitlePos,
  dePricePorGroupPos,
  setDePricePorGroupPos,
  dePos,
  setDePos,
  normalPricePos,
  setNormalPricePos,
  porPos,
  setPorPos,
  currencyPos,
  setCurrencyPos,
  promoPricePos,
  setPromoPricePos,
  centsPos,
  setCentsPos,
  installmentsPos,
  setInstallmentsPos,
  showTitle,
  showDe,
  showNormalPrice,
  showPor,
  showCurrency,
  showPromoPrice,
  showCents,
  showInstallments,
}: UsePriceLabelCanvasDragInteractionParams) {
  const dragRef = useRef<{
    isDragging: boolean;
    layer: PriceLabelLayerKey;
    startX: number;
    startY: number;
    initialPos: { x: number; y: number };
    initialPositions: Partial<Record<string, { x: number; y: number }>>;
  }>({
    isDragging: false,
    layer: null,
    startX: 0,
    startY: 0,
    initialPos: { x: 0, y: 0 },
    initialPositions: {},
  });

  const startDragging = useCallback(
    (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
      if (!layer) return;
      e.stopPropagation();

      prevSelectedRef.current = selectedElement;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      let activeElements = new Set(selectedElements);
      if (!activeElements.has(layer)) {
        activeElements = new Set([layer]);
        setSelectedElements(activeElements);
        setSelectedElement(layer);
      }

      const initialPositions = {} as Record<string, { x: number; y: number }>;
      activeElements.forEach((key) => {
        if (key) {
          let pos = { x: 0, y: 0 };
          if (key === 'title') pos = { ...titlePos };
          else if (key === 'dePricePorGroup') pos = { ...dePricePorGroupPos };
          else if (key === 'deText') pos = { ...dePos };
          else if (key === 'normalPrice') pos = { ...normalPricePos };
          else if (key === 'porText') pos = { ...porPos };
          else if (key === 'currencySymbol') pos = { ...currencyPos };
          else if (key === 'promoPrice') pos = { ...promoPricePos };
          else if (key === 'cents') pos = { ...centsPos };
          else if (key === 'installments') pos = { ...installmentsPos };
          initialPositions[key] = pos;
        }
      });

      dragRef.current = {
        isDragging: true,
        layer,
        startX: clientX,
        startY: clientY,
        initialPos: initialPositions[layer] || { x: 0, y: 0 },
        initialPositions,
      };

      const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
        if (!active.current || closing.current || actionInFlight.current || !historyEditingAllowed.current) return;
        if (!dragRef.current.isDragging || !dragRef.current.layer) return;
        const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

        const el = previewRef.current;
        const s = el ? Math.min(el.clientWidth / 840, el.clientHeight / 480) : 1;
        const currentScale = s > 0 ? s : 1;
        const dx = Math.round((curX - dragRef.current.startX) / currentScale);
        const dy = Math.round((curY - dragRef.current.startY) / currentScale);

        const primaryKey = dragRef.current.layer;
        const primaryStartPos = dragRef.current.initialPositions?.[primaryKey];
        if (!primaryStartPos) return;

        let nextPrimaryX = primaryStartPos.x + dx;
        let nextPrimaryY = primaryStartPos.y + dy;

        const SNAP_THRESHOLD = 6;
        const targets: { x: number; y: number }[] = [
          { x: 0, y: 0 }, // Centro da etiqueta
        ];

        if (showTitle && primaryKey !== 'title') targets.push(titlePos);
        if (showDe && primaryKey !== 'deText') targets.push(dePos);
        if (showNormalPrice && primaryKey !== 'normalPrice') targets.push(normalPricePos);
        if (showPor && primaryKey !== 'porText') targets.push(porPos);
        if (showCurrency && primaryKey !== 'currencySymbol') targets.push(currencyPos);
        if (showPromoPrice && primaryKey !== 'promoPrice') targets.push(promoPricePos);
        if (showCents && primaryKey !== 'cents') targets.push(centsPos);
        if (showInstallments && primaryKey !== 'installments') targets.push(installmentsPos);

        let guideX: number | null = null;
        let guideY: number | null = null;

        for (const t of targets) {
          if (Math.abs(nextPrimaryX - t.x) <= SNAP_THRESHOLD) {
            nextPrimaryX = t.x;
            guideX = t.x;
          }
          if (Math.abs(nextPrimaryY - t.y) <= SNAP_THRESHOLD) {
            nextPrimaryY = t.y;
            guideY = t.y;
          }
        }

        setActiveGuideX(guideX);
        setActiveGuideY(guideY);

        const finalDx = nextPrimaryX - primaryStartPos.x;
        const finalDy = nextPrimaryY - primaryStartPos.y;

        activeElements.forEach((key) => {
          if (!key) return;
          const startPos = dragRef.current.initialPositions?.[key];
          if (!startPos) return;

          const finalPos = {
            x: startPos.x + finalDx,
            y: startPos.y + finalDy,
          };

          if (key === 'title') setTitlePos(finalPos);
          else if (key === 'dePricePorGroup') setDePricePorGroupPos(finalPos);
          else if (key === 'deText') setDePos(finalPos);
          else if (key === 'normalPrice') setNormalPricePos(finalPos);
          else if (key === 'porText') setPorPos(finalPos);
          else if (key === 'currencySymbol') setCurrencyPos(finalPos);
          else if (key === 'promoPrice') setPromoPricePos(finalPos);
          else if (key === 'cents') setCentsPos(finalPos);
          else if (key === 'installments') setInstallmentsPos(finalPos);
        });
      };

      const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        setActiveGuideX(null);
        setActiveGuideY(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    },
    [
      active,
      closing,
      actionInFlight,
      historyEditingAllowed,
      previewRef,
      selectedElement,
      selectedElements,
      setSelectedElement,
      setSelectedElements,
      prevSelectedRef,
      setActiveGuideX,
      setActiveGuideY,
      titlePos,
      setTitlePos,
      dePricePorGroupPos,
      setDePricePorGroupPos,
      dePos,
      setDePos,
      normalPricePos,
      setNormalPricePos,
      porPos,
      setPorPos,
      currencyPos,
      setCurrencyPos,
      promoPricePos,
      setPromoPricePos,
      centsPos,
      setCentsPos,
      installmentsPos,
      setInstallmentsPos,
      showTitle,
      showDe,
      showNormalPrice,
      showPor,
      showCurrency,
      showPromoPrice,
      showCents,
      showInstallments,
    ]
  );

  return { dragRef, startDragging };
}
