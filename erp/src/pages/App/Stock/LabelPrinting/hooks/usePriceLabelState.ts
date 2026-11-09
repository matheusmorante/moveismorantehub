import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  Opportunity,
  PriceLabelArtEditorModalProps,
} from '../types/PriceLabelArtEditorTypes';
import { usePriceLabelHistory } from './usePriceLabelHistory';
import { buildPriceLabelStateSnapshot } from './priceLabelStateSnapshot';
import { usePriceLabelEditorTransientState } from './usePriceLabelEditorTransientState';
import { usePriceLabelTitleState } from './usePriceLabelTitleState';
import { usePriceLabelInstallmentsState } from './usePriceLabelInstallmentsState';
import { usePriceLabelPromoPriceState } from './usePriceLabelPromoPriceState';
import { applyPriceLabelMagnitudeSnapshot } from './priceLabelMagnitudeSnapshot';
import { applyPriceLabelSnapshot } from './priceLabelSnapshotRestoration';

export function usePriceLabelState(
  initialProduct: PriceLabelArtEditorModalProps['initialProduct'],
  config: PriceLabelArtEditorModalProps['config'],
  isOpen: boolean,
  canEditHistory: () => boolean = () => true,
) {
  const [magnitudeTemplates, setMagnitudeTemplates] = useState<{
    tens?: any;
    hundreds?: any;
    thousands?: any;
  }>({});
  // COR DE FUNDO PADRÃO
  const getDefaultBg = (_oppId?: string) => '#ffffff';

  // MARGEM DE SEGURANÇA DA IMPRESSÃO
  const [showSafetyMargin, setShowSafetyMargin] = useState(true);

  // HISTÓRICO DE CORES USADAS RECENTEMENTE

  // MAPEAMENTO DE CORES DE ELEMENTOS POR TIPO DE ETIQUETA (OPPORTUNITY ID)
  const [oppColorsMap, setOppColorsMap] = useState<Record<string, Record<string, string>>>({});

  // 1. TÍTULO NO CABEÇALHO DA ETIQUETA
  const {
    title,
    setTitle,
    showTitle,
    setShowTitle,
    titleFontSizeTens,
    setTitleFontSizeTens,
    titleFontSizeHundreds,
    setTitleFontSizeHundreds,
    titleFontSizeThousands,
    setTitleFontSizeThousands,
    titleColor,
    setTitleColor,
    titleFontFamily,
    setTitleFontFamily,
    titlePos,
    setTitlePos,
    titleRotation,
    setTitleRotation,
    titleWidth,
    setTitleWidth,
  } = usePriceLabelTitleState(initialProduct, config);

  // 2. TEXTO "DE"
  const [deText, setDeText] = useState('De');
  const [showDe, setShowDe] = useState(true);
  const [deFontSizeTens, setDeFontSizeTens] = useState<number>(34);
  const [deFontSizeHundreds, setDeFontSizeHundreds] = useState<number>(34);
  const [deFontSizeThousands, setDeFontSizeThousands] = useState<number>(34);
  const [deColor, setDeColor] = useState('#000000');
  const [deFontFamily, setDeFontFamily] = useState<string>('Inter, system-ui, sans-serif');
  const [dePos, setDePos] = useState({ x: 0, y: 0 });
  const [deRotation, setDeRotation] = useState<number>(0);

  // 3. PREÇO ORIGINAL (VALOR NUMÉRICO RISCADO)
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

  // 4. TEXTO "POR:"
  const [porText, setPorText] = useState('por:');
  const [showPor, setShowPor] = useState(true);
  const [porFontSizeTens, setPorFontSizeTens] = useState<number>(15);
  const [porFontSizeHundreds, setPorFontSizeHundreds] = useState<number>(15);
  const [porFontSizeThousands, setPorFontSizeThousands] = useState<number>(15);
  const [porColor, setPorColor] = useState('#000000');
  const [porFontFamily, setPorFontFamily] = useState<string>('Inter, system-ui, sans-serif');
  const [porPos, setPorPos] = useState({ x: 0, y: 0 });
  const [porRotation, setPorRotation] = useState<number>(0);

  // 5. SÍMBOLO DA MOEDA "R$" (TAMANHO FIXO EM TODAS AS GRANDEZAS)
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

  const promoPriceState = usePriceLabelPromoPriceState(initialProduct, config);
  const {
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
  } = promoPriceState;

  // ORDEM DE GRANDEZA SELECIONADA NA BARRA DE FERRAMENTAS (DEZENA, CENTENA, MILHAR)
  const [selectedMagnitude, setSelectedMagnitude] = useState<'tens' | 'hundreds' | 'thousands'>(
    'hundreds'
  );

  // MAPA DE TEMPLATES INDEPENDENTES POR ORDEM DE GRANDEZA (DEZENA, CENTENA, MILHAR)

  // LINHAS GUIA DE ALINHAMENTO MAGNÉTICO (ÍMÃ)
  const [activeGuideX, setActiveGuideX] = useState<number | null>(null);
  const [activeGuideY, setActiveGuideY] = useState<number | null>(null);

  // 8. TIPO DE ETIQUETA
  const [dbOpportunities, setDbOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('none');

  // 9. PARCELAMENTO
  const {
    showInstallments,
    setShowInstallments,
    installments,
    setInstallments,
    installmentsFontSizeTens,
    setInstallmentsFontSizeTens,
    installmentsFontSizeHundreds,
    setInstallmentsFontSizeHundreds,
    installmentsFontSizeThousands,
    setInstallmentsFontSizeThousands,
    installmentsColor,
    setInstallmentsColor,
    installmentsFontFamily,
    setInstallmentsFontFamily,
    installmentsPos,
    setInstallmentsPos,
    installmentsRotation,
    setInstallmentsRotation,
  } = usePriceLabelInstallmentsState();

  // 10. CONTAINER AGRUPADO FLEX (DE + PREÇO ANTIGO + POR)
  const [dePricePorGroupPos, setDePricePorGroupPos] = useState({ x: 0, y: 0 });
  const [dePricePorGroupRotation, setDePricePorGroupRotation] = useState<number>(0);
  const [dePricePorGroupGap, setDePricePorGroupGap] = useState<number>(10);

  // 11. FUNDO DA ETIQUETA
  const defaultBgColor = getDefaultBg(selectedOppId);
  const [bgColor, setBgColor] = useState<string>(defaultBgColor);

  // Estado de Seleção e Menus
  const editorTransientState = usePriceLabelEditorTransientState();

  // Sistema de Histórico (Undo / Redo)
  const isApplyingHistoryRef = useRef<boolean>(false);

  const magnitudeSnapshotSetters = {
    setTitle,
    setShowTitle,
    setTitleFontSizeTens,
    setTitleFontSizeHundreds,
    setTitleFontSizeThousands,
    setTitleColor,
    setTitleFontFamily,
    setTitlePos,
    setTitleRotation,
    setTitleWidth,
    setDeText,
    setShowDe,
    setDeFontSizeTens,
    setDeFontSizeHundreds,
    setDeFontSizeThousands,
    setDeColor,
    setDeFontFamily,
    setDePos,
    setDeRotation,
    setNormalPrice,
    setShowNormalPrice,
    setNormalPriceFontSizeTens,
    setNormalPriceFontSizeHundreds,
    setNormalPriceFontSizeThousands,
    setNormalPriceColor,
    setNormalPriceFontFamily,
    setNormalPricePos,
    setNormalPriceRotation,
    setPorText,
    setShowPor,
    setPorFontSizeTens,
    setPorFontSizeHundreds,
    setPorFontSizeThousands,
    setPorColor,
    setPorFontFamily,
    setPorPos,
    setPorRotation,
    setCurrencySymbol,
    setShowCurrency,
    setCurrencyFontSizeTens,
    setCurrencyFontSizeHundreds,
    setCurrencyFontSizeThousands,
    setCurrencyColor,
    setCurrencyFontFamily,
    setCurrencyPos,
    setCurrencyRotation,
    setPromoPrice,
    setShowPromoPrice,
    setShowPromoPriceTens,
    setShowPromoPriceHundreds,
    setShowPromoPriceThousands,
    setPriceColor,
    setPromoPriceFontFamily,
    setPromoPricePos,
    setPromoPriceRotation,
    setScaleTens,
    setScaleHundreds,
    setScaleThousands,
    setScaleTenThousands,
    setCentsText,
    setShowCents,
    setCentsFontSizeTens,
    setCentsFontSizeHundreds,
    setCentsFontSizeThousands,
    setCentsColor,
    setCentsFontFamily,
    setCentsPos,
    setCentsRotation,
    setShowInstallments,
    setInstallments,
    setInstallmentsFontSizeTens,
    setInstallmentsFontSizeHundreds,
    setInstallmentsFontSizeThousands,
    setInstallmentsColor,
    setInstallmentsFontFamily,
    setInstallmentsPos,
    setInstallmentsRotation,
    setDePricePorGroupPos,
    setDePricePorGroupRotation,
    setDePricePorGroupGap,
    setBgColor,
  };
  const applyMagnitudeSnapshot = (s: any, preserveFixedTextStyles = false) =>
    applyPriceLabelMagnitudeSnapshot(
      s,
      preserveFixedTextStyles,
      magnitudeSnapshotSetters,
      defaultBgColor,
    );

  const applySnapshot = (s: any, preserveLayout = false) =>
    applyPriceLabelSnapshot({
      snapshot: s,
      preserveLayout,
      getCurrentLayout: () => ({
          titlePos,
          dePos,
          normalPricePos,
          porPos,
          currencyPos,
          promoPricePos,
          centsPos,
          installmentsPos,
          dePricePorGroupPos,
          titleFontSizeTens,
          titleFontSizeHundreds,
          titleFontSizeThousands,
          deFontSizeTens,
          deFontSizeHundreds,
          deFontSizeThousands,
          normalPriceFontSizeTens,
          normalPriceFontSizeHundreds,
          normalPriceFontSizeThousands,
          porFontSizeTens,
          porFontSizeHundreds,
          porFontSizeThousands,
          currencyFontSizeTens,
          currencyFontSizeHundreds,
          currencyFontSizeThousands,
          scaleTens,
          scaleHundreds,
          scaleThousands,
          scaleTenThousands,
          centsFontSizeTens,
          centsFontSizeHundreds,
          centsFontSizeThousands,
          installmentsFontSizeTens,
          installmentsFontSizeHundreds,
          installmentsFontSizeThousands,
      }),
      selectedMagnitude,
      setSelectedMagnitude,
      setMagnitudeTemplates,
      setOppColorsMap,
      setSelectedOppId,
      applyMagnitudeSnapshot,
      setters: magnitudeSnapshotSetters,
      isApplyingHistoryRef,
    });

  // TROCA DE ORDEM DE GRANDEZA (COM SALVAMENTO E CARREGAMENTO INDEPENDENTE DE LAYOUT)
  const handleSwitchMagnitude = (newMag: 'tens' | 'hundreds' | 'thousands') => {
    if (newMag === selectedMagnitude) return;

    // Salva o snapshot da magnitude atual no mapa
    const curState = getMagnitudeSnapshot();
    const updatedMap = {
      ...magnitudeTemplates,
      [selectedMagnitude]: curState,
    };
    setMagnitudeTemplates(updatedMap);

    setSelectedMagnitude(newMag);

    // Se a nova magnitude já tem um layout salvo no mapa, restaura!
    const targetState = updatedMap[newMag];
    if (targetState) {
      applyMagnitudeSnapshot(targetState, true);
    }
  };

  // SNAPSHOT DOS VALORES DE ESTILO E POSICIONAMENTO DA MAGNITUDE ATUAL
  // oppColorsMap é global (não por grandeza), salvo somente no getSnapshot
  const getMagnitudeSnapshot = useCallback(
    () => ({
      title,
      showTitle,
      titleFontSizeTens,
      titleFontSizeHundreds,
      titleFontSizeThousands,
      titleColor,
      titleFontFamily,
      titlePos,
      titleRotation,
      titleWidth,
      deText,
      showDe,
      deFontSizeTens,
      deFontSizeHundreds,
      deFontSizeThousands,
      deColor,
      deFontFamily,
      dePos,
      deRotation,
      normalPrice,
      showNormalPrice,
      normalPriceFontSizeTens,
      normalPriceFontSizeHundreds,
      normalPriceFontSizeThousands,
      normalPriceColor,
      normalPriceFontFamily,
      normalPricePos,
      normalPriceRotation,
      porText,
      showPor,
      porFontSizeTens,
      porFontSizeHundreds,
      porFontSizeThousands,
      porColor,
      porFontFamily,
      porPos,
      porRotation,
      currencySymbol,
      showCurrency,
      currencyFontSizeTens,
      currencyFontSizeHundreds,
      currencyFontSizeThousands,
      currencyColor,
      currencyFontFamily,
      currencyPos,
      currencyRotation,
      promoPrice,
      showPromoPrice,
      showPromoPriceTens,
      showPromoPriceHundreds,
      showPromoPriceThousands,
      priceColor,
      promoPriceFontFamily,
      promoPricePos,
      promoPriceRotation,
      scaleTens,
      scaleHundreds,
      scaleThousands,
      scaleTenThousands,
      centsText,
      showCents,
      centsFontSizeTens,
      centsFontSizeHundreds,
      centsFontSizeThousands,
      centsColor,
      centsFontFamily,
      centsPos,
      centsRotation,
      showInstallments,
      installments,
      installmentsFontSizeTens,
      installmentsFontSizeHundreds,
      installmentsFontSizeThousands,
      installmentsColor,
      installmentsFontFamily,
      installmentsPos,
      installmentsRotation,
      dePricePorGroupPos,
      dePricePorGroupRotation,
      dePricePorGroupGap,
      bgColor,
    }),
    [
      title,
      showTitle,
      titleFontSizeTens,
      titleFontSizeHundreds,
      titleFontSizeThousands,
      titleColor,
      titleFontFamily,
      titlePos,
      titleRotation,
      titleWidth,
      deText,
      showDe,
      deFontSizeTens,
      deFontSizeHundreds,
      deFontSizeThousands,
      deColor,
      deFontFamily,
      dePos,
      deRotation,
      normalPrice,
      showNormalPrice,
      normalPriceFontSizeTens,
      normalPriceFontSizeHundreds,
      normalPriceFontSizeThousands,
      normalPriceColor,
      normalPriceFontFamily,
      normalPricePos,
      normalPriceRotation,
      porText,
      showPor,
      porFontSizeTens,
      porFontSizeHundreds,
      porFontSizeThousands,
      porColor,
      porFontFamily,
      porPos,
      porRotation,
      currencySymbol,
      showCurrency,
      currencyFontSizeTens,
      currencyFontSizeHundreds,
      currencyFontSizeThousands,
      currencyColor,
      currencyFontFamily,
      currencyPos,
      currencyRotation,
      promoPrice,
      showPromoPrice,
      showPromoPriceTens,
      showPromoPriceHundreds,
      showPromoPriceThousands,
      priceColor,
      promoPriceFontFamily,
      promoPricePos,
      promoPriceRotation,
      scaleTens,
      scaleHundreds,
      scaleThousands,
      scaleTenThousands,
      centsText,
      showCents,
      centsFontSizeTens,
      centsFontSizeHundreds,
      centsFontSizeThousands,
      centsColor,
      centsFontFamily,
      centsPos,
      centsRotation,
      showInstallments,
      installments,
      installmentsFontSizeTens,
      installmentsFontSizeHundreds,
      installmentsFontSizeThousands,
      installmentsColor,
      installmentsFontFamily,
      installmentsPos,
      installmentsRotation,
      dePricePorGroupPos,
      dePricePorGroupRotation,
      dePricePorGroupGap,
      bgColor,
    ]
  );

  // SNAPSHOT COMPLETO DO TIPO DE ETIQUETA (INCLUINDO AS 3 ORDENS DE GRANDEZA)
  const getSnapshot = useCallback(() => {
    const curMagState = getMagnitudeSnapshot();
    return buildPriceLabelStateSnapshot({
      selectedOppId,
      selectedMagnitude,
      magnitudeTemplates,
      oppColorsMap,
      currentMagnitudeSnapshot: curMagState,
    });
  }, [
    selectedOppId,
    selectedMagnitude,
    magnitudeTemplates,
    getMagnitudeSnapshot,
    oppColorsMap,
  ]);

  const {
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = usePriceLabelHistory<ReturnType<typeof getSnapshot>>({
    canEdit: canEditHistory,
    isOpen,
    getSnapshot,
    applySnapshot,
    isApplyingHistoryRef,
  });
  return {
    applySnapshot,
    getSnapshot,
    getMagnitudeSnapshot,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    getDefaultBg,
    showSafetyMargin,
    setShowSafetyMargin,
    oppColorsMap,
    setOppColorsMap,
    title,
    setTitle,
    showTitle,
    setShowTitle,
    titleFontSizeTens,
    setTitleFontSizeTens,
    titleFontSizeHundreds,
    setTitleFontSizeHundreds,
    titleFontSizeThousands,
    setTitleFontSizeThousands,
    titleColor,
    setTitleColor,
    titleFontFamily,
    setTitleFontFamily,
    titlePos,
    setTitlePos,
    titleRotation,
    setTitleRotation,
    titleWidth,
    setTitleWidth,
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
    ...promoPriceState,
    selectedMagnitude,
    setSelectedMagnitude,
    activeGuideX,
    setActiveGuideX,
    activeGuideY,
    setActiveGuideY,
    dbOpportunities,
    setDbOpportunities,
    selectedOppId,
    setSelectedOppId,
    showInstallments,
    setShowInstallments,
    installments,
    setInstallments,
    installmentsFontSizeTens,
    setInstallmentsFontSizeTens,
    installmentsFontSizeHundreds,
    setInstallmentsFontSizeHundreds,
    installmentsFontSizeThousands,
    setInstallmentsFontSizeThousands,
    installmentsColor,
    setInstallmentsColor,
    installmentsFontFamily,
    setInstallmentsFontFamily,
    installmentsPos,
    setInstallmentsPos,
    installmentsRotation,
    setInstallmentsRotation,
    dePricePorGroupPos,
    setDePricePorGroupPos,
    dePricePorGroupRotation,
    setDePricePorGroupRotation,
    dePricePorGroupGap,
    setDePricePorGroupGap,
    defaultBgColor,
    bgColor,
    setBgColor,
    ...editorTransientState,
  };
}
