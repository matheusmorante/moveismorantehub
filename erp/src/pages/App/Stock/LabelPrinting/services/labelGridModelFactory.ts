import type { GridModel } from '../types/LabelGridModelTypes';

type LabelGridModelEditorValues = Omit<
  Partial<GridModel>,
  | 'id'
  | 'name'
  | 'icon'
  | 'paperWidth'
  | 'paperHeight'
  | 'category'
  | 'type'
  | 'dePricePorGroupPos'
  | 'dePricePorGroupRotation'
  | 'dePricePorGroupGap'
  | 'namePosX'
  | 'namePosY'
  | 'pricePosX'
  | 'pricePosY'
  | 'promoPosX'
  | 'promoPosY'
  | 'barcodePosX'
  | 'barcodePosY'
  | 'priceSymbolPosX'
  | 'priceSymbolPosY'
  | 'priceDecimalsPosX'
  | 'priceDecimalsPosY'
  | 'promoNamePosX'
  | 'promoNamePosY'
  | 'oldPricePosX'
  | 'oldPricePosY'
  | 'promoBarcodePosX'
  | 'promoBarcodePosY'
  | 'promoPriceSymbolPosX'
  | 'promoPriceSymbolPosY'
  | 'promoPriceDecimalsPosX'
  | 'promoPriceDecimalsPosY'
>;

type Point = { x: number; y: number };

type RequiredGridLayout = Pick<
  GridModel,
  | 'columns'
  | 'rows'
  | 'marginT'
  | 'marginB'
  | 'marginL'
  | 'marginR'
  | 'gapH'
  | 'gapV'
  | 'paperSize'
>;

export type LabelGridModelEditorState = LabelGridModelEditorValues &
  RequiredGridLayout & {
    editingModel?: Pick<
      GridModel,
      | 'id'
      | 'category'
      | 'dePricePorGroupPos'
      | 'dePricePorGroupRotation'
      | 'dePricePorGroupGap'
    > | null;
    name: string;
    generatedName: string;
    currentCategory?: GridModel['category'] | null;
    layoutType: NonNullable<GridModel['type']>;
    customWidth: number;
    customHeight: number;
    namePos: Point;
    pricePos: Point;
    promoPos: Point;
    barcodePos: Point;
    priceSymbolPos: Point;
    priceDecimalsPos: Point;
    promoNamePos: Point;
    oldPricePos: Point;
    promoBarcodePos: Point;
    promoPriceSymbolPos: Point;
    promoPriceDecimalsPos: Point;
    customPreviewImage: string | null;
  };

