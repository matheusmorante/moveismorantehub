import { useState } from 'react';
import type { PriceLabelArtEditorModalProps } from '../../types/PriceLabelArtEditorTypes';

/** Agrupa estados de estilo, posição e rotação dos elementos textuais fixos da etiqueta ("De", preço normal, "por:" e moeda). */
export function usePriceLabelFixedElementStates(
  initialProduct: PriceLabelArtEditorModalProps['initialProduct'],
  config: PriceLabelArtEditorModalProps['config']
) {
  const [deText, setDeText] = useState('De');
  const [showDe, setShowDe] = useState(true);
  const [deFontSizeTens, setDeFontSizeTens] = useState<number>(34);
  const [deFontSizeHundreds, setDeFontSizeHundreds] = useState<number>(34);
  const [deFontSizeThousands, setDeFontSizeThousands] = useState<number>(34);
  const [deColor, setDeColor] = useState('#000000');
  const [deFontFamily, setDeFontFamily] = useState<string>('Inter, system-ui, sans-serif');
  const [dePos, setDePos] = useState({ x: 0, y: 0 });
  const [deRotation, setDeRotation] = useState<number>(0);

  const [normalPrice, setNormalPrice] = useState(initialProduct?.price || config.price || '499,00');
  const [showNormalPrice, setShowNormalPrice] = useState(true);
  const [normalPriceFontSizeTens, setNormalPriceFontSizeTens] = useState<number>(16);
  const [normalPriceFontSizeHundreds, setNormalPriceFontSizeHundreds] = useState<number>(16);
  const [normalPriceFontSizeThousands, setNormalPriceFontSizeThousands] = useState<number>(16);
  const [normalPriceColor, setNormalPriceColor] = useState('#000000');
  const [normalPriceFontFamily, setNormalPriceFontFamily] = useState<string>(
    'Inter, system-ui, sans-serif'
  );
  const [normalPricePos, setNormalPricePos] = useState({ x: 0, y: 0 });
  const [normalPriceRotation, setNormalPriceRotation] = useState<number>(0);

  const [porText, setPorText] = useState('por:');
  const [showPor, setShowPor] = useState(true);
  const [porFontSizeTens, setPorFontSizeTens] = useState<number>(15);
  const [porFontSizeHundreds, setPorFontSizeHundreds] = useState<number>(15);
  const [porFontSizeThousands, setPorFontSizeThousands] = useState<number>(15);
  const [porColor, setPorColor] = useState('#000000');
  const [porFontFamily, setPorFontFamily] = useState<string>('Inter, system-ui, sans-serif');
  const [porPos, setPorPos] = useState({ x: 0, y: 0 });
  const [porRotation, setPorRotation] = useState<number>(0);

  const [currencySymbol, setCurrencySymbol] = useState('R$');
  const [showCurrency, setShowCurrency] = useState(true);
  const [currencyFontSizeTens, setCurrencyFontSizeTens] = useState<number>(70);
  const [currencyFontSizeHundreds, setCurrencyFontSizeHundreds] = useState<number>(70);
  const [currencyFontSizeThousands, setCurrencyFontSizeThousands] = useState<number>(70);
  const [currencyColor, setCurrencyColor] = useState('#000000');
  const [currencyFontFamily, setCurrencyFontFamily] = useState<string>(
    'Inter, system-ui, sans-serif'
  );
  const [currencyPos, setCurrencyPos] = useState({ x: 0, y: 0 });
  const [currencyRotation, setCurrencyRotation] = useState<number>(0);

  return {
    deText,
    setDeText,
    showDe,
    setShowDe,
    deFontSizeTens,
    setDeFontSizeTens,
    deFontSizeHundreds,
    setDeFontSizeHundreds,
    deFontSizeThousands,
    setDeFontSizeThousands,
    deColor,
    setDeColor,
    deFontFamily,
    setDeFontFamily,
    dePos,
    setDePos,
    deRotation,
    setDeRotation,
    normalPrice,
    setNormalPrice,
    showNormalPrice,
    setShowNormalPrice,
    normalPriceFontSizeTens,
    setNormalPriceFontSizeTens,
    normalPriceFontSizeHundreds,
    setNormalPriceFontSizeHundreds,
    normalPriceFontSizeThousands,
    setNormalPriceFontSizeThousands,
    normalPriceColor,
    setNormalPriceColor,
    normalPriceFontFamily,
    setNormalPriceFontFamily,
    normalPricePos,
    setNormalPricePos,
    normalPriceRotation,
    setNormalPriceRotation,
    porText,
    setPorText,
    showPor,
    setShowPor,
    porFontSizeTens,
    setPorFontSizeTens,
    porFontSizeHundreds,
    setPorFontSizeHundreds,
    porFontSizeThousands,
    setPorFontSizeThousands,
    porColor,
    setPorColor,
    porFontFamily,
    setPorFontFamily,
    porPos,
    setPorPos,
    porRotation,
    setPorRotation,
    currencySymbol,
    setCurrencySymbol,
    showCurrency,
    setShowCurrency,
    currencyFontSizeTens,
    setCurrencyFontSizeTens,
    currencyFontSizeHundreds,
    setCurrencyFontSizeHundreds,
    currencyFontSizeThousands,
    setCurrencyFontSizeThousands,
    currencyColor,
    setCurrencyColor,
    currencyFontFamily,
    setCurrencyFontFamily,
    currencyPos,
    setCurrencyPos,
    currencyRotation,
    setCurrencyRotation,
  };
}
