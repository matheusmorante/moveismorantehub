import { useMemo, useState } from 'react';

export function useLabelGridModelSessionState(currentType?: 'round' | 'rect') {
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

  const setters = useMemo(
    () => ({
      setName,
      setPaperSize,
      setCustomWidth,
      setCustomHeight,
      setColumns,
      setRows,
      setMarginT,
      setMarginB,
      setMarginL,
      setMarginR,
      setGapH,
      setGapV,
      setLayoutType,
      setImageScale,
      setCustomPreviewImage,
      setNameFontSize,
      setNameColor,
      setNameBold,
      setNameAlign,
      setNameVAlign,
      setNamePos,
      setNameWidth,
      setNameHeight,
      setNameBgColor,
      setPriceFontSize,
      setPriceColor,
      setPriceBold,
      setPriceAlign,
      setPriceVAlign,
      setPricePos,
      setPriceWidth,
      setPriceHeight,
      setPriceBgColor,
      setPromoPriceFontSize,
      setPromoPriceColor,
      setPromoPriceBold,
      setPromoPriceAlign,
      setPromoPriceVAlign,
      setPromoPos,
      setPromoWidth,
      setPromoHeight,
      setPromoBgColor,
      setPromoFontSize,
      setPromoColor,
      setOldPriceFontSize,
      setOldPriceColor,
      setOldPriceBold,
      setOldPriceAlign,
      setOldPriceVAlign,
      setOldPricePos,
      setOldPriceWidth,
      setOldPriceHeight,
      setBarcodePos,
      setPromoBarcodePos,
      setPromoNamePos,
      setPromoNameFontSize,
      setPromoNameAlign,
      setPromoNameVAlign,
      setPromoNameColor,
      setPromoNameBold,
      setPromoNameWidth,
      setPromoNameHeight,
      setPromoNameBgColor,
      setBgColor,
      setPriceFontSizeTens,
      setPriceFontSizeHundreds,
      setPriceFontSizeThousands,
      setPriceFontSizeTenThousands,
      setPriceFormat,
      setFontFamily,
      setPriceSymbolFontSize,
      setPriceSymbolColor,
      setPriceSymbolBold,
      setPriceSymbolPos,
      setPriceDecimalsFontSize,
      setPriceDecimalsColor,
      setPriceDecimalsBold,
      setPriceDecimalsPos,
      setPromoPriceSymbolFontSize,
      setPromoPriceSymbolColor,
      setPromoPriceSymbolBold,
      setPromoPriceSymbolPos,
      setPromoPriceDecimalsFontSize,
      setPromoPriceDecimalsColor,
      setPromoPriceDecimalsBold,
      setPromoPriceDecimalsPos,
      setExtraFields,
      setExtraFieldsPromo,
    }),
    []
  );

  const state = {
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
  };

  return { state, setters };
}
