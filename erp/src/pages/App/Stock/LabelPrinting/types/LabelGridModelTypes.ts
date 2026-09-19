export interface GridModel {
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

export interface LabelGridModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: GridModel) => void;
  currentModelId?: string;
  onSaveCustomModel?: (model: GridModel) => void;
  onDeleteCustomModel?: (id: string) => void;
  initialCategory?: 'identificacao' | 'precos' | 'logos' | 'posts';
}
