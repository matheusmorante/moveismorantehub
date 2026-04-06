import { GridModel } from './LabelGridModelModal';

export interface CustomLabel {
    id: string;
    name: string;
    image: string;
    extraFields?: any[];
}

export type LabelType = 'round' | 'rect';
export type LabelPreset = 'mdf' | 'store_logo' | 'qr_product' | 'barcode_only' | 'price_only' | 'promotional_price' | 'custom' | 'social_square';
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
    oldPricePosX?: number; oldPricePosY?: number; oldPriceWidth?: number; oldPriceHeight?: number;
    promoNamePosX?: number; promoNamePosY?: number; promoNameFontSize?: number;
    promoNameAlign?: 'left' | 'center' | 'right'; promoNameVAlign?: 'top' | 'middle' | 'bottom';
    promoNameColor?: string; promoNameBold?: boolean; promoNameWidth?: number; promoNameHeight?: number;
    promoNameBgColor?: string;
    promoBarcodePosX?: number; promoBarcodePosY?: number;
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
}

export const DEFAULT_LAYOUT_MODELS: GridModel[] = [
    // Identificação
    { id: '1x1_std', name: '1 Etiqueta (1x1)', columns: 1, rows: 1, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 0, gapV: 0, icon: 'bi-square', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '2x2_std', name: '4 Etiquetas (2x2)', columns: 2, rows: 2, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 10, gapV: 10, icon: 'bi-grid-fill', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '2x3_std', name: '6 Etiquetas (2x3)', columns: 2, rows: 3, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-1x2', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '3x3_std', name: '9 Etiquetas (3x3)', columns: 3, rows: 3, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-3x3', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    
    // Preços (Gôndola) - Com tipografia padrão
    { id: 'preco_2x5_restored', name: '10 Etiquetas (2x5)', columns: 2, rows: 5, marginT: 8.5, marginB: 8.5, marginL: 4, marginR: 4, gapH: 2.5, gapV: 0, icon: 'bi-grid-1x2-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 11, nameColor: '#1e293b', priceFontSize: 28, priceColor: '#1e293b', promoFontSize: 22, promoColor: '#16a34a', priceFormat: 'split' },
    { id: 'preco_1x1', name: '1 Etiqueta (1x1)', columns: 1, rows: 1, marginT: 20, marginB: 20, marginL: 20, marginR: 20, gapH: 0, gapV: 0, icon: 'bi-card-text', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 12, nameColor: '#1e293b', priceFontSize: 32, priceColor: '#1e293b', promoPriceFontSize: 24, promoPriceColor: '#16a34a', bg_color: '#ffffff', priceFormat: 'split' },
    { id: 'preco_2x4', name: '8 Etiquetas (2x4)', columns: 2, rows: 4, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 10, icon: 'bi-tags', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 10, nameColor: '#1e293b', priceFontSize: 24, priceColor: '#1e293b', promoPriceFontSize: 20, promoPriceColor: '#16a34a', bg_color: '#ffffff' },
    { id: 'preco_3x7', name: '21 Etiquetas (3x7)', columns: 3, rows: 7, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 2, gapV: 2, icon: 'bi-grid-3x3-gap', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 7, nameColor: '#1e293b', priceFontSize: 14, priceColor: '#1e293b', promoPriceFontSize: 11, promoPriceColor: '#16a34a', bg_color: '#ffffff' },
    { id: 'preco_3x9_a4', name: '27 Etiquetas (3x9)', columns: 3, rows: 9, marginT: 10, marginB: 10, marginL: 5, marginR: 5, gapH: 4, gapV: 0, icon: 'bi-grid-3x3-gap-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 7, nameColor: '#1e293b', priceFontSize: 12, priceColor: '#1e293b', promoFontSize: 10, promoColor: '#16a34a' },
    { id: 'preco_4x10_a4', name: '40 Etiquetas (4x10)', columns: 4, rows: 10, marginT: 10, marginB: 10, marginL: 5, marginR: 5, gapH: 4, gapV: 0, icon: 'bi-grid-3x2-gap-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 6, nameColor: '#1e293b', priceFontSize: 10, priceColor: '#1e293b', promoFontSize: 8, promoColor: '#16a34a' },
    { id: 'preco_3x5_a4', name: '15 Etiquetas (3x5)', columns: 3, rows: 5, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-3x2-gap-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 9, nameColor: '#1e293b', priceFontSize: 20, priceColor: '#1e293b', promoFontSize: 16, promoColor: '#16a34a' },

    // Logos e Rótulos (Redondos ou Retangulares)
    { id: 'logo_round_3x3', name: '9 Etiquetas (Redonda) (3x3)', columns: 3, rows: 3, marginT: 15, marginB: 15, marginL: 15, marginR: 15, gapH: 10, gapV: 10, icon: 'bi-circle', paperSize: 'A4', category: 'logos', type: 'round' },
    { id: 'logo_round_4x6', name: '24 Etiquetas (Redonda) (4x6)', columns: 4, rows: 6, marginT: 7, marginB: 7, marginL: 9, marginR: 9, gapH: 12, gapV: 10, icon: 'bi-circle', paperSize: 'A4', category: 'logos', type: 'round' },
    { id: 'logo_rect_2x2', name: '4 Etiquetas (Retangular) (2x2)', columns: 2, rows: 2, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 10, gapV: 10, icon: 'bi-square', paperSize: 'A4', category: 'logos', type: 'rect' },

    // Posts para Redes Sociais
    { id: 'post_square', name: 'Post Individual (1x1)', columns: 1, rows: 1, marginT: 0, marginB: 0, marginL: 0, marginR: 0, gapH: 0, gapV: 0, icon: 'bi-instagram', paperSize: 'A4', category: 'posts', type: 'rect' },
];
