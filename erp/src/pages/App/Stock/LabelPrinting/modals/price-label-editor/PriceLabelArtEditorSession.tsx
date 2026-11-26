import React, { useEffect, useRef, useMemo } from 'react';
import { calculateLabelPhysicalSize } from '../../utils/LabelPhysicalGeometry';
import { usePriceLabelState } from '../../hooks/price-label/usePriceLabelState';
import { usePriceLabelTestValues } from '../../hooks/price-label/usePriceLabelTestValues';
import { usePriceLabelEditorKeyboardShortcuts } from '../../hooks/price-label/usePriceLabelEditorKeyboardShortcuts';
import { usePriceLabelLayerSelection } from '../../hooks/price-label/usePriceLabelLayerSelection';
import { usePriceLabelLayerModalSelection } from '../../hooks/price-label/usePriceLabelLayerModalSelection';
import { PriceLabelEditorHeader } from './PriceLabelEditorHeader';
import { PriceLabelEditorFooter } from './PriceLabelEditorFooter';
import { PriceLabelEditorStatusMessages } from './PriceLabelEditorStatusMessages';
import { PriceLabelMenuBar } from './PriceLabelMenuBar';
import { PriceLabelArtEditorWorkspace } from './PriceLabelArtEditorWorkspace';
import { PriceLabelEditorModals } from './PriceLabelEditorModals';
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

  const labelState = usePriceLabelState(
    initialProduct,
    config,
    isOpen,
    () => session.active.current && !session.closing.current && !session.actionInFlight.current && session.historyEditingAllowed.current
  );

  const previewRef = useRef<HTMLDivElement>(null);
  const prevSelectedRef = useRef<PriceLabelLayerKey>(null);
  const testValuesState = usePriceLabelTestValues();

  const session = usePriceLabelArtworkSession({
    isOpen,
    onClose,
    config,
    onSaveConfig,
    onArtConfigLoaded,
    initialProduct,
    saveGuard,
    getSnapshot: labelState.getSnapshot,
    applySnapshot: labelState.applySnapshot,
    lastQueuedSnapshotRef: labelState.lastQueuedSnapshotRef,
    latestRequestedSnapshotRef: labelState.latestRequestedSnapshotRef,
    saveQueueRef: labelState.saveQueueRef,
    isArtConfigLoading: labelState.isArtConfigLoading,
    setIsArtConfigLoading: labelState.setIsArtConfigLoading,
    autoSaveStatus: labelState.autoSaveStatus,
    setAutoSaveStatus: labelState.setAutoSaveStatus,
    oppColorsMap: labelState.oppColorsMap,
    setOppColorsMap: labelState.setOppColorsMap,
    selectedOppId: labelState.selectedOppId,
    setSelectedOppId: labelState.setSelectedOppId,
    dbOpportunities: labelState.dbOpportunities,
    setDbOpportunities: labelState.setDbOpportunities,
    setBgColor: labelState.setBgColor,
    title: labelState.title,
    setTitle: labelState.setTitle,
    showTitle: labelState.showTitle,
    normalPrice: labelState.normalPrice,
    promoPrice: labelState.promoPrice,
    showPromoPrice: labelState.showPromoPrice,
    priceColor: labelState.priceColor,
    scaleTens: labelState.scaleTens,
    scaleHundreds: labelState.scaleHundreds,
    scaleThousands: labelState.scaleThousands,
    scaleTenThousands: labelState.scaleTenThousands,
    titlePos: labelState.titlePos,
    titleWidth: labelState.titleWidth,
    promoPricePos: labelState.promoPricePos,
    dePricePorGroupPos: labelState.dePricePorGroupPos,
    dePricePorGroupRotation: labelState.dePricePorGroupRotation,
    dePricePorGroupGap: labelState.dePricePorGroupGap,
    setSelectedElement: labelState.setSelectedElement,
    setSelectedElements: labelState.setSelectedElements,
    previewRef,
    isTestValuesModalOpen: testValuesState.isTestValuesModalOpen,
  });

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const allOppOptions = useMemo(
    () => buildPriceLabelOpportunityOptions(labelState.dbOpportunities),
    [labelState.dbOpportunities]
  );

  usePriceLabelOpportunityColorSync({
    selectedOppId: labelState.selectedOppId,
    oppColorsMap: labelState.oppColorsMap,
    defaultBgColor: labelState.defaultBgColor,
    setTitleColor: labelState.setTitleColor,
    setDeColor: labelState.setDeColor,
    setNormalPriceColor: labelState.setNormalPriceColor,
    setPorColor: labelState.setPorColor,
    setCurrencyColor: labelState.setCurrencyColor,
    setPriceColor: labelState.setPriceColor,
    setCentsColor: labelState.setCentsColor,
    setInstallmentsColor: labelState.setInstallmentsColor,
    setBgColor: labelState.setBgColor,
  });

  const activeScale =
    labelState.selectedMagnitude === 'tens'
      ? labelState.scaleTens
      : labelState.selectedMagnitude === 'hundreds'
        ? labelState.scaleHundreds
        : labelState.selectedMagnitude === 'thousands'
          ? labelState.scaleThousands
          : labelState.scaleTenThousands;

  const canvasInteractions = usePriceLabelCanvasInteractions({
    active: session.active,
    closing: session.closing,
    actionInFlight: session.actionInFlight,
    historyEditingAllowed: session.historyEditingAllowed,
    previewRef,
    selectedElement: labelState.selectedElement,
    setSelectedElement: labelState.setSelectedElement,
    selectedElements: labelState.selectedElements,
    setSelectedElements: labelState.setSelectedElements,
    prevSelectedRef,
    setActiveGuideX: labelState.setActiveGuideX,
    setActiveGuideY: labelState.setActiveGuideY,
    titlePos: labelState.titlePos,
    setTitlePos: labelState.setTitlePos,
    dePricePorGroupPos: labelState.dePricePorGroupPos,
    setDePricePorGroupPos: labelState.setDePricePorGroupPos,
    dePos: labelState.dePos,
    setDePos: labelState.setDePos,
    normalPricePos: labelState.normalPricePos,
    setNormalPricePos: labelState.setNormalPricePos,
    porPos: labelState.porPos,
    setPorPos: labelState.setPorPos,
    currencyPos: labelState.currencyPos,
    setCurrencyPos: labelState.setCurrencyPos,
    promoPricePos: labelState.promoPricePos,
    setPromoPricePos: labelState.setPromoPricePos,
    centsPos: labelState.centsPos,
    setCentsPos: labelState.setCentsPos,
    installmentsPos: labelState.installmentsPos,
    setInstallmentsPos: labelState.setInstallmentsPos,
    showTitle: labelState.showTitle,
    showDe: labelState.showDe,
    showNormalPrice: labelState.showNormalPrice,
    showPor: labelState.showPor,
    showCurrency: labelState.showCurrency,
    showPromoPrice: labelState.showPromoPrice,
    showCents: labelState.showCents,
    showInstallments: labelState.showInstallments,
    titleRotation: labelState.titleRotation,
    setTitleRotation: labelState.setTitleRotation,
    dePricePorGroupRotation: labelState.dePricePorGroupRotation,
    setDePricePorGroupRotation: labelState.setDePricePorGroupRotation,
    deRotation: labelState.deRotation,
    setDeRotation: labelState.setDeRotation,
    normalPriceRotation: labelState.normalPriceRotation,
    setNormalPriceRotation: labelState.setNormalPriceRotation,
    porRotation: labelState.porRotation,
    setPorRotation: labelState.setPorRotation,
    currencyRotation: labelState.currencyRotation,
    setCurrencyRotation: labelState.setCurrencyRotation,
    promoPriceRotation: labelState.promoPriceRotation,
    setPromoPriceRotation: labelState.setPromoPriceRotation,
    centsRotation: labelState.centsRotation,
    setCentsRotation: labelState.setCentsRotation,
    installmentsRotation: labelState.installmentsRotation,
    setInstallmentsRotation: labelState.setInstallmentsRotation,
    activeTitleFontSize: labelState.titleFontSizeHundreds,
    setTitleFontSizeTens: labelState.setTitleFontSizeTens,
    setTitleFontSizeHundreds: labelState.setTitleFontSizeHundreds,
    setTitleFontSizeThousands: labelState.setTitleFontSizeThousands,
    activeDeFontSize: labelState.deFontSizeHundreds,
    setDeFontSizeTens: labelState.setDeFontSizeTens,
    setDeFontSizeHundreds: labelState.setDeFontSizeHundreds,
    setDeFontSizeThousands: labelState.setDeFontSizeThousands,
    activeNormalPriceFontSize: labelState.normalPriceFontSizeHundreds,
    setNormalPriceFontSizeTens: labelState.setNormalPriceFontSizeTens,
    setNormalPriceFontSizeHundreds: labelState.setNormalPriceFontSizeHundreds,
    setNormalPriceFontSizeThousands: labelState.setNormalPriceFontSizeThousands,
    activePorFontSize: labelState.porFontSizeHundreds,
    setPorFontSizeTens: labelState.setPorFontSizeTens,
    setPorFontSizeHundreds: labelState.setPorFontSizeHundreds,
    setPorFontSizeThousands: labelState.setPorFontSizeThousands,
    activeCurrencyFontSize: labelState.currencyFontSizeHundreds,
    setCurrencyFontSizeTens: labelState.setCurrencyFontSizeTens,
    setCurrencyFontSizeHundreds: labelState.setCurrencyFontSizeHundreds,
    setCurrencyFontSizeThousands: labelState.setCurrencyFontSizeThousands,
    activeCentsFontSize: labelState.centsFontSizeHundreds,
    setCentsFontSizeTens: labelState.setCentsFontSizeTens,
    setCentsFontSizeHundreds: labelState.setCentsFontSizeHundreds,
    setCentsFontSizeThousands: labelState.setCentsFontSizeThousands,
    activeInstallmentsFontSize: labelState.installmentsFontSizeHundreds,
    setInstallmentsFontSizeTens: labelState.setInstallmentsFontSizeTens,
    setInstallmentsFontSizeHundreds: labelState.setInstallmentsFontSizeHundreds,
    setInstallmentsFontSizeThousands: labelState.setInstallmentsFontSizeThousands,
    activeScale,
    scaleTens: labelState.scaleTens,
    setScaleTens: labelState.setScaleTens,
    scaleHundreds: labelState.scaleHundreds,
    setScaleHundreds: labelState.setScaleHundreds,
    scaleThousands: labelState.scaleThousands,
    setScaleThousands: labelState.setScaleThousands,
    scaleTenThousands: labelState.scaleTenThousands,
    setScaleTenThousands: labelState.setScaleTenThousands,
  });

  usePriceLabelEditorKeyboardShortcuts({
    isOpen:
      isOpen &&
      !labelState.isArtConfigLoading &&
      !session.artQueryError &&
      !saveGuard.error &&
      !session.isClosing &&
      !session.actionBusy,
    selectedElement: labelState.selectedElement,
    setTitlePos: labelState.setTitlePos,
    setDePricePorGroupPos: labelState.setDePricePorGroupPos,
    setDePos: labelState.setDePos,
    setNormalPricePos: labelState.setNormalPricePos,
    setPorPos: labelState.setPorPos,
    setCurrencyPos: labelState.setCurrencyPos,
    setPromoPricePos: labelState.setPromoPricePos,
    setCentsPos: labelState.setCentsPos,
    setInstallmentsPos: labelState.setInstallmentsPos,
  });

  const handleElementClick = usePriceLabelLayerSelection({
    previousSelectedRef: prevSelectedRef,
    setSelectedElement: labelState.setSelectedElement,
    setSelectedElements: labelState.setSelectedElements,
    showTitle: labelState.showTitle,
    showDe: labelState.showDe,
    showNormalPrice: labelState.showNormalPrice,
    showPor: labelState.showPor,
    showCurrency: labelState.showCurrency,
    showPromoPrice: labelState.showPromoPrice,
    showCents: labelState.showCents,
    showInstallments: labelState.showInstallments,
  });

  const handleLayerModalSelect = usePriceLabelLayerModalSelection({
    previousSelectedRef: prevSelectedRef,
    setSelectedElement: labelState.setSelectedElement,
    setSelectedElements: labelState.setSelectedElements,
    setIsLayersModalOpen: labelState.setIsLayersModalOpen,
  });

  const priceLabelLayers = useMemo(
    () =>
      buildPriceLabelLayers({
        showTitle: labelState.showTitle,
        setShowTitle: labelState.setShowTitle,
        titlePos: labelState.titlePos,
        setTitlePos: labelState.setTitlePos,
        setTitleRotation: labelState.setTitleRotation,
        showDe: labelState.showDe,
        setShowDe: labelState.setShowDe,
        dePos: labelState.dePos,
        setDePos: labelState.setDePos,
        setDeRotation: labelState.setDeRotation,
        showNormalPrice: labelState.showNormalPrice,
        setShowNormalPrice: labelState.setShowNormalPrice,
        normalPricePos: labelState.normalPricePos,
        setNormalPricePos: labelState.setNormalPricePos,
        setNormalPriceRotation: labelState.setNormalPriceRotation,
        showPor: labelState.showPor,
        setShowPor: labelState.setShowPor,
        porPos: labelState.porPos,
        setPorPos: labelState.setPorPos,
        setPorRotation: labelState.setPorRotation,
        showCurrency: labelState.showCurrency,
        setShowCurrency: labelState.setShowCurrency,
        currencyPos: labelState.currencyPos,
        setCurrencyPos: labelState.setCurrencyPos,
        setCurrencyRotation: labelState.setCurrencyRotation,
        showPromoPrice: labelState.showPromoPrice,
        setShowPromoPrice: labelState.setShowPromoPrice,
        promoPricePos: labelState.promoPricePos,
        setPromoPricePos: labelState.setPromoPricePos,
        setPromoPriceRotation: labelState.setPromoPriceRotation,
        showCents: labelState.showCents,
        setShowCents: labelState.setShowCents,
        centsPos: labelState.centsPos,
        setCentsPos: labelState.setCentsPos,
        setCentsRotation: labelState.setCentsRotation,
        showInstallments: labelState.showInstallments,
        setShowInstallments: labelState.setShowInstallments,
        installmentsPos: labelState.installmentsPos,
        setInstallmentsPos: labelState.setInstallmentsPos,
        setInstallmentsRotation: labelState.setInstallmentsRotation,
      }),
    [
      labelState.showTitle, labelState.setShowTitle, labelState.titlePos, labelState.setTitlePos, labelState.setTitleRotation,
      labelState.showDe, labelState.setShowDe, labelState.dePos, labelState.setDePos, labelState.setDeRotation,
      labelState.showNormalPrice, labelState.setShowNormalPrice, labelState.normalPricePos, labelState.setNormalPricePos, labelState.setNormalPriceRotation,
      labelState.showPor, labelState.setShowPor, labelState.porPos, labelState.setPorPos, labelState.setPorRotation,
      labelState.showCurrency, labelState.setShowCurrency, labelState.currencyPos, labelState.setCurrencyPos, labelState.setCurrencyRotation,
      labelState.showPromoPrice, labelState.setShowPromoPrice, labelState.promoPricePos, labelState.setPromoPricePos, labelState.setPromoPriceRotation,
      labelState.showCents, labelState.setShowCents, labelState.centsPos, labelState.setCentsPos, labelState.setCentsRotation,
      labelState.showInstallments, labelState.setShowInstallments, labelState.installmentsPos, labelState.setInstallmentsPos, labelState.setInstallmentsRotation,
    ]
  );

  const formatting = usePriceLabelElementFormatting({
    selectedElement: labelState.selectedElement,
    selectedElements: labelState.selectedElements,
    setSelectedElement: labelState.setSelectedElement,
    setSelectedElements: labelState.setSelectedElements,
    selectedOppId: labelState.selectedOppId,
    setSelectedOppId: labelState.setSelectedOppId,
    oppColorsMap: labelState.oppColorsMap,
    setOppColorsMap: labelState.setOppColorsMap,
    defaultBgColor: labelState.defaultBgColor,
    bgColor: labelState.bgColor,
    setBgColor: labelState.setBgColor,
    priceLabelLayers,
    pendingGradientColorRef: labelState.pendingGradientColorRef,
    setShowColorPickerDropdown: labelState.setShowColorPickerDropdown,
    opportunitySelectionRevision: session.opportunitySelectionRevision,
    setTitlePos: labelState.setTitlePos,
    setDePricePorGroupPos: labelState.setDePricePorGroupPos,
    setDePos: labelState.setDePos,
    setNormalPricePos: labelState.setNormalPricePos,
    setPorPos: labelState.setPorPos,
    setCurrencyPos: labelState.setCurrencyPos,
    setPromoPricePos: labelState.setPromoPricePos,
    setCentsPos: labelState.setCentsPos,
    setInstallmentsPos: labelState.setInstallmentsPos,
    titleColor: labelState.titleColor,
    setTitleColor: labelState.setTitleColor,
    deColor: labelState.deColor,
    setDeColor: labelState.setDeColor,
    normalPriceColor: labelState.normalPriceColor,
    setNormalPriceColor: labelState.setNormalPriceColor,
    porColor: labelState.porColor,
    setPorColor: labelState.setPorColor,
    currencyColor: labelState.currencyColor,
    setCurrencyColor: labelState.setCurrencyColor,
    priceColor: labelState.priceColor,
    setPriceColor: labelState.setPriceColor,
    centsColor: labelState.centsColor,
    setCentsColor: labelState.setCentsColor,
    installmentsColor: labelState.installmentsColor,
    setInstallmentsColor: labelState.setInstallmentsColor,
    titleFontFamily: labelState.titleFontFamily,
    setTitleFontFamily: labelState.setTitleFontFamily,
    deFontFamily: labelState.deFontFamily,
    setDeFontFamily: labelState.setDeFontFamily,
    normalPriceFontFamily: labelState.normalPriceFontFamily,
    setNormalPriceFontFamily: labelState.setNormalPriceFontFamily,
    porFontFamily: labelState.porFontFamily,
    setPorFontFamily: labelState.setPorFontFamily,
    currencyFontFamily: labelState.currencyFontFamily,
    setCurrencyFontFamily: labelState.setCurrencyFontFamily,
    promoPriceFontFamily: labelState.promoPriceFontFamily,
    setPromoPriceFontFamily: labelState.setPromoPriceFontFamily,
    centsFontFamily: labelState.centsFontFamily,
    setCentsFontFamily: labelState.setCentsFontFamily,
    installmentsFontFamily: labelState.installmentsFontFamily,
    setInstallmentsFontFamily: labelState.setInstallmentsFontFamily,
    setTitleFontSizeTens: labelState.setTitleFontSizeTens,
    setTitleFontSizeHundreds: labelState.setTitleFontSizeHundreds,
    setTitleFontSizeThousands: labelState.setTitleFontSizeThousands,
    setDeFontSizeTens: labelState.setDeFontSizeTens,
    setDeFontSizeHundreds: labelState.setDeFontSizeHundreds,
    setDeFontSizeThousands: labelState.setDeFontSizeThousands,
    setNormalPriceFontSizeTens: labelState.setNormalPriceFontSizeTens,
    setNormalPriceFontSizeHundreds: labelState.setNormalPriceFontSizeHundreds,
    setNormalPriceFontSizeThousands: labelState.setNormalPriceFontSizeThousands,
    setPorFontSizeTens: labelState.setPorFontSizeTens,
    setPorFontSizeHundreds: labelState.setPorFontSizeHundreds,
    setPorFontSizeThousands: labelState.setPorFontSizeThousands,
    setCurrencyFontSizeTens: labelState.setCurrencyFontSizeTens,
    setCurrencyFontSizeHundreds: labelState.setCurrencyFontSizeHundreds,
    setCurrencyFontSizeThousands: labelState.setCurrencyFontSizeThousands,
    setCentsFontSizeTens: labelState.setCentsFontSizeTens,
    setCentsFontSizeHundreds: labelState.setCentsFontSizeHundreds,
    setCentsFontSizeThousands: labelState.setCentsFontSizeThousands,
    setInstallmentsFontSizeTens: labelState.setInstallmentsFontSizeTens,
    setInstallmentsFontSizeHundreds: labelState.setInstallmentsFontSizeHundreds,
    setInstallmentsFontSizeThousands: labelState.setInstallmentsFontSizeThousands,
    selectedMagnitude: labelState.selectedMagnitude,
    setScaleTens: labelState.setScaleTens,
    setScaleHundreds: labelState.setScaleHundreds,
    setScaleThousands: labelState.setScaleThousands,
  });

  if (!isOpen) return null;

  const editingDisabled =
    labelState.isArtConfigLoading ||
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
        isArtConfigLoading={labelState.isArtConfigLoading}
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
          canUndo={labelState.canUndo}
          canRedo={labelState.canRedo}
          onUndo={labelState.handleUndo}
          onRedo={labelState.handleRedo}
          onBackToErp={session.handleBackToErp}
        />

        <PriceLabelMenuBar
          onDownloadPng={() => void session.handleExport('download')}
          onCopyImage={() => void session.handleExport('copy')}
          onRenameTitle={() => void session.handleRenameTitle()}
          onOpenLayersModal={() => labelState.setIsLayersModalOpen(true)}
          showSafetyMargin={labelState.showSafetyMargin}
          onToggleSafetyMargin={() => labelState.setShowSafetyMargin(!labelState.showSafetyMargin)}
          selectedOppId={labelState.selectedOppId}
          onSelectOpportunityContext={formatting.handleSelectOpportunityContext}
          allOppOptions={allOppOptions}
          onOpenDataFillModal={() => setIsDataFillModalOpen(true)}
          onOpenTestValuesModal={testValuesState.openTestValuesModal}
        />

        <PriceLabelArtEditorWorkspace
          labelState={labelState}
          testValuesState={testValuesState}
          formatting={formatting}
          canvasInteractions={canvasInteractions}
          priceLabelLayers={priceLabelLayers}
          allOppOptions={allOppOptions}
          artworkSizeMm={artworkSizeMm}
          previewRef={previewRef}
          handleElementClick={handleElementClick}
        />

        <PriceLabelEditorModals
          config={config}
          labelState={labelState}
          testValuesState={testValuesState}
          priceLabelLayers={priceLabelLayers}
          allOppOptions={allOppOptions}
          isDataFillModalOpen={isDataFillModalOpen}
          setIsDataFillModalOpen={setIsDataFillModalOpen}
          onLayerModalSelect={handleLayerModalSelect}
          onCenterElement={formatting.handleCenterElement}
          onSelectOpportunityContext={formatting.handleSelectOpportunityContext}
        />

        <PriceLabelEditorFooter autoSaveStatus={labelState.autoSaveStatus} />
      </fieldset>
    </div>
  );
};
