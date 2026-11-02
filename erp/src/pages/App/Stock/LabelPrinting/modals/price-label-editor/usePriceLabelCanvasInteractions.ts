import React, { useRef, useCallback } from 'react';
import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';
import {
  usePriceLabelCanvasDragInteraction,
  type UsePriceLabelCanvasDragInteractionParams,
} from './usePriceLabelCanvasDragInteraction';

export interface UsePriceLabelCanvasInteractionsParams extends UsePriceLabelCanvasDragInteractionParams {
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
  const { dragRef, startDragging } = usePriceLabelCanvasDragInteraction({
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
