import { useState, useEffect } from 'react';
import type { GridModel } from '../../types/LabelGridModelTypes';
import type { LabelGridModelEditorState } from '../../services/labelGridModelFactory';

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
  const [name, setName] = useState('');
  const [paperSize, setPaperSize] = useState('A4');
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(7);
  const [marginT, setMarginT] = useState(10);
  const [marginB, setMarginB] = useState(10);
  const [marginL, setMarginL] = useState(10);
  const [marginR, setMarginR] = useState(10);
  const [gapH, setGapH] = useState(2);
  const [gapV, setGapV] = useState(2);
  const [layoutType, setLayoutType] = useState<'round' | 'rect'>(currentType || 'rect');

  const [imageScale, setImageScale] = useState(1);
  const [customPreviewImage, setCustomPreviewImage] = useState<string | null>(null);

  // Tipografia do Nome
  const [nameFontSize, setNameFontSize] = useState(7);
  const [nameColor, setNameColor] = useState('#1e293b');
  const [nameBold, setNameBold] = useState(true);
  const [nameAlign, setNameAlign] = useState<'left' | 'center' | 'right'>('center');
  const [nameVAlign, setNameVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [namePos, setNamePos] = useState({ x: 50, y: 30 });
  const [nameWidth, setNameWidth] = useState(80);
  const [nameHeight, setNameHeight] = useState(20);
  const [nameBgColor, setNameBgColor] = useState('transparent');

  // Tipografia Normal (Preço)
  const [priceFontSize, setPriceFontSize] = useState(11);
  const [priceColor, setPriceColor] = useState('#1e293b');
  const [priceBold, setPriceBold] = useState(true);
  const [priceAlign, setPriceAlign] = useState<'left' | 'center' | 'right'>('center');
  const [priceVAlign, setPriceVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [pricePos, setPricePos] = useState({ x: 50, y: 60 });
  const [priceWidth, setPriceWidth] = useState(80);
  const [priceHeight, setPriceHeight] = useState(30);
  const [priceBgColor, setPriceBgColor] = useState('transparent');

  // Preço Promocional
  const [promoPriceFontSize, setPromoPriceFontSize] = useState(24);
  const [promoPriceColor, setPromoPriceColor] = useState('#2563eb');
  const [promoPriceBold, setPromoPriceBold] = useState(true);
  const [promoPriceAlign, setPromoPriceAlign] = useState<'left' | 'center' | 'right'>('center');
  const [promoPriceVAlign, setPromoPriceVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [promoPos, setPromoPos] = useState({ x: 50, y: 75 });
  const [promoWidth, setPromoWidth] = useState(80);
  const [promoHeight, setPromoHeight] = useState(40);
  const [promoBgColor, setPromoBgColor] = useState('transparent');
  const [promoFontSize, setPromoFontSize] = useState(9);
  const [promoColor, setPromoColor] = useState('#dc2626');

  // Preço Antigo
  const [oldPriceFontSize, setOldPriceFontSize] = useState(7);
  const [oldPriceColor, setOldPriceColor] = useState('#94a3b8');
  const [oldPriceBold, setOldPriceBold] = useState(false);
  const [oldPriceAlign, setOldPriceAlign] = useState<'left' | 'center' | 'right'>('center');
  const [oldPriceVAlign, setOldPriceVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [oldPricePos, setOldPricePos] = useState({ x: 50, y: 60 });
  const [oldPriceWidth, setOldPriceWidth] = useState(80);
  const [oldPriceHeight, setOldPriceHeight] = useState(30);

  // Código de Barras
  const [barcodePos, setBarcodePos] = useState({ x: 50, y: 90 });
  const [promoBarcodePos, setPromoBarcodePos] = useState({ x: 50, y: 85 });

  // Nome Promocional
  const [promoNamePos, setPromoNamePos] = useState({ x: 50, y: 25 });
  const [promoNameFontSize, setPromoNameFontSize] = useState(9);
  const [promoNameAlign, setPromoNameAlign] = useState<'left' | 'center' | 'right'>('center');
  const [promoNameVAlign, setPromoNameVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [promoNameColor, setPromoNameColor] = useState('#1e293b');
  const [promoNameBold, setPromoNameBold] = useState(false);
  const [promoNameWidth, setPromoNameWidth] = useState(80);
  const [promoNameHeight, setPromoNameHeight] = useState(20);
  const [promoNameBgColor, setPromoNameBgColor] = useState('transparent');

  // Background Geral
  const [bgColor, setBgColor] = useState('#ffffff');

  // Multi-escala de fontes
  const [priceFontSizeTens, setPriceFontSizeTens] = useState<number | undefined>(undefined);
  const [priceFontSizeHundreds, setPriceFontSizeHundreds] = useState<number | undefined>(undefined);
  const [priceFontSizeThousands, setPriceFontSizeThousands] = useState<number | undefined>(undefined);
  const [priceFontSizeTenThousands, setPriceFontSizeTenThousands] = useState<number | undefined>(undefined);

  // Formato do Preço e Tipografia Geral
  const [priceFormat, setPriceFormat] = useState<'standard' | 'split'>('split');
  const [fontFamily, setFontFamily] = useState('Inter');

  // Preço Dividido (Normal)
  const [priceSymbolFontSize, setPriceSymbolFontSize] = useState(8);
  const [priceSymbolColor, setPriceSymbolColor] = useState('#1e293b');
  const [priceSymbolBold, setPriceSymbolBold] = useState(true);
  const [priceSymbolPos, setPriceSymbolPos] = useState({ x: 35, y: 55 });

  const [priceDecimalsFontSize, setPriceDecimalsFontSize] = useState(8);
  const [priceDecimalsColor, setPriceDecimalsColor] = useState('#1e293b');
  const [priceDecimalsBold, setPriceDecimalsBold] = useState(true);
  const [priceDecimalsPos, setPriceDecimalsPos] = useState({ x: 65, y: 55 });

  // Preço Dividido (Promoção)
  const [promoPriceSymbolFontSize, setPromoPriceSymbolFontSize] = useState(12);
  const [promoPriceSymbolColor, setPromoPriceSymbolColor] = useState('#2563eb');
  const [promoPriceSymbolBold, setPromoPriceSymbolBold] = useState(true);
  const [promoPriceSymbolPos, setPromoPriceSymbolPos] = useState({ x: 35, y: 70 });

  const [promoPriceDecimalsFontSize, setPromoPriceDecimalsFontSize] = useState(12);
  const [promoPriceDecimalsColor, setPromoPriceDecimalsColor] = useState('#2563eb');
  const [promoPriceDecimalsBold, setPromoPriceDecimalsBold] = useState(true);
  const [promoPriceDecimalsPos, setPromoPriceDecimalsPos] = useState({ x: 65, y: 70 });

  // Campos Extras
  const [extraFields, setExtraFields] = useState<any[]>([]);
  const [extraFieldsPromo, setExtraFieldsPromo] = useState<any[]>([]);

  // Sincronização inicial com o modelo ou reset
  useEffect(() => {
    if (isOpen) {
      if (editingModel) {
        setName(editingModel.name || '');
        setLayoutType(editingModel.type || 'rect');
        setPaperSize(editingModel.paperSize);
        if (editingModel.paperWidth !== undefined) setCustomWidth(editingModel.paperWidth);
        if (editingModel.paperHeight !== undefined) setCustomHeight(editingModel.paperHeight);
        setColumns(editingModel.columns);
        setRows(editingModel.rows);
        setMarginT(editingModel.marginT);
        setMarginB(editingModel.marginB);
        setMarginL(editingModel.marginL);
        setMarginR(editingModel.marginR);
        setGapH(editingModel.gapH);
        setGapV(editingModel.gapV);
        if (editingModel.bg_color !== undefined) setBgColor(editingModel.bg_color);
        if (editingModel.nameFontSize !== undefined) setNameFontSize(editingModel.nameFontSize);
        if (editingModel.nameColor !== undefined) setNameColor(editingModel.nameColor);
        if (editingModel.nameBold !== undefined) setNameBold(editingModel.nameBold);
        if (editingModel.nameAlign !== undefined) setNameAlign(editingModel.nameAlign);
        if (editingModel.nameVAlign !== undefined) setNameVAlign(editingModel.nameVAlign);
        if (editingModel.priceFontSize !== undefined) setPriceFontSize(editingModel.priceFontSize);
        if (editingModel.priceColor !== undefined) setPriceColor(editingModel.priceColor);
        if (editingModel.priceBold !== undefined) setPriceBold(editingModel.priceBold);
        if (editingModel.priceAlign !== undefined) setPriceAlign(editingModel.priceAlign);
        if (editingModel.priceVAlign !== undefined) setPriceVAlign(editingModel.priceVAlign);
        if (editingModel.promoPriceFontSize !== undefined) setPromoPriceFontSize(editingModel.promoPriceFontSize);
        if (editingModel.promoPriceColor !== undefined) setPromoPriceColor(editingModel.promoPriceColor);
        if (editingModel.promoPriceBold !== undefined) setPromoPriceBold(editingModel.promoPriceBold);
        if (editingModel.promoPriceAlign !== undefined) setPromoPriceAlign(editingModel.promoPriceAlign);
        if (editingModel.promoPriceVAlign !== undefined) setPromoPriceVAlign(editingModel.promoPriceVAlign);

        if (editingModel.oldPriceColor !== undefined) setOldPriceColor(editingModel.oldPriceColor);
        if (editingModel.oldPriceFontSize !== undefined) setOldPriceFontSize(editingModel.oldPriceFontSize);
        if (editingModel.oldPriceBold !== undefined) setOldPriceBold(editingModel.oldPriceBold);
        if (editingModel.oldPriceAlign !== undefined) setOldPriceAlign(editingModel.oldPriceAlign);
        if (editingModel.oldPriceVAlign !== undefined) setOldPriceVAlign(editingModel.oldPriceVAlign);
        if (editingModel.nameWidth !== undefined) setNameWidth(editingModel.nameWidth);
        if (editingModel.nameHeight !== undefined) setNameHeight(editingModel.nameHeight);
        if (editingModel.priceWidth !== undefined) setPriceWidth(editingModel.priceWidth);
        if (editingModel.priceHeight !== undefined) setPriceHeight(editingModel.priceHeight);
        if (editingModel.promoWidth !== undefined) setPromoWidth(editingModel.promoWidth);
        if (editingModel.promoHeight !== undefined) setPromoHeight(editingModel.promoHeight);
        if (editingModel.priceFontSizeTens !== undefined) setPriceFontSizeTens(editingModel.priceFontSizeTens);
        if (editingModel.priceFontSizeHundreds !== undefined) setPriceFontSizeHundreds(editingModel.priceFontSizeHundreds);
        if (editingModel.priceFontSizeThousands !== undefined) setPriceFontSizeThousands(editingModel.priceFontSizeThousands);
        if (editingModel.priceFontSizeTenThousands !== undefined) setPriceFontSizeTenThousands(editingModel.priceFontSizeTenThousands);
        if (editingModel.promoFontSize !== undefined) setPromoFontSize(editingModel.promoFontSize);
        if (editingModel.promoColor) setPromoColor(editingModel.promoColor);
        if (editingModel.bg_color) setBgColor(editingModel.bg_color);
        if (editingModel.nameBgColor) setNameBgColor(editingModel.nameBgColor);
        if (editingModel.priceBgColor) setPriceBgColor(editingModel.priceBgColor);
        if (editingModel.promoBgColor) setPromoBgColor(editingModel.promoBgColor);

        setNamePos({ x: editingModel.namePosX ?? 50, y: editingModel.namePosY ?? 30 });
        setPricePos({ x: editingModel.pricePosX ?? 50, y: editingModel.pricePosY ?? 60 });
        setPromoPos({ x: editingModel.promoPosX ?? 50, y: editingModel.promoPosY ?? 75 });
        setBarcodePos({ x: editingModel.barcodePosX ?? 50, y: editingModel.barcodePosY ?? 90 });

        setPriceFormat(editingModel.priceFormat || 'split');
        if (editingModel.priceSymbolFontSize !== undefined) setPriceSymbolFontSize(editingModel.priceSymbolFontSize);
        if (editingModel.priceSymbolColor) setPriceSymbolColor(editingModel.priceSymbolColor);
        if (editingModel.priceSymbolBold !== undefined) setPriceSymbolBold(editingModel.priceSymbolBold);
        setPriceSymbolPos({
          x: editingModel.priceSymbolPosX ?? 35,
          y: editingModel.priceSymbolPosY ?? 55,
        });

        if (editingModel.priceDecimalsFontSize !== undefined) setPriceDecimalsFontSize(editingModel.priceDecimalsFontSize);
        if (editingModel.priceDecimalsColor) setPriceDecimalsColor(editingModel.priceDecimalsColor);
        if (editingModel.priceDecimalsBold !== undefined) setPriceDecimalsBold(editingModel.priceDecimalsBold);
        setPriceDecimalsPos({
          x: editingModel.priceDecimalsPosX ?? 65,
          y: editingModel.priceDecimalsPosY ?? 55,
        });

        // Carregar Estados Promocionais
        setPromoNamePos({
          x: editingModel.promoNamePosX ?? 50,
          y: editingModel.promoNamePosY ?? 25,
        });
        if (editingModel.promoNameFontSize !== undefined) setPromoNameFontSize(editingModel.promoNameFontSize);
        if (editingModel.promoNameAlign) setPromoNameAlign(editingModel.promoNameAlign);
        if (editingModel.promoNameVAlign) setPromoNameVAlign(editingModel.promoNameVAlign);
        if (editingModel.promoNameColor) setPromoNameColor(editingModel.promoNameColor);
        if (editingModel.promoNameBold !== undefined) setPromoNameBold(editingModel.promoNameBold);
        if (editingModel.promoNameWidth !== undefined) setPromoNameWidth(editingModel.promoNameWidth);
        if (editingModel.promoNameHeight !== undefined) setPromoNameHeight(editingModel.promoNameHeight);
        if (editingModel.promoNameBgColor) setPromoNameBgColor(editingModel.promoNameBgColor);

        setOldPricePos({ x: editingModel.oldPricePosX ?? 50, y: editingModel.oldPricePosY ?? 60 });
        if (editingModel.oldPriceWidth !== undefined) setOldPriceWidth(editingModel.oldPriceWidth);
        if (editingModel.oldPriceHeight !== undefined) setOldPriceHeight(editingModel.oldPriceHeight);
        if (editingModel.oldPriceFontSize !== undefined) setOldPriceFontSize(editingModel.oldPriceFontSize);
        if (editingModel.oldPriceColor) setOldPriceColor(editingModel.oldPriceColor);
        if (editingModel.oldPriceBold !== undefined) setOldPriceBold(editingModel.oldPriceBold);
        if (editingModel.oldPriceAlign) setOldPriceAlign(editingModel.oldPriceAlign);
        if (editingModel.oldPriceVAlign) setOldPriceVAlign(editingModel.oldPriceVAlign);

        setPromoBarcodePos({
          x: editingModel.promoBarcodePosX ?? 50,
          y: editingModel.promoBarcodePosY ?? 85,
        });
        if (editingModel.extraFields) setExtraFields(editingModel.extraFields);
        if (editingModel.extraFieldsPromo) setExtraFieldsPromo(editingModel.extraFieldsPromo);
        if (editingModel.fontFamily) setFontFamily(editingModel.fontFamily);
        if (editingModel.priceFormat) setPriceFormat(editingModel.priceFormat);

        if (editingModel.imageScale !== undefined) setImageScale(editingModel.imageScale);
        if (editingModel.previewImage) setCustomPreviewImage(editingModel.previewImage);

        // Carregar Split Price Promoção
        if (editingModel.promoPriceSymbolPosX !== undefined) {
          setPromoPriceSymbolPos({
            x: editingModel.promoPriceSymbolPosX,
            y: editingModel.promoPriceSymbolPosY ?? 70,
          });
        }
        if (editingModel.promoPriceSymbolFontSize !== undefined) {
          setPromoPriceSymbolFontSize(editingModel.promoPriceSymbolFontSize);
        }
        if (editingModel.promoPriceSymbolColor) {
          setPromoPriceSymbolColor(editingModel.promoPriceSymbolColor);
        }
        if (editingModel.promoPriceSymbolBold !== undefined) {
          setPromoPriceSymbolBold(editingModel.promoPriceSymbolBold);
        }

        if (editingModel.promoPriceDecimalsPosX !== undefined) {
          setPromoPriceDecimalsPos({
            x: editingModel.promoPriceDecimalsPosX,
            y: editingModel.promoPriceDecimalsPosY ?? 70,
          });
        }
        if (editingModel.promoPriceDecimalsFontSize !== undefined) {
          setPromoPriceDecimalsFontSize(editingModel.promoPriceDecimalsFontSize);
        }
        if (editingModel.promoPriceDecimalsColor) {
          setPromoPriceDecimalsColor(editingModel.promoPriceDecimalsColor);
        }
        if (editingModel.promoPriceDecimalsBold !== undefined) {
          setPromoPriceDecimalsBold(editingModel.promoPriceDecimalsBold);
        }
      } else {
        setLayoutType(currentType || 'rect');
        setName('');
        setPaperSize('A4');
        setColumns(3);
        setRows(7);
        setMarginT(10);
        setMarginB(10);
        setMarginL(10);
        setMarginR(10);
        setGapH(2);
        setGapV(2);
        setBgColor('#ffffff');
        setNamePos({ x: 50, y: 30 });
        setPricePos({ x: 50, y: 60 });
        setPromoPos({ x: 50, y: 75 });
        setBarcodePos({ x: 50, y: 90 });
        setExtraFields([]);
        setExtraFieldsPromo([]);
        if (currentCategory === 'precos') {
          setExtraFields([
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
  }, [isOpen, editingModel, currentType, currentCategory]);

  const formatLabel = layoutType === 'round' ? 'Redonda' : 'Retangular';
  const generatedName =
    currentCategory === 'logos'
      ? `${columns * rows} Etiquetas (${formatLabel}) (${columns}x${rows})`
      : `${columns * rows} ${columns * rows === 1 ? 'Etiqueta' : 'Etiquetas'} (${columns}x${rows})`;

  const selectedPaper = PAPER_OPTIONS.find((option) => option.id === paperSize) || PAPER_OPTIONS[0];
  const effectivePreviewImage = customPreviewImage || previewImage || null;

  const buildEditorState = (): LabelGridModelEditorState => ({
    editingModel,
    name,
    generatedName,
    currentCategory,
    columns,
    rows,
    marginT,
    marginB,
    marginL,
    marginR,
    gapH,
    gapV,
    paperSize,
    customWidth,
    customHeight,
    layoutType,
    nameFontSize,
    nameColor,
    nameBold,
    nameAlign,
    nameVAlign,
    priceFontSize,
    priceColor,
    priceBold,
    priceAlign,
    priceVAlign,
    promoFontSize,
    promoColor,
    promoPriceFontSize,
    promoPriceColor,
    promoPriceBold,
    promoPriceAlign,
    promoPriceVAlign,
    oldPriceFontSize,
    oldPriceColor,
    oldPriceBold,
    oldPriceAlign,
    oldPriceVAlign,
    namePos,
    pricePos,
    promoPos,
    barcodePos,
    nameWidth,
    nameHeight,
    priceWidth,
    priceHeight,
    promoWidth,
    promoHeight,
    priceFontSizeTens,
    priceFontSizeHundreds,
    priceFontSizeThousands,
    priceFontSizeTenThousands,
    bg_color: bgColor,
    nameBgColor,
    priceBgColor,
    promoBgColor,
    priceFormat,
    priceSymbolFontSize,
    priceSymbolColor,
    priceSymbolBold,
    priceSymbolPos,
    priceDecimalsFontSize,
    priceDecimalsColor,
    priceDecimalsBold,
    priceDecimalsPos,
    promoNamePos,
    promoNameFontSize,
    promoNameAlign,
    promoNameVAlign,
    promoNameColor,
    promoNameBold,
    promoNameWidth,
    promoNameHeight,
    promoNameBgColor,
    oldPricePos,
    oldPriceWidth,
    oldPriceHeight,
    promoBarcodePos,
    extraFields,
    extraFieldsPromo,
    fontFamily,
    promoPriceSymbolPos,
    promoPriceSymbolFontSize,
    promoPriceSymbolColor,
    promoPriceSymbolBold,
    promoPriceDecimalsPos,
    promoPriceDecimalsFontSize,
    promoPriceDecimalsColor,
    promoPriceDecimalsBold,
    imageScale,
    customPreviewImage,
  });

  return {
    name,
    setName,
    paperSize,
    setPaperSize,
    customWidth,
    setCustomWidth,
    customHeight,
    setCustomHeight,
    columns,
    setColumns,
    rows,
    setRows,
    marginT,
    setMarginT,
    marginB,
    setMarginB,
    marginL,
    setMarginL,
    marginR,
    setMarginR,
    gapH,
    setGapH,
    gapV,
    setGapV,
    layoutType,
    setLayoutType,
    imageScale,
    setImageScale,
    customPreviewImage,
    setCustomPreviewImage,
    nameFontSize,
    setNameFontSize,
    nameColor,
    setNameColor,
    nameBold,
    setNameBold,
    nameAlign,
    setNameAlign,
    nameVAlign,
    setNameVAlign,
    namePos,
    setNamePos,
    nameWidth,
    setNameWidth,
    nameHeight,
    setNameHeight,
    nameBgColor,
    setNameBgColor,
    priceFontSize,
    setPriceFontSize,
    priceColor,
    setPriceColor,
    priceBold,
    setPriceBold,
    priceAlign,
    setPriceAlign,
    priceVAlign,
    setPriceVAlign,
    pricePos,
    setPricePos,
    priceWidth,
    setPriceWidth,
    priceHeight,
    setPriceHeight,
    priceBgColor,
    setPriceBgColor,
    promoPriceFontSize,
    setPromoPriceFontSize,
    promoPriceColor,
    setPromoPriceColor,
    promoPriceBold,
    setPromoPriceBold,
    promoPriceAlign,
    setPromoPriceAlign,
    promoPriceVAlign,
    setPromoPriceVAlign,
    promoPos,
    setPromoPos,
    promoWidth,
    setPromoWidth,
    promoHeight,
    setPromoHeight,
    promoBgColor,
    setPromoBgColor,
    promoFontSize,
    setPromoFontSize,
    promoColor,
    setPromoColor,
    oldPriceFontSize,
    setOldPriceFontSize,
    oldPriceColor,
    setOldPriceColor,
    oldPriceBold,
    setOldPriceBold,
    oldPriceAlign,
    setOldPriceAlign,
    oldPriceVAlign,
    setOldPriceVAlign,
    oldPricePos,
    setOldPricePos,
    oldPriceWidth,
    setOldPriceWidth,
    oldPriceHeight,
    setOldPriceHeight,
    barcodePos,
    setBarcodePos,
    promoBarcodePos,
    setPromoBarcodePos,
    promoNamePos,
    setPromoNamePos,
    promoNameFontSize,
    setPromoNameFontSize,
    promoNameAlign,
    setPromoNameAlign,
    promoNameVAlign,
    setPromoNameVAlign,
    promoNameColor,
    setPromoNameColor,
    promoNameBold,
    setPromoNameBold,
    promoNameWidth,
    setPromoNameWidth,
    promoNameHeight,
    setPromoNameHeight,
    promoNameBgColor,
    setPromoNameBgColor,
    bgColor,
    setBgColor,
    priceFontSizeTens,
    setPriceFontSizeTens,
    priceFontSizeHundreds,
    setPriceFontSizeHundreds,
    priceFontSizeThousands,
    setPriceFontSizeThousands,
    priceFontSizeTenThousands,
    setPriceFontSizeTenThousands,
    priceFormat,
    setPriceFormat,
    fontFamily,
    setFontFamily,
    priceSymbolFontSize,
    setPriceSymbolFontSize,
    priceSymbolColor,
    setPriceSymbolColor,
    priceSymbolBold,
    setPriceSymbolBold,
    priceSymbolPos,
    setPriceSymbolPos,
    priceDecimalsFontSize,
    setPriceDecimalsFontSize,
    priceDecimalsColor,
    setPriceDecimalsColor,
    priceDecimalsBold,
    setPriceDecimalsBold,
    priceDecimalsPos,
    setPriceDecimalsPos,
    promoPriceSymbolFontSize,
    setPromoPriceSymbolFontSize,
    promoPriceSymbolColor,
    setPromoPriceSymbolColor,
    promoPriceSymbolBold,
    setPromoPriceSymbolBold,
    promoPriceSymbolPos,
    setPromoPriceSymbolPos,
    promoPriceDecimalsFontSize,
    setPromoPriceDecimalsFontSize,
    promoPriceDecimalsColor,
    setPromoPriceDecimalsColor,
    promoPriceDecimalsBold,
    setPromoPriceDecimalsBold,
    promoPriceDecimalsPos,
    setPromoPriceDecimalsPos,
    extraFields,
    setExtraFields,
    extraFieldsPromo,
    setExtraFieldsPromo,
    generatedName,
    selectedPaper,
    effectivePreviewImage,
    buildEditorState,
  };
}
