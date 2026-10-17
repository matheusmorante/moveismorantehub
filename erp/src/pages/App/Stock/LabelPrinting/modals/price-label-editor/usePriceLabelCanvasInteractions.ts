import React, { useRef, useCallback } from 'react';
import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

export interface UsePriceLabelCanvasInteractionsParams {
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

  // Guides
  setActiveGuideX: (val: number | null) => void;
  setActiveGuideY: (val: number | null) => void;

  // Positions and Setters
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

  // Visibility Flags
  showTitle: boolean;
  showDe: boolean;
  showNormalPrice: boolean;
  showPor: boolean;
  showCurrency: boolean;
  showPromoPrice: boolean;
  showCents: boolean;
  showInstallments: boolean;

  // Rotations
  titleRotation: number;
  setTitleRotation: (val: number) => void;
  dePricePorGroupRotation: number;
  setDePricePorGroupRotation: (val: number) => void;
  deRotation: number;
  setDeRotation: (val: number) => void;
  normalPriceRotation: number;
  setNormalPriceRotation: (val: number) => void;
  porRotation: number;
  setPorRotation: (val: number) => void;
  currencyRotation: number;
  setCurrencyRotation: (val: number) => void;
  promoPriceRotation: number;
  setPromoPriceRotation: (val: number) => void;
  centsRotation: number;
  setCentsRotation: (val: number) => void;
  installmentsRotation: number;
  setInstallmentsRotation: (val: number) => void;

  // Font Sizes and Setters for Resizing
  activeTitleFontSize: number;
  setTitleFontSizeTens: (val: number) => void;
  setTitleFontSizeHundreds: (val: number) => void;
  setTitleFontSizeThousands: (val: number) => void;

  activeDeFontSize: number;
  setDeFontSizeTens: (val: number) => void;
  setDeFontSizeHundreds: (val: number) => void;
  setDeFontSizeThousands: (val: number) => void;

  activeNormalPriceFontSize: number;
  setNormalPriceFontSizeTens: (val: number) => void;
  setNormalPriceFontSizeHundreds: (val: number) => void;
  setNormalPriceFontSizeThousands: (val: number) => void;

  activePorFontSize: number;
  setPorFontSizeTens: (val: number) => void;
  setPorFontSizeHundreds: (val: number) => void;
  setPorFontSizeThousands: (val: number) => void;

  activeCurrencyFontSize: number;
  setCurrencyFontSizeTens: (val: number) => void;
  setCurrencyFontSizeHundreds: (val: number) => void;
  setCurrencyFontSizeThousands: (val: number) => void;

  activeCentsFontSize: number;
  setCentsFontSizeTens: (val: number) => void;
  setCentsFontSizeHundreds: (val: number) => void;
  setCentsFontSizeThousands: (val: number) => void;

  activeInstallmentsFontSize: number;
  setInstallmentsFontSizeTens: (val: number) => void;
  setInstallmentsFontSizeHundreds: (val: number) => void;
  setInstallmentsFontSizeThousands: (val: number) => void;

  activeScale: number;
  scaleTens: number;
  setScaleTens: (val: number) => void;
  scaleHundreds: number;
  setScaleHundreds: (val: number) => void;
  scaleThousands: number;
  setScaleThousands: (val: number) => void;
  scaleTenThousands: number;
  setScaleTenThousands: (val: number) => void;
}

