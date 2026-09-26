import { useState, useRef, useEffect, useCallback } from 'react';
import { getFixedLabelTextSize } from '../utils/fixedLabelTextSize';
import { Opportunity, PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

export function usePriceLabelState(initialProduct: any, config: any, isOpen: boolean) {
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
    const [title, setTitle] = useState(initialProduct?.name || config.text || 'COLCHÃO DE ESPUMA D28 LARGURA 88');
    const [showTitle, setShowTitle] = useState(true);
    const [titleFontSizeTens, setTitleFontSizeTens] = useState<number>(14);
    const [titleFontSizeHundreds, setTitleFontSizeHundreds] = useState<number>(14);
    const [titleFontSizeThousands, setTitleFontSizeThousands] = useState<number>(14);
    const [titleColor, setTitleColor] = useState('#000000');
    const [titleFontFamily, setTitleFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [titlePos, setTitlePos] = useState({ x: 0, y: 0 });
    const [titleRotation, setTitleRotation] = useState<number>(0);
    const [titleWidth, setTitleWidth] = useState<number>(520);

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
    const [normalPriceFontFamily, setNormalPriceFontFamily] = useState<string>('Inter, system-ui, sans-serif');
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
    const [currencyFontFamily, setCurrencyFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [currencyPos, setCurrencyPos] = useState({ x: 0, y: 0 });
    const [currencyRotation, setCurrencyRotation] = useState<number>(0);

    // 6. PREÇO PRINCIPAL (NÚMERO GRANDE POR:) - POR ORDEM DE GRANDEZA
    const [promoPrice, setPromoPrice] = useState(initialProduct?.promoPrice || config.promoPrice || '399,00');
    const [showPromoPrice, setShowPromoPrice] = useState(true);
    const [showPromoPriceTens, setShowPromoPriceTens] = useState(true);
    const [showPromoPriceHundreds, setShowPromoPriceHundreds] = useState(true);
    const [showPromoPriceThousands, setShowPromoPriceThousands] = useState(true);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [priceColor, setPriceColor] = useState(config.priceColor || '#1e3a8a');
    const [promoPriceFontFamily, setPromoPriceFontFamily] = useState<string>('Inter, system-ui, sans-serif');
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

    // ORDEM DE GRANDEZA SELECIONADA NA BARRA DE FERRAMENTAS (DEZENA, CENTENA, MILHAR)
    const [selectedMagnitude, setSelectedMagnitude] = useState<'tens' | 'hundreds' | 'thousands'>('hundreds');

    // MAPA DE TEMPLATES INDEPENDENTES POR ORDEM DE GRANDEZA (DEZENA, CENTENA, MILHAR)

    // LINHAS GUIA DE ALINHAMENTO MAGNÉTICO (ÍMÃ)
    const [activeGuideX, setActiveGuideX] = useState<number | null>(null);
    const [activeGuideY, setActiveGuideY] = useState<number | null>(null);

    // 8. TIPO DE ETIQUETA
    const [dbOpportunities, setDbOpportunities] = useState<Opportunity[]>([]);
    const [selectedOppId, setSelectedOppId] = useState<string>('none');

    // 9. PARCELAMENTO
    const [showInstallments, setShowInstallments] = useState(false);
    const [installments, setInstallments] = useState('Em até 10x sem juros no cartão');
    const [installmentsFontSizeTens, setInstallmentsFontSizeTens] = useState<number>(12);
    const [installmentsFontSizeHundreds, setInstallmentsFontSizeHundreds] = useState<number>(12);
    const [installmentsFontSizeThousands, setInstallmentsFontSizeThousands] = useState<number>(12);
    const [installmentsColor, setInstallmentsColor] = useState('#000000');
    const [installmentsFontFamily, setInstallmentsFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [installmentsPos, setInstallmentsPos] = useState({ x: 0, y: 0 });
    const [installmentsRotation, setInstallmentsRotation] = useState<number>(0);

    // 10. CONTAINER AGRUPADO FLEX (DE + PREÇO ANTIGO + POR)
    const [dePricePorGroupPos, setDePricePorGroupPos] = useState({ x: 0, y: 0 });
    const [dePricePorGroupRotation, setDePricePorGroupRotation] = useState<number>(0);
    const [dePricePorGroupGap, setDePricePorGroupGap] = useState<number>(10);

    // 11. FUNDO DA ETIQUETA
    const defaultBgColor = getDefaultBg(selectedOppId);
    const [bgColor, setBgColor] = useState<string>(defaultBgColor);

    // Estado de Seleção e Menus
    const [selectedElement, setSelectedElement] = useState<PriceLabelLayerKey>(null);
    const [selectedElements, setSelectedElements] = useState<Set<PriceLabelLayerKey>>(new Set());
    const [isArtConfigLoading, setIsArtConfigLoading] = useState(true);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const lastQueuedSnapshotRef = useRef('');
    const latestRequestedSnapshotRef = useRef('');
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isCenterMenuOpen, setIsCenterMenuOpen] = useState(false);
    const [isOppSelectModalOpen, setIsOppSelectModalOpen] = useState(false);
    const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);
    const [showColorPickerDropdown, setShowColorPickerDropdown] = useState(false);
    const pendingGradientColorRef = useRef<string | null>(null);

    // Sistema de Histórico (Undo / Redo)
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const undoStackRef = useRef<any[]>([]);
    const redoStackRef = useRef<any[]>([]);
    const isApplyingHistoryRef = useRef<boolean>(false);


    const applyMagnitudeSnapshot = (s: any, preserveFixedTextStyles = false) => {
        if (!s) return;
        if (s.title !== undefined) setTitle(s.title);
        if (s.showTitle !== undefined) setShowTitle(s.showTitle);
        if (!preserveFixedTextStyles) {
            const fixedTitleSize = getFixedLabelTextSize(s, 'title', 14);
            setTitleFontSizeTens(fixedTitleSize); setTitleFontSizeHundreds(fixedTitleSize); setTitleFontSizeThousands(fixedTitleSize);
        }

        if (s.titleColor) setTitleColor(s.titleColor);
        if (!preserveFixedTextStyles && s.titleFontFamily) setTitleFontFamily(s.titleFontFamily);
        if (s.titlePos && (s.titlePos.x !== 0 || s.titlePos.y !== 0)) setTitlePos(s.titlePos); else setTitlePos({ x: 0, y: -160 });
        if (s.titleRotation !== undefined) setTitleRotation(s.titleRotation);
        if (Number.isFinite(Number(s.titleWidth))) setTitleWidth(Number(s.titleWidth));

        if (s.deText !== undefined) setDeText(s.deText);
        if (s.showDe !== undefined) setShowDe(s.showDe);
        if (!preserveFixedTextStyles) {
            const fixedDeSize = getFixedLabelTextSize(s, 'de', 34);
            setDeFontSizeTens(fixedDeSize); setDeFontSizeHundreds(fixedDeSize); setDeFontSizeThousands(fixedDeSize);
        }

        if (s.deColor) setDeColor(s.deColor);
        if (!preserveFixedTextStyles && s.deFontFamily) setDeFontFamily(s.deFontFamily);
        if (s.dePos) setDePos(s.dePos);
        if (s.deRotation !== undefined) setDeRotation(s.deRotation);

        if (s.normalPrice !== undefined) setNormalPrice(s.normalPrice);
        if (s.showNormalPrice !== undefined) setShowNormalPrice(s.showNormalPrice);
        if (!preserveFixedTextStyles) {
            const fixedNormalPriceSize = getFixedLabelTextSize(s, 'normalPrice', 16);
            setNormalPriceFontSizeTens(fixedNormalPriceSize); setNormalPriceFontSizeHundreds(fixedNormalPriceSize); setNormalPriceFontSizeThousands(fixedNormalPriceSize);
        }

        if (s.normalPriceColor) setNormalPriceColor(s.normalPriceColor);
        if (!preserveFixedTextStyles && s.normalPriceFontFamily) setNormalPriceFontFamily(s.normalPriceFontFamily);
        if (s.normalPricePos) setNormalPricePos(s.normalPricePos);
        if (s.normalPriceRotation !== undefined) setNormalPriceRotation(s.normalPriceRotation);

        if (s.porText !== undefined) setPorText(s.porText);
        if (s.showPor !== undefined) setShowPor(s.showPor);
        if (!preserveFixedTextStyles) {
            const fixedPorSize = getFixedLabelTextSize(s, 'por', 15);
            setPorFontSizeTens(fixedPorSize); setPorFontSizeHundreds(fixedPorSize); setPorFontSizeThousands(fixedPorSize);
        }

        if (s.porColor) setPorColor(s.porColor);
        if (!preserveFixedTextStyles && s.porFontFamily) setPorFontFamily(s.porFontFamily);
        if (s.porPos) setPorPos(s.porPos);
        if (s.porRotation !== undefined) setPorRotation(s.porRotation);

        if (s.currencySymbol !== undefined) setCurrencySymbol(s.currencySymbol);
        if (s.showCurrency !== undefined) setShowCurrency(s.showCurrency);
        if (!preserveFixedTextStyles) {
            const fixedCurrencySize = getFixedLabelTextSize(s, 'currency', 70);
            setCurrencyFontSizeTens(fixedCurrencySize); setCurrencyFontSizeHundreds(fixedCurrencySize); setCurrencyFontSizeThousands(fixedCurrencySize);
        }

        if (s.currencyColor) setCurrencyColor(s.currencyColor);
        if (!preserveFixedTextStyles && s.currencyFontFamily) setCurrencyFontFamily(s.currencyFontFamily);
        if (s.currencyPos && (s.currencyPos.x !== 0 || s.currencyPos.y !== 0)) setCurrencyPos(s.currencyPos); else setCurrencyPos({ x: -280, y: 35 });
        if (s.currencyRotation !== undefined) setCurrencyRotation(s.currencyRotation);

        if (s.promoPrice !== undefined) setPromoPrice(s.promoPrice);
        if (s.showPromoPrice !== undefined) setShowPromoPrice(s.showPromoPrice);
        if (s.showPromoPriceTens !== undefined) setShowPromoPriceTens(s.showPromoPriceTens);
        if (s.showPromoPriceHundreds !== undefined) setShowPromoPriceHundreds(s.showPromoPriceHundreds);
        if (s.showPromoPriceThousands !== undefined) setShowPromoPriceThousands(s.showPromoPriceThousands);
        if (s.priceColor) setPriceColor(s.priceColor);
        if (s.promoPriceFontFamily) setPromoPriceFontFamily(s.promoPriceFontFamily);
        if (s.promoPricePos && (s.promoPricePos.x !== 0 || s.promoPricePos.y !== 0)) setPromoPricePos(s.promoPricePos); else setPromoPricePos({ x: 0, y: 45 });
        if (s.promoPriceRotation !== undefined) setPromoPriceRotation(s.promoPriceRotation);

        const targetScaleTens = (s.scaleTens && Number(s.scaleTens) >= 120) ? Number(s.scaleTens) : 240;
        const targetScaleHundreds = (s.scaleHundreds && Number(s.scaleHundreds) >= 120) ? Number(s.scaleHundreds) : 210;
        const targetScaleThousands = (s.scaleThousands && Number(s.scaleThousands) >= 120) ? Number(s.scaleThousands) : 170;
        setScaleTens(targetScaleTens);
        setScaleHundreds(targetScaleHundreds);
        setScaleThousands(targetScaleThousands);
        if (s.scaleTenThousands !== undefined) setScaleTenThousands(s.scaleTenThousands);

        if (s.centsText !== undefined) setCentsText(s.centsText);
        if (s.showCents !== undefined) setShowCents(s.showCents);
        if (!preserveFixedTextStyles) {
            const fixedCentsSize = getFixedLabelTextSize(s, 'cents', 70);
            setCentsFontSizeTens(fixedCentsSize); setCentsFontSizeHundreds(fixedCentsSize); setCentsFontSizeThousands(fixedCentsSize);
        }

        if (s.centsColor) setCentsColor(s.centsColor);
        if (!preserveFixedTextStyles && s.centsFontFamily) setCentsFontFamily(s.centsFontFamily);
        if (s.centsPos && (s.centsPos.x !== 0 || s.centsPos.y !== 0)) setCentsPos(s.centsPos); else setCentsPos({ x: 260, y: -10 });
        if (s.centsRotation !== undefined) setCentsRotation(s.centsRotation);

        if (s.showInstallments !== undefined) setShowInstallments(s.showInstallments);
        if (s.installments) setInstallments(s.installments);
        if (!preserveFixedTextStyles) {
            const fixedInstallmentsSize = getFixedLabelTextSize(s, 'installments', 14);
            setInstallmentsFontSizeTens(fixedInstallmentsSize); setInstallmentsFontSizeHundreds(fixedInstallmentsSize); setInstallmentsFontSizeThousands(fixedInstallmentsSize);
        }

        if (s.installmentsColor) setInstallmentsColor(s.installmentsColor);
        if (!preserveFixedTextStyles && s.installmentsFontFamily) setInstallmentsFontFamily(s.installmentsFontFamily);
        if (s.installmentsPos) setInstallmentsPos(s.installmentsPos);
        if (s.installmentsRotation !== undefined) setInstallmentsRotation(s.installmentsRotation);

        // { x: 0, y: 0 } é uma posição válida do template, não ausência de
        // configuração. O editor deve refletir exatamente o snapshot do BD.
        setDePricePorGroupPos(s.dePricePorGroupPos ?? { x: 0, y: 0 });
        if (s.dePricePorGroupRotation !== undefined) setDePricePorGroupRotation(s.dePricePorGroupRotation);
        if (s.dePricePorGroupGap !== undefined) setDePricePorGroupGap(s.dePricePorGroupGap);

        if (s.bgColor && s.bgColor !== 'transparent') {
            setBgColor(s.bgColor);
        } else if (defaultBgColor) {
            setBgColor(defaultBgColor);
        }
    };

    const applySnapshot = (s: any, preserveLayout = false) => {
        if (!s) return;
        isApplyingHistoryRef.current = true;
        const currentLayout = preserveLayout ? {
            titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos,
            centsPos, installmentsPos, dePricePorGroupPos,
            titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands,
            deFontSizeTens, deFontSizeHundreds, deFontSizeThousands,
            normalPriceFontSizeTens, normalPriceFontSizeHundreds, normalPriceFontSizeThousands,
            porFontSizeTens, porFontSizeHundreds, porFontSizeThousands,
            currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands,
            scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
            centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands,
            installmentsFontSizeTens, installmentsFontSizeHundreds, installmentsFontSizeThousands,
        } : null;

        if (s.oppColorsMap && typeof s.oppColorsMap === 'object') setOppColorsMap(s.oppColorsMap);
        if (s.magnitudeTemplates) setMagnitudeTemplates(s.magnitudeTemplates);
        if (s.selectedOppId) setSelectedOppId(s.selectedOppId);

        const targetMag = s.selectedMagnitude || selectedMagnitude || 'hundreds';
        setSelectedMagnitude(targetMag);
        if (s.magnitudeTemplates && s.magnitudeTemplates[targetMag]) {
            applyMagnitudeSnapshot(s.magnitudeTemplates[targetMag]);
        } else {
            applyMagnitudeSnapshot(s);
        }

        if (currentLayout) {
            const fixedTitleSize = currentLayout.titleFontSizeHundreds;
            const fixedDeSize = currentLayout.deFontSizeHundreds;
            const fixedNormalPriceSize = currentLayout.normalPriceFontSizeHundreds;
            const fixedPorSize = currentLayout.porFontSizeHundreds;
            const fixedCurrencySize = currentLayout.currencyFontSizeHundreds;
            const fixedCentsSize = currentLayout.centsFontSizeHundreds;
            const fixedInstallmentsSize = currentLayout.installmentsFontSizeHundreds;
            setTitlePos(currentLayout.titlePos); setDePos(currentLayout.dePos); setNormalPricePos(currentLayout.normalPricePos);
            setPorPos(currentLayout.porPos); setCurrencyPos(currentLayout.currencyPos); setPromoPricePos(currentLayout.promoPricePos);
            setCentsPos(currentLayout.centsPos); setInstallmentsPos(currentLayout.installmentsPos); setDePricePorGroupPos(currentLayout.dePricePorGroupPos);
            setTitleFontSizeTens(fixedTitleSize); setTitleFontSizeHundreds(fixedTitleSize); setTitleFontSizeThousands(fixedTitleSize);
            setDeFontSizeTens(fixedDeSize); setDeFontSizeHundreds(fixedDeSize); setDeFontSizeThousands(fixedDeSize);
            setNormalPriceFontSizeTens(fixedNormalPriceSize); setNormalPriceFontSizeHundreds(fixedNormalPriceSize); setNormalPriceFontSizeThousands(fixedNormalPriceSize);
            setPorFontSizeTens(fixedPorSize); setPorFontSizeHundreds(fixedPorSize); setPorFontSizeThousands(fixedPorSize);
            setCurrencyFontSizeTens(fixedCurrencySize); setCurrencyFontSizeHundreds(fixedCurrencySize); setCurrencyFontSizeThousands(fixedCurrencySize);
            setScaleTens(currentLayout.scaleTens); setScaleHundreds(currentLayout.scaleHundreds); setScaleThousands(currentLayout.scaleThousands); setScaleTenThousands(currentLayout.scaleTenThousands);
            setCentsFontSizeTens(fixedCentsSize); setCentsFontSizeHundreds(fixedCentsSize); setCentsFontSizeThousands(fixedCentsSize);
            setInstallmentsFontSizeTens(fixedInstallmentsSize); setInstallmentsFontSizeHundreds(fixedInstallmentsSize); setInstallmentsFontSizeThousands(fixedInstallmentsSize);
        }

        setTimeout(() => { isApplyingHistoryRef.current = false; }, 50);
    };

    // TROCA DE ORDEM DE GRANDEZA (COM SALVAMENTO E CARREGAMENTO INDEPENDENTE DE LAYOUT)
    const handleSwitchMagnitude = (newMag: 'tens' | 'hundreds' | 'thousands') => {
        if (newMag === selectedMagnitude) return;

        // Salva o snapshot da magnitude atual no mapa
        const curState = getMagnitudeSnapshot();
        const updatedMap = {
            ...magnitudeTemplates,
            [selectedMagnitude]: curState
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
    const getMagnitudeSnapshot = useCallback(() => ({
        title, showTitle, titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands, titleColor, titleFontFamily, titlePos, titleRotation, titleWidth,
        deText, showDe, deFontSizeTens, deFontSizeHundreds, deFontSizeThousands, deColor, deFontFamily, dePos, deRotation,
        normalPrice, showNormalPrice, normalPriceFontSizeTens, normalPriceFontSizeHundreds, normalPriceFontSizeThousands, normalPriceColor, normalPriceFontFamily, normalPricePos, normalPriceRotation,
        porText, showPor, porFontSizeTens, porFontSizeHundreds, porFontSizeThousands, porColor, porFontFamily, porPos, porRotation,
        currencySymbol, showCurrency, currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands, currencyColor, currencyFontFamily, currencyPos, currencyRotation,
        promoPrice, showPromoPrice, showPromoPriceTens, showPromoPriceHundreds, showPromoPriceThousands, priceColor, promoPriceFontFamily, promoPricePos, promoPriceRotation, scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsText, showCents, centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands, centsColor, centsFontFamily, centsPos, centsRotation,
        showInstallments, installments, installmentsFontSizeTens, installmentsFontSizeHundreds, installmentsFontSizeThousands, installmentsColor, installmentsFontFamily, installmentsPos, installmentsRotation,
        dePricePorGroupPos, dePricePorGroupRotation, dePricePorGroupGap,
        bgColor,
    }), [
        title, showTitle, titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands, titleColor, titleFontFamily, titlePos, titleRotation, titleWidth,
        deText, showDe, deFontSizeTens, deFontSizeHundreds, deFontSizeThousands, deColor, deFontFamily, dePos, deRotation,
        normalPrice, showNormalPrice, normalPriceFontSizeTens, normalPriceFontSizeHundreds, normalPriceFontSizeThousands, normalPriceColor, normalPriceFontFamily, normalPricePos, normalPriceRotation,
        porText, showPor, porFontSizeTens, porFontSizeHundreds, porFontSizeThousands, porColor, porFontFamily, porPos, porRotation,
        currencySymbol, showCurrency, currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands, currencyColor, currencyFontFamily, currencyPos, currencyRotation,
        promoPrice, showPromoPrice, showPromoPriceTens, showPromoPriceHundreds, showPromoPriceThousands, priceColor, promoPriceFontFamily, promoPricePos, promoPriceRotation, scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsText, showCents, centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands, centsColor, centsFontFamily, centsPos, centsRotation,
        showInstallments, installments, installmentsFontSizeTens, installmentsFontSizeHundreds, installmentsFontSizeThousands, installmentsColor, installmentsFontFamily, installmentsPos, installmentsRotation,
        dePricePorGroupPos, dePricePorGroupRotation, dePricePorGroupGap,
        bgColor,
    ]);

    // SNAPSHOT COMPLETO DO TIPO DE ETIQUETA (INCLUINDO AS 3 ORDENS DE GRANDEZA)
    const getSnapshot = useCallback(() => {
        const curMagState = getMagnitudeSnapshot();
        const sharedLayout = {
            titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos,
            centsPos, installmentsPos, dePricePorGroupPos,
            titleFontFamily, deFontFamily, normalPriceFontFamily, porFontFamily,
            currencyFontFamily, centsFontFamily, installmentsFontFamily,
            titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands,
            deFontSizeTens, deFontSizeHundreds, deFontSizeThousands,
            normalPriceFontSizeTens, normalPriceFontSizeHundreds, normalPriceFontSizeThousands,
            porFontSizeTens, porFontSizeHundreds, porFontSizeThousands,
            currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands,
            scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
            centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands,
            installmentsFontSizeTens, installmentsFontSizeHundreds, installmentsFontSizeThousands,
        };
        const fullTemplates = {
            ...Object.fromEntries(Object.entries(magnitudeTemplates).map(([magnitude, template]) => {
                const {
                    fabricTemplateJson: _legacyFabricTemplate,
                    fabricDataUrl: _legacyFabricImage,
                    ...templateData
                } = template || {};
                return [magnitude, { ...templateData, ...sharedLayout }];
            })),
            [selectedMagnitude]: curMagState
        };
        return {
            selectedOppId,
            selectedMagnitude,
            magnitudeTemplates: fullTemplates,
            oppColorsMap,
            ...curMagState
        };
    }, [selectedOppId, selectedMagnitude, magnitudeTemplates, getMagnitudeSnapshot,
    magnitudeTemplates,
    setMagnitudeTemplates, oppColorsMap,
        titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, installmentsPos, dePricePorGroupPos,
        titleFontFamily, deFontFamily, normalPriceFontFamily, porFontFamily,
        currencyFontFamily, centsFontFamily, installmentsFontFamily,
        titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands,
        deFontSizeTens, deFontSizeHundreds, deFontSizeThousands,
        normalPriceFontSizeTens, normalPriceFontSizeHundreds, normalPriceFontSizeThousands,
        porFontSizeTens, porFontSizeHundreds, porFontSizeThousands,
        currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands,
        scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands,
        installmentsFontSizeTens, installmentsFontSizeHundreds, installmentsFontSizeThousands]);

    // ----------------------------------------------------
    // SISTEMA ROBUSTO DE HISTÓRICO: DESFAZER (Ctrl+Z) E REFAZER (Ctrl+Y)
    // ----------------------------------------------------

    // Registra o snapshot inicial e acompanha mudanças do editor para a pilha de Desfazer/Refazer
    useEffect(() => {
        if (!isOpen) {
            undoStackRef.current = [];
            redoStackRef.current = [];
            setCanUndo(false);
            setCanRedo(false);
            return;
        }

        // Ao abrir, inicializa a pilha com a arte atual
        if (undoStackRef.current.length === 0) {
            const initialSnap = getSnapshot();
            undoStackRef.current = [initialSnap];
            redoStackRef.current = [];
            setCanUndo(false);
            setCanRedo(false);
        }

        if (isApplyingHistoryRef.current) return;

        const timer = setTimeout(() => {
            if (isApplyingHistoryRef.current) return;
            const currentSnap = getSnapshot();
            const stack = undoStackRef.current;
            if (stack.length > 0) {
                const lastSnap = stack[stack.length - 1];
                if (JSON.stringify(lastSnap) === JSON.stringify(currentSnap)) return;
            }
            undoStackRef.current = [...stack.slice(-50), currentSnap];
            redoStackRef.current = [];
            setCanUndo(undoStackRef.current.length > 1);
            setCanRedo(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [isOpen, getSnapshot]);

    const handleUndo = useCallback(() => {
        const stack = undoStackRef.current;
        if (stack.length <= 1) return;

        isApplyingHistoryRef.current = true;
        const current = stack.pop()!;
        redoStackRef.current.push(current);

        const previous = stack[stack.length - 1];
        applySnapshot(previous);

        setCanUndo(stack.length > 1);
        setCanRedo(true);

        setTimeout(() => {
            isApplyingHistoryRef.current = false;
        }, 120);
    }, []);

    const handleRedo = useCallback(() => {
        const redoStack = redoStackRef.current;
        if (redoStack.length === 0) return;

        isApplyingHistoryRef.current = true;
        const next = redoStack.pop()!;
        undoStackRef.current.push(next);

        applySnapshot(next);

        setCanUndo(undoStackRef.current.length > 1);
        setCanRedo(redoStack.length > 0);

        setTimeout(() => {
            isApplyingHistoryRef.current = false;
        }, 120);
    }, []);

    // Atalhos globais de teclado para Ctrl+Z e Ctrl+Y (ou Cmd+Z / Cmd+Y no Mac)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd) {
                const key = e.key.toLowerCase();
                if (key === 'z') {
                    if (e.shiftKey) {
                        // Ctrl + Shift + Z -> Refazer
                        e.preventDefault();
                        handleRedo();
                    } else {
                        // Ctrl + Z -> Desfazer (se não estiver num campo de texto simples)
                        if (!isInput) {
                            e.preventDefault();
                            handleUndo();
                        }
                    }
                } else if (key === 'y') {
                    // Ctrl + Y -> Refazer
                    if (!isInput) {
                        e.preventDefault();
                        handleRedo();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleUndo, handleRedo]);
  return {
    applySnapshot,
    getSnapshot,
    getMagnitudeSnapshot,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    undoStackRef,
    redoStackRef,
    isApplyingHistoryRef,
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
    selectedElement,
    setSelectedElement,
    selectedElements,
    setSelectedElements,
    isArtConfigLoading,
    setIsArtConfigLoading,
    autoSaveStatus,
    setAutoSaveStatus,
    lastQueuedSnapshotRef,
    latestRequestedSnapshotRef,
    saveQueueRef,
    isFileMenuOpen,
    setIsFileMenuOpen,
    isCenterMenuOpen,
    setIsCenterMenuOpen,
    isOppSelectModalOpen,
    setIsOppSelectModalOpen,
    isLayersModalOpen,
    setIsLayersModalOpen,
    showColorPickerDropdown,
    setShowColorPickerDropdown,
    pendingGradientColorRef
  };
}
