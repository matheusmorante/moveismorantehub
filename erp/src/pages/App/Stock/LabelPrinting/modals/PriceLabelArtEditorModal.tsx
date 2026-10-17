import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { calculateLabelPhysicalSize } from '../utils/LabelPhysicalGeometry';
import { usePriceLabelState } from '../hooks/usePriceLabelState';
import { usePriceLabelTestValues } from '../hooks/usePriceLabelTestValues';
import { usePriceLabelEditorKeyboardShortcuts } from '../hooks/usePriceLabelEditorKeyboardShortcuts';
import { usePriceLabelLayerSelection } from '../hooks/usePriceLabelLayerSelection';
import { PriceLabelLayersModal } from './PriceLabelLayersModal';
import { PriceLabelOpportunityModal } from './PriceLabelOpportunityModal';
import { PriceLabelDataFillModal } from './PriceLabelDataFillModal';
import { PriceLabelTestValuesModal } from './PriceLabelTestValuesModal';
import { PriceLabelColorPickerPopup } from './price-label-editor/PriceLabelColorPickerPopup';
import { PriceLabelSelectedElementToolbar } from './price-label-editor/PriceLabelSelectedElementToolbar';
import { PriceLabelEditorHeader } from './price-label-editor/PriceLabelEditorHeader';
import { PriceLabelEditorFooter } from './price-label-editor/PriceLabelEditorFooter';
import { PriceLabelMenuBar } from './price-label-editor/PriceLabelMenuBar';
import { PriceLabelArtEditorPreview } from './price-label-editor/PriceLabelArtEditorPreview';
import { buildPriceLabelLayers } from './price-label-editor/priceLabelLayersConfig';
import { usePriceLabelCanvasInteractions } from './price-label-editor/usePriceLabelCanvasInteractions';
import { usePriceLabelArtworkSession } from './price-label-editor/usePriceLabelArtworkSession';
import type { ArtworkSaveGuard } from './price-label-editor/usePriceLabelArtworkSession';
import type {
  PriceLabelArtEditorModalProps,
  PriceLabelLayerKey,
} from '../types/PriceLabelArtEditorTypes';

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = (props) => {
  const guards = useRef(new Map<string, ArtworkSaveGuard>());
  const [isDataFillModalOpen, setIsDataFillModalOpen] = useState(false);
  const ownerKey = JSON.stringify([props.config.layoutId || 'preco_2x5_restored', props.config.category || 'precos']);
  if (!guards.current.has(ownerKey)) guards.current.set(ownerKey, { active: null, error: null });
  useEffect(() => {
    if (!props.isOpen) setIsDataFillModalOpen(false);
  }, [props.isOpen]);
  return props.isOpen ? (
    <PriceLabelArtEditorSession
      key={ownerKey}
      {...props}
      saveGuard={guards.current.get(ownerKey)!}
      isDataFillModalOpen={isDataFillModalOpen}
      setIsDataFillModalOpen={setIsDataFillModalOpen}
    />
  ) : null;
};

const PriceLabelArtEditorSession: React.FC<
  PriceLabelArtEditorModalProps & {
    saveGuard: ArtworkSaveGuard;
    isDataFillModalOpen: boolean;
    setIsDataFillModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }
> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onArtConfigLoaded,
  initialProduct,
  saveGuard,
  isDataFillModalOpen,
  setIsDataFillModalOpen,
}) => {
  const isStandaloneTemplate = typeof window !== 'undefined' && window.location.pathname === '/templates/price-label';
  const rawArtworkSize = calculateLabelPhysicalSize(config);
  const artworkSizeMm =
    rawArtworkSize && rawArtworkSize.widthMm >= rawArtworkSize.heightMm
      ? rawArtworkSize
      : { widthMm: 100, heightMm: 56 };

  const {
    getDefaultBg,
    showSafetyMargin,
    setShowSafetyMargin,
    oppColorsMap,
    setOppColorsMap,
    title,
    setTitle,
    showTitle,
    setShowTitle,
    titleFontSizeTens,
    setTitleFontSizeTens,
    titleFontSizeHundreds,
    setTitleFontSizeHundreds,
    titleFontSizeThousands,
    setTitleFontSizeThousands,
    titleColor,
    setTitleColor,
    titleFontFamily,
    setTitleFontFamily,
    titlePos,
    setTitlePos,
    titleRotation,
    setTitleRotation,
    titleWidth,
    setTitleWidth,
    deText,
    showDe,
    setShowDe,
    deFontSizeTens,
    setDeFontSizeTens,
    deFontSizeHundreds,
    setDeFontSizeHundreds,
    deFontSizeThousands,
    setDeFontSizeThousands,
    deColor,
    setDeColor,
    deFontFamily,
    setDeFontFamily,
    dePos,
    setDePos,
    deRotation,
    setDeRotation,
    normalPrice,
    setNormalPrice,
    showNormalPrice,
    setShowNormalPrice,
    normalPriceFontSizeTens,
    setNormalPriceFontSizeTens,
    normalPriceFontSizeHundreds,
    setNormalPriceFontSizeHundreds,
    normalPriceFontSizeThousands,
    setNormalPriceFontSizeThousands,
    normalPriceColor,
    setNormalPriceColor,
    normalPriceFontFamily,
    setNormalPriceFontFamily,
    normalPricePos,
    setNormalPricePos,
    normalPriceRotation,
    setNormalPriceRotation,
    porText,
    showPor,
    setShowPor,
    porFontSizeTens,
    setPorFontSizeTens,
    porFontSizeHundreds,
    setPorFontSizeHundreds,
    porFontSizeThousands,
    setPorFontSizeThousands,
    porColor,
    setPorColor,
    porFontFamily,
    setPorFontFamily,
    porPos,
    setPorPos,
    porRotation,
    setPorRotation,
    currencySymbol,
    setCurrencySymbol,
    showCurrency,
    setShowCurrency,
    currencyFontSizeTens,
    setCurrencyFontSizeTens,
    currencyFontSizeHundreds,
    setCurrencyFontSizeHundreds,
    currencyFontSizeThousands,
    setCurrencyFontSizeThousands,
    currencyColor,
    setCurrencyColor,
    currencyFontFamily,
    setCurrencyFontFamily,
    currencyPos,
    setCurrencyPos,
    currencyRotation,
    setCurrencyRotation,
    promoPrice,
    setPromoPrice,
    showPromoPrice,
    setShowPromoPrice,
    showPromoPriceTens,
    setShowPromoPriceTens,
    showPromoPriceHundreds,
    setShowPromoPriceHundreds,
    showPromoPriceThousands,
    setShowPromoPriceThousands,
    showSizeDropdown,
    setShowSizeDropdown,
    priceColor,
    setPriceColor,
    promoPriceFontFamily,
    setPromoPriceFontFamily,
    promoPricePos,
    setPromoPricePos,
    promoPriceRotation,
    setPromoPriceRotation,
    scaleTens,
    setScaleTens,
    scaleHundreds,
    setScaleHundreds,
    scaleThousands,
    setScaleThousands,
    scaleTenThousands,
    setScaleTenThousands,
    centsText,
    setCentsText,
    showCents,
    setShowCents,
    centsFontSizeTens,
    setCentsFontSizeTens,
    centsFontSizeHundreds,
    setCentsFontSizeHundreds,
    centsFontSizeThousands,
    setCentsFontSizeThousands,
    centsColor,
    setCentsColor,
    centsFontFamily,
    setCentsFontFamily,
    centsPos,
    setCentsPos,
    centsRotation,
    setCentsRotation,
    selectedMagnitude,
    activeGuideX,
    setActiveGuideX,
    activeGuideY,
    setActiveGuideY,
    dbOpportunities,
    setDbOpportunities,
    selectedOppId,
    setSelectedOppId,
    showInstallments,
    setShowInstallments,
    installments,
    setInstallments,
    installmentsFontSizeTens,
    setInstallmentsFontSizeTens,
    installmentsFontSizeHundreds,
    setInstallmentsFontSizeHundreds,
    installmentsFontSizeThousands,
    setInstallmentsFontSizeThousands,
    installmentsColor,
    setInstallmentsColor,
    installmentsFontFamily,
    setInstallmentsFontFamily,
    installmentsPos,
    setInstallmentsPos,
    installmentsRotation,
    setInstallmentsRotation,
    dePricePorGroupPos,
    setDePricePorGroupPos,
    dePricePorGroupRotation,
    setDePricePorGroupRotation,
    dePricePorGroupGap,
    setDePricePorGroupGap,
    defaultBgColor,
    bgColor,
    setBgColor,
    selectedElement,
    setSelectedElement,
    selectedElements,
    setSelectedElements,
    isArtConfigLoading,
    setIsArtConfigLoading,
    autoSaveStatus,
    setAutoSaveStatus,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    saveQueueRef,
    isOppSelectModalOpen,
    setIsOppSelectModalOpen,
    isLayersModalOpen,
    setIsLayersModalOpen,
    showColorPickerDropdown,
    setShowColorPickerDropdown,
    pendingGradientColorRef,
    applySnapshot,
    getSnapshot,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = usePriceLabelState(
    initialProduct,
    config,
    isOpen,
    () => session.active.current && !session.closing.current && !session.actionInFlight.current && session.historyEditingAllowed.current
  );

  const previewRef = useRef<HTMLDivElement>(null);
  const prevSelectedRef = useRef<PriceLabelLayerKey>(null);

  const {
    isTestValuesModalOpen,
    openTestValuesModal,
    closeTestValuesModal,
    testDezenaD1,
    setTestDezenaD1,
    testDezenaD2,
    setTestDezenaD2,
    testCentenaD1,
    setTestCentenaD1,
    testCentenaD2,
    setTestCentenaD2,
    testCentenaD3,
    setTestCentenaD3,
    testMilharD1,
    setTestMilharD1,
    testMilharD2,
    setTestMilharD2,
    testMilharD3,
    setTestMilharD3,
    testMilharD4,
    setTestMilharD4,
    testNormalD1,
    setTestNormalD1,
    testNormalD2,
    setTestNormalD2,
    testNormalD3,
    setTestNormalD3,
  } = usePriceLabelTestValues();

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

  const session = usePriceLabelArtworkSession({
    isOpen,
    onClose,
    config,
    onSaveConfig,
    onArtConfigLoaded,
    initialProduct,
    saveGuard,
    getSnapshot,
    applySnapshot,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    saveQueueRef,
    isArtConfigLoading,
    setIsArtConfigLoading,
    autoSaveStatus,
    setAutoSaveStatus,
    oppColorsMap,
    setOppColorsMap,
    selectedOppId,
    setSelectedOppId,
    dbOpportunities,
    setDbOpportunities,
    setBgColor,
    title,
    setTitle,
    showTitle,
    normalPrice,
    promoPrice,
    showPromoPrice,
    priceColor,
    scaleTens,
    scaleHundreds,
    scaleThousands,
    scaleTenThousands,
    titlePos,
    titleWidth,
    promoPricePos,
    dePricePorGroupPos,
    dePricePorGroupRotation,
    dePricePorGroupGap,
    setSelectedElement,
    setSelectedElements,
    previewRef,
    isTestValuesModalOpen,
  });

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Options memo
  const allOppOptions = useMemo(() => {
    const baseOptions = [{ id: 'none', name: 'SEM OPORTUNIDADE' }];
    if (dbOpportunities && dbOpportunities.length > 0) {
      const oppsMapped = dbOpportunities.map((opp) => ({
        id: opp.id || opp.slug || opp.name,
        name: opp.name.toUpperCase(),
      }));
      return [...baseOptions, ...oppsMapped];
    }
    return [...baseOptions, { id: 'salvado', name: 'QUEIMA DOS SALVADOS' }];
  }, [dbOpportunities]);

  // Sincroniza as cores dos elementos com a oportunidade
  useEffect(() => {
    if (!selectedOppId) return;
    const baseColors = oppColorsMap.none || oppColorsMap.default || {};
    const currentOppColors = { ...baseColors, ...(oppColorsMap[selectedOppId] || {}) };

    setTitleColor(currentOppColors['title'] || '#000000');
    setDeColor(currentOppColors['deText'] || '#000000');
    setNormalPriceColor(currentOppColors['normalPrice'] || '#000000');
    setPorColor(currentOppColors['porText'] || '#000000');
    setCurrencyColor(currentOppColors['currencySymbol'] || '#000000');
    setPriceColor(currentOppColors['promoPrice'] || '#1e3a8a');
    setCentsColor(currentOppColors['cents'] || '#000000');
    setInstallmentsColor(currentOppColors['installments'] || '#000000');
    const savedBackground = currentOppColors['background'];
    setBgColor(
      savedBackground && savedBackground !== 'transparent' ? savedBackground : defaultBgColor
    );
  }, [selectedOppId, oppColorsMap, defaultBgColor, setBgColor, setCentsColor, setCurrencyColor, setDeColor, setInstallmentsColor, setNormalPriceColor, setPorColor, setPriceColor, setTitleColor]);

  const activeTitleFontSize = titleFontSizeHundreds;
  const activeDeFontSize = deFontSizeHundreds;
  const activeNormalPriceFontSize = normalPriceFontSizeHundreds;
  const activePorFontSize = porFontSizeHundreds;
  const activeInstallmentsFontSize = installmentsFontSizeHundreds;
  const activeCurrencyFontSize = currencyFontSizeHundreds;
  const activeCentsFontSize = centsFontSizeHundreds;

  const activeScale =
    selectedMagnitude === 'tens'
      ? scaleTens
      : selectedMagnitude === 'hundreds'
        ? scaleHundreds
        : selectedMagnitude === 'thousands'
          ? scaleThousands
          : scaleTenThousands;

  const { startDragging, startResizing, startRotating } = usePriceLabelCanvasInteractions({
    active: session.active,
    closing: session.closing,
    actionInFlight: session.actionInFlight,
    historyEditingAllowed: session.historyEditingAllowed,
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
  });

  const keyboardPositionSetters = useMemo(
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

  usePriceLabelEditorKeyboardShortcuts({
    isOpen:
      isOpen &&
      !isArtConfigLoading &&
      !session.artQueryError &&
      !saveGuard.error &&
      !session.isClosing &&
      !session.actionBusy,
    selectedElement,
    positionSetters: keyboardPositionSetters,
  });

  const handleElementClick = usePriceLabelLayerSelection({
    previousSelectedRef: prevSelectedRef,
    setSelectedElement,
    setSelectedElements,
    showTitle,
    showDe,
    showNormalPrice,
    showPor,
    showCurrency,
    showPromoPrice,
    showCents,
    showInstallments,
  });

  const priceLabelLayers = useMemo(
    () =>
      buildPriceLabelLayers({
        showTitle,
        setShowTitle,
        titlePos,
        setTitlePos,
        setTitleRotation,
        showDe,
        setShowDe,
        dePos,
        setDePos,
        setDeRotation,
        showNormalPrice,
        setShowNormalPrice,
        normalPricePos,
        setNormalPricePos,
        setNormalPriceRotation,
        showPor,
        setShowPor,
        porPos,
        setPorPos,
        setPorRotation,
        showCurrency,
        setShowCurrency,
        currencyPos,
        setCurrencyPos,
        setCurrencyRotation,
        showPromoPrice,
        setShowPromoPrice,
        promoPricePos,
        setPromoPricePos,
        setPromoPriceRotation,
        showCents,
        setShowCents,
        centsPos,
        setCentsPos,
        setCentsRotation,
        showInstallments,
        setShowInstallments,
        installmentsPos,
        setInstallmentsPos,
        setInstallmentsRotation,
      }),
    [
      showTitle,
      setShowTitle,
      titlePos,
      setTitlePos,
      setTitleRotation,
      showDe,
      setShowDe,
      dePos,
      setDePos,
      setDeRotation,
      showNormalPrice,
      setShowNormalPrice,
      normalPricePos,
      setNormalPricePos,
      setNormalPriceRotation,
      showPor,
      setShowPor,
      porPos,
      setPorPos,
      setPorRotation,
      showCurrency,
      setShowCurrency,
      currencyPos,
      setCurrencyPos,
      setCurrencyRotation,
      showPromoPrice,
      setShowPromoPrice,
      promoPricePos,
      setPromoPricePos,
      setPromoPriceRotation,
      showCents,
      setShowCents,
      centsPos,
      setCentsPos,
      setCentsRotation,
      showInstallments,
      setShowInstallments,
      installmentsPos,
      setInstallmentsPos,
      setInstallmentsRotation,
    ]
  );

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
    session.opportunitySelectionRevision.current += 1;
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

  if (!isOpen) return null;

  const editingDisabled =
    isArtConfigLoading ||
    Boolean(session.artQueryError || saveGuard.error) ||
    session.isClosing ||
    session.actionBusy;
  const stopDisabledEditing = (event: React.SyntheticEvent) => {
    if (editingDisabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col animate-fade-in overflow-hidden w-screen h-screen ${isStandaloneTemplate ? 'bg-white dark:bg-slate-950' : 'bg-slate-900/90 backdrop-blur-md'}`}
    >
      {(session.artQueryError || session.saveError || session.opportunityQueryError || session.actionError) && (
        <div role="alert" className="shrink-0 bg-red-50 p-3 text-sm text-red-800">
          {session.actionError && <p>{session.actionError}</p>}
          {session.artQueryError && (
            <p>
              {session.artQueryError}{' '}
              <button type="button" onClick={() => session.setQueryRevision((value) => value + 1)}>
                Consultar arte novamente
              </button>
            </p>
          )}
          {session.saveError && (
            <p>
              {session.saveError}{' '}
              {!saveGuard.error && (
                <button type="button" onClick={() => void session.retrySave()}>
                  Tentar salvar novamente
                </button>
              )}
            </p>
          )}
          {session.opportunityQueryError && (
            <p>
              {session.opportunityQueryError}{' '}
              <button type="button" onClick={() => session.setOpportunityQueryRevision((value) => value + 1)}>
                Consultar oportunidades novamente
              </button>
            </p>
          )}
        </div>
      )}
      {isArtConfigLoading && (
        <div role="status" className="shrink-0 bg-blue-50 p-3 text-sm text-blue-800">
          <i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />
          Consultando a arte da etiqueta...
        </div>
      )}
      {session.actionBusy && (
        <div role="status" className="shrink-0 bg-blue-50 p-3 text-sm text-blue-800">
          <i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />
          Preparando a ação da arte...
        </div>
      )}
      <fieldset
        disabled={editingDisabled}
        className="contents"
        onClickCapture={stopDisabledEditing}
        onPointerDownCapture={stopDisabledEditing}
        onMouseDownCapture={stopDisabledEditing}
        onKeyDownCapture={stopDisabledEditing}
      >
        <PriceLabelEditorHeader
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onBackToErp={session.handleBackToErp}
        />

        <PriceLabelMenuBar
          onDownloadPng={() => void session.handleExport('download')}
          onCopyImage={() => void session.handleExport('copy')}
          onRenameTitle={() => void session.handleRenameTitle()}
          onOpenLayersModal={() => setIsLayersModalOpen(true)}
          showSafetyMargin={showSafetyMargin}
          onToggleSafetyMargin={() => setShowSafetyMargin(!showSafetyMargin)}
          selectedOppId={selectedOppId}
          onSelectOpportunityContext={handleSelectOpportunityContext}
          allOppOptions={allOppOptions}
          onOpenDataFillModal={() => setIsDataFillModalOpen(true)}
          onOpenTestValuesModal={openTestValuesModal}
        />

        <PriceLabelSelectedElementToolbar
          selectedElement={selectedElement}
          selectedElements={selectedElements}
          onClearSelection={() => {
            setSelectedElement(null);
            setSelectedElements(new Set());
          }}
          priceLabelLayers={priceLabelLayers}
          activeFontFamily={activeFontFamily}
          onFontChange={handleFontChange}
          onBatchFontFamily={handleBatchFontFamily}
          onBatchFontSize={handleBatchFontSize}
          dePricePorGroupGap={dePricePorGroupGap}
          setDePricePorGroupGap={setDePricePorGroupGap}
          scaleTens={scaleTens}
          setScaleTens={setScaleTens}
          showPromoPriceTens={showPromoPriceTens}
          setShowPromoPriceTens={setShowPromoPriceTens}
          scaleHundreds={scaleHundreds}
          setScaleHundreds={setScaleHundreds}
          showPromoPriceHundreds={showPromoPriceHundreds}
          setShowPromoPriceHundreds={setShowPromoPriceHundreds}
          scaleThousands={scaleThousands}
          setScaleThousands={setScaleThousands}
          showPromoPriceThousands={showPromoPriceThousands}
          setShowPromoPriceThousands={setShowPromoPriceThousands}
          titleFontSizeTens={titleFontSizeTens}
          setTitleFontSizeTens={setTitleFontSizeTens}
          setTitleFontSizeHundreds={setTitleFontSizeHundreds}
          setTitleFontSizeThousands={setTitleFontSizeThousands}
          deFontSizeTens={deFontSizeTens}
          setDeFontSizeTens={setDeFontSizeTens}
          setDeFontSizeHundreds={setDeFontSizeHundreds}
          setDeFontSizeThousands={setDeFontSizeThousands}
          normalPriceFontSizeTens={normalPriceFontSizeTens}
          setNormalPriceFontSizeTens={setNormalPriceFontSizeTens}
          normalPriceFontSizeHundreds={normalPriceFontSizeHundreds}
          setNormalPriceFontSizeHundreds={setNormalPriceFontSizeHundreds}
          normalPriceFontSizeThousands={normalPriceFontSizeThousands}
          setNormalPriceFontSizeThousands={setNormalPriceFontSizeThousands}
          porFontSizeTens={porFontSizeTens}
          setPorFontSizeTens={setPorFontSizeTens}
          porFontSizeHundreds={porFontSizeHundreds}
          setPorFontSizeHundreds={setPorFontSizeHundreds}
          porFontSizeThousands={porFontSizeThousands}
          setPorFontSizeThousands={setPorFontSizeThousands}
          currencyFontSizeTens={currencyFontSizeTens}
          setCurrencyFontSizeTens={setCurrencyFontSizeTens}
          currencyFontSizeHundreds={currencyFontSizeHundreds}
          setCurrencyFontSizeHundreds={setCurrencyFontSizeHundreds}
          currencyFontSizeThousands={currencyFontSizeThousands}
          setCurrencyFontSizeThousands={setCurrencyFontSizeThousands}
          centsFontSizeTens={centsFontSizeTens}
          setCentsFontSizeTens={setCentsFontSizeTens}
          setCentsFontSizeHundreds={setCentsFontSizeHundreds}
          setCentsFontSizeThousands={setCentsFontSizeThousands}
          installmentsFontSizeTens={installmentsFontSizeTens}
          setInstallmentsFontSizeTens={setInstallmentsFontSizeTens}
          installmentsFontSizeHundreds={installmentsFontSizeHundreds}
          setInstallmentsFontSizeHundreds={setInstallmentsFontSizeHundreds}
          installmentsFontSizeThousands={installmentsFontSizeThousands}
          setInstallmentsFontSizeThousands={setInstallmentsFontSizeThousands}
          activeColor={activeColor}
          onToggleColorPicker={(event) => {
            event.stopPropagation();
            setShowColorPickerDropdown(!showColorPickerDropdown);
          }}
          showSizeDropdown={showSizeDropdown}
          setShowSizeDropdown={setShowSizeDropdown}
        />

        <PriceLabelColorPickerPopup
          isOpen={showColorPickerDropdown}
          onClose={closeColorPicker}
          allOppOptions={allOppOptions}
          selectedOppId={selectedOppId}
          selectedElement={selectedElement}
          oppColorsMap={oppColorsMap}
          getDefaultBg={getDefaultBg}
          colorHistory={colorHistory}
          onOppColorChange={handleOpportunityColorChange}
        />

        <PriceLabelArtEditorPreview
          isArtConfigLoading={isArtConfigLoading}
          previewRef={previewRef}
          artworkSizeMm={artworkSizeMm}
          selectedMagnitude={selectedMagnitude}
          selectedElement={selectedElement}
          setSelectedElement={setSelectedElement}
          selectedElements={selectedElements}
          setSelectedElements={setSelectedElements}
          title={title}
          showTitle={showTitle}
          titleFontSizeTens={titleFontSizeTens}
          titleFontSizeHundreds={titleFontSizeHundreds}
          titleFontSizeThousands={titleFontSizeThousands}
          titleColor={titleColor}
          titleFontFamily={titleFontFamily}
          titlePos={titlePos}
          titleRotation={titleRotation}
          titleWidth={titleWidth}
          setTitleWidth={setTitleWidth}
          deText={deText}
          showDe={showDe}
          deFontSizeTens={deFontSizeTens}
          deFontSizeHundreds={deFontSizeHundreds}
          deFontSizeThousands={deFontSizeThousands}
          deColor={deColor}
          deFontFamily={deFontFamily}
          deRotation={deRotation}
          normalPrice={normalPrice}
          showNormalPrice={showNormalPrice}
          normalPriceFontSizeTens={normalPriceFontSizeTens}
          normalPriceFontSizeHundreds={normalPriceFontSizeHundreds}
          normalPriceFontSizeThousands={normalPriceFontSizeThousands}
          normalPriceColor={normalPriceColor}
          normalPriceFontFamily={normalPriceFontFamily}
          normalPriceRotation={normalPriceRotation}
          porText={porText}
          showPor={showPor}
          porFontSizeTens={porFontSizeTens}
          porFontSizeHundreds={porFontSizeHundreds}
          porFontSizeThousands={porFontSizeThousands}
          porColor={porColor}
          porFontFamily={porFontFamily}
          porRotation={porRotation}
          dePricePorGroupPos={dePricePorGroupPos}
          dePricePorGroupRotation={dePricePorGroupRotation}
          dePricePorGroupGap={dePricePorGroupGap}
          currencySymbol={currencySymbol}
          showCurrency={showCurrency}
          currencyFontSizeTens={currencyFontSizeTens}
          currencyFontSizeHundreds={currencyFontSizeHundreds}
          currencyFontSizeThousands={currencyFontSizeThousands}
          currencyColor={currencyColor}
          currencyFontFamily={currencyFontFamily}
          currencyPos={currencyPos}
          currencyRotation={currencyRotation}
          promoPrice={promoPrice}
          showPromoPrice={showPromoPrice}
          priceColor={priceColor}
          promoPriceFontFamily={promoPriceFontFamily}
          promoPricePos={promoPricePos}
          promoPriceRotation={promoPriceRotation}
          scaleTens={scaleTens}
          scaleHundreds={scaleHundreds}
          scaleThousands={scaleThousands}
          showPromoPriceTens={showPromoPriceTens}
          showPromoPriceHundreds={showPromoPriceHundreds}
          showPromoPriceThousands={showPromoPriceThousands}
          centsText={centsText}
          showCents={showCents}
          centsFontSizeTens={centsFontSizeTens}
          centsFontSizeHundreds={centsFontSizeHundreds}
          centsFontSizeThousands={centsFontSizeThousands}
          centsColor={centsColor}
          centsFontFamily={centsFontFamily}
          centsPos={centsPos}
          centsRotation={centsRotation}
          installments={installments}
          showInstallments={showInstallments}
          installmentsFontSizeTens={installmentsFontSizeTens}
          installmentsFontSizeHundreds={installmentsFontSizeHundreds}
          installmentsFontSizeThousands={installmentsFontSizeThousands}
          installmentsColor={installmentsColor}
          installmentsFontFamily={installmentsFontFamily}
          installmentsPos={installmentsPos}
          installmentsRotation={installmentsRotation}
          bgColor={bgColor}
          oppColorsMap={oppColorsMap}
          selectedOppId={selectedOppId}
          defaultBgColor={defaultBgColor}
          isTestValuesModalOpen={isTestValuesModalOpen}
          testDezenaD1={testDezenaD1}
          testDezenaD2={testDezenaD2}
          testCentenaD1={testCentenaD1}
          testCentenaD2={testCentenaD2}
          testCentenaD3={testCentenaD3}
          testMilharD1={testMilharD1}
          testMilharD2={testMilharD2}
          testMilharD3={testMilharD3}
          testMilharD4={testMilharD4}
          testNormalD1={testNormalD1}
          testNormalD2={testNormalD2}
          testNormalD3={testNormalD3}
          handleElementClick={handleElementClick}
          startDragging={startDragging}
          startResizing={startResizing}
          startRotating={startRotating}
          showSafetyMargin={showSafetyMargin}
          activeGuideX={activeGuideX}
          activeGuideY={activeGuideY}
        />

        <PriceLabelLayersModal
          isOpen={isLayersModalOpen}
          onClose={() => setIsLayersModalOpen(false)}
          layers={priceLabelLayers}
          selectedElements={selectedElements}
          selectedElement={selectedElement}
          onSelectLayer={(key, isShift) => {
            if (isShift) {
              setSelectedElements((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                if (next.size > 0) {
                  const arr = Array.from(next);
                  const last = arr[arr.length - 1];
                  setSelectedElement(last);
                  prevSelectedRef.current = last;
                } else {
                  setSelectedElement(null);
                  prevSelectedRef.current = null;
                }
                return next;
              });
            } else {
              setSelectedElement(key);
              setSelectedElements(new Set([key]));
              prevSelectedRef.current = key;
              setIsLayersModalOpen(false);
            }
          }}
          onCenterElement={handleCenterElement}
        />

        <PriceLabelOpportunityModal
          isOpen={isOppSelectModalOpen}
          onClose={() => setIsOppSelectModalOpen(false)}
          allOppOptions={allOppOptions}
          selectedOppId={selectedOppId}
          onSelectOpportunityView={handleSelectOpportunityContext}
        />

        <PriceLabelDataFillModal
          isOpen={isDataFillModalOpen}
          ownerKey={JSON.stringify([config.layoutId, selectedOppId, selectedMagnitude])}
          onClose={() => setIsDataFillModalOpen(false)}
          onApplyProductTitle={(prodName, stillCurrent) => {
            if (stillCurrent && !stillCurrent()) return false;
            setTitle(prodName);
            setShowTitle(true);
            return true;
          }}
          onApplyData={(values, stillCurrent) => {
            if (stillCurrent && !stillCurrent()) return false;
            setTitle(values.title);
            setNormalPrice(values.normalPrice);
            setPromoPrice(values.promoPrice);
            setCentsText(values.centsText);
            setCurrencySymbol(values.currencySymbol);
            setInstallments(values.installments);
            return true;
          }}
          title={title}
          normalPrice={normalPrice}
          promoPrice={promoPrice}
          centsText={centsText}
          currencySymbol={currencySymbol}
          installments={installments}
        />

        <PriceLabelEditorFooter autoSaveStatus={autoSaveStatus} />

        <PriceLabelTestValuesModal
          isOpen={isTestValuesModalOpen}
          onClose={closeTestValuesModal}
          testDezenaD1={testDezenaD1}
          setTestDezenaD1={setTestDezenaD1}
          testDezenaD2={testDezenaD2}
          setTestDezenaD2={setTestDezenaD2}
          testCentenaD1={testCentenaD1}
          setTestCentenaD1={setTestCentenaD1}
          testCentenaD2={testCentenaD2}
          setTestCentenaD2={setTestCentenaD2}
          testCentenaD3={testCentenaD3}
          setTestCentenaD3={setTestCentenaD3}
          testMilharD1={testMilharD1}
          setTestMilharD1={setTestMilharD1}
          testMilharD2={testMilharD2}
          setTestMilharD2={setTestMilharD2}
          testMilharD3={testMilharD3}
          setTestMilharD3={setTestMilharD3}
          testMilharD4={testMilharD4}
          setTestMilharD4={setTestMilharD4}
          testNormalD1={testNormalD1}
          setTestNormalD1={setTestNormalD1}
          testNormalD2={testNormalD2}
          setTestNormalD2={setTestNormalD2}
          testNormalD3={testNormalD3}
          setTestNormalD3={setTestNormalD3}
        />
      </fieldset>
    </div>
  );
};

export default PriceLabelArtEditorModal;
