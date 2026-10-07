export interface PriceLabelArtData {
  artWidthMm?: number;
  artHeightMm?: number;
  fabricTemplateJson?: any;
  fabricDataUrl?: string;
  title: string;
  showTitle?: boolean;
  titleFontSize: number;
  titleColor: string;
  titleFontFamily: string;
  titlePos: { x: number; y: number };
  titleRotation: number;
  titleWidth?: number;

  deText: string;
  showDe?: boolean;
  deFontSize: number;
  deColor: string;
  deFontFamily: string;
  dePos?: { x: number; y: number };
  deRotation?: number;

  normalPrice: string;
  showNormalPrice?: boolean;
  normalPriceFontSize: number;
  normalPriceColor: string;
  normalPriceFontFamily: string;
  normalPricePos?: { x: number; y: number };
  normalPriceRotation?: number;

  porText: string;
  showPor?: boolean;
  porFontSize: number;
  porColor: string;
  porFontFamily: string;
  porPos?: { x: number; y: number };
  porRotation?: number;

  dePricePorGroupPos: { x: number; y: number };
  dePricePorGroupRotation: number;
  dePricePorGroupGap: number;

  currencySymbol: string;
  showCurrency?: boolean;
  currencyFontSize: number;
  currencyColor: string;
  currencyFontFamily: string;
  currencyPos: { x: number; y: number };
  currencyRotation: number;

  promoPrice: string; // Preço formatado ou dígito do produto
  showPromoPrice?: boolean;
  priceScale: number;
  priceColor: string;
  promoPriceFontFamily: string;
  promoPricePos: { x: number; y: number };
  promoPriceRotation: number;

  centsText: string;
  showCents?: boolean;
  centsFontSize: number;
  centsColor: string;
  centsFontFamily: string;
  centsPos: { x: number; y: number };
  centsRotation: number;

  installments?: string;
  showInstallments?: boolean;
  installmentsFontSize?: number;
  installmentsColor?: string;
  installmentsFontFamily?: string;
  installmentsPos?: { x: number; y: number };
  installmentsRotation?: number;

  bgColor: string;

  // Modos de visualização de design em camadas (editor)
  showPromoPriceThousands?: boolean;
  showPromoPriceHundreds?: boolean;
  showPromoPriceTens?: boolean;
  scaleThousands?: number;
  scaleHundreds?: number;
  scaleTens?: number;
  testMilharStr?: string;
  testCentenaStr?: string;
  testDezenaStr?: string;
  selectedMagnitude?: 'tens' | 'hundreds' | 'thousands';
}