export function createGridModelFromEditorState(
  state: LabelGridModelEditorState
): GridModel {
  const { editingModel, currentCategory, ...values } = state;

  return {
    id: editingModel?.id || `custom_${Date.now()}`,
    name: values.name.trim() || values.generatedName,
    columns: values.columns,
    rows: values.rows,
    marginT: values.marginT,
    marginB: values.marginB,
    marginL: values.marginL,
    marginR: values.marginR,
    gapH: values.gapH,
    gapV: values.gapV,
    paperSize: values.paperSize,
    paperWidth: values.paperSize === 'Custom' ? values.customWidth : undefined,
    paperHeight: values.paperSize === 'Custom' ? values.customHeight : undefined,
    icon: values.layoutType === 'round' ? 'bi-circle' : 'bi-grid-fill',
    category: editingModel?.category || currentCategory || 'identificacao',
    type: values.layoutType,
    nameFontSize: values.nameFontSize,
    nameColor: values.nameColor,
    nameBold: values.nameBold,
    nameAlign: values.nameAlign,
    nameVAlign: values.nameVAlign,
    priceFontSize: values.priceFontSize,
    priceColor: values.priceColor,
    priceBold: values.priceBold,
    priceAlign: values.priceAlign,
    priceVAlign: values.priceVAlign,
    promoFontSize: values.promoFontSize,
    promoColor: values.promoColor,
    promoPriceFontSize: values.promoPriceFontSize,
    promoPriceColor: values.promoPriceColor,
    promoPriceBold: values.promoPriceBold,
    promoPriceAlign: values.promoPriceAlign,
    promoPriceVAlign: values.promoPriceVAlign,
    oldPriceFontSize: values.oldPriceFontSize,
    oldPriceColor: values.oldPriceColor,
    oldPriceBold: values.oldPriceBold,
    oldPriceAlign: values.oldPriceAlign,
    oldPriceVAlign: values.oldPriceVAlign,
    namePosX: values.namePos.x,
    namePosY: values.namePos.y,
    pricePosX: values.pricePos.x,
    pricePosY: values.pricePos.y,
    promoPosX: values.promoPos.x,
    promoPosY: values.promoPos.y,
    barcodePosX: values.barcodePos.x,
    barcodePosY: values.barcodePos.y,
    dePricePorGroupPos: editingModel?.dePricePorGroupPos,
    dePricePorGroupRotation: editingModel?.dePricePorGroupRotation,
    dePricePorGroupGap: editingModel?.dePricePorGroupGap,
    nameWidth: values.nameWidth,
    nameHeight: values.nameHeight,
    priceWidth: values.priceWidth,
    priceHeight: values.priceHeight,
    promoWidth: values.promoWidth,
    promoHeight: values.promoHeight,
    priceFontSizeTens: values.priceFontSizeTens,
    priceFontSizeHundreds: values.priceFontSizeHundreds,
    priceFontSizeThousands: values.priceFontSizeThousands,
    priceFontSizeTenThousands: values.priceFontSizeTenThousands,
    bg_color: values.bg_color,
    nameBgColor: values.nameBgColor,
    priceBgColor: values.priceBgColor,
    promoBgColor: values.promoBgColor,
    priceFormat: values.priceFormat,
    priceSymbolFontSize: values.priceSymbolFontSize,
    priceSymbolColor: values.priceSymbolColor,
    priceSymbolBold: values.priceSymbolBold,
    priceSymbolPosX: values.priceSymbolPos.x,
    priceSymbolPosY: values.priceSymbolPos.y,
    priceDecimalsFontSize: values.priceDecimalsFontSize,
    priceDecimalsColor: values.priceDecimalsColor,
    priceDecimalsBold: values.priceDecimalsBold,
    priceDecimalsPosX: values.priceDecimalsPos.x,
    priceDecimalsPosY: values.priceDecimalsPos.y,
    promoNamePosX: values.promoNamePos.x,
    promoNamePosY: values.promoNamePos.y,
    promoNameFontSize: values.promoNameFontSize,
    promoNameAlign: values.promoNameAlign,
    promoNameVAlign: values.promoNameVAlign,
    promoNameColor: values.promoNameColor,
    promoNameBold: values.promoNameBold,
    promoNameWidth: values.promoNameWidth,
    promoNameHeight: values.promoNameHeight,
    promoNameBgColor: values.promoNameBgColor,
    oldPricePosX: values.oldPricePos.x,
    oldPricePosY: values.oldPricePos.y,
    oldPriceWidth: values.oldPriceWidth,
    oldPriceHeight: values.oldPriceHeight,
    promoBarcodePosX: values.promoBarcodePos.x,
    promoBarcodePosY: values.promoBarcodePos.y,
    extraFields: values.extraFields,
    extraFieldsPromo: values.extraFieldsPromo,
    fontFamily: values.fontFamily,
    promoPriceSymbolPosX: values.promoPriceSymbolPos.x,
    promoPriceSymbolPosY: values.promoPriceSymbolPos.y,
    promoPriceSymbolFontSize: values.promoPriceSymbolFontSize,
    promoPriceSymbolColor: values.promoPriceSymbolColor,
    promoPriceSymbolBold: values.promoPriceSymbolBold,
    promoPriceDecimalsPosX: values.promoPriceDecimalsPos.x,
    promoPriceDecimalsPosY: values.promoPriceDecimalsPos.y,
    promoPriceDecimalsFontSize: values.promoPriceDecimalsFontSize,
    promoPriceDecimalsColor: values.promoPriceDecimalsColor,
    promoPriceDecimalsBold: values.promoPriceDecimalsBold,
    imageScale: values.imageScale,
    previewImage: values.customPreviewImage,
  };
}
