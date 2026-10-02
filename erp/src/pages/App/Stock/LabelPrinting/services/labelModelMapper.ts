import type { GridModel } from '../types/LabelGridModelTypes';
import type { LabelConfig, LabelPreset } from '../utils/LabelConstants';

export function createInitialLabelConfig(isProductContext = false): LabelConfig {
  return {
    type: 'rect',
    preset: isProductContext ? 'qr_product' : 'store_logo',
    layout: 'horizontal',
    showName: isProductContext,
    showPrice: false,
    showBarcode: isProductContext,
    showSKU: isProductContext,
    showStoreName: !isProductContext,
    showStoreLogo: !isProductContext,
    showCustomText: false,
    text: '',
    price: '',
    sku: '',
    qrContent: '',
    customText: 'Qualidade Garantida',
    imageScale: 1,
    marginT: 8,
    marginB: 8,
    marginL: 9,
    marginR: 9,
    gapH: 10,
    gapV: 2,
    columns: 2,
    rows: 3,
    layoutId: '2x3_std',
    paperSize: 'A4',
    showPromoPrice: false,
    promoPrice: '',
    oldPriceColor: '#94a3b8',
    priceColor: '#1e293b',
    promoPriceColor: '#2563eb',
    nameColor: '#0f172a',
    promoColor: '#16a34a',
    nameFontSize: 10,
    category: 'identificacao',
    priceFontSize: 28,
    promoPriceFontSize: 24,
    promoFontSize: 18,
    imageFit: 'contain',
  };
}

export function resolveAutoPreset(category?: string | null): LabelPreset {
  if (category === 'precos') return 'price_only';
  if (category === 'identificacao') return 'qr_product';
  if (category === 'logos') return 'store_logo';
  return 'qr_product';
}

export function mapModelToLabelConfig(
  model: GridModel,
  prefConfig: LabelConfig,
  savedArtConfigs: Record<string, NonNullable<LabelConfig['artConfig']>> = {}
): LabelConfig {
  const autoPreset = resolveAutoPreset(model.category);

  return {
    ...prefConfig,
    layoutId: model.id,
    preset: autoPreset,
    columns: model.columns,
    rows: model.rows,
    marginT: model.marginT,
    marginB: model.marginB,
    marginL: model.marginL,
    marginR: model.marginR,
    gapH: model.gapH,
    gapV: model.gapV,
    paperSize: model.paperSize,
    paperWidth: model.paperWidth,
    paperHeight: model.paperHeight,
    type: model.type || 'rect',
    category: model.category || prefConfig.category,

    // Design e Tipografia (Normal)
    nameFontSize: model.nameFontSize || prefConfig.nameFontSize,
    nameColor: model.nameColor || '#1e293b',
    nameBold: model.nameBold,
    nameAlign: model.nameAlign,
    nameVAlign: model.nameVAlign,
    priceFontSize: model.priceFontSize || prefConfig.priceFontSize,
    priceColor: model.priceColor || '#1e293b',
    priceBold: model.priceBold,
    priceAlign: model.priceAlign,
    priceVAlign: model.priceVAlign,
    fontFamily: model.fontFamily || 'Inter',

    // Fontes por Faixa
    priceFontSizeTens: model.priceFontSizeTens,
    priceFontSizeHundreds: model.priceFontSizeHundreds,
    priceFontSizeThousands: model.priceFontSizeThousands,
    priceFontSizeTenThousands: model.priceFontSizeTenThousands,

    // Posições e Dimensões (Normal)
    namePosX: model.namePosX,
    namePosY: model.namePosY,
    nameWidth: model.nameWidth,
    nameHeight: model.nameHeight,
    pricePosX: model.pricePosX,
    pricePosY: model.pricePosY,
    priceWidth: model.priceWidth,
    priceHeight: model.priceHeight,
    barcodePosX: model.barcodePosX,
    barcodePosY: model.barcodePosY,
    dePricePorGroupPos: model.dePricePorGroupPos,
    dePricePorGroupRotation: model.dePricePorGroupRotation,
    dePricePorGroupGap: model.dePricePorGroupGap,
    artConfig: savedArtConfigs[model.id] || model.artConfig || prefConfig.artConfig,

    // Estilos Promocionais (Novo Preço)
    promoPriceFontSize: model.promoPriceFontSize || 24,
    promoPriceColor: model.promoPriceColor || '#2563eb',
    promoPriceBold: model.promoPriceBold,
    promoPriceAlign: model.promoPriceAlign,
    promoPriceVAlign: model.promoPriceVAlign,
    promoPosX: model.promoPosX,
    promoPosY: model.promoPosY,
    promoWidth: model.promoWidth,
    promoHeight: model.promoHeight,

    // Preço Antigo
    oldPriceFontSize: model.oldPriceFontSize,
    oldPriceColor: model.oldPriceColor || '#94a3b8',
    oldPriceBold: model.oldPriceBold,
    oldPriceAlign: model.oldPriceAlign,
    oldPriceVAlign: model.oldPriceVAlign,
    oldPricePosX: model.oldPricePosX,

    // Promo Label (Texto PROMOÇÃO)
    promoFontSize: model.promoFontSize,
    promoColor: model.promoColor,
    promoBold: model.promoBold,
    promoAlign: model.promoAlign,
    promoVAlign: model.promoVAlign,

    // Preço Split (Normal)
    priceFormat: model.priceFormat || 'standard',
    priceSymbolFontSize: model.priceSymbolFontSize,
    priceSymbolColor: model.priceSymbolColor,
    priceSymbolBold: model.priceSymbolBold,
    priceSymbolPosX: model.priceSymbolPosX,
    priceSymbolPosY: model.priceSymbolPosY,
    priceDecimalsFontSize: model.priceDecimalsFontSize,
    priceDecimalsColor: model.priceDecimalsColor,
    priceDecimalsBold: model.priceDecimalsBold,
    priceDecimalsPosX: model.priceDecimalsPosX,
    priceDecimalsPosY: model.priceDecimalsPosY,

    // Preço Split (Promo)
    promoPriceSymbolFontSize: model.promoPriceSymbolFontSize,
    promoPriceSymbolColor: model.promoPriceSymbolColor,
    promoPriceSymbolBold: model.promoPriceSymbolBold,
    promoPriceSymbolPosX: model.promoPriceSymbolPosX,
    promoPriceSymbolPosY: model.promoPriceSymbolPosY,
    promoPriceDecimalsFontSize: model.promoPriceDecimalsFontSize,
    promoPriceDecimalsColor: model.promoPriceDecimalsColor,
    promoPriceDecimalsBold: model.promoPriceDecimalsBold,
    promoPriceDecimalsPosX: model.promoPriceDecimalsPosX,
    promoPriceDecimalsPosY: model.promoPriceDecimalsPosY,

    // Cores de Fundo e Campos Extras
    bg_color: model.bg_color || '#ffffff',
    nameBgColor: model.nameBgColor || 'transparent',
    priceBgColor: model.priceBgColor || 'transparent',
    promoBgColor: model.promoBgColor || 'transparent',
    extraFields: model.extraFields || [],
    extraFieldsPromo: model.extraFieldsPromo || [],

    showName: true,
    showPrice: model.category === 'precos',
    showBarcode: model.category !== 'precos',
    showStoreLogo: model.category !== 'precos',
    imageScale: model.imageScale || 1,
  };
}

