export interface CustomLabel {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  readonly extraFields?: readonly any[];
}

export type LabelType = 'round' | 'rect';
export type LabelPreset =
  | 'mdf'
  | 'store_logo'
  | 'qr_product'
  | 'barcode_only'
  | 'price_only'
  | 'promotional_price'
  | 'custom'
  | 'social_square';
export type LabelLayout = 'vertical' | 'horizontal' | 'image-focus';

export interface LabelConfig {
  type: LabelType;
  preset: LabelPreset;
  layout: LabelLayout;
  showName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showSKU: boolean;
  showStoreName: boolean;
  showStoreLogo: boolean;
  showCustomText: boolean;
  text: string;
  price: string;
  sku: string;
  qrContent: string;
  customText: string;
  imageScale: number;
  marginT: number;
  marginB: number;
  marginL: number;
  marginR: number;
  gapH: number;
  gapV: number;
  columns: number;
  rows: number;
  showPromoPrice: boolean;
  promoPrice: string;
  layoutId?: string;
  paperSize: string;
  paperWidth?: number;
  paperHeight?: number;
  category: string;
  previewImage?: string | null;
  id?: string;
  // Design e Interatividade
  nameFontSize: number;
  nameColor: string;
  nameBold?: boolean;
  nameAlign?: 'left' | 'center' | 'right';
  nameVAlign?: 'top' | 'middle' | 'bottom';
  priceFontSize: number;
  priceColor: string;
  priceBold?: boolean;
  priceAlign?: 'left' | 'center' | 'right';
  priceVAlign?: 'top' | 'middle' | 'bottom';
  promoFontSize?: number;
  promoColor?: string;
  promoBold?: boolean;
  promoAlign?: 'left' | 'center' | 'right';
  promoVAlign?: 'top' | 'middle' | 'bottom';
  promoPriceFontSize: number;
  promoPriceColor: string;
  oldPriceColor: string;
  // Posições
  namePosX?: number;
  namePosY?: number;
  pricePosX?: number;
  pricePosY?: number;
  promoPosX?: number;
  promoPosY?: number;
  barcodePosX?: number;
  barcodePosY?: number;
  dePricePorGroupPos?: { x: number; y: number };
  dePricePorGroupRotation?: number;
  dePricePorGroupGap?: number;
  // Fontes por faixa
  priceFontSizeHundreds?: number;
  priceFontSizeThousands?: number;
  priceFontSizeTens?: number;
  priceFontSizeTenThousands?: number;
  // Dimensões e Áreas
  labelWidth?: number;
  labelHeight?: number;
  nameWidth?: number;
  nameHeight?: number;
  priceWidth?: number;
  priceHeight?: number;
  promoWidth?: number;
  promoHeight?: number;
  // Estilos Independentes Promo/Antigo
  promoPriceBold?: boolean;
  promoPriceAlign?: 'left' | 'center' | 'right';
  promoPriceVAlign?: 'top' | 'middle' | 'bottom';
  oldPriceBold?: boolean;
  oldPriceFontSize?: number;
  oldPriceAlign?: 'left' | 'center' | 'right';
  oldPriceVAlign?: 'top' | 'middle' | 'bottom';
  priceFormat?: 'standard' | 'split';
  priceSymbolFontSize?: number;
  priceDecimalsFontSize?: number;
  priceSymbolPosX?: number;
  priceSymbolPosY?: number;
  priceDecimalsPosX?: number;
  priceDecimalsPosY?: number;
  priceSymbolColor?: string;
  priceDecimalsColor?: string;
  priceSymbolBold?: boolean;
  priceDecimalsBold?: boolean;
  // Promo variations
  oldPricePosX?: number;
  oldPricePosY?: number;
  oldPriceWidth?: number;
  oldPriceHeight?: number;
  promoNamePosX?: number;
  promoNamePosY?: number;
  promoNameFontSize?: number;
  promoNameAlign?: 'left' | 'center' | 'right';
  promoNameVAlign?: 'top' | 'middle' | 'bottom';
  promoNameColor?: string;
  promoNameBold?: boolean;
  promoNameWidth?: number;
  promoNameHeight?: number;
  promoNameBgColor?: string;
  promoBarcodePosX?: number;
  promoBarcodePosY?: number;
  bg_color?: string;
  nameBgColor?: string;
  priceBgColor?: string;
  promoBgColor?: string;
  extraFields?: any[];
  extraFieldsPromo?: any[];
  fontFamily?: string;
  promoPriceSymbolPosX?: number;
  promoPriceSymbolPosY?: number;
  promoPriceSymbolFontSize?: number;
  promoPriceSymbolBold?: boolean;
  promoPriceSymbolColor?: string;
  promoPriceDecimalsPosX?: number;
  promoPriceDecimalsPosY?: number;
  promoPriceDecimalsFontSize?: number;
  promoPriceDecimalsBold?: boolean;
  promoPriceDecimalsColor?: string;
  printingMode?: 'simple' | 'advanced';
  imageFit?: 'contain' | 'cover' | 'fill';
  _artVersion?: number;
  barcode?: string;
  code?: string;
  opportunityId?: string | null;
  opportunity_id?: string | null;
  isBlank?: boolean;
  name?: string;
  artConfig?: {
    opportunities?: Record<string, any>;
    globalSnapshot?: Record<string, any>;
    oppColorsMap?: Record<string, any>;
  };
}

export { DEFAULT_LAYOUT_MODELS } from './defaultLayoutModels';