export function usePriceLabelCanvasInteractions({
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
  titleRotation,
  setTitleRotation,
  dePricePorGroupRotation,
  setDePricePorGroupRotation,
  deRotation,
  setDeRotation,
  normalPriceRotation,
  setNormalPriceRotation,
  porRotation,
  setPorRotation,
  currencyRotation,
  setCurrencyRotation,
  promoPriceRotation,
  setPromoPriceRotation,
  centsRotation,
  setCentsRotation,
  installmentsRotation,
  setInstallmentsRotation,
  activeTitleFontSize,
  setTitleFontSizeTens,
  setTitleFontSizeHundreds,
  setTitleFontSizeThousands,
  activeDeFontSize,
  setDeFontSizeTens,
  setDeFontSizeHundreds,
  setDeFontSizeThousands,
  activeNormalPriceFontSize,
  setNormalPriceFontSizeTens,
  setNormalPriceFontSizeHundreds,
  setNormalPriceFontSizeThousands,
  activePorFontSize,
  setPorFontSizeTens,
  setPorFontSizeHundreds,
  setPorFontSizeThousands,
  activeCurrencyFontSize,
  setCurrencyFontSizeTens,
  setCurrencyFontSizeHundreds,
  setCurrencyFontSizeThousands,
  activeCentsFontSize,
  setCentsFontSizeTens,
  setCentsFontSizeHundreds,
  setCentsFontSizeThousands,
  activeInstallmentsFontSize,
  setInstallmentsFontSizeTens,
  setInstallmentsFontSizeHundreds,
  setInstallmentsFontSizeThousands,
  activeScale,
  scaleTens,
  setScaleTens,
  scaleHundreds,
  setScaleHundreds,
  scaleThousands,
  setScaleThousands,
  scaleTenThousands,
  setScaleTenThousands,
}: UsePriceLabelCanvasInteractionsParams) {
  // Drag de Posição
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

  // Resize do Elemento
  const resizeRef = useRef<{
    isResizing: boolean;
    layer: PriceLabelLayerKey;
    startX: number;
    startY: number;
    initialVal: number;
    initialTens?: number;
    initialHundreds?: number;
    initialThousands?: number;
    initialTenThousands?: number;
  }>({
    isResizing: false,
    layer: null,
    startX: 0,
    startY: 0,
    initialVal: 0,
  });

  // Rotação do Elemento
  const rotateRef = useRef<{
    isRotating: boolean;
    layer: PriceLabelLayerKey;
    startX: number;
    initialRot: number;
  }>({
    isRotating: false,
    layer: null,
    startX: 0,
    initialRot: 0,
  });

  // ARRASTATOR DE ELEMENTOS NO CANVAS COM ÍMÃ E LINHAS GUIA MAGNÉTICAS
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

  // REDIMENSIONAR ELEMENTO ARRASTANDO O CANTO INFERIOR DIREITO
  const startResizing = useCallback(
    (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setSelectedElement(layer);
      setSelectedElements(new Set(layer ? [layer] : []));

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      let initial = 14;
      if (layer === 'title') initial = activeTitleFontSize;
      else if (layer === 'deText') initial = activeDeFontSize;
      else if (layer === 'normalPrice') initial = activeNormalPriceFontSize;
      else if (layer === 'porText') initial = activePorFontSize;
      else if (layer === 'currencySymbol') initial = activeCurrencyFontSize;
      else if (layer === 'cents') initial = activeCentsFontSize;
      else if (layer === 'installments') initial = activeInstallmentsFontSize;
      else if (layer === 'promoPrice') initial = activeScale;

      resizeRef.current = {
        isResizing: true,
        layer,
        startX: clientX,
        startY: clientY,
        initialVal: initial,
        initialTens: scaleTens,
        initialHundreds: scaleHundreds,
        initialThousands: scaleThousands,
        initialTenThousands: scaleTenThousands,
      };

      const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
        if (!active.current || closing.current || actionInFlight.current || !historyEditingAllowed.current) return;
        if (!resizeRef.current.isResizing || !resizeRef.current.layer) return;
        const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
        const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

        const delta = curX - resizeRef.current.startX + (curY - resizeRef.current.startY);
        const l = resizeRef.current.layer;

        if (l === 'promoPrice') {
          const deltaPx = Math.round(delta * 0.18);
          setScaleTens(Math.max(10, (resizeRef.current.initialTens ?? scaleTens) + deltaPx));
          setScaleHundreds(
            Math.max(10, (resizeRef.current.initialHundreds ?? scaleHundreds) + deltaPx)
          );
          setScaleThousands(
            Math.max(10, (resizeRef.current.initialThousands ?? scaleThousands) + deltaPx)
          );
          setScaleTenThousands(
            Math.max(10, (resizeRef.current.initialTenThousands ?? scaleTenThousands) + deltaPx)
          );
        } else if (l === 'currencySymbol') {
          const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
          setCurrencyFontSizeTens(newSize);
          setCurrencyFontSizeHundreds(newSize);
          setCurrencyFontSizeThousands(newSize);
        } else if (l === 'cents') {
          const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
          setCentsFontSizeTens(newSize);
          setCentsFontSizeHundreds(newSize);
          setCentsFontSizeThousands(newSize);
        } else {
          const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
          if (l === 'title') {
            setTitleFontSizeTens(newSize);
            setTitleFontSizeHundreds(newSize);
            setTitleFontSizeThousands(newSize);
          } else if (l === 'deText') {
            setDeFontSizeTens(newSize);
            setDeFontSizeHundreds(newSize);
            setDeFontSizeThousands(newSize);
          } else if (l === 'normalPrice') {
            setNormalPriceFontSizeTens(newSize);
            setNormalPriceFontSizeHundreds(newSize);
            setNormalPriceFontSizeThousands(newSize);
          } else if (l === 'porText') {
            setPorFontSizeTens(newSize);
            setPorFontSizeHundreds(newSize);
            setPorFontSizeThousands(newSize);
          } else if (l === 'installments') {
            setInstallmentsFontSizeTens(newSize);
            setInstallmentsFontSizeHundreds(newSize);
            setInstallmentsFontSizeThousands(newSize);
          }
        }
      };

      const handleMouseUp = () => {
        resizeRef.current.isResizing = false;
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
      setSelectedElement,
      setSelectedElements,
      activeTitleFontSize,
      activeDeFontSize,
      activeNormalPriceFontSize,
      activePorFontSize,
      activeCurrencyFontSize,
      activeCentsFontSize,
      activeInstallmentsFontSize,
      activeScale,
      scaleTens,
      setScaleTens,
      scaleHundreds,
      setScaleHundreds,
      scaleThousands,
      setScaleThousands,
      scaleTenThousands,
      setScaleTenThousands,
      setCurrencyFontSizeTens,
      setCurrencyFontSizeHundreds,
      setCurrencyFontSizeThousands,
      setCentsFontSizeTens,
      setCentsFontSizeHundreds,
      setCentsFontSizeThousands,
      setTitleFontSizeTens,
      setTitleFontSizeHundreds,
      setTitleFontSizeThousands,
      setDeFontSizeTens,
      setDeFontSizeHundreds,
      setDeFontSizeThousands,
      setNormalPriceFontSizeTens,
      setNormalPriceFontSizeHundreds,
      setNormalPriceFontSizeThousands,
      setPorFontSizeTens,
      setPorFontSizeHundreds,
      setPorFontSizeThousands,
      setInstallmentsFontSizeTens,
      setInstallmentsFontSizeHundreds,
      setInstallmentsFontSizeThousands,
    ]
  );

  // ROTACIONAR ELEMENTO ARRASTANDO A SETA CURVADA
  const startRotating = useCallback(
    (layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setSelectedElement(layer);
      setSelectedElements(new Set(layer ? [layer] : []));

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      let initialRot = 0;
      if (layer === 'title') initialRot = titleRotation;
      else if (layer === 'dePricePorGroup') initialRot = dePricePorGroupRotation;
      else if (layer === 'deText') initialRot = deRotation;
      else if (layer === 'normalPrice') initialRot = normalPriceRotation;
      else if (layer === 'porText') initialRot = porRotation;
      else if (layer === 'currencySymbol') initialRot = currencyRotation;
      else if (layer === 'promoPrice') initialRot = promoPriceRotation;
      else if (layer === 'cents') initialRot = centsRotation;
      else if (layer === 'installments') initialRot = installmentsRotation;

      rotateRef.current = {
        isRotating: true,
        layer,
        startX: clientX,
        initialRot,
      };

      const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
        if (!active.current || closing.current || actionInFlight.current || !historyEditingAllowed.current) return;
        if (!rotateRef.current.isRotating || !rotateRef.current.layer) return;
        const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;

        const dx = curX - rotateRef.current.startX;
        const newRot = Math.round((rotateRef.current.initialRot + dx * 0.8) % 360);

        const l = rotateRef.current.layer;
        if (l === 'title') setTitleRotation(newRot);
        else if (l === 'dePricePorGroup') setDePricePorGroupRotation(newRot);
        else if (l === 'deText') setDeRotation(newRot);
        else if (l === 'normalPrice') setNormalPriceRotation(newRot);
        else if (l === 'porText') setPorRotation(newRot);
        else if (l === 'currencySymbol') setCurrencyRotation(newRot);
        else if (l === 'promoPrice') setPromoPriceRotation(newRot);
        else if (l === 'cents') setCentsRotation(newRot);
        else if (l === 'installments') setInstallmentsRotation(newRot);
      };

      const handleMouseUp = () => {
        rotateRef.current.isRotating = false;
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
      setSelectedElement,
      setSelectedElements,
      titleRotation,
      setTitleRotation,
      dePricePorGroupRotation,
      setDePricePorGroupRotation,
      deRotation,
      setDeRotation,
      normalPriceRotation,
      setNormalPriceRotation,
      porRotation,
      setPorRotation,
      currencyRotation,
      setCurrencyRotation,
      promoPriceRotation,
      setPromoPriceRotation,
      centsRotation,
      setCentsRotation,
      installmentsRotation,
      setInstallmentsRotation,
    ]
  );

  return {
    dragRef,
    resizeRef,
    rotateRef,
    startDragging,
    startResizing,
    startRotating,
  };
}