export function applyPresetToConfig(preset: LabelPreset, baseConfig: LabelConfig): LabelConfig {
  const newConfig: LabelConfig = { ...baseConfig, preset };
  if (preset === 'qr_product' || preset === 'barcode_only') newConfig.category = 'identificacao';
  else if (preset === 'price_only' || preset === 'promotional_price') newConfig.category = 'precos';
  else if (preset === 'store_logo') newConfig.category = 'logos';
  else if (preset === 'social_square') newConfig.category = 'posts';

  switch (preset) {
    case 'store_logo':
      newConfig.type = 'rect';
      newConfig.layout = 'horizontal';
      newConfig.showName = false;
      newConfig.showPrice = false;
      newConfig.showBarcode = false;
      newConfig.showStoreLogo = true;
      newConfig.showStoreName = false;
      newConfig.showSKU = false;
      newConfig.showCustomText = false;
      break;
    case 'qr_product':
      newConfig.type = 'rect';
      newConfig.layout = 'horizontal';
      newConfig.showName = true;
      newConfig.showPrice = false;
      newConfig.showBarcode = true;
      newConfig.showSKU = true;
      newConfig.showStoreLogo = false;
      newConfig.showStoreName = false;
      newConfig.showCustomText = false;
      break;
    case 'price_only':
      newConfig.type = 'rect';
      newConfig.layout = 'horizontal';
      newConfig.showName = true;
      newConfig.showPrice = true;
      newConfig.showBarcode = false;
      newConfig.showSKU = false;
      newConfig.showStoreLogo = false;
      newConfig.showStoreName = false;
      newConfig.showCustomText = false;
      break;
    case 'social_square':
      newConfig.type = 'rect';
      newConfig.layout = 'horizontal';
      newConfig.showName = true;
      newConfig.showPrice = true;
      newConfig.showBarcode = false;
      newConfig.showSKU = false;
      newConfig.showStoreLogo = true;
      newConfig.showStoreName = true;
      newConfig.showCustomText = false;
      break;
  }

  return newConfig;
}
