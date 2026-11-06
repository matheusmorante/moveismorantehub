import type { Dispatch, SetStateAction } from 'react';

type PriceLabelMagnitude = 'tens' | 'hundreds' | 'thousands';
type SnapshotSetters = Record<string, (value: any) => void>;
type MagnitudeTemplates = {
  tens?: any;
  hundreds?: any;
  thousands?: any;
};

interface ApplyPriceLabelSnapshotInput {
  snapshot: any;
  preserveLayout: boolean;
  getCurrentLayout: () => Record<string, any>;
  selectedMagnitude: PriceLabelMagnitude;
  setSelectedMagnitude: Dispatch<SetStateAction<PriceLabelMagnitude>>;
  setMagnitudeTemplates: Dispatch<SetStateAction<MagnitudeTemplates>>;
  setOppColorsMap: Dispatch<SetStateAction<Record<string, Record<string, string>>>>;
  setSelectedOppId: Dispatch<SetStateAction<string>>;
  applyMagnitudeSnapshot: (snapshot: any) => void;
  setters: SnapshotSetters;
  isApplyingHistoryRef: { current: boolean };
}

export const applyPriceLabelSnapshot = ({
  snapshot: s,
  preserveLayout,
  getCurrentLayout,
  selectedMagnitude,
  setSelectedMagnitude,
  setMagnitudeTemplates,
  setOppColorsMap,
  setSelectedOppId,
  applyMagnitudeSnapshot,
  setters,
  isApplyingHistoryRef,
}: ApplyPriceLabelSnapshotInput) => {
  if (!s) return;
  isApplyingHistoryRef.current = true;
  const currentLayout = preserveLayout ? getCurrentLayout() : null;

  if (s.oppColorsMap && typeof s.oppColorsMap === 'object') setOppColorsMap(s.oppColorsMap);
  if (s.magnitudeTemplates) setMagnitudeTemplates(s.magnitudeTemplates);
  if (s.selectedOppId) setSelectedOppId(s.selectedOppId);

  const targetMag = s.selectedMagnitude || selectedMagnitude || 'hundreds';
  setSelectedMagnitude(targetMag);
  if (s.magnitudeTemplates && s.magnitudeTemplates[targetMag]) {
    applyMagnitudeSnapshot(s.magnitudeTemplates[targetMag]);
  } else {
    applyMagnitudeSnapshot(s);
  }

  if (currentLayout) {
    const fixedTitleSize = currentLayout.titleFontSizeHundreds;
    const fixedDeSize = currentLayout.deFontSizeHundreds;
    const fixedNormalPriceSize = currentLayout.normalPriceFontSizeHundreds;
    const fixedPorSize = currentLayout.porFontSizeHundreds;
    const fixedCurrencySize = currentLayout.currencyFontSizeHundreds;
    const fixedCentsSize = currentLayout.centsFontSizeHundreds;
    const fixedInstallmentsSize = currentLayout.installmentsFontSizeHundreds;
    setters.setTitlePos(currentLayout.titlePos);
    setters.setDePos(currentLayout.dePos);
    setters.setNormalPricePos(currentLayout.normalPricePos);
    setters.setPorPos(currentLayout.porPos);
    setters.setCurrencyPos(currentLayout.currencyPos);
    setters.setPromoPricePos(currentLayout.promoPricePos);
    setters.setCentsPos(currentLayout.centsPos);
    setters.setInstallmentsPos(currentLayout.installmentsPos);
    setters.setDePricePorGroupPos(currentLayout.dePricePorGroupPos);
    setters.setTitleFontSizeTens(fixedTitleSize);
    setters.setTitleFontSizeHundreds(fixedTitleSize);
    setters.setTitleFontSizeThousands(fixedTitleSize);
    setters.setDeFontSizeTens(fixedDeSize);
    setters.setDeFontSizeHundreds(fixedDeSize);
    setters.setDeFontSizeThousands(fixedDeSize);
    setters.setNormalPriceFontSizeTens(fixedNormalPriceSize);
    setters.setNormalPriceFontSizeHundreds(fixedNormalPriceSize);
    setters.setNormalPriceFontSizeThousands(fixedNormalPriceSize);
    setters.setPorFontSizeTens(fixedPorSize);
    setters.setPorFontSizeHundreds(fixedPorSize);
    setters.setPorFontSizeThousands(fixedPorSize);
    setters.setCurrencyFontSizeTens(fixedCurrencySize);
    setters.setCurrencyFontSizeHundreds(fixedCurrencySize);
    setters.setCurrencyFontSizeThousands(fixedCurrencySize);
    setters.setScaleTens(currentLayout.scaleTens);
    setters.setScaleHundreds(currentLayout.scaleHundreds);
    setters.setScaleThousands(currentLayout.scaleThousands);
    setters.setScaleTenThousands(currentLayout.scaleTenThousands);
    setters.setCentsFontSizeTens(fixedCentsSize);
    setters.setCentsFontSizeHundreds(fixedCentsSize);
    setters.setCentsFontSizeThousands(fixedCentsSize);
    setters.setInstallmentsFontSizeTens(fixedInstallmentsSize);
    setters.setInstallmentsFontSizeHundreds(fixedInstallmentsSize);
    setters.setInstallmentsFontSizeThousands(fixedInstallmentsSize);
  }

  setTimeout(() => {
    isApplyingHistoryRef.current = false;
  }, 50);
};
