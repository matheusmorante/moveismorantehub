import { getFixedLabelTextSize } from '../utils/fixedLabelTextSize';

type SnapshotSetters = Record<string, (value: any) => void>;

export const applyPriceLabelMagnitudeSnapshot = (
  s: any,
  preserveFixedTextStyles: boolean,
  setters: SnapshotSetters,
  defaultBgColor: string,
) => {
  if (!s) return;
  if (s.title !== undefined) setters.setTitle(s.title);
  if (s.showTitle !== undefined) setters.setShowTitle(s.showTitle);
  if (!preserveFixedTextStyles) {
    const fixedTitleSize = getFixedLabelTextSize(s, 'title', 14);
    setters.setTitleFontSizeTens(fixedTitleSize);
    setters.setTitleFontSizeHundreds(fixedTitleSize);
    setters.setTitleFontSizeThousands(fixedTitleSize);
  }

  if (s.titleColor) setters.setTitleColor(s.titleColor);
  if (!preserveFixedTextStyles && s.titleFontFamily) setters.setTitleFontFamily(s.titleFontFamily);
  if (s.titlePos && (s.titlePos.x !== 0 || s.titlePos.y !== 0)) setters.setTitlePos(s.titlePos);
  else setters.setTitlePos({ x: 0, y: -160 });
  if (s.titleRotation !== undefined) setters.setTitleRotation(s.titleRotation);
  if (Number.isFinite(Number(s.titleWidth))) setters.setTitleWidth(Number(s.titleWidth));

  if (s.deText !== undefined) setters.setDeText(s.deText);
  if (s.showDe !== undefined) setters.setShowDe(s.showDe);
  if (!preserveFixedTextStyles) {
    const fixedDeSize = getFixedLabelTextSize(s, 'de', 34);
    setters.setDeFontSizeTens(fixedDeSize);
    setters.setDeFontSizeHundreds(fixedDeSize);
    setters.setDeFontSizeThousands(fixedDeSize);
  }

  if (s.deColor) setters.setDeColor(s.deColor);
  if (!preserveFixedTextStyles && s.deFontFamily) setters.setDeFontFamily(s.deFontFamily);
  if (s.dePos) setters.setDePos(s.dePos);
  if (s.deRotation !== undefined) setters.setDeRotation(s.deRotation);

  if (s.normalPrice !== undefined) setters.setNormalPrice(s.normalPrice);
  if (s.showNormalPrice !== undefined) setters.setShowNormalPrice(s.showNormalPrice);
  if (!preserveFixedTextStyles) {
    const fixedNormalPriceSize = getFixedLabelTextSize(s, 'normalPrice', 16);
    setters.setNormalPriceFontSizeTens(fixedNormalPriceSize);
    setters.setNormalPriceFontSizeHundreds(fixedNormalPriceSize);
    setters.setNormalPriceFontSizeThousands(fixedNormalPriceSize);
  }

  if (s.normalPriceColor) setters.setNormalPriceColor(s.normalPriceColor);
  if (!preserveFixedTextStyles && s.normalPriceFontFamily)
    setters.setNormalPriceFontFamily(s.normalPriceFontFamily);
  if (s.normalPricePos) setters.setNormalPricePos(s.normalPricePos);
  if (s.normalPriceRotation !== undefined) setters.setNormalPriceRotation(s.normalPriceRotation);

  if (s.porText !== undefined) setters.setPorText(s.porText);
  if (s.showPor !== undefined) setters.setShowPor(s.showPor);
  if (!preserveFixedTextStyles) {
    const fixedPorSize = getFixedLabelTextSize(s, 'por', 15);
    setters.setPorFontSizeTens(fixedPorSize);
    setters.setPorFontSizeHundreds(fixedPorSize);
    setters.setPorFontSizeThousands(fixedPorSize);
  }

  if (s.porColor) setters.setPorColor(s.porColor);
  if (!preserveFixedTextStyles && s.porFontFamily) setters.setPorFontFamily(s.porFontFamily);
  if (s.porPos) setters.setPorPos(s.porPos);
  if (s.porRotation !== undefined) setters.setPorRotation(s.porRotation);

  if (s.currencySymbol !== undefined) setters.setCurrencySymbol(s.currencySymbol);
  if (s.showCurrency !== undefined) setters.setShowCurrency(s.showCurrency);
  if (!preserveFixedTextStyles) {
    const fixedCurrencySize = getFixedLabelTextSize(s, 'currency', 70);
    setters.setCurrencyFontSizeTens(fixedCurrencySize);
    setters.setCurrencyFontSizeHundreds(fixedCurrencySize);
    setters.setCurrencyFontSizeThousands(fixedCurrencySize);
  }

  if (s.currencyColor) setters.setCurrencyColor(s.currencyColor);
  if (!preserveFixedTextStyles && s.currencyFontFamily)
    setters.setCurrencyFontFamily(s.currencyFontFamily);
  if (s.currencyPos && (s.currencyPos.x !== 0 || s.currencyPos.y !== 0))
    setters.setCurrencyPos(s.currencyPos);
  else setters.setCurrencyPos({ x: -280, y: 35 });
  if (s.currencyRotation !== undefined) setters.setCurrencyRotation(s.currencyRotation);

  if (s.promoPrice !== undefined) setters.setPromoPrice(s.promoPrice);
  if (s.showPromoPrice !== undefined) setters.setShowPromoPrice(s.showPromoPrice);
  if (s.showPromoPriceTens !== undefined) setters.setShowPromoPriceTens(s.showPromoPriceTens);
  if (s.showPromoPriceHundreds !== undefined) setters.setShowPromoPriceHundreds(s.showPromoPriceHundreds);
  if (s.showPromoPriceThousands !== undefined)
    setters.setShowPromoPriceThousands(s.showPromoPriceThousands);
  if (s.priceColor) setters.setPriceColor(s.priceColor);
  if (s.promoPriceFontFamily) setters.setPromoPriceFontFamily(s.promoPriceFontFamily);
  if (s.promoPricePos && (s.promoPricePos.x !== 0 || s.promoPricePos.y !== 0))
    setters.setPromoPricePos(s.promoPricePos);
  else setters.setPromoPricePos({ x: 0, y: 45 });
  if (s.promoPriceRotation !== undefined) setters.setPromoPriceRotation(s.promoPriceRotation);

  const targetScaleTens = s.scaleTens && Number(s.scaleTens) >= 120 ? Number(s.scaleTens) : 240;
  const targetScaleHundreds =
    s.scaleHundreds && Number(s.scaleHundreds) >= 120 ? Number(s.scaleHundreds) : 210;
  const targetScaleThousands =
    s.scaleThousands && Number(s.scaleThousands) >= 120 ? Number(s.scaleThousands) : 170;
  setters.setScaleTens(targetScaleTens);
  setters.setScaleHundreds(targetScaleHundreds);
  setters.setScaleThousands(targetScaleThousands);
  if (s.scaleTenThousands !== undefined) setters.setScaleTenThousands(s.scaleTenThousands);

  if (s.centsText !== undefined) setters.setCentsText(s.centsText);
  if (s.showCents !== undefined) setters.setShowCents(s.showCents);
  if (!preserveFixedTextStyles) {
    const fixedCentsSize = getFixedLabelTextSize(s, 'cents', 70);
    setters.setCentsFontSizeTens(fixedCentsSize);
    setters.setCentsFontSizeHundreds(fixedCentsSize);
    setters.setCentsFontSizeThousands(fixedCentsSize);
  }

  if (s.centsColor) setters.setCentsColor(s.centsColor);
  if (!preserveFixedTextStyles && s.centsFontFamily) setters.setCentsFontFamily(s.centsFontFamily);
  if (s.centsPos && (s.centsPos.x !== 0 || s.centsPos.y !== 0)) setters.setCentsPos(s.centsPos);
  else setters.setCentsPos({ x: 260, y: -10 });
  if (s.centsRotation !== undefined) setters.setCentsRotation(s.centsRotation);

  if (s.showInstallments !== undefined) setters.setShowInstallments(s.showInstallments);
  if (s.installments) setters.setInstallments(s.installments);
  if (!preserveFixedTextStyles) {
    const fixedInstallmentsSize = getFixedLabelTextSize(s, 'installments', 14);
    setters.setInstallmentsFontSizeTens(fixedInstallmentsSize);
    setters.setInstallmentsFontSizeHundreds(fixedInstallmentsSize);
    setters.setInstallmentsFontSizeThousands(fixedInstallmentsSize);
  }

  if (s.installmentsColor) setters.setInstallmentsColor(s.installmentsColor);
  if (!preserveFixedTextStyles && s.installmentsFontFamily)
    setters.setInstallmentsFontFamily(s.installmentsFontFamily);
  if (s.installmentsPos) setters.setInstallmentsPos(s.installmentsPos);
  if (s.installmentsRotation !== undefined) setters.setInstallmentsRotation(s.installmentsRotation);

  // { x: 0, y: 0 } é uma posição válida do template, não ausência de
  // configuração. O editor deve refletir exatamente o snapshot do BD.
  setters.setDePricePorGroupPos(s.dePricePorGroupPos ?? { x: 0, y: 0 });
  if (s.dePricePorGroupRotation !== undefined)
    setters.setDePricePorGroupRotation(s.dePricePorGroupRotation);
  if (s.dePricePorGroupGap !== undefined) setters.setDePricePorGroupGap(s.dePricePorGroupGap);

  if (s.bgColor && s.bgColor !== 'transparent') {
    setters.setBgColor(s.bgColor);
  } else if (defaultBgColor) {
    setters.setBgColor(defaultBgColor);
  }
};
