import { useState } from 'react';
import type { PriceLabelArtEditorModalProps } from '../types/PriceLabelArtEditorTypes';

export function usePriceLabelPromoPriceState(
  initialProduct: PriceLabelArtEditorModalProps['initialProduct'],
  config: PriceLabelArtEditorModalProps['config'],
) {
  // 6. PREÇO PRINCIPAL (NÚMERO GRANDE POR:) - POR ORDEM DE GRANDEZA
  const [promoPrice, setPromoPrice] = useState(
    initialProduct?.promoPrice || config.promoPrice || '399,00'
  );
  const [showPromoPrice, setShowPromoPrice] = useState(true);
  const [showPromoPriceTens, setShowPromoPriceTens] = useState(true);
  const [showPromoPriceHundreds, setShowPromoPriceHundreds] = useState(true);
  const [showPromoPriceThousands, setShowPromoPriceThousands] = useState(true);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [priceColor, setPriceColor] = useState(config.priceColor || '#1e3a8a');
  const [promoPriceFontFamily, setPromoPriceFontFamily] = useState<string>(
    'Inter, system-ui, sans-serif'
  );
  const [promoPricePos, setPromoPricePos] = useState({ x: 0, y: 0 });
  const [promoPriceRotation, setPromoPriceRotation] = useState<number>(0);

  // Escalas por Ordem de Grandeza (Dezena, Centena, Milhar, Dezena de Milhar)
  const [scaleTens, setScaleTens] = useState<number>(240);
  const [scaleHundreds, setScaleHundreds] = useState<number>(210);
  const [scaleThousands, setScaleThousands] = useState<number>(170);
  const [scaleTenThousands, setScaleTenThousands] = useState<number>(140);

  // 7. CENTAVOS ",00" (TAMANHO FIXO EM TODAS AS GRANDEZAS)
  const [centsText, setCentsText] = useState(',00');
  const [showCents, setShowCents] = useState(true);
  const [centsFontSizeTens, setCentsFontSizeTens] = useState<number>(70);
  const [centsFontSizeHundreds, setCentsFontSizeHundreds] = useState<number>(70);
  const [centsFontSizeThousands, setCentsFontSizeThousands] = useState<number>(70);
  const [centsColor, setCentsColor] = useState('#000000');
  const [centsFontFamily, setCentsFontFamily] = useState<string>('Inter, system-ui, sans-serif');
  const [centsPos, setCentsPos] = useState({ x: 0, y: 0 });
  const [centsRotation, setCentsRotation] = useState<number>(0);

  return {
    promoPrice,
    setPromoPrice,
    showPromoPrice,
    setShowPromoPrice,
    showPromoPriceTens,
    setShowPromoPriceTens,
    showPromoPriceHundreds,
    setShowPromoPriceHundreds,
    showPromoPriceThousands,
    setShowPromoPriceThousands,
    showSizeDropdown,
    setShowSizeDropdown,
    priceColor,
    setPriceColor,
    promoPriceFontFamily,
    setPromoPriceFontFamily,
    promoPricePos,
    setPromoPricePos,
    promoPriceRotation,
    setPromoPriceRotation,
    scaleTens,
    setScaleTens,
    scaleHundreds,
    setScaleHundreds,
    scaleThousands,
    setScaleThousands,
    scaleTenThousands,
    setScaleTenThousands,
    centsText,
    setCentsText,
    showCents,
    setShowCents,
    centsFontSizeTens,
    setCentsFontSizeTens,
    centsFontSizeHundreds,
    setCentsFontSizeHundreds,
    centsFontSizeThousands,
    setCentsFontSizeThousands,
    centsColor,
    setCentsColor,
    centsFontFamily,
    setCentsFontFamily,
    centsPos,
    setCentsPos,
    centsRotation,
    setCentsRotation,
  };
}
