import { useEffect } from 'react';
import type { GridModel } from '../../types/LabelGridModelTypes';
import type { LabelGridModelEditorState } from '../../services/labelGridModelFactory';
import { useLabelGridModelSessionState } from './useLabelGridModelSessionState';

export const PAPER_OPTIONS = [
  { id: 'A4', name: 'Folha A4 (210x297mm)', w: 210, h: 297 },
  { id: 'A3', name: 'Folha A3 (297x420mm)', w: 297, h: 420 },
  { id: 'A5', name: 'Folha A5 (148x210mm)', w: 148, h: 210 },
  { id: 'Letter', name: 'Carta (216x279mm)', w: 216, h: 279 },
  { id: 'Custom', name: 'Tamanho Personalizado', w: 0, h: 0 },
];

interface UseLabelGridModelSessionProps {
  isOpen: boolean;
  editingModel?: GridModel | null;
  currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
  currentType?: 'round' | 'rect';
  previewImage?: string | null;
}

export function useLabelGridModelSession({
  isOpen,
  editingModel,
  currentCategory,
  currentType,
  previewImage,
}: UseLabelGridModelSessionProps) {
  const { state, setters } = useLabelGridModelSessionState(currentType);

  // Sincronização inicial com o modelo ou reset
  useEffect(() => {
    if (isOpen) {
      if (editingModel) {
        setters.setName(editingModel.name || '');
        setters.setLayoutType(editingModel.type || 'rect');
        setters.setPaperSize(editingModel.paperSize);
        if (editingModel.paperWidth !== undefined) setters.setCustomWidth(editingModel.paperWidth);
        if (editingModel.paperHeight !== undefined) setters.setCustomHeight(editingModel.paperHeight);
        setters.setColumns(editingModel.columns);
        setters.setRows(editingModel.rows);
        setters.setMarginT(editingModel.marginT);
        setters.setMarginB(editingModel.marginB);
        setters.setMarginL(editingModel.marginL);
        setters.setMarginR(editingModel.marginR);
        setters.setGapH(editingModel.gapH);
        setters.setGapV(editingModel.gapV);
        if (editingModel.bg_color !== undefined) setters.setBgColor(editingModel.bg_color);
        if (editingModel.nameFontSize !== undefined) setters.setNameFontSize(editingModel.nameFontSize);
        if (editingModel.nameColor !== undefined) setters.setNameColor(editingModel.nameColor);
        if (editingModel.nameBold !== undefined) setters.setNameBold(editingModel.nameBold);
        if (editingModel.nameAlign !== undefined) setters.setNameAlign(editingModel.nameAlign);
        if (editingModel.nameVAlign !== undefined) setters.setNameVAlign(editingModel.nameVAlign);
        if (editingModel.priceFontSize !== undefined) setters.setPriceFontSize(editingModel.priceFontSize);
        if (editingModel.priceColor !== undefined) setters.setPriceColor(editingModel.priceColor);
        if (editingModel.priceBold !== undefined) setters.setPriceBold(editingModel.priceBold);
        if (editingModel.priceAlign !== undefined) setters.setPriceAlign(editingModel.priceAlign);
        if (editingModel.priceVAlign !== undefined) setters.setPriceVAlign(editingModel.priceVAlign);
        if (editingModel.promoPriceFontSize !== undefined) setters.setPromoPriceFontSize(editingModel.promoPriceFontSize);
        if (editingModel.promoPriceColor !== undefined) setters.setPromoPriceColor(editingModel.promoPriceColor);
        if (editingModel.promoPriceBold !== undefined) setters.setPromoPriceBold(editingModel.promoPriceBold);
        if (editingModel.promoPriceAlign !== undefined) setters.setPromoPriceAlign(editingModel.promoPriceAlign);
        if (editingModel.promoPriceVAlign !== undefined) setters.setPromoPriceVAlign(editingModel.promoPriceVAlign);

        if (editingModel.oldPriceColor !== undefined) setters.setOldPriceColor(editingModel.oldPriceColor);
        if (editingModel.oldPriceFontSize !== undefined) setters.setOldPriceFontSize(editingModel.oldPriceFontSize);
        if (editingModel.oldPriceBold !== undefined) setters.setOldPriceBold(editingModel.oldPriceBold);
        if (editingModel.oldPriceAlign !== undefined) setters.setOldPriceAlign(editingModel.oldPriceAlign);
        if (editingModel.oldPriceVAlign !== undefined) setters.setOldPriceVAlign(editingModel.oldPriceVAlign);
        if (editingModel.nameWidth !== undefined) setters.setNameWidth(editingModel.nameWidth);
        if (editingModel.nameHeight !== undefined) setters.setNameHeight(editingModel.nameHeight);
        if (editingModel.priceWidth !== undefined) setters.setPriceWidth(editingModel.priceWidth);
        if (editingModel.priceHeight !== undefined) setters.setPriceHeight(editingModel.priceHeight);
        if (editingModel.promoWidth !== undefined) setters.setPromoWidth(editingModel.promoWidth);
        if (editingModel.promoHeight !== undefined) setters.setPromoHeight(editingModel.promoHeight);
        if (editingModel.priceFontSizeTens !== undefined) setters.setPriceFontSizeTens(editingModel.priceFontSizeTens);
        if (editingModel.priceFontSizeHundreds !== undefined) setters.setPriceFontSizeHundreds(editingModel.priceFontSizeHundreds);
        if (editingModel.priceFontSizeThousands !== undefined) setters.setPriceFontSizeThousands(editingModel.priceFontSizeThousands);
        if (editingModel.priceFontSizeTenThousands !== undefined) setters.setPriceFontSizeTenThousands(editingModel.priceFontSizeTenThousands);
        if (editingModel.promoFontSize !== undefined) setters.setPromoFontSize(editingModel.promoFontSize);
        if (editingModel.promoColor) setters.setPromoColor(editingModel.promoColor);
        if (editingModel.bg_color) setters.setBgColor(editingModel.bg_color);
        if (editingModel.nameBgColor) setters.setNameBgColor(editingModel.nameBgColor);
        if (editingModel.priceBgColor) setters.setPriceBgColor(editingModel.priceBgColor);
        if (editingModel.promoBgColor) setters.setPromoBgColor(editingModel.promoBgColor);

        setters.setNamePos({ x: editingModel.namePosX ?? 50, y: editingModel.namePosY ?? 30 });
        setters.setPricePos({ x: editingModel.pricePosX ?? 50, y: editingModel.pricePosY ?? 60 });
        setters.setPromoPos({ x: editingModel.promoPosX ?? 50, y: editingModel.promoPosY ?? 75 });
        setters.setBarcodePos({ x: editingModel.barcodePosX ?? 50, y: editingModel.barcodePosY ?? 90 });

        setters.setPriceFormat(editingModel.priceFormat || 'split');
        if (editingModel.priceSymbolFontSize !== undefined) setters.setPriceSymbolFontSize(editingModel.priceSymbolFontSize);
        if (editingModel.priceSymbolColor) setters.setPriceSymbolColor(editingModel.priceSymbolColor);
        if (editingModel.priceSymbolBold !== undefined) setters.setPriceSymbolBold(editingModel.priceSymbolBold);
        setters.setPriceSymbolPos({
          x: editingModel.priceSymbolPosX ?? 35,
          y: editingModel.priceSymbolPosY ?? 55,
        });

        if (editingModel.priceDecimalsFontSize !== undefined) setters.setPriceDecimalsFontSize(editingModel.priceDecimalsFontSize);
        if (editingModel.priceDecimalsColor) setters.setPriceDecimalsColor(editingModel.priceDecimalsColor);
        if (editingModel.priceDecimalsBold !== undefined) setters.setPriceDecimalsBold(editingModel.priceDecimalsBold);
        setters.setPriceDecimalsPos({
          x: editingModel.priceDecimalsPosX ?? 65,
          y: editingModel.priceDecimalsPosY ?? 55,
        });

        // Carregar Estados Promocionais
        setters.setPromoNamePos({
          x: editingModel.promoNamePosX ?? 50,
          y: editingModel.promoNamePosY ?? 25,
        });
        if (editingModel.promoNameFontSize !== undefined) setters.setPromoNameFontSize(editingModel.promoNameFontSize);
        if (editingModel.promoNameAlign) setters.setPromoNameAlign(editingModel.promoNameAlign);
        if (editingModel.promoNameVAlign) setters.setPromoNameVAlign(editingModel.promoNameVAlign);
        if (editingModel.promoNameColor) setters.setPromoNameColor(editingModel.promoNameColor);
        if (editingModel.promoNameBold !== undefined) setters.setPromoNameBold(editingModel.promoNameBold);
        if (editingModel.promoNameWidth !== undefined) setters.setPromoNameWidth(editingModel.promoNameWidth);
        if (editingModel.promoNameHeight !== undefined) setters.setPromoNameHeight(editingModel.promoNameHeight);
        if (editingModel.promoNameBgColor) setters.setPromoNameBgColor(editingModel.promoNameBgColor);

        setters.setOldPricePos({ x: editingModel.oldPricePosX ?? 50, y: editingModel.oldPricePosY ?? 60 });
        if (editingModel.oldPriceWidth !== undefined) setters.setOldPriceWidth(editingModel.oldPriceWidth);
        if (editingModel.oldPriceHeight !== undefined) setters.setOldPriceHeight(editingModel.oldPriceHeight);
        if (editingModel.oldPriceFontSize !== undefined) setters.setOldPriceFontSize(editingModel.oldPriceFontSize);
        if (editingModel.oldPriceColor) setters.setOldPriceColor(editingModel.oldPriceColor);
        if (editingModel.oldPriceBold !== undefined) setters.setOldPriceBold(editingModel.oldPriceBold);
        if (editingModel.oldPriceAlign) setters.setOldPriceAlign(editingModel.oldPriceAlign);
        if (editingModel.oldPriceVAlign) setters.setOldPriceVAlign(editingModel.oldPriceVAlign);

        setters.setPromoBarcodePos({
          x: editingModel.promoBarcodePosX ?? 50,
          y: editingModel.promoBarcodePosY ?? 85,
        });
        if (editingModel.extraFields) setters.setExtraFields(editingModel.extraFields);
        if (editingModel.extraFieldsPromo) setters.setExtraFieldsPromo(editingModel.extraFieldsPromo);
        if (editingModel.fontFamily) setters.setFontFamily(editingModel.fontFamily);
        if (editingModel.priceFormat) setters.setPriceFormat(editingModel.priceFormat);

        if (editingModel.imageScale !== undefined) setters.setImageScale(editingModel.imageScale);
        if (editingModel.previewImage) setters.setCustomPreviewImage(editingModel.previewImage);

        // Carregar Split Price Promoção
        if (editingModel.promoPriceSymbolPosX !== undefined) {
          setters.setPromoPriceSymbolPos({
            x: editingModel.promoPriceSymbolPosX,
            y: editingModel.promoPriceSymbolPosY ?? 70,
          });
        }
        if (editingModel.promoPriceSymbolFontSize !== undefined) {
          setters.setPromoPriceSymbolFontSize(editingModel.promoPriceSymbolFontSize);
        }
        if (editingModel.promoPriceSymbolColor) {
          setters.setPromoPriceSymbolColor(editingModel.promoPriceSymbolColor);
        }
        if (editingModel.promoPriceSymbolBold !== undefined) {
          setters.setPromoPriceSymbolBold(editingModel.promoPriceSymbolBold);
        }

        if (editingModel.promoPriceDecimalsPosX !== undefined) {
          setters.setPromoPriceDecimalsPos({
            x: editingModel.promoPriceDecimalsPosX,
            y: editingModel.promoPriceDecimalsPosY ?? 70,
          });
        }
        if (editingModel.promoPriceDecimalsFontSize !== undefined) {
          setters.setPromoPriceDecimalsFontSize(editingModel.promoPriceDecimalsFontSize);
        }
        if (editingModel.promoPriceDecimalsColor) {
          setters.setPromoPriceDecimalsColor(editingModel.promoPriceDecimalsColor);
        }
        if (editingModel.promoPriceDecimalsBold !== undefined) {
          setters.setPromoPriceDecimalsBold(editingModel.promoPriceDecimalsBold);
        }
      } else {
        setters.setLayoutType(currentType || 'rect');
        setters.setName('');
        setters.setPaperSize('A4');
        setters.setColumns(3);
        setters.setRows(7);
        setters.setMarginT(10);
        setters.setMarginB(10);
        setters.setMarginL(10);
        setters.setMarginR(10);
        setters.setGapH(2);
        setters.setGapV(2);
        setters.setBgColor('#ffffff');
        setters.setNamePos({ x: 50, y: 30 });
        setters.setPricePos({ x: 50, y: 60 });
        setters.setPromoPos({ x: 50, y: 75 });
        setters.setBarcodePos({ x: 50, y: 90 });
        setters.setExtraFields([]);
        setters.setExtraFieldsPromo([]);
        if (currentCategory === 'precos') {
          setters.setExtraFields([
            {
              id: 'extra_default',
              text: 'DESCRIÇÃO EXTRA',
              x: 50,
              y: 45,
              size: 8,
              color: '#64748b',
              bold: false,
              align: 'center',
              width: 60,
              height: 10,
              bgColor: 'transparent',
            },
          ]);
        }
      }
    }
  }, [isOpen, editingModel, currentType, currentCategory, setters]);

  const formatLabel = state.layoutType === 'round' ? 'Redonda' : 'Retangular';
  const generatedName =
    currentCategory === 'logos'
      ? `${state.columns * state.rows} Etiquetas (${formatLabel}) (${state.columns}x${state.rows})`
      : `${state.columns * state.rows} ${state.columns * state.rows === 1 ? 'Etiqueta' : 'Etiquetas'} (${state.columns}x${state.rows})`;

  const selectedPaper = PAPER_OPTIONS.find((option) => option.id === state.paperSize) || PAPER_OPTIONS[0];
  const effectivePreviewImage = state.customPreviewImage || previewImage || null;

  const buildEditorState = (): LabelGridModelEditorState => ({
    editingModel,
    name: state.name,
    generatedName,
    currentCategory,
    columns: state.columns,
    rows: state.rows,
    marginT: state.marginT,
    marginB: state.marginB,
    marginL: state.marginL,
    marginR: state.marginR,
    gapH: state.gapH,
    gapV: state.gapV,
    paperSize: state.paperSize,
    customWidth: state.customWidth,
    customHeight: state.customHeight,
    layoutType: state.layoutType,
    nameFontSize: state.nameFontSize,
    nameColor: state.nameColor,
    nameBold: state.nameBold,
    nameAlign: state.nameAlign,
    nameVAlign: state.nameVAlign,
    priceFontSize: state.priceFontSize,
    priceColor: state.priceColor,
    priceBold: state.priceBold,
    priceAlign: state.priceAlign,
    priceVAlign: state.priceVAlign,
    promoFontSize: state.promoFontSize,
    promoColor: state.promoColor,
    promoPriceFontSize: state.promoPriceFontSize,
    promoPriceColor: state.promoPriceColor,
    promoPriceBold: state.promoPriceBold,
    promoPriceAlign: state.promoPriceAlign,
    promoPriceVAlign: state.promoPriceVAlign,
    oldPriceFontSize: state.oldPriceFontSize,
    oldPriceColor: state.oldPriceColor,
    oldPriceBold: state.oldPriceBold,
    oldPriceAlign: state.oldPriceAlign,
    oldPriceVAlign: state.oldPriceVAlign,
    namePos: state.namePos,
    pricePos: state.pricePos,
    promoPos: state.promoPos,
    barcodePos: state.barcodePos,
    nameWidth: state.nameWidth,
    nameHeight: state.nameHeight,
    priceWidth: state.priceWidth,
    priceHeight: state.priceHeight,
    promoWidth: state.promoWidth,
    promoHeight: state.promoHeight,
    priceFontSizeTens: state.priceFontSizeTens,
    priceFontSizeHundreds: state.priceFontSizeHundreds,
    priceFontSizeThousands: state.priceFontSizeThousands,
    priceFontSizeTenThousands: state.priceFontSizeTenThousands,
    bg_color: state.bgColor,
    nameBgColor: state.nameBgColor,
    priceBgColor: state.priceBgColor,
    promoBgColor: state.promoBgColor,
    priceFormat: state.priceFormat,
    priceSymbolFontSize: state.priceSymbolFontSize,
    priceSymbolColor: state.priceSymbolColor,
    priceSymbolBold: state.priceSymbolBold,
    priceSymbolPos: state.priceSymbolPos,
    priceDecimalsFontSize: state.priceDecimalsFontSize,
    priceDecimalsColor: state.priceDecimalsColor,
    priceDecimalsBold: state.priceDecimalsBold,
    priceDecimalsPos: state.priceDecimalsPos,
    promoNamePos: state.promoNamePos,
    promoNameFontSize: state.promoNameFontSize,
    promoNameAlign: state.promoNameAlign,
    promoNameVAlign: state.promoNameVAlign,
    promoNameColor: state.promoNameColor,
    promoNameBold: state.promoNameBold,
    promoNameWidth: state.promoNameWidth,
    promoNameHeight: state.promoNameHeight,
    promoNameBgColor: state.promoNameBgColor,
    oldPricePos: state.oldPricePos,
    oldPriceWidth: state.oldPriceWidth,
    oldPriceHeight: state.oldPriceHeight,
    promoBarcodePos: state.promoBarcodePos,
    extraFields: state.extraFields,
    extraFieldsPromo: state.extraFieldsPromo,
    fontFamily: state.fontFamily,
    promoPriceSymbolPos: state.promoPriceSymbolPos,
    promoPriceSymbolFontSize: state.promoPriceSymbolFontSize,
    promoPriceSymbolColor: state.promoPriceSymbolColor,
    promoPriceSymbolBold: state.promoPriceSymbolBold,
    promoPriceDecimalsPos: state.promoPriceDecimalsPos,
    promoPriceDecimalsFontSize: state.promoPriceDecimalsFontSize,
    promoPriceDecimalsColor: state.promoPriceDecimalsColor,
    promoPriceDecimalsBold: state.promoPriceDecimalsBold,
    imageScale: state.imageScale,
    customPreviewImage: state.customPreviewImage,
  });

  return { ...state, generatedName, selectedPaper, effectivePreviewImage, buildEditorState };
}
