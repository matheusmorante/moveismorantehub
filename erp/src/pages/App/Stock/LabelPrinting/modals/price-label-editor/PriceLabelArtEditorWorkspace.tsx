import React from 'react';
import type { usePriceLabelState } from '../../hooks/price-label/usePriceLabelState';
import type { usePriceLabelTestValues } from '../../hooks/price-label/usePriceLabelTestValues';
import type { PriceLabelLayerItem } from '../PriceLabelLayersModal';
import type { Opportunity, PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';
import { PriceLabelSelectedElementToolbar } from './PriceLabelSelectedElementToolbar';
import { PriceLabelColorPickerPopup } from './PriceLabelColorPickerPopup';
import { PriceLabelArtEditorPreview } from './PriceLabelArtEditorPreview';
import type { usePriceLabelElementFormatting } from './usePriceLabelElementFormatting';
import type { usePriceLabelCanvasInteractions } from './usePriceLabelCanvasInteractions';

interface PriceLabelArtEditorWorkspaceProps {
  labelState: ReturnType<typeof usePriceLabelState>;
  testValuesState: ReturnType<typeof usePriceLabelTestValues>;
  formatting: ReturnType<typeof usePriceLabelElementFormatting>;
  canvasInteractions: ReturnType<typeof usePriceLabelCanvasInteractions>;
  priceLabelLayers: PriceLabelLayerItem[];
  allOppOptions: Opportunity[];
  artworkSizeMm: { widthMm: number; heightMm: number };
  previewRef: React.RefObject<HTMLDivElement | null>;
  handleElementClick: (
    layer: PriceLabelLayerKey,
    event: React.MouseEvent
  ) => void;
}

/** Área principal do editor contendo barra de formatação, seletor de cores e preview interativo da arte. */
export const PriceLabelArtEditorWorkspace: React.FC<PriceLabelArtEditorWorkspaceProps> = ({
  labelState,
  testValuesState,
  formatting,
  canvasInteractions,
  priceLabelLayers,
  allOppOptions,
  artworkSizeMm,
  previewRef,
  handleElementClick,
}) => (
  <>
    <PriceLabelSelectedElementToolbar
      selectedElement={labelState.selectedElement}
      selectedElements={labelState.selectedElements}
      onClearSelection={() => {
        labelState.setSelectedElement(null);
        labelState.setSelectedElements(new Set());
      }}
      priceLabelLayers={priceLabelLayers}
      activeFontFamily={formatting.activeFontFamily}
      onFontChange={formatting.handleFontChange}
      onBatchFontFamily={formatting.handleBatchFontFamily}
      onBatchFontSize={formatting.handleBatchFontSize}
      dePricePorGroupGap={labelState.dePricePorGroupGap}
      setDePricePorGroupGap={labelState.setDePricePorGroupGap}
      scaleTens={labelState.scaleTens}
      setScaleTens={labelState.setScaleTens}
      showPromoPriceTens={labelState.showPromoPriceTens}
      setShowPromoPriceTens={labelState.setShowPromoPriceTens}
      scaleHundreds={labelState.scaleHundreds}
      setScaleHundreds={labelState.setScaleHundreds}
      showPromoPriceHundreds={labelState.showPromoPriceHundreds}
      setShowPromoPriceHundreds={labelState.setShowPromoPriceHundreds}
      scaleThousands={labelState.scaleThousands}
      setScaleThousands={labelState.setScaleThousands}
      showPromoPriceThousands={labelState.showPromoPriceThousands}
      setShowPromoPriceThousands={labelState.setShowPromoPriceThousands}
      titleFontSizeTens={labelState.titleFontSizeTens}
      setTitleFontSizeTens={labelState.setTitleFontSizeTens}
      setTitleFontSizeHundreds={labelState.setTitleFontSizeHundreds}
      setTitleFontSizeThousands={labelState.setTitleFontSizeThousands}
      deFontSizeTens={labelState.deFontSizeTens}
      setDeFontSizeTens={labelState.setDeFontSizeTens}
      setDeFontSizeHundreds={labelState.setDeFontSizeHundreds}
      setDeFontSizeThousands={labelState.setDeFontSizeThousands}
      normalPriceFontSizeTens={labelState.normalPriceFontSizeTens}
      setNormalPriceFontSizeTens={labelState.setNormalPriceFontSizeTens}
      setNormalPriceFontSizeHundreds={labelState.setNormalPriceFontSizeHundreds}
      setNormalPriceFontSizeThousands={labelState.setNormalPriceFontSizeThousands}
      porFontSizeTens={labelState.porFontSizeTens}
      setPorFontSizeTens={labelState.setPorFontSizeTens}
      setPorFontSizeHundreds={labelState.setPorFontSizeHundreds}
      setPorFontSizeThousands={labelState.setPorFontSizeThousands}
      currencyFontSizeTens={labelState.currencyFontSizeTens}
      setCurrencyFontSizeTens={labelState.setCurrencyFontSizeTens}
      setCurrencyFontSizeHundreds={labelState.setCurrencyFontSizeHundreds}
      setCurrencyFontSizeThousands={labelState.setCurrencyFontSizeThousands}
      centsFontSizeTens={labelState.centsFontSizeTens}
      setCentsFontSizeTens={labelState.setCentsFontSizeTens}
      setCentsFontSizeHundreds={labelState.setCentsFontSizeHundreds}
      setCentsFontSizeThousands={labelState.setCentsFontSizeThousands}
      installmentsFontSizeTens={labelState.installmentsFontSizeTens}
      setInstallmentsFontSizeTens={labelState.setInstallmentsFontSizeTens}
      setInstallmentsFontSizeHundreds={labelState.setInstallmentsFontSizeHundreds}
      setInstallmentsFontSizeThousands={labelState.setInstallmentsFontSizeThousands}
      activeColor={formatting.activeColor}
      onToggleColorPicker={(event) => {
        event.stopPropagation();
        labelState.setShowColorPickerDropdown(!labelState.showColorPickerDropdown);
      }}
      showSizeDropdown={labelState.showSizeDropdown}
      setShowSizeDropdown={labelState.setShowSizeDropdown}
    />

    <PriceLabelColorPickerPopup
      isOpen={labelState.showColorPickerDropdown}
      onClose={formatting.closeColorPicker}
      allOppOptions={allOppOptions}
      selectedOppId={labelState.selectedOppId}
      selectedElement={labelState.selectedElement}
      oppColorsMap={labelState.oppColorsMap}
      getDefaultBg={labelState.getDefaultBg}
      colorHistory={formatting.colorHistory}
      onOppColorChange={formatting.handleOpportunityColorChange}
    />

    <PriceLabelArtEditorPreview
      isArtConfigLoading={labelState.isArtConfigLoading}
      previewRef={previewRef}
      artworkSizeMm={artworkSizeMm}
      selectedMagnitude={labelState.selectedMagnitude}
      selectedElement={labelState.selectedElement}
      setSelectedElement={labelState.setSelectedElement}
      selectedElements={labelState.selectedElements}
      setSelectedElements={labelState.setSelectedElements}
      title={labelState.title}
      showTitle={labelState.showTitle}
      titleFontSizeTens={labelState.titleFontSizeTens}
      titleFontSizeHundreds={labelState.titleFontSizeHundreds}
      titleFontSizeThousands={labelState.titleFontSizeThousands}
      titleColor={labelState.titleColor}
      titleFontFamily={labelState.titleFontFamily}
      titlePos={labelState.titlePos}
      titleRotation={labelState.titleRotation}
      titleWidth={labelState.titleWidth}
      setTitleWidth={labelState.setTitleWidth}
      deText={labelState.deText}
      showDe={labelState.showDe}
      deFontSizeTens={labelState.deFontSizeTens}
      deFontSizeHundreds={labelState.deFontSizeHundreds}
      deFontSizeThousands={labelState.deFontSizeThousands}
      deColor={labelState.deColor}
      deFontFamily={labelState.deFontFamily}
      deRotation={labelState.deRotation}
      normalPrice={labelState.normalPrice}
      showNormalPrice={labelState.showNormalPrice}
      normalPriceFontSizeTens={labelState.normalPriceFontSizeTens}
      normalPriceFontSizeHundreds={labelState.normalPriceFontSizeHundreds}
      normalPriceFontSizeThousands={labelState.normalPriceFontSizeThousands}
      normalPriceColor={labelState.normalPriceColor}
      normalPriceFontFamily={labelState.normalPriceFontFamily}
      normalPriceRotation={labelState.normalPriceRotation}
      porText={labelState.porText}
      showPor={labelState.showPor}
      porFontSizeTens={labelState.porFontSizeTens}
      porFontSizeHundreds={labelState.porFontSizeHundreds}
      porFontSizeThousands={labelState.porFontSizeThousands}
      porColor={labelState.porColor}
      porFontFamily={labelState.porFontFamily}
      porRotation={labelState.porRotation}
      dePricePorGroupPos={labelState.dePricePorGroupPos}
      dePricePorGroupRotation={labelState.dePricePorGroupRotation}
      dePricePorGroupGap={labelState.dePricePorGroupGap}
      currencySymbol={labelState.currencySymbol}
      showCurrency={labelState.showCurrency}
      currencyFontSizeTens={labelState.currencyFontSizeTens}
      currencyFontSizeHundreds={labelState.currencyFontSizeHundreds}
      currencyFontSizeThousands={labelState.currencyFontSizeThousands}
      currencyColor={labelState.currencyColor}
      currencyFontFamily={labelState.currencyFontFamily}
      currencyPos={labelState.currencyPos}
      currencyRotation={labelState.currencyRotation}
      promoPrice={labelState.promoPrice}
      showPromoPrice={labelState.showPromoPrice}
      priceColor={labelState.priceColor}
      promoPriceFontFamily={labelState.promoPriceFontFamily}
      promoPricePos={labelState.promoPricePos}
      promoPriceRotation={labelState.promoPriceRotation}
      scaleTens={labelState.scaleTens}
      scaleHundreds={labelState.scaleHundreds}
      scaleThousands={labelState.scaleThousands}
      showPromoPriceTens={labelState.showPromoPriceTens}
      showPromoPriceHundreds={labelState.showPromoPriceHundreds}
      showPromoPriceThousands={labelState.showPromoPriceThousands}
      centsText={labelState.centsText}
      showCents={labelState.showCents}
      centsFontSizeTens={labelState.centsFontSizeTens}
      centsFontSizeHundreds={labelState.centsFontSizeHundreds}
      centsFontSizeThousands={labelState.centsFontSizeThousands}
      centsColor={labelState.centsColor}
      centsFontFamily={labelState.centsFontFamily}
      centsPos={labelState.centsPos}
      centsRotation={labelState.centsRotation}
      installments={labelState.installments}
      showInstallments={labelState.showInstallments}
      installmentsFontSizeTens={labelState.installmentsFontSizeTens}
      installmentsFontSizeHundreds={labelState.installmentsFontSizeHundreds}
      installmentsFontSizeThousands={labelState.installmentsFontSizeThousands}
      installmentsColor={labelState.installmentsColor}
      installmentsFontFamily={labelState.installmentsFontFamily}
      installmentsPos={labelState.installmentsPos}
      installmentsRotation={labelState.installmentsRotation}
      bgColor={labelState.bgColor}
      oppColorsMap={labelState.oppColorsMap}
      selectedOppId={labelState.selectedOppId}
      defaultBgColor={labelState.defaultBgColor}
      isTestValuesModalOpen={testValuesState.isTestValuesModalOpen}
      testDezenaD1={testValuesState.testDezenaD1}
      testDezenaD2={testValuesState.testDezenaD2}
      testCentenaD1={testValuesState.testCentenaD1}
      testCentenaD2={testValuesState.testCentenaD2}
      testCentenaD3={testValuesState.testCentenaD3}
      testMilharD1={testValuesState.testMilharD1}
      testMilharD2={testValuesState.testMilharD2}
      testMilharD3={testValuesState.testMilharD3}
      testMilharD4={testValuesState.testMilharD4}
      testNormalD1={testValuesState.testNormalD1}
      testNormalD2={testValuesState.testNormalD2}
      testNormalD3={testValuesState.testNormalD3}
      handleElementClick={handleElementClick}
      startDragging={canvasInteractions.startDragging}
      startResizing={canvasInteractions.startResizing}
      startRotating={canvasInteractions.startRotating}
      showSafetyMargin={labelState.showSafetyMargin}
      activeGuideX={labelState.activeGuideX}
      activeGuideY={labelState.activeGuideY}
    />
  </>
);
