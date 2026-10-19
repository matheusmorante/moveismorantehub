import { useState } from 'react';
import { toast } from 'react-toastify';
import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

interface UsePriceLabelElementFormattingParams {
  selectedElement: PriceLabelLayerKey;
  selectedElements: Set<PriceLabelLayerKey>;
  setSelectedElement: React.Dispatch<React.SetStateAction<PriceLabelLayerKey>>;
  setSelectedElements: React.Dispatch<React.SetStateAction<Set<PriceLabelLayerKey>>>;
  selectedOppId: string;
  setSelectedOppId: (id: string) => void;
  oppColorsMap: Record<string, Record<string, string>>;
  setOppColorsMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  defaultBgColor: string;
  bgColor: string;
  setBgColor: (color: string) => void;
  priceLabelLayers: Array<{ key: string; label: string }>;
  pendingGradientColorRef: React.MutableRefObject<string | null>;
  setShowColorPickerDropdown: (show: boolean) => void;
  opportunitySelectionRevision: React.MutableRefObject<number>;

  // Position Setters
  setTitlePos: (pos: { x: number; y: number }) => void;
  setDePricePorGroupPos: (pos: { x: number; y: number }) => void;
  setDePos: (pos: { x: number; y: number }) => void;
  setNormalPricePos: (pos: { x: number; y: number }) => void;
  setPorPos: (pos: { x: number; y: number }) => void;
  setCurrencyPos: (pos: { x: number; y: number }) => void;
  setPromoPricePos: (pos: { x: number; y: number }) => void;
  setCentsPos: (pos: { x: number; y: number }) => void;
  setInstallmentsPos: (pos: { x: number; y: number }) => void;

  // Color Setters and Values
  titleColor: string;
  setTitleColor: (color: string) => void;
  deColor: string;
  setDeColor: (color: string) => void;
  normalPriceColor: string;
  setNormalPriceColor: (color: string) => void;
  porColor: string;
  setPorColor: (color: string) => void;
  currencyColor: string;
  setCurrencyColor: (color: string) => void;
  priceColor: string;
  setPriceColor: (color: string) => void;
  centsColor: string;
  setCentsColor: (color: string) => void;
  installmentsColor: string;
  setInstallmentsColor: (color: string) => void;

  // Font Family Setters and Values
  titleFontFamily: string;
  setTitleFontFamily: (font: string) => void;
  deFontFamily: string;
  setDeFontFamily: (font: string) => void;
  normalPriceFontFamily: string;
  setNormalPriceFontFamily: (font: string) => void;
  porFontFamily: string;
  setPorFontFamily: (font: string) => void;
  currencyFontFamily: string;
  setCurrencyFontFamily: (font: string) => void;
  promoPriceFontFamily: string;
  setPromoPriceFontFamily: (font: string) => void;
  centsFontFamily: string;
  setCentsFontFamily: (font: string) => void;
  installmentsFontFamily: string;
  setInstallmentsFontFamily: (font: string) => void;

  // Font Size Setters
  setTitleFontSizeTens: (v: number) => void;
  setTitleFontSizeHundreds: (v: number) => void;
  setTitleFontSizeThousands: (v: number) => void;
  setDeFontSizeTens: (v: number) => void;
  setDeFontSizeHundreds: (v: number) => void;
  setDeFontSizeThousands: (v: number) => void;
  setNormalPriceFontSizeTens: (v: number) => void;
  setNormalPriceFontSizeHundreds: (v: number) => void;
  setNormalPriceFontSizeThousands: (v: number) => void;
  setPorFontSizeTens: (v: number) => void;
  setPorFontSizeHundreds: (v: number) => void;
  setPorFontSizeThousands: (v: number) => void;
  setCurrencyFontSizeTens: (v: number) => void;
  setCurrencyFontSizeHundreds: (v: number) => void;
  setCurrencyFontSizeThousands: (v: number) => void;
  setCentsFontSizeTens: (v: number) => void;
  setCentsFontSizeHundreds: (v: number) => void;
  setCentsFontSizeThousands: (v: number) => void;
  setInstallmentsFontSizeTens: (v: number) => void;
  setInstallmentsFontSizeHundreds: (v: number) => void;
  setInstallmentsFontSizeThousands: (v: number) => void;

  // Scale Setters
  selectedMagnitude: 'tens' | 'hundreds' | 'thousands' | 'tenThousands';
  setScaleTens: (v: number) => void;
  setScaleHundreds: (v: number) => void;
  setScaleThousands: (v: number) => void;
}

