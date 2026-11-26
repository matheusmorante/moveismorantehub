import React from 'react';
import type { usePriceLabelState } from '../../hooks/price-label/usePriceLabelState';
import type { usePriceLabelTestValues } from '../../hooks/price-label/usePriceLabelTestValues';
import type {
  Opportunity,
  PriceLabelArtEditorModalProps,
  PriceLabelLayerKey,
} from '../../types/PriceLabelArtEditorTypes';
import { PriceLabelLayersModal, type PriceLabelLayerItem } from '../PriceLabelLayersModal';
import { PriceLabelOpportunityModal } from '../PriceLabelOpportunityModal';
import { PriceLabelDataFillModal } from '../PriceLabelDataFillModal';
import { PriceLabelTestValuesModal } from '../PriceLabelTestValuesModal';

interface PriceLabelEditorModalsProps {
  config: PriceLabelArtEditorModalProps['config'];
  labelState: ReturnType<typeof usePriceLabelState>;
  testValuesState: ReturnType<typeof usePriceLabelTestValues>;
  priceLabelLayers: PriceLabelLayerItem[];
  allOppOptions: Opportunity[];
  isDataFillModalOpen: boolean;
  setIsDataFillModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onLayerModalSelect: (layerId: PriceLabelLayerKey, isMulti: boolean) => void;
  onCenterElement: (layerId: string | null) => void;
  onSelectOpportunityContext: (oppId: string) => void;
}

/** Agrupa os modais auxiliares do editor de etiqueta de preço (camadas, oportunidades, preenchimento e teste). */
export const PriceLabelEditorModals: React.FC<PriceLabelEditorModalsProps> = ({
  config,
  labelState,
  testValuesState,
  priceLabelLayers,
  allOppOptions,
  isDataFillModalOpen,
  setIsDataFillModalOpen,
  onLayerModalSelect,
  onCenterElement,
  onSelectOpportunityContext,
}) => (
  <>
    <PriceLabelLayersModal
      isOpen={labelState.isLayersModalOpen}
      onClose={() => labelState.setIsLayersModalOpen(false)}
      layers={priceLabelLayers}
      selectedElements={labelState.selectedElements}
      selectedElement={labelState.selectedElement}
      onSelectLayer={onLayerModalSelect}
      onCenterElement={onCenterElement}
    />

    <PriceLabelOpportunityModal
      isOpen={labelState.isOppSelectModalOpen}
      onClose={() => labelState.setIsOppSelectModalOpen(false)}
      allOppOptions={allOppOptions}
      selectedOppId={labelState.selectedOppId}
      onSelectOpportunityView={onSelectOpportunityContext}
    />

    <PriceLabelDataFillModal
      isOpen={isDataFillModalOpen}
      ownerKey={JSON.stringify([
        config.layoutId,
        labelState.selectedOppId,
        labelState.selectedMagnitude,
      ])}
      onClose={() => setIsDataFillModalOpen(false)}
      onApplyProductTitle={(prodName, stillCurrent) => {
        if (stillCurrent && !stillCurrent()) return false;
        labelState.setTitle(prodName);
        labelState.setShowTitle(true);
        return true;
      }}
      onApplyData={(values, stillCurrent) => {
        if (stillCurrent && !stillCurrent()) return false;
        labelState.setTitle(values.title);
        labelState.setNormalPrice(values.normalPrice);
        labelState.setPromoPrice(values.promoPrice);
        labelState.setCentsText(values.centsText);
        labelState.setCurrencySymbol(values.currencySymbol);
        labelState.setInstallments(values.installments);
        return true;
      }}
      title={labelState.title}
      normalPrice={labelState.normalPrice}
      promoPrice={labelState.promoPrice}
      centsText={labelState.centsText}
      currencySymbol={labelState.currencySymbol}
      installments={labelState.installments}
    />

    <PriceLabelTestValuesModal
      isOpen={testValuesState.isTestValuesModalOpen}
      onClose={testValuesState.closeTestValuesModal}
      testDezenaD1={testValuesState.testDezenaD1}
      setTestDezenaD1={testValuesState.setTestDezenaD1}
      testDezenaD2={testValuesState.testDezenaD2}
      setTestDezenaD2={testValuesState.setTestDezenaD2}
      testCentenaD1={testValuesState.testCentenaD1}
      setTestCentenaD1={testValuesState.setTestCentenaD1}
      testCentenaD2={testValuesState.testCentenaD2}
      setTestCentenaD2={testValuesState.setTestCentenaD2}
      testCentenaD3={testValuesState.testCentenaD3}
      setTestCentenaD3={testValuesState.setTestCentenaD3}
      testMilharD1={testValuesState.testMilharD1}
      setTestMilharD1={testValuesState.setTestMilharD1}
      testMilharD2={testValuesState.testMilharD2}
      setTestMilharD2={testValuesState.setTestMilharD2}
      testMilharD3={testValuesState.testMilharD3}
      setTestMilharD3={testValuesState.setTestMilharD3}
      testMilharD4={testValuesState.testMilharD4}
      setTestMilharD4={testValuesState.setTestMilharD4}
      testNormalD1={testValuesState.testNormalD1}
      setTestNormalD1={testValuesState.setTestNormalD1}
      testNormalD2={testValuesState.testNormalD2}
      setTestNormalD2={testValuesState.setTestNormalD2}
      testNormalD3={testValuesState.testNormalD3}
      setTestNormalD3={testValuesState.setTestNormalD3}
    />
  </>
);
