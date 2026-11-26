type PriceLabelMagnitude = 'tens' | 'hundreds' | 'thousands';

type MagnitudeTemplates = Partial<Record<PriceLabelMagnitude, any>>;

export function buildPriceLabelStateSnapshot<TState extends Record<string, any>>({
  selectedOppId,
  selectedMagnitude,
  magnitudeTemplates,
  oppColorsMap,
  currentMagnitudeSnapshot,
}: {
  selectedOppId: string;
  selectedMagnitude: PriceLabelMagnitude;
  magnitudeTemplates: MagnitudeTemplates;
  oppColorsMap: Record<string, Record<string, string>>;
  currentMagnitudeSnapshot: TState;
}) {
  const sharedLayout = {
    titlePos: currentMagnitudeSnapshot.titlePos,
    dePos: currentMagnitudeSnapshot.dePos,
    normalPricePos: currentMagnitudeSnapshot.normalPricePos,
    porPos: currentMagnitudeSnapshot.porPos,
    currencyPos: currentMagnitudeSnapshot.currencyPos,
    promoPricePos: currentMagnitudeSnapshot.promoPricePos,
    centsPos: currentMagnitudeSnapshot.centsPos,
    installmentsPos: currentMagnitudeSnapshot.installmentsPos,
    dePricePorGroupPos: currentMagnitudeSnapshot.dePricePorGroupPos,
    titleFontFamily: currentMagnitudeSnapshot.titleFontFamily,
    deFontFamily: currentMagnitudeSnapshot.deFontFamily,
    normalPriceFontFamily: currentMagnitudeSnapshot.normalPriceFontFamily,
    porFontFamily: currentMagnitudeSnapshot.porFontFamily,
    currencyFontFamily: currentMagnitudeSnapshot.currencyFontFamily,
    centsFontFamily: currentMagnitudeSnapshot.centsFontFamily,
    installmentsFontFamily: currentMagnitudeSnapshot.installmentsFontFamily,
    titleFontSizeTens: currentMagnitudeSnapshot.titleFontSizeTens,
    titleFontSizeHundreds: currentMagnitudeSnapshot.titleFontSizeHundreds,
    titleFontSizeThousands: currentMagnitudeSnapshot.titleFontSizeThousands,
    deFontSizeTens: currentMagnitudeSnapshot.deFontSizeTens,
    deFontSizeHundreds: currentMagnitudeSnapshot.deFontSizeHundreds,
    deFontSizeThousands: currentMagnitudeSnapshot.deFontSizeThousands,
    normalPriceFontSizeTens: currentMagnitudeSnapshot.normalPriceFontSizeTens,
    normalPriceFontSizeHundreds: currentMagnitudeSnapshot.normalPriceFontSizeHundreds,
    normalPriceFontSizeThousands: currentMagnitudeSnapshot.normalPriceFontSizeThousands,
    porFontSizeTens: currentMagnitudeSnapshot.porFontSizeTens,
    porFontSizeHundreds: currentMagnitudeSnapshot.porFontSizeHundreds,
    porFontSizeThousands: currentMagnitudeSnapshot.porFontSizeThousands,
    currencyFontSizeTens: currentMagnitudeSnapshot.currencyFontSizeTens,
    currencyFontSizeHundreds: currentMagnitudeSnapshot.currencyFontSizeHundreds,
    currencyFontSizeThousands: currentMagnitudeSnapshot.currencyFontSizeThousands,
    scaleTens: currentMagnitudeSnapshot.scaleTens,
    scaleHundreds: currentMagnitudeSnapshot.scaleHundreds,
    scaleThousands: currentMagnitudeSnapshot.scaleThousands,
    scaleTenThousands: currentMagnitudeSnapshot.scaleTenThousands,
    centsFontSizeTens: currentMagnitudeSnapshot.centsFontSizeTens,
    centsFontSizeHundreds: currentMagnitudeSnapshot.centsFontSizeHundreds,
    centsFontSizeThousands: currentMagnitudeSnapshot.centsFontSizeThousands,
    installmentsFontSizeTens: currentMagnitudeSnapshot.installmentsFontSizeTens,
    installmentsFontSizeHundreds: currentMagnitudeSnapshot.installmentsFontSizeHundreds,
    installmentsFontSizeThousands: currentMagnitudeSnapshot.installmentsFontSizeThousands,
  };

  const fullTemplates = {
    ...Object.fromEntries(
      Object.entries(magnitudeTemplates).map(([magnitude, template]) => {
        const {
          fabricTemplateJson: _legacyFabricTemplate,
          fabricDataUrl: _legacyFabricImage,
          ...templateData
        } = template || {};
        return [magnitude, { ...templateData, ...sharedLayout }];
      })
    ),
    [selectedMagnitude]: currentMagnitudeSnapshot,
  };

  return {
    selectedOppId,
    selectedMagnitude,
    magnitudeTemplates: fullTemplates,
    oppColorsMap,
    ...currentMagnitudeSnapshot,
  };
}