export function usePriceLabelElementFormatting({
  selectedElement,
  selectedElements,
  setSelectedElement,
  setSelectedElements,
  selectedOppId,
  setSelectedOppId,
  oppColorsMap,
  setOppColorsMap,
  defaultBgColor,
  bgColor,
  setBgColor,
  priceLabelLayers,
  pendingGradientColorRef,
  setShowColorPickerDropdown,
  opportunitySelectionRevision,
  setTitlePos,
  setDePricePorGroupPos,
  setDePos,
  setNormalPricePos,
  setPorPos,
  setCurrencyPos,
  setPromoPricePos,
  setCentsPos,
  setInstallmentsPos,
  titleColor,
  setTitleColor,
  deColor,
  setDeColor,
  normalPriceColor,
  setNormalPriceColor,
  porColor,
  setPorColor,
  currencyColor,
  setCurrencyColor,
  priceColor,
  setPriceColor,
  centsColor,
  setCentsColor,
  installmentsColor,
  setInstallmentsColor,
  titleFontFamily,
  setTitleFontFamily,
  deFontFamily,
  setDeFontFamily,
  normalPriceFontFamily,
  setNormalPriceFontFamily,
  porFontFamily,
  setPorFontFamily,
  currencyFontFamily,
  setCurrencyFontFamily,
  promoPriceFontFamily,
  setPromoPriceFontFamily,
  centsFontFamily,
  setCentsFontFamily,
  installmentsFontFamily,
  setInstallmentsFontFamily,
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
  setCurrencyFontSizeTens,
  setCurrencyFontSizeHundreds,
  setCurrencyFontSizeThousands,
  setCentsFontSizeTens,
  setCentsFontSizeHundreds,
  setCentsFontSizeThousands,
  setInstallmentsFontSizeTens,
  setInstallmentsFontSizeHundreds,
  setInstallmentsFontSizeThousands,
  selectedMagnitude,
  setScaleTens,
  setScaleHundreds,
  setScaleThousands,
}: UsePriceLabelElementFormattingParams) {
  const [colorHistory, setColorHistory] = useState<string[]>([
    '#000000',
    '#1e3a8a',
    '#dc2626',
    '#ea580c',
    '#ffffff',
    '#2563eb',
    '#16a34a',
    '#ff7900',
    '#7c3aed',
  ]);

  const handleCenterElement = (elementKey: string | null) => {
    if (!elementKey || elementKey === 'background') return;
    switch (elementKey) {
      case 'title':
        setTitlePos({ x: 0, y: 0 });
        break;
      case 'dePricePorGroup':
        setDePricePorGroupPos({ x: 0, y: 0 });
        break;
      case 'deText':
        setDePos({ x: 0, y: 0 });
        break;
      case 'normalPrice':
        setNormalPricePos({ x: 0, y: 0 });
        break;
      case 'porText':
        setPorPos({ x: 0, y: 0 });
        break;
      case 'currencySymbol':
        setCurrencyPos({ x: 0, y: 0 });
        break;
      case 'promoPrice':
        setPromoPricePos({ x: 0, y: 0 });
        break;
      case 'cents':
        setCentsPos({ x: 0, y: 0 });
        break;
      case 'installments':
        setInstallmentsPos({ x: 0, y: 0 });
        break;
      default:
        break;
    }
    setSelectedElement(elementKey as any);
    setSelectedElements(new Set([elementKey as any]));
    const labelName = priceLabelLayers.find((l) => l.key === elementKey)?.label || elementKey;
    toast.success(`Componente "${labelName}" centralizado na etiqueta!`);
  };

  const closeColorPicker = () => {
    const color = pendingGradientColorRef.current;
    if (color) {
      setColorHistory((prev) =>
        [color, ...prev.filter((item) => item.toLowerCase() !== color.toLowerCase())].slice(0, 10)
      );
      pendingGradientColorRef.current = null;
    }
    setShowColorPickerDropdown(false);
  };

  const handleSelectOpportunityContext = (newOppId: string) => {
    opportunitySelectionRevision.current += 1;
    setSelectedOppId(newOppId);
  };

  const handleColorSelect = (newColor: string, addToHistory = true) => {
    if (selectedElement === 'title') setTitleColor(newColor);
    else if (selectedElement === 'deText') setDeColor(newColor);
    else if (selectedElement === 'normalPrice') setNormalPriceColor(newColor);
    else if (selectedElement === 'porText') setPorColor(newColor);
    else if (selectedElement === 'currencySymbol') setCurrencyColor(newColor);
    else if (selectedElement === 'promoPrice') setPriceColor(newColor);
    else if (selectedElement === 'cents') setCentsColor(newColor);
    else if (selectedElement === 'installments') setInstallmentsColor(newColor);
    else if (selectedElement === 'background') setBgColor(newColor);

    if (selectedElement && selectedOppId) {
      setOppColorsMap((prev) => ({
        ...prev,
        [selectedOppId]: {
          ...(prev[selectedOppId] || {}),
          [selectedElement]: newColor,
        },
      }));
    }

    if (addToHistory) {
      setColorHistory((prev) => {
        const filtered = prev.filter((c) => c.toLowerCase() !== newColor.toLowerCase());
        return [newColor, ...filtered].slice(0, 10);
      });
    }
  };

  const handleOpportunityColorChange = (
    opportunityId: string,
    color: string,
    isCurrentActiveOpp: boolean
  ) => {
    if (!selectedElement) return;
    setOppColorsMap((prev) => ({
      ...prev,
      [opportunityId]: {
        ...(prev[opportunityId] || {}),
        [selectedElement]: color,
      },
    }));
    if (isCurrentActiveOpp) handleColorSelect(color, false);
    pendingGradientColorRef.current = color;
  };

  const handleFontChange = (fontVal: string) => {
    if (selectedElement === 'title') setTitleFontFamily(fontVal);
    else if (selectedElement === 'deText') setDeFontFamily(fontVal);
    else if (selectedElement === 'normalPrice') setNormalPriceFontFamily(fontVal);
    else if (selectedElement === 'porText') setPorFontFamily(fontVal);
    else if (selectedElement === 'currencySymbol') setCurrencyFontFamily(fontVal);
    else if (selectedElement === 'promoPrice') setPromoPriceFontFamily(fontVal);
    else if (selectedElement === 'cents') setCentsFontFamily(fontVal);
    else if (selectedElement === 'installments') setInstallmentsFontFamily(fontVal);
  };

  const handleBatchFontSize = (v: number) => {
    selectedElements.forEach((key) => {
      if (key === 'title') {
        setTitleFontSizeTens(v);
        setTitleFontSizeHundreds(v);
        setTitleFontSizeThousands(v);
      } else if (key === 'deText') {
        setDeFontSizeTens(v);
        setDeFontSizeHundreds(v);
        setDeFontSizeThousands(v);
      } else if (key === 'normalPrice') {
        setNormalPriceFontSizeTens(v);
        setNormalPriceFontSizeHundreds(v);
        setNormalPriceFontSizeThousands(v);
      } else if (key === 'porText') {
        setPorFontSizeTens(v);
        setPorFontSizeHundreds(v);
        setPorFontSizeThousands(v);
      } else if (key === 'installments') {
        setInstallmentsFontSizeTens(v);
        setInstallmentsFontSizeHundreds(v);
        setInstallmentsFontSizeThousands(v);
      } else if (key === 'currencySymbol') {
        setCurrencyFontSizeTens(v);
        setCurrencyFontSizeHundreds(v);
        setCurrencyFontSizeThousands(v);
      } else if (key === 'cents') {
        setCentsFontSizeTens(v);
        setCentsFontSizeHundreds(v);
        setCentsFontSizeThousands(v);
      } else if (key === 'promoPrice') {
        if (selectedMagnitude === 'tens') setScaleTens(v);
        else if (selectedMagnitude === 'hundreds') setScaleHundreds(v);
        else setScaleThousands(v);
      }
    });
  };

  const handleBatchFontFamily = (fontVal: string) => {
    selectedElements.forEach((key) => {
      if (key === 'title') setTitleFontFamily(fontVal);
      else if (key === 'deText') setDeFontFamily(fontVal);
      else if (key === 'normalPrice') setNormalPriceFontFamily(fontVal);
      else if (key === 'porText') setPorFontFamily(fontVal);
      else if (key === 'currencySymbol') setCurrencyFontFamily(fontVal);
      else if (key === 'cents') setCentsFontFamily(fontVal);
      else if (key === 'promoPrice') setPromoPriceFontFamily(fontVal);
      else if (key === 'installments') setInstallmentsFontFamily(fontVal);
    });
  };

  const activeFontFamily =
    selectedElement === 'title'
      ? titleFontFamily
      : selectedElement === 'deText'
        ? deFontFamily
        : selectedElement === 'normalPrice'
          ? normalPriceFontFamily
          : selectedElement === 'porText'
            ? porFontFamily
            : selectedElement === 'currencySymbol'
              ? currencyFontFamily
              : selectedElement === 'promoPrice'
                ? promoPriceFontFamily
                : selectedElement === 'cents'
                  ? centsFontFamily
                  : selectedElement === 'installments'
                    ? installmentsFontFamily
                    : 'Inter, system-ui, sans-serif';

  const activeColor =
    selectedElement === 'title'
      ? titleColor
      : selectedElement === 'deText'
        ? deColor
        : selectedElement === 'normalPrice'
          ? normalPriceColor
          : selectedElement === 'porText'
            ? porColor
            : selectedElement === 'currencySymbol'
              ? currencyColor
              : selectedElement === 'promoPrice'
                ? priceColor
                : selectedElement === 'cents'
                  ? centsColor
                  : selectedElement === 'installments'
                    ? installmentsColor
                    : bgColor && bgColor !== 'transparent'
                      ? bgColor
                      : oppColorsMap[selectedOppId]?.background || defaultBgColor;

  return {
    colorHistory,
    setColorHistory,
    handleCenterElement,
    closeColorPicker,
    handleSelectOpportunityContext,
    handleColorSelect,
    handleOpportunityColorChange,
    handleFontChange,
    handleBatchFontSize,
    handleBatchFontFamily,
    activeFontFamily,
    activeColor,
  };
}
