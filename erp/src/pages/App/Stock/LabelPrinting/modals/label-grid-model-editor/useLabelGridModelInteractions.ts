import React, { useState, useEffect } from 'react';
import type { useLabelGridModelSession } from './useLabelGridModelSession';

type Session = ReturnType<typeof useLabelGridModelSession>;

export function useLabelGridModelInteractions(session: Session) {
  const [selectedElement, setSelectedElement] = useState<string | null>('name');
  const [editingTextElement, setEditingTextElement] = useState<string | null>(null);
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | 'font' | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartValue, setResizeStartValue] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [previewRef, setPreviewRef] = useState<HTMLDivElement | null>(null);
  const [showGuides, setShowGuides] = useState({ h: false, v: false });

  const [isDesignMode, setIsDesignMode] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [isPromoPreview, setIsPromoPreview] = useState(true);

  // Fecha a paleta ao mudar de elemento
  useEffect(() => setShowColorPalette(false), [selectedElement]);

  const addExtraField = () => {
    const newField = {
      id: `extra_${Date.now()}`,
      text: 'Novo Texto',
      x: 50,
      y: 50,
      size: 10,
      color: '#1e293b',
      bold: false,
      align: 'center',
      width: 40,
      height: 10,
      bgColor: 'transparent',
    };
    if (isPromoPreview) session.setExtraFieldsPromo((prev) => [...prev, newField]);
    else session.setExtraFields((prev) => [...prev, newField]);
    setSelectedElement(newField.id);
  };

  const duplicateExtraField = (id: string) => {
    const fields = isPromoPreview ? session.extraFieldsPromo : session.extraFields;
    const source = fields.find((f) => f.id === id);
    if (!source) return;

    const newField = {
      ...source,
      id: `extra_${Date.now()}`,
      x: Math.min(95, source.x + 5),
      y: Math.min(95, source.y + 5),
    };

    if (isPromoPreview) session.setExtraFieldsPromo((prev) => [...prev, newField]);
    else session.setExtraFields((prev) => [...prev, newField]);
    setSelectedElement(newField.id);
  };

  const removeExtraField = (id: string) => {
    if (isPromoPreview) session.setExtraFieldsPromo((prev) => prev.filter((f) => f.id !== id));
    else session.setExtraFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedElement(null);
  };

  const handleMouseDownResize = (
    e: React.MouseEvent,
    element: string,
    side: 'left' | 'right' | 'font',
    val: number,
    currentX: number,
    currentW: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingElement(element);
    setResizeSide(side);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartValue(val);
    setResizeStartX(currentX);
    setResizeStartWidth(currentW);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement && !resizingElement) return;
    const rect = previewRef?.getBoundingClientRect();
    if (!rect) return;
    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;
    const newX = Math.max(0, Math.min(100, (targetX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, (targetY / rect.height) * 100));

    if (resizingElement && resizeSide) {
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      const previewW = rect.width;
      const deltaPX = (deltaX / previewW) * 100;

      if (resizeSide === 'font') {
        const newValue = Math.max(4, resizeStartValue + deltaY / 2);

        if (resizingElement === 'name') {
          if (isPromoPreview) {
            session.setPromoNameFontSize(newValue);
          } else {
            session.setNameFontSize(newValue);
          }
        } else if (resizingElement === 'mainPrice') {
          if (isPromoPreview) {
            session.setPromoPriceFontSize(newValue);
            session.setPromoFontSize(newValue);
          } else {
            session.setPriceFontSize(newValue);
          }
        } else if (resizingElement === 'oldPrice') {
          session.setOldPriceFontSize(newValue);
        } else if (resizingElement === 'priceSymbol') {
          if (isPromoPreview) session.setPromoPriceSymbolFontSize(newValue);
          else session.setPriceSymbolFontSize(newValue);
        } else if (resizingElement === 'priceDecimals') {
          if (isPromoPreview) session.setPromoPriceDecimalsFontSize(newValue);
          else session.setPriceDecimalsFontSize(newValue);
        } else if (resizingElement.startsWith('extra_')) {
          const update = (prev: any[]) =>
            prev.map((f) => (f.id === resizingElement ? { ...f, size: newValue } : f));
          if (isPromoPreview) session.setExtraFieldsPromo(update);
          else session.setExtraFields(update);
        }
      } else if (resizeSide === 'right' || resizeSide === 'left') {
        const isLeft = resizeSide === 'left';
        const FixedEdge = isLeft
          ? resizeStartX + resizeStartWidth / 2
          : resizeStartX - resizeStartWidth / 2;

        const requestedWidth = isLeft ? resizeStartWidth - deltaPX : resizeStartWidth + deltaPX;
        const maxPossibleWidth = isLeft ? FixedEdge : 100 - FixedEdge;

        const newWidth = Math.max(5, Math.min(maxPossibleWidth, requestedWidth));
        const newX = isLeft ? FixedEdge - newWidth / 2 : FixedEdge + newWidth / 2;

        if (resizingElement === 'name') {
          if (isPromoPreview) {
            session.setPromoNameWidth(newWidth);
            session.setPromoNamePos((p) => ({ ...p, x: newX }));
          } else {
            session.setNameWidth(newWidth);
            session.setNamePos((p) => ({ ...p, x: newX }));
          }
        } else if (resizingElement === 'mainPrice') {
          if (isPromoPreview) {
            session.setPromoWidth(newWidth);
            session.setPromoPos((p) => ({ ...p, x: newX }));
          } else {
            session.setPriceWidth(newWidth);
            session.setPricePos((p) => ({ ...p, x: newX }));
          }
        } else if (resizingElement === 'oldPrice') {
          session.setOldPriceWidth(newWidth);
          session.setOldPricePos((p) => ({ ...p, x: newX }));
        } else if (resizingElement.startsWith('extra_')) {
          const update = (prev: any[]) =>
            prev.map((f) => (f.id === resizingElement ? { ...f, width: newWidth, x: newX } : f));
          if (isPromoPreview) session.setExtraFieldsPromo(update);
          else session.setExtraFields(update);
        }
      }
    } else if (draggingElement) {
      const snappedX = snapEnabled && Math.abs(newX - 50) < 3.5 ? 50 : newX;
      const snappedY = snapEnabled && Math.abs(newY - 50) < 3.5 ? 50 : newY;

      setShowGuides({
        h: snapEnabled && snappedX === 50,
        v: snapEnabled && snappedY === 50,
      });

      const getElemSize = () => {
        if (draggingElement === 'name')
          return {
            w: isPromoPreview ? session.promoNameWidth : session.nameWidth,
            h: isPromoPreview ? session.promoNameHeight : session.nameHeight,
          };
        if (draggingElement === 'mainPrice')
          return {
            w: isPromoPreview ? session.promoWidth : session.priceWidth,
            h: isPromoPreview ? session.promoHeight : session.priceHeight,
          };
        if (draggingElement === 'oldPrice') return { w: session.oldPriceWidth, h: session.oldPriceHeight };
        if (draggingElement === 'barcode') return { w: 80, h: 15 };
        if (draggingElement?.startsWith('extra_')) {
          const f = (isPromoPreview ? session.extraFieldsPromo : session.extraFields).find(
            (field) => field.id === draggingElement
          );
          return { w: f?.width || 40, h: f?.height || 10 };
        }
        return { w: 10, h: 10 };
      };

      const size = getElemSize();
      const minX = size.w / 2;
      const maxX = 100 - size.w / 2;
      const minY = size.h / 2;
      const maxY = 100 - size.h / 2;

      const finalX = Math.max(minX, Math.min(maxX, snappedX));
      const finalY = Math.max(minY, Math.min(maxY, snappedY));

      if (draggingElement === 'name') {
        if (isPromoPreview) {
          session.setPromoNamePos({ x: finalX, y: finalY });
        } else {
          session.setNamePos({ x: finalX, y: finalY });
        }
      } else if (draggingElement === 'mainPrice') {
        if (isPromoPreview) {
          session.setPromoPos({ x: finalX, y: finalY });
        } else {
          session.setPricePos({ x: finalX, y: finalY });
        }
      } else if (draggingElement === 'oldPrice') {
        session.setOldPricePos({ x: finalX, y: finalY });
      } else if (draggingElement === 'barcode') {
        if (isPromoPreview) {
          session.setPromoBarcodePos({ x: finalX, y: finalY });
        } else {
          session.setBarcodePos({ x: finalX, y: finalY });
        }
      } else if (draggingElement === 'priceSymbol') {
        const sX = Math.max(5, Math.min(95, snappedX));
        const sY = Math.max(5, Math.min(95, snappedY));
        if (isPromoPreview) session.setPromoPriceSymbolPos({ x: sX, y: sY });
        else session.setPriceSymbolPos({ x: sX, y: sY });
      } else if (draggingElement === 'priceDecimals') {
        const sX = Math.max(5, Math.min(95, snappedX));
        const sY = Math.max(5, Math.min(95, snappedY));
        if (isPromoPreview) session.setPromoPriceDecimalsPos({ x: sX, y: sY });
        else session.setPriceDecimalsPos({ x: sX, y: sY });
      } else if (draggingElement.startsWith('extra_')) {
        const update = (prev: any[]) =>
          prev.map((f) => (f.id === draggingElement ? { ...f, x: finalX, y: finalY } : f));
        if (isPromoPreview) session.setExtraFieldsPromo(update);
        else session.setExtraFields(update);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
    setResizingElement(null);
    setShowGuides({ h: false, v: false });
  };

  useEffect(() => {
    if (draggingElement || resizingElement) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [draggingElement, resizingElement]);

  const isInactive = !selectedElement;
  const isText = selectedElement && selectedElement !== 'barcode';

  const getActiveValue = () => {
    if (selectedElement === 'name')
      return {
        font: session.nameFontSize,
        color: session.nameColor,
        bold: session.nameBold,
        align: session.nameAlign,
        valign: session.nameVAlign,
        text: 'Sofá de Canto Luxo Reclinável',
      };
    if (selectedElement === 'mainPrice') {
      if (isPromoPreview)
        return {
          font: session.promoPriceFontSize,
          color: session.promoPriceColor,
          bold: session.promoPriceBold,
          align: session.promoPriceAlign,
          valign: session.promoPriceVAlign,
          text: '2.990',
        };
      return {
        font: session.priceFontSize,
        color: session.priceColor,
        bold: session.priceBold,
        align: session.priceAlign,
        valign: session.priceVAlign,
        text: '3.490',
      };
    }
    if (selectedElement === 'oldPrice')
      return {
        font: session.oldPriceFontSize,
        color: session.oldPriceColor,
        bold: session.oldPriceBold,
        align: session.oldPriceAlign,
        valign: session.oldPriceVAlign,
        text: '3.490',
      };
    if (selectedElement === 'priceSymbol') {
      if (isPromoPreview)
        return {
          font: session.promoPriceSymbolFontSize,
          color: session.promoPriceSymbolColor,
          bold: session.promoPriceSymbolBold,
          align: 'center' as const,
          valign: 'middle' as const,
          text: 'R$',
        };
      return {
        font: session.priceSymbolFontSize,
        color: session.priceSymbolColor,
        bold: session.priceSymbolBold,
        align: 'center' as const,
        valign: 'middle' as const,
        text: 'R$',
      };
    }
    if (selectedElement === 'priceDecimals') {
      if (isPromoPreview)
        return {
          font: session.promoPriceDecimalsFontSize,
          color: session.promoPriceDecimalsColor,
          bold: session.promoPriceDecimalsBold,
          align: 'center' as const,
          valign: 'middle' as const,
          text: ',00',
        };
      return {
        font: session.priceDecimalsFontSize,
        color: session.priceDecimalsColor,
        bold: session.priceDecimalsBold,
        align: 'center' as const,
        valign: 'middle' as const,
        text: ',00',
      };
    }
    if (selectedElement?.toString().startsWith('extra_')) {
      const fields = isPromoPreview ? session.extraFieldsPromo : session.extraFields;
      const f = fields.find((field) => field.id === selectedElement);
      if (f)
        return {
          font: f.size,
          color: f.color,
          bold: f.bold,
          align: f.align || 'center',
          valign: 'middle' as const,
          text: f.text,
        };
    }
    return {
      font: 0,
      color: '#ccc',
      bold: false,
      align: 'center' as const,
      valign: 'middle' as const,
      text: '',
    };
  };

  const active = getActiveValue();
  const activeColor = isText ? active.color : '#ccc';
  const activeSize = isText ? active.font : 0;
  const activeBold = isText ? active.bold : false;
  const activeAlign = isText ? active.align : 'center';
  const activeVAlign = isText ? active.valign : 'middle';

  const activeBg = !selectedElement
    ? session.bgColor
    : selectedElement === 'name'
      ? isPromoPreview
        ? session.promoNameBgColor
        : session.nameBgColor
      : selectedElement === 'mainPrice'
        ? isPromoPreview
          ? session.promoBgColor
          : session.priceBgColor
        : selectedElement === 'oldPrice'
          ? 'transparent'
          : selectedElement === 'priceSymbol' || selectedElement === 'priceDecimals'
            ? isPromoPreview
              ? session.promoBgColor
              : session.priceBgColor
            : 'transparent';

  const updateStyle = (key: string, val: any) => {
    if (!selectedElement) {
      if (key === 'bg') session.setBgColor(val);
      return;
    }
    if (selectedElement === 'name') {
      if (isPromoPreview) {
        if (key === 'color') session.setPromoNameColor(val);
        if (key === 'size') session.setPromoNameFontSize(val);
        if (key === 'bold') session.setPromoNameBold(val);
        if (key === 'align') session.setPromoNameAlign(val);
        if (key === 'valign') session.setPromoNameVAlign(val);
        if (key === 'bg') session.setPromoNameBgColor(val);
      } else {
        if (key === 'color') session.setNameColor(val);
        if (key === 'size') session.setNameFontSize(val);
        if (key === 'bold') session.setNameBold(val);
        if (key === 'align') session.setNameAlign(val);
        if (key === 'valign') session.setNameVAlign(val);
        if (key === 'bg') session.setNameBgColor(val);
      }
    } else if (selectedElement === 'mainPrice') {
      if (isPromoPreview) {
        if (key === 'color') session.setPromoPriceColor(val);
        if (key === 'size') {
          session.setPromoPriceFontSize(val);
          session.setPromoFontSize(val);
        }
        if (key === 'bold') session.setPromoPriceBold(val);
        if (key === 'align') session.setPromoPriceAlign(val);
        if (key === 'valign') session.setPromoPriceVAlign(val);
        if (key === 'bg') session.setPromoBgColor(val);
      } else {
        if (key === 'color') session.setPriceColor(val);
        if (key === 'size') session.setPriceFontSize(val);
        if (key === 'bold') session.setPriceBold(val);
        if (key === 'align') session.setPriceAlign(val);
        if (key === 'valign') session.setPriceVAlign(val);
        if (key === 'bg') session.setPriceBgColor(val);
      }
    } else if (selectedElement === 'oldPrice') {
      if (key === 'color') session.setOldPriceColor(val);
      if (key === 'size') session.setOldPriceFontSize(val);
      if (key === 'bold') session.setOldPriceBold(val);
      if (key === 'align') session.setOldPriceAlign(val);
      if (key === 'valign') session.setOldPriceVAlign(val);
    } else if (selectedElement === 'priceSymbol') {
      if (isPromoPreview) {
        if (key === 'color') session.setPromoPriceSymbolColor(val);
        if (key === 'size') session.setPromoPriceSymbolFontSize(val);
        if (key === 'bold') session.setPromoPriceSymbolBold(val);
      } else {
        if (key === 'color') session.setPriceSymbolColor(val);
        if (key === 'size') session.setPriceSymbolFontSize(val);
        if (key === 'bold') session.setPriceSymbolBold(val);
      }
      if (key === 'bg') session.setPriceBgColor(val);
    } else if (selectedElement === 'priceDecimals') {
      if (isPromoPreview) {
        if (key === 'color') session.setPromoPriceDecimalsColor(val);
        if (key === 'size') session.setPromoPriceDecimalsFontSize(val);
        if (key === 'bold') session.setPromoPriceDecimalsBold(val);
      } else {
        if (key === 'color') session.setPriceDecimalsColor(val);
        if (key === 'size') session.setPriceDecimalsFontSize(val);
        if (key === 'bold') session.setPriceDecimalsBold(val);
      }
      if (key === 'bg') session.setPriceBgColor(val);
    } else if (selectedElement?.toString().startsWith('extra_')) {
      const update = (prev: any[]) =>
        prev.map((f) => {
          if (f.id === selectedElement) {
            if (key === 'color') return { ...f, color: val };
            if (key === 'size') return { ...f, size: val };
            if (key === 'bold') return { ...f, bold: val };
            if (key === 'text') return { ...f, text: val };
            if (key === 'align') return { ...f, align: val };
          }
          return f;
        });
      if (isPromoPreview) session.setExtraFieldsPromo(update);
      else session.setExtraFields(update);
    }
  };

  const cycleAlign = () => {
    const next: Record<string, 'left' | 'center' | 'right'> = {
      left: 'center',
      center: 'right',
      right: 'left',
    };
    updateStyle('align', next[activeAlign]);
  };

  const cycleVAlign = () => {
    const next: Record<string, 'top' | 'middle' | 'bottom'> = {
      top: 'middle',
      middle: 'bottom',
      bottom: 'top',
    };
    updateStyle('valign', next[activeVAlign]);
  };

  const toolbarState = {
    isInactive,
    isDesignMode,
    isPromoPreview,
    selectedElement,
    activeBackground: activeBg,
    snapEnabled,
    showColorPalette,
    activeColor,
    activeSize,
    activeBold,
    activeAlign,
    activeVerticalAlign: activeVAlign,
    priceFontSizes: {
      tens: session.priceFontSizeTens,
      hundreds: session.priceFontSizeHundreds,
      thousands: session.priceFontSizeThousands,
      tenThousands: session.priceFontSizeTenThousands,
    },
    fontFamily: session.fontFamily,
    priceFormat: session.priceFormat,
  };

  const toolbarHandlers = {
    onExitDesignMode: () => setIsDesignMode(false),
    onChangePreviewMode: (promo: boolean) => {
      setIsPromoPreview(promo);
      setSelectedElement(null);
    },
    onAddExtraField: addExtraField,
    onUpdateStyle: updateStyle,
    onToggleSnap: () => setSnapEnabled(!snapEnabled),
    onToggleColorPalette: setShowColorPalette,
    onPriceFontSizeChange: (
      scale: 'tens' | 'hundreds' | 'thousands' | 'tenThousands',
      value: number
    ) => {
      if (scale === 'tens') session.setPriceFontSizeTens(value);
      else if (scale === 'hundreds') session.setPriceFontSizeHundreds(value);
      else if (scale === 'thousands') session.setPriceFontSizeThousands(value);
      else session.setPriceFontSizeTenThousands(value);
    },
    onCycleAlign: cycleAlign,
    onCycleVerticalAlign: cycleVAlign,
    onFontFamilyChange: session.setFontFamily,
    onTogglePriceFormat: () =>
      session.setPriceFormat((prev) => (prev === 'split' ? 'standard' : 'split')),
    onClearSelection: () => setSelectedElement(null),
  };

  return {
    selectedElement,
    setSelectedElement,
    editingTextElement,
    setEditingTextElement,
    resizingElement,
    setResizingElement,
    draggingElement,
    setDraggingElement,
    previewRef,
    setPreviewRef,
    showGuides,
    isDesignMode,
    setIsDesignMode,
    snapEnabled,
    setSnapEnabled,
    showColorPalette,
    setShowColorPalette,
    isPromoPreview,
    setIsPromoPreview,
    handleMouseDownResize,
    handleMouseMove,
    handleMouseUp,
    addExtraField,
    duplicateExtraField,
    removeExtraField,
    getActiveValue,
    updateStyle,
    cycleAlign,
    cycleVAlign,
    toolbarState,
    toolbarHandlers,
  };
}
