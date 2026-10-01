interface GridModelBase {
  id: string;
  baseModelId?: string;
  name: string;
  columns: number;
  rows: number;
  marginT: number;
  marginB: number;
  marginL: number;
  marginR: number;
  gapH: number;
  gapV: number;
  paperSize: string;
  paperWidth?: number;
  paperHeight?: number;
  icon: string;
  category?: 'identificacao' | 'precos' | 'logos' | 'posts';
  type?: 'round' | 'rect';
  imageFit?: 'contain' | 'cover' | 'fill';
  // Design tipográfico
  nameFontSize?: number;
  nameColor?: string;
  nameBold?: boolean;
  nameAlign?: 'left' | 'center' | 'right';
  nameVAlign?: 'top' | 'middle' | 'bottom';
  priceFontSize?: number;
  priceColor?: string;
  priceBold?: boolean;
  priceAlign?: 'left' | 'center' | 'right';
  priceVAlign?: 'top' | 'middle' | 'bottom';
  promoFontSize?: number;
  promoColor?: string;
  promoBold?: boolean;
  promoAlign?: 'left' | 'center' | 'right';
  promoVAlign?: 'top' | 'middle' | 'bottom';
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
  priceFontSizeTens?: number;
  priceFontSizeHundreds?: number;
  priceFontSizeThousands?: number;
  priceFontSizeTenThousands?: number;
  promoPriceColor?: string;
  oldPriceColor?: string;
  fontFamily?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  customPadding?: number;
  isCustom?: boolean;
}

export interface GridModel extends GridModelBase {
  priceFormat?: 'split' | 'standard';
  priceSymbolPosX?: number;
  priceSymbolPosY?: number;
  priceSymbolFontSize?: number;
  priceSymbolBold?: boolean;
  priceSymbolColor?: string;
  priceDecimalsPosX?: number;
  priceDecimalsPosY?: number;
  priceDecimalsFontSize?: number;
  priceDecimalsBold?: boolean;
  priceDecimalsColor?: string;
  oldPriceFontSize?: number;
  oldPriceBold?: boolean;
  oldPriceAlign?: 'left' | 'center' | 'right';
  oldPriceVAlign?: 'top' | 'middle' | 'bottom';
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
  promoPriceFontSize?: number;
  promoPriceBold?: boolean;
  promoPriceAlign?: 'left' | 'center' | 'right';
  promoPriceVAlign?: 'top' | 'middle' | 'bottom';
  nameWidth?: number;
  nameHeight?: number;
  priceWidth?: number;
  priceHeight?: number;
  promoWidth?: number;
  promoHeight?: number;
  bg_color?: string;
  nameBgColor?: string;
  priceBgColor?: string;
  promoBgColor?: string;
  extraFields?: any[];
  extraFieldsPromo?: any[];
  imageScale?: number;
  previewImage?: string | null;
  showPromoPrice?: boolean;
  artConfig?: {
    opportunities?: Record<string, any>;
  };
}

export type GridModelDraft = Omit<GridModel, 'id'> & { id?: string | undefined };

export interface LabelGridModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: GridModel) => void;
  currentModelId?: string;
  onSaveCustomModel?: (model: GridModel) => void;
  onDeleteCustomModel?: (id: string) => void;
  initialCategory?: 'identificacao' | 'precos' | 'logos' | 'posts';
}
