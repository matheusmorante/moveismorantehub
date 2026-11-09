import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { calculateLabelPhysicalSize } from '../../utils/LabelPhysicalGeometry';
import { usePriceLabelState } from '../../hooks/usePriceLabelState';
import { usePriceLabelTestValues } from '../../hooks/usePriceLabelTestValues';
import { usePriceLabelEditorKeyboardShortcuts } from '../../hooks/usePriceLabelEditorKeyboardShortcuts';
import { usePriceLabelLayerSelection } from '../../hooks/usePriceLabelLayerSelection';
import { usePriceLabelLayerModalSelection } from '../../hooks/usePriceLabelLayerModalSelection';
import { PriceLabelLayersModal } from '../PriceLabelLayersModal';
import { PriceLabelOpportunityModal } from '../PriceLabelOpportunityModal';
import { PriceLabelDataFillModal } from '../PriceLabelDataFillModal';
import { PriceLabelTestValuesModal } from '../PriceLabelTestValuesModal';
import { PriceLabelColorPickerPopup } from './PriceLabelColorPickerPopup';
import { PriceLabelSelectedElementToolbar } from './PriceLabelSelectedElementToolbar';
import { PriceLabelEditorHeader } from './PriceLabelEditorHeader';
import { PriceLabelEditorFooter } from './PriceLabelEditorFooter';
import { PriceLabelEditorStatusMessages } from './PriceLabelEditorStatusMessages';
import { PriceLabelMenuBar } from './PriceLabelMenuBar';
import { PriceLabelArtEditorPreview } from './PriceLabelArtEditorPreview';
import { buildPriceLabelLayers } from './priceLabelLayersConfig';
import { buildPriceLabelOpportunityOptions } from './priceLabelOpportunityOptions';
import { usePriceLabelCanvasInteractions } from './usePriceLabelCanvasInteractions';
import { usePriceLabelArtworkSession } from './usePriceLabelArtworkSession';
import type { ArtworkSaveGuard } from './usePriceLabelArtworkSession';
import { usePriceLabelElementFormatting } from './usePriceLabelElementFormatting';
import { usePriceLabelOpportunityColorSync } from './usePriceLabelOpportunityColorSync';
import type { PriceLabelArtEditorModalProps, PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

export const PriceLabelArtEditorSession: React.FC<
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
  const allOppOptions = useMemo(
    () => buildPriceLabelOpportunityOptions(dbOpportunities),
    [dbOpportunities]
  );

  usePriceLabelOpportunityColorSync({
    selectedOppId,
    oppColorsMap,
    defaultBgColor,
    setTitleColor,
    setDeColor,
    setNormalPriceColor,
    setPorColor,
    setCurrencyColor,
    setPriceColor,
    setCentsColor,
    setInstallmentsColor,
    setBgColor,
  });

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

  usePriceLabelEditorKeyboardShortcuts({
    isOpen:
      isOpen &&
      !isArtConfigLoading &&
      !session.artQueryError &&
      !saveGuard.error &&
      !session.isClosing &&
      !session.actionBusy,
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

  const handleLayerModalSelect = usePriceLabelLayerModalSelection({
    previousSelectedRef: prevSelectedRef,
    setSelectedElement,
    setSelectedElements,
    setIsLayersModalOpen,
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

  const {
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
  } = usePriceLabelElementFormatting({
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
    opportunitySelectionRevision: session.opportunitySelectionRevision,
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
  });

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
      <PriceLabelEditorStatusMessages
        actionError={session.actionError}
        artQueryError={session.artQueryError}
        saveError={session.saveError}
        opportunityQueryError={session.opportunityQueryError}
        canRetrySave={!saveGuard.error}
        isArtConfigLoading={isArtConfigLoading}
        actionBusy={session.actionBusy}
        onRetryArtQuery={() => session.setQueryRevision((value) => value + 1)}
        onRetrySave={() => void session.retrySave()}
        onRetryOpportunityQuery={() => session.setOpportunityQueryRevision((value) => value + 1)}
      />
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
          onSelectLayer={handleLayerModalSelect}
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
