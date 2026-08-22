import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { LabelConfig } from './LabelConstants';

const GLOBAL_PRICE_LABEL_ART_KEY = 'morante_global_price_label_art_template';
const getOppTemplateKey = (oppId: string) => `morante_price_label_art_template_${oppId}`;

interface Opportunity {
    id: string;
    name: string;
    slug?: string;
    badge_color?: string;
    border_color?: string;
}

interface PriceLabelArtEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: LabelConfig;
    onSaveConfig: (updatedConfig: Partial<LabelConfig>) => void;
    initialProduct?: {
        name?: string;
        price?: string;
        promoPrice?: string;
        sku?: string;
        opportunities?: any;
    };
}

type PriceLabelLayerKey = 
    | 'title' 
    | 'deText'
    | 'normalPrice' 
    | 'porText'
    | 'currencySymbol'
    | 'promoPrice' 
    | 'cents'
    | 'installments' 
    | 'background' 
    | null;

const FONT_OPTIONS = [
    { label: 'Padrão (Inter)', value: 'Inter, system-ui, sans-serif' },
    { label: 'Impact (Pesada)', value: 'Impact, sans-serif' },
    { label: 'Oswald (Condensada)', value: 'Oswald, sans-serif' },
    { label: 'Bebas Neue (Alta)', value: '"Bebas Neue", sans-serif' },
    { label: 'Anton (Extra Bold)', value: 'Anton, sans-serif' },
    { label: 'Montserrat (Moderna)', value: 'Montserrat, sans-serif' },
    { label: 'Roboto (Limpa)', value: 'Roboto, sans-serif' },
    { label: 'Poppins (Arredondada)', value: 'Poppins, sans-serif' },
    { label: 'Playfair (Clássica)', value: '"Playfair Display", Georgia, serif' },
    { label: 'Monospace (Digital)', value: 'ui-monospace, monospace' }
];

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = ({
    isOpen,
    onClose,
    config,
    onSaveConfig,
    initialProduct
}) => {
    // COR DE FUNDO PADRÃO
    const defaultBgColor = config.bg_color || '#ff7900';

    // MARGEM DE SEGURANÇA DA IMPRESSÃO
    const [showSafetyMargin, setShowSafetyMargin] = useState(true);

    // HISTÓRICO DE CORES USADAS RECENTEMENTE
    const [colorHistory, setColorHistory] = useState<string[]>([
        '#000000', '#1e3a8a', '#dc2626', '#ea580c', '#ffffff', '#2563eb', '#16a34a', '#ff7900', '#7c3aed'
    ]);

    // 1. TÍTULO NO CABEÇALHO DA ETIQUETA
    const [title, setTitle] = useState(initialProduct?.name || config.text || 'COLCHÃO DE ESPUMA D28 LARGURA 88');
    const [showTitle, setShowTitle] = useState(true);
    const [titleFontSize, setTitleFontSize] = useState<number>(14);
    const [titleColor, setTitleColor] = useState('#000000');
    const [titleFontFamily, setTitleFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [titlePos, setTitlePos] = useState({ x: 0, y: 0 });
    const [titleRotation, setTitleRotation] = useState<number>(0);

    // 2. TEXTO "DE"
    const [deText, setDeText] = useState('De');
    const [showDe, setShowDe] = useState(true);
    const [deFontSize, setDeFontSize] = useState<number>(15);
    const [deColor, setDeColor] = useState('#000000');
    const [deFontFamily, setDeFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [dePos, setDePos] = useState({ x: 0, y: 0 });
    const [deRotation, setDeRotation] = useState<number>(0);

    // 3. PREÇO ORIGINAL (VALOR NUMÉRICO RISCADO)
    const [normalPrice, setNormalPrice] = useState(initialProduct?.price || config.price || '499,00');
    const [showNormalPrice, setShowNormalPrice] = useState(true);
    const [normalPriceFontSize, setNormalPriceFontSize] = useState<number>(16);
    const [normalPriceColor, setNormalPriceColor] = useState('#000000');
    const [normalPriceFontFamily, setNormalPriceFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [normalPricePos, setNormalPricePos] = useState({ x: 0, y: 0 });
    const [normalPriceRotation, setNormalPriceRotation] = useState<number>(0);

    // 4. TEXTO "POR:"
    const [porText, setPorText] = useState('por:');
    const [showPor, setShowPor] = useState(true);
    const [porFontSize, setPorFontSize] = useState<number>(15);
    const [porColor, setPorColor] = useState('#000000');
    const [porFontFamily, setPorFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [porPos, setPorPos] = useState({ x: 0, y: 0 });
    const [porRotation, setPorRotation] = useState<number>(0);

    // 5. SÍMBOLO DA MOEDA "R$" (PREÇO PRINCIPAL) - POR ORDEM DE GRANDEZA
    const [currencySymbol, setCurrencySymbol] = useState('R$');
    const [showCurrency, setShowCurrency] = useState(true);
    const [currencyFontSizeTens, setCurrencyFontSizeTens] = useState<number>(26);
    const [currencyFontSizeHundreds, setCurrencyFontSizeHundreds] = useState<number>(26);
    const [currencyFontSizeThousands, setCurrencyFontSizeThousands] = useState<number>(22);
    const [currencyColor, setCurrencyColor] = useState('#000000');
    const [currencyFontFamily, setCurrencyFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [currencyPos, setCurrencyPos] = useState({ x: 0, y: 0 });
    const [currencyRotation, setCurrencyRotation] = useState<number>(0);

    // 6. PREÇO PRINCIPAL (NÚMERO GRANDE POR:) - POR ORDEM DE GRANDEZA
    const [promoPrice, setPromoPrice] = useState(initialProduct?.promoPrice || config.promoPrice || '399,00');
    const [showPromoPrice, setShowPromoPrice] = useState(true);
    const [priceColor, setPriceColor] = useState(config.priceColor || '#1e3a8a');
    const [promoPriceFontFamily, setPromoPriceFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [promoPricePos, setPromoPricePos] = useState({ x: 0, y: 0 });
    const [promoPriceRotation, setPromoPriceRotation] = useState<number>(0);
    
    // Escalas por Ordem de Grandeza (Dezena, Centena, Milhar, Dezena de Milhar)
    const [scaleTens, setScaleTens] = useState<number>(115);            
    const [scaleHundreds, setScaleHundreds] = useState<number>(100);    
    const [scaleThousands, setScaleThousands] = useState<number>(88);   
    const [scaleTenThousands, setScaleTenThousands] = useState<number>(75); 

    // 7. CENTAVOS ",00" - POR ORDEM DE GRANDEZA
    const [centsText, setCentsText] = useState(',00');
    const [showCents, setShowCents] = useState(true);
    const [centsFontSizeTens, setCentsFontSizeTens] = useState<number>(26);
    const [centsFontSizeHundreds, setCentsFontSizeHundreds] = useState<number>(26);
    const [centsFontSizeThousands, setCentsFontSizeThousands] = useState<number>(22);
    const [centsColor, setCentsColor] = useState('#000000');
    const [centsFontFamily, setCentsFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [centsPos, setCentsPos] = useState({ x: 0, y: 0 });
    const [centsRotation, setCentsRotation] = useState<number>(0);

    // ORDEM DE GRANDEZA SELECIONADA NA BARRA DE FERRAMENTAS (DEZENA, CENTENA, MILHAR)
    const [selectedMagnitude, setSelectedMagnitude] = useState<'tens' | 'hundreds' | 'thousands'>('hundreds');

    // MAPA DE TEMPLATES INDEPENDENTES POR ORDEM DE GRANDEZA (DEZENA, CENTENA, MILHAR)
    const [magnitudeTemplates, setMagnitudeTemplates] = useState<{
        tens?: any;
        hundreds?: any;
        thousands?: any;
    }>({});

    // LINHAS GUIA DE ALINHAMENTO MAGNÉTICO (ÍMÃ)
    const [activeGuideX, setActiveGuideX] = useState<number | null>(null);
    const [activeGuideY, setActiveGuideY] = useState<number | null>(null);

    // 8. TIPO DE ETIQUETA
    const [dbOpportunities, setDbOpportunities] = useState<Opportunity[]>([]);
    const [selectedOppId, setSelectedOppId] = useState<string>('salvado');

    // 9. PARCELAMENTO
    const [showInstallments, setShowInstallments] = useState(false);
    const [installments, setInstallments] = useState('Em até 10x sem juros no cartão');
    const [installmentsFontSize, setInstallmentsFontSize] = useState<number>(12);
    const [installmentsColor, setInstallmentsColor] = useState('#000000');
    const [installmentsFontFamily, setInstallmentsFontFamily] = useState<string>('Inter, system-ui, sans-serif');
    const [installmentsPos, setInstallmentsPos] = useState({ x: 0, y: 0 });
    const [installmentsRotation, setInstallmentsRotation] = useState<number>(0);

    // 10. FUNDO DA ETIQUETA
    const [bgColor, setBgColor] = useState<string>(defaultBgColor);

    // Estado de Seleção e Menus
    const [selectedElement, setSelectedElement] = useState<PriceLabelLayerKey>(null);
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);

    const isInitializedRef = useRef(false);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // Drag de Posição
    const dragRef = useRef<{
        isDragging: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        startY: number;
        initialPos: { x: number; y: number };
    }>({
        isDragging: false,
        layer: null,
        startX: 0,
        startY: 0,
        initialPos: { x: 0, y: 0 }
    });

    // Resize do Elemento
    const resizeRef = useRef<{
        isResizing: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        startY: number;
        initialVal: number;
    }>({
        isResizing: false,
        layer: null,
        startX: 0,
        startY: 0,
        initialVal: 0
    });

    // Rotação do Elemento
    const rotateRef = useRef<{
        isRotating: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        initialRot: number;
    }>({
        isRotating: false,
        layer: null,
        startX: 0,
        initialRot: 0
    });

    // BLOQUEIO DE SCROLL DO BODY QUANDO MODAL ESTÁ ABERTO
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Histórico de Ações (Undo / Redo Stack)
    const [historyStack, setHistoryStack] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const isApplyingHistoryRef = useRef(false);

    // SNAPSHOT DOS VALORES DE ESTILO E POSICIONAMENTO DA MAGNITUDE ATUAL
    const getMagnitudeSnapshot = useCallback(() => ({
        title, showTitle, titleFontSize, titleColor, titleFontFamily, titlePos, titleRotation,
        deText, showDe, deFontSize, deColor, deFontFamily, dePos, deRotation,
        normalPrice, showNormalPrice, normalPriceFontSize, normalPriceColor, normalPriceFontFamily, normalPricePos, normalPriceRotation,
        porText, showPor, porFontSize, porColor, porFontFamily, porPos, porRotation,
        currencySymbol, showCurrency, currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands, currencyColor, currencyFontFamily, currencyPos, currencyRotation,
        promoPrice, showPromoPrice, priceColor, promoPriceFontFamily, promoPricePos, promoPriceRotation, scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsText, showCents, centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands, centsColor, centsFontFamily, centsPos, centsRotation,
        showInstallments, installments, installmentsFontSize, installmentsColor, installmentsFontFamily, installmentsPos, installmentsRotation,
        bgColor
    }), [
        title, showTitle, titleFontSize, titleColor, titleFontFamily, titlePos, titleRotation,
        deText, showDe, deFontSize, deColor, deFontFamily, dePos, deRotation,
        normalPrice, showNormalPrice, normalPriceFontSize, normalPriceColor, normalPriceFontFamily, normalPricePos, normalPriceRotation,
        porText, showPor, porFontSize, porColor, porFontFamily, porPos, porRotation,
        currencySymbol, showCurrency, currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands, currencyColor, currencyFontFamily, currencyPos, currencyRotation,
        promoPrice, showPromoPrice, priceColor, promoPriceFontFamily, promoPricePos, promoPriceRotation, scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsText, showCents, centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands, centsColor, centsFontFamily, centsPos, centsRotation,
        showInstallments, installments, installmentsFontSize, installmentsColor, installmentsFontFamily, installmentsPos, installmentsRotation,
        bgColor
    ]);

    // SNAPSHOT COMPLETO DO TIPO DE ETIQUETA (INCLUINDO AS 3 ORDENS DE GRANDEZA)
    const getSnapshot = useCallback(() => {
        const curMagState = getMagnitudeSnapshot();
        const fullTemplates = {
            ...magnitudeTemplates,
            [selectedMagnitude]: curMagState
        };
        return {
            selectedOppId,
            selectedMagnitude,
            magnitudeTemplates: fullTemplates,
            ...curMagState
        };
    }, [selectedOppId, selectedMagnitude, magnitudeTemplates, getMagnitudeSnapshot]);

    // APLICA O SNAPSHOT DE UMA ORDEM DE GRANDEZA ESPECÍFICA
    const applyMagnitudeSnapshot = (s: any) => {
        if (!s) return;
        if (s.title !== undefined) setTitle(s.title);
        if (s.showTitle !== undefined) setShowTitle(s.showTitle);
        if (s.titleFontSize !== undefined) setTitleFontSize(s.titleFontSize);
        if (s.titleColor) setTitleColor(s.titleColor);
        if (s.titleFontFamily) setTitleFontFamily(s.titleFontFamily);
        if (s.titlePos) setTitlePos(s.titlePos);
        if (s.titleRotation !== undefined) setTitleRotation(s.titleRotation);

        if (s.deText !== undefined) setDeText(s.deText);
        if (s.showDe !== undefined) setShowDe(s.showDe);
        if (s.deFontSize !== undefined) setDeFontSize(s.deFontSize);
        if (s.deColor) setDeColor(s.deColor);
        if (s.deFontFamily) setDeFontFamily(s.deFontFamily);
        if (s.dePos) setDePos(s.dePos);
        if (s.deRotation !== undefined) setDeRotation(s.deRotation);

        if (s.normalPrice !== undefined) setNormalPrice(s.normalPrice);
        if (s.showNormalPrice !== undefined) setShowNormalPrice(s.showNormalPrice);
        if (s.normalPriceFontSize !== undefined) setNormalPriceFontSize(s.normalPriceFontSize);
        if (s.normalPriceColor) setNormalPriceColor(s.normalPriceColor);
        if (s.normalPriceFontFamily) setNormalPriceFontFamily(s.normalPriceFontFamily);
        if (s.normalPricePos) setNormalPricePos(s.normalPricePos);
        if (s.normalPriceRotation !== undefined) setNormalPriceRotation(s.normalPriceRotation);

        if (s.porText !== undefined) setPorText(s.porText);
        if (s.showPor !== undefined) setShowPor(s.showPor);
        if (s.porFontSize !== undefined) setPorFontSize(s.porFontSize);
        if (s.porColor) setPorColor(s.porColor);
        if (s.porFontFamily) setPorFontFamily(s.porFontFamily);
        if (s.porPos) setPorPos(s.porPos);
        if (s.porRotation !== undefined) setPorRotation(s.porRotation);

        if (s.currencySymbol !== undefined) setCurrencySymbol(s.currencySymbol);
        if (s.showCurrency !== undefined) setShowCurrency(s.showCurrency);
        if (s.currencyFontSizeTens !== undefined) setCurrencyFontSizeTens(s.currencyFontSizeTens);
        else if (s.currencyFontSize !== undefined) setCurrencyFontSizeTens(s.currencyFontSize);
        if (s.currencyFontSizeHundreds !== undefined) setCurrencyFontSizeHundreds(s.currencyFontSizeHundreds);
        else if (s.currencyFontSize !== undefined) setCurrencyFontSizeHundreds(s.currencyFontSize);
        if (s.currencyFontSizeThousands !== undefined) setCurrencyFontSizeThousands(s.currencyFontSizeThousands);
        else if (s.currencyFontSize !== undefined) setCurrencyFontSizeThousands(s.currencyFontSize);

        if (s.currencyColor) setCurrencyColor(s.currencyColor);
        if (s.currencyFontFamily) setCurrencyFontFamily(s.currencyFontFamily);
        if (s.currencyPos) setCurrencyPos(s.currencyPos);
        if (s.currencyRotation !== undefined) setCurrencyRotation(s.currencyRotation);

        if (s.promoPrice !== undefined) setPromoPrice(s.promoPrice);
        if (s.showPromoPrice !== undefined) setShowPromoPrice(s.showPromoPrice);
        if (s.priceColor) setPriceColor(s.priceColor);
        if (s.promoPriceFontFamily) setPromoPriceFontFamily(s.promoPriceFontFamily);
        if (s.promoPricePos) setPromoPricePos(s.promoPricePos);
        if (s.promoPriceRotation !== undefined) setPromoPriceRotation(s.promoPriceRotation);
        if (s.scaleTens !== undefined) setScaleTens(s.scaleTens);
        if (s.scaleHundreds !== undefined) setScaleHundreds(s.scaleHundreds);
        if (s.scaleThousands !== undefined) setScaleThousands(s.scaleThousands);
        if (s.scaleTenThousands !== undefined) setScaleTenThousands(s.scaleTenThousands);

        if (s.centsText !== undefined) setCentsText(s.centsText);
        if (s.showCents !== undefined) setShowCents(s.showCents);
        if (s.centsFontSizeTens !== undefined) setCentsFontSizeTens(s.centsFontSizeTens);
        else if (s.centsFontSize !== undefined) setCentsFontSizeTens(s.centsFontSize);
        if (s.centsFontSizeHundreds !== undefined) setCentsFontSizeHundreds(s.centsFontSizeHundreds);
        else if (s.centsFontSize !== undefined) setCentsFontSizeHundreds(s.centsFontSize);
        if (s.centsFontSizeThousands !== undefined) setCentsFontSizeThousands(s.centsFontSizeThousands);
        else if (s.centsFontSize !== undefined) setCentsFontSizeThousands(s.centsFontSize);

        if (s.centsColor) setCentsColor(s.centsColor);
        if (s.centsFontFamily) setCentsFontFamily(s.centsFontFamily);
        if (s.centsPos) setCentsPos(s.centsPos);
        if (s.centsRotation !== undefined) setCentsRotation(s.centsRotation);

        if (s.showInstallments !== undefined) setShowInstallments(s.showInstallments);
        if (s.installments) setInstallments(s.installments);
        if (s.installmentsFontSize !== undefined) setInstallmentsFontSize(s.installmentsFontSize);
        if (s.installmentsColor) setInstallmentsColor(s.installmentsColor);
        if (s.installmentsFontFamily) setInstallmentsFontFamily(s.installmentsFontFamily);
        if (s.installmentsPos) setInstallmentsPos(s.installmentsPos);
        if (s.installmentsRotation !== undefined) setInstallmentsRotation(s.installmentsRotation);

        if (s.bgColor && s.bgColor !== '#ffffff') {
            setBgColor(s.bgColor);
        } else if (defaultBgColor) {
            setBgColor(defaultBgColor);
        }
    };

    const applySnapshot = (s: any) => {
        if (!s) return;
        isApplyingHistoryRef.current = true;
        
        if (s.magnitudeTemplates) {
            setMagnitudeTemplates(s.magnitudeTemplates);
        }

        if (s.selectedOppId) setSelectedOppId(s.selectedOppId);

        const targetMag = s.selectedMagnitude || selectedMagnitude || 'hundreds';
        setSelectedMagnitude(targetMag);

        if (s.magnitudeTemplates && s.magnitudeTemplates[targetMag]) {
            applyMagnitudeSnapshot(s.magnitudeTemplates[targetMag]);
        } else {
            applyMagnitudeSnapshot(s);
        }

        setTimeout(() => {
            isApplyingHistoryRef.current = false;
        }, 50);
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
            applyMagnitudeSnapshot(targetState);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const nextIdx = historyIndex - 1;
            setHistoryIndex(nextIdx);
            applySnapshot(historyStack[nextIdx]);
            toast.info('Ação desfeita');
        }
    };

    const handleRedo = () => {
        if (historyIndex < historyStack.length - 1) {
            const nextIdx = historyIndex + 1;
            setHistoryIndex(nextIdx);
            applySnapshot(historyStack[nextIdx]);
            toast.info('Ação refeita');
        }
    };

    // Registra o estado inicial ao abrir
    useEffect(() => {
        if (isOpen && historyStack.length === 0) {
            const initial = getSnapshot();
            setHistoryStack([initial]);
            setHistoryIndex(0);
        }
    }, [isOpen]);

    // Carrega modelo salvo por Oportunidade ou modelo global
    useEffect(() => {
        if (!isOpen) {
            isInitializedRef.current = false;
            return;
        }

        const ultimasSaved = localStorage.getItem(getOppTemplateKey('ultimas-unidades')) || localStorage.getItem(getOppTemplateKey('mostruario'));
        if (ultimasSaved && !localStorage.getItem(getOppTemplateKey('salvado'))) {
            localStorage.setItem(getOppTemplateKey('salvado'), ultimasSaved);
            localStorage.setItem(GLOBAL_PRICE_LABEL_ART_KEY, ultimasSaved);
        }

        const oppSaved = localStorage.getItem(getOppTemplateKey(selectedOppId));
        const salvadoSaved = localStorage.getItem(getOppTemplateKey('salvado'));
        let savedGlobal = oppSaved || salvadoSaved || ultimasSaved || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
        
        if (!savedGlobal) {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.includes('price_label_art') || k.includes('morante_') || k.includes('template'))) {
                    const val = localStorage.getItem(k);
                    if (val && val.includes('promoPrice')) {
                        savedGlobal = val;
                        break;
                    }
                }
            }
        }

        if (savedGlobal) {
            try {
                const parsed = JSON.parse(savedGlobal);
                applySnapshot(parsed);
            } catch (e) {
                console.error("Erro ao restaurar template da etiqueta:", e);
            }
        }

        // Marca como inicializado após aplicar a restauração
        setTimeout(() => {
            isInitializedRef.current = true;
        }, 100);
    }, [isOpen]);

    // Carrega oportunidades cadastradas no Supabase
    useEffect(() => {
        if (!isOpen) return;
        async function fetchOpps() {
            try {
                const { data } = await supabase.from('opportunities').select('id, name, slug, badge_color, border_color');
                if (data && data.length > 0) {
                    setDbOpportunities(data);
                    if (initialProduct?.opportunities) {
                        const opp = initialProduct.opportunities;
                        const oppKey = opp.id || opp.slug || 'salvado';
                        setSelectedOppId(oppKey);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar oportunidades:", err);
            }
        }
        fetchOpps();
    }, [isOpen, initialProduct]);

    // LISTA DE OPÇÕES DO SELETOR DE ETIQUETA
    const allOppOptions = useMemo(() => {
        if (dbOpportunities && dbOpportunities.length > 0) {
            return dbOpportunities.map(opp => ({
                id: opp.id || opp.slug || opp.name,
                name: opp.name.toUpperCase()
            }));
        }
        return [{ id: 'salvado', name: 'QUEIMA DOS SALVADOS' }];
    }, [dbOpportunities]);

    // SALVAMENTO AUTOMÁTICO DE MODELO POR TIPO DE ETIQUETA (SOMENTE APÓS INICIALIZAÇÃO CONCLUÍDA E ESTRITAMENTE ISOLADO POR oppId)
    useEffect(() => {
        if (!isOpen || !isInitializedRef.current || isApplyingHistoryRef.current) return;

        const currentSnapshot = getSnapshot();
        // Salva ESTRITAMENTE sob a chave individual da modalidade selecionada
        localStorage.setItem(getOppTemplateKey(selectedOppId), JSON.stringify(currentSnapshot));
        
        // Apenas atualiza a chave global se a modalidade for salvado
        if (selectedOppId === 'salvado') {
            localStorage.setItem(GLOBAL_PRICE_LABEL_ART_KEY, JSON.stringify(currentSnapshot));
        }

        onSaveConfig({
            text: title,
            price: normalPrice,
            promoPrice: promoPrice,
            showPromoPrice: showPromoPrice,
            bg_color: bgColor,
            priceColor: priceColor,
            promoPriceColor: priceColor,
            priceFormat: 'split',
            showName: showTitle,
            priceFontSizeTens: scaleTens,
            priceFontSizeHundreds: scaleHundreds,
            priceFontSizeThousands: scaleThousands,
            priceFontSizeTenThousands: scaleTenThousands,
            namePosX: titlePos.x,
            namePosY: titlePos.y,
            pricePosX: promoPricePos.x,
            pricePosY: promoPricePos.y,
        });
    }, [
        isOpen, selectedOppId, title, showTitle, titleFontSize, titleColor, titleFontFamily, titlePos, titleRotation,
        deText, showDe, deFontSize, deColor, deFontFamily, dePos, deRotation,
        normalPrice, showNormalPrice, normalPriceFontSize, normalPriceColor, normalPriceFontFamily, normalPricePos, normalPriceRotation,
        porText, showPor, porFontSize, porColor, porFontFamily, porPos, porRotation,
        currencySymbol, showCurrency, currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands, currencyColor, currencyFontFamily, currencyPos, currencyRotation,
        promoPrice, showPromoPrice, priceColor, promoPriceFontFamily, promoPricePos, promoPriceRotation, scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsText, showCents, centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands, centsColor, centsFontFamily, centsPos, centsRotation,
        showInstallments, installments, installmentsFontSize, installmentsColor, installmentsFontFamily, installmentsPos, installmentsRotation,
        bgColor, magnitudeTemplates, selectedMagnitude
    ]);

    // TECLAS DO TECLADO PARA MOVER ELEMENTO & ATALHOS DESFAZER/REFAZER
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            const isInput = targetTag === 'input' || targetTag === 'textarea';

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (isInput) return;
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                if (isInput) return;
                e.preventDefault();
                handleRedo();
                return;
            }

            if (!selectedElement || selectedElement === 'background') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (isInput) return;

                e.preventDefault();
                const step = e.shiftKey ? 5 : 1;
                const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
                const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;

                if (selectedElement === 'title') setTitlePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'deText') setDePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'normalPrice') setNormalPricePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'porText') setPorPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'currencySymbol') setCurrencyPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'promoPrice') setPromoPricePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'cents') setCentsPos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'installments') setInstallmentsPos(p => ({ x: p.x + dx, y: p.y + dy }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedElement, historyIndex, historyStack]);

    // SELEÇÃO INTELIGENTE DE ELEMENTOS (ALTERNÂNCIA DE CAMADAS SOBREPOSTAS AO RE-CLICAR)
    const handleElementClick = useCallback((layerKey: PriceLabelLayerKey, e: React.MouseEvent) => {
        e.stopPropagation();

        const visibleLayers: { key: PriceLabelLayerKey; label: string }[] = [
            { key: 'title', label: 'Nome do Produto' },
            { key: 'deText', label: 'Texto "De"' },
            { key: 'normalPrice', label: 'Preço Original' },
            { key: 'porText', label: 'Texto "Por"' },
            { key: 'currencySymbol', label: 'Símbolo R$' },
            { key: 'promoPrice', label: 'Preço Principal' },
            { key: 'cents', label: 'Centavos' },
            { key: 'installments', label: 'Parcelamento' }
        ];

        if (selectedElement === layerKey) {
            const activeList = visibleLayers.filter(l => {
                if (l.key === 'title') return showTitle;
                if (l.key === 'deText') return showDe;
                if (l.key === 'normalPrice') return showNormalPrice;
                if (l.key === 'porText') return showPor;
                if (l.key === 'currencySymbol') return showCurrency;
                if (l.key === 'promoPrice') return showPromoPrice;
                if (l.key === 'cents') return showCents;
                if (l.key === 'installments') return showInstallments;
                return false;
            });

            const curIdx = activeList.findIndex(l => l.key === layerKey);
            if (curIdx !== -1 && activeList.length > 1) {
                const nextLayer = activeList[(curIdx + 1) % activeList.length];
                setSelectedElement(nextLayer.key);
                return;
            }
        }

        setSelectedElement(layerKey);
    }, [selectedElement, showTitle, showDe, showNormalPrice, showPor, showCurrency, showPromoPrice, showCents, showInstallments]);

    // ARRASTATOR DE ELEMENTOS NO CANVAS COM ÍMÃ E LINHAS GUIA MAGNÉTICAS
    const startDragging = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();

        let initial = { x: 0, y: 0 };
        if (layer === 'title') initial = { ...titlePos };
        else if (layer === 'deText') initial = { ...dePos };
        else if (layer === 'normalPrice') initial = { ...normalPricePos };
        else if (layer === 'porText') initial = { ...porPos };
        else if (layer === 'currencySymbol') initial = { ...currencyPos };
        else if (layer === 'promoPrice') initial = { ...promoPricePos };
        else if (layer === 'cents') initial = { ...centsPos };
        else if (layer === 'installments') initial = { ...installmentsPos };

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragRef.current = {
            isDragging: true,
            layer,
            startX: clientX,
            startY: clientY,
            initialPos: initial
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!dragRef.current.isDragging || !dragRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
            
            const dx = Math.round((curX - dragRef.current.startX));
            const dy = Math.round((curY - dragRef.current.startY));
            let newX = dragRef.current.initialPos.x + dx;
            let newY = dragRef.current.initialPos.y + dy;

            const l = dragRef.current.layer;
            const SNAP_THRESHOLD = 6;

            const targets: { x: number; y: number }[] = [
                { x: 0, y: 0 } // Centro da etiqueta
            ];

            if (showTitle && l !== 'title') targets.push(titlePos);
            if (showDe && l !== 'deText') targets.push(dePos);
            if (showNormalPrice && l !== 'normalPrice') targets.push(normalPricePos);
            if (showPor && l !== 'porText') targets.push(porPos);
            if (showCurrency && l !== 'currencySymbol') targets.push(currencyPos);
            if (showPromoPrice && l !== 'promoPrice') targets.push(promoPricePos);
            if (showCents && l !== 'cents') targets.push(centsPos);
            if (showInstallments && l !== 'installments') targets.push(installmentsPos);

            let guideX: number | null = null;
            let guideY: number | null = null;

            for (const t of targets) {
                if (Math.abs(newX - t.x) <= SNAP_THRESHOLD) {
                    newX = t.x;
                    guideX = t.x;
                }
                if (Math.abs(newY - t.y) <= SNAP_THRESHOLD) {
                    newY = t.y;
                    guideY = t.y;
                }
            }

            setActiveGuideX(guideX);
            setActiveGuideY(guideY);

            const newPos = { x: newX, y: newY };

            if (l === 'title') setTitlePos(newPos);
            else if (l === 'deText') setDePos(newPos);
            else if (l === 'normalPrice') setNormalPricePos(newPos);
            else if (l === 'porText') setPorPos(newPos);
            else if (l === 'currencySymbol') setCurrencyPos(newPos);
            else if (l === 'promoPrice') setPromoPricePos(newPos);
            else if (l === 'cents') setCentsPos(newPos);
            else if (l === 'installments') setInstallmentsPos(newPos);
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
            setActiveGuideX(null);
            setActiveGuideY(null);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [
        titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, installmentsPos,
        showTitle, showDe, showNormalPrice, showPor, showCurrency, showPromoPrice, showCents, showInstallments
    ]);

    const formatDisplayPrice = (val: string) => {
        if (!val) return '0';
        const clean = val.replace(/[^\d,.]/g, '');
        return clean || '0';
    };

    const getIntegerPart = (val: string) => {
        const clean = formatDisplayPrice(val);
        const parts = clean.split(',');
        return parts[0] || '0';
    };

    // VALOR FICTÍCIO DO PREÇO PRINCIPAL BASEADO NA ORDEM DE GRANDEZA SELECIONADA (99 PARA DEZENA, 999 PARA CENTENA, 9.999 PARA MILHAR)
    const displayPriceNumber = useMemo(() => {
        if (selectedMagnitude === 'tens') return '99';
        if (selectedMagnitude === 'hundreds') return '999';
        if (selectedMagnitude === 'thousands') return '9.999';
        return getIntegerPart(promoPrice || normalPrice || '399');
    }, [selectedMagnitude, promoPrice, normalPrice]);

    // Valores dinâmicos para renderização baseados na Ordem de Grandeza ativa ou selecionada
    const activeCurrencyFontSize = 
        selectedMagnitude === 'tens' ? currencyFontSizeTens :
        selectedMagnitude === 'hundreds' ? currencyFontSizeHundreds : currencyFontSizeThousands;

    const activeCentsFontSize = 
        selectedMagnitude === 'tens' ? centsFontSizeTens :
        selectedMagnitude === 'hundreds' ? centsFontSizeHundreds : centsFontSizeThousands;

    const activeScale = 
        selectedMagnitude === 'tens' ? scaleTens :
        selectedMagnitude === 'hundreds' ? scaleHundreds :
        selectedMagnitude === 'thousands' ? scaleThousands : scaleTenThousands;

    // REDIMENSIONAR ELEMENTO ARRASTANDO O CANTO INFERIOR DIREITO
    const startResizing = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement(layer);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        let initial = 14;
        if (layer === 'title') initial = titleFontSize;
        else if (layer === 'deText') initial = deFontSize;
        else if (layer === 'normalPrice') initial = normalPriceFontSize;
        else if (layer === 'porText') initial = porFontSize;
        else if (layer === 'currencySymbol') initial = activeCurrencyFontSize;
        else if (layer === 'cents') initial = activeCentsFontSize;
        else if (layer === 'installments') initial = installmentsFontSize;
        else if (layer === 'promoPrice') initial = activeScale;

        resizeRef.current = {
            isResizing: true,
            layer,
            startX: clientX,
            startY: clientY,
            initialVal: initial
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!resizeRef.current.isResizing || !resizeRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

            const delta = (curX - resizeRef.current.startX) + (curY - resizeRef.current.startY);
            const l = resizeRef.current.layer;

            if (l === 'promoPrice') {
                const newScale = Math.max(10, Math.round(resizeRef.current.initialVal + delta * 0.35));
                if (selectedMagnitude === 'tens') setScaleTens(newScale);
                else if (selectedMagnitude === 'hundreds') setScaleHundreds(newScale);
                else if (selectedMagnitude === 'thousands') setScaleThousands(newScale);
                else setScaleTenThousands(newScale);
            } else if (l === 'currencySymbol') {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                if (selectedMagnitude === 'tens') setCurrencyFontSizeTens(newSize);
                else if (selectedMagnitude === 'hundreds') setCurrencyFontSizeHundreds(newSize);
                else setCurrencyFontSizeThousands(newSize);
            } else if (l === 'cents') {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                if (selectedMagnitude === 'tens') setCentsFontSizeTens(newSize);
                else if (selectedMagnitude === 'hundreds') setCentsFontSizeHundreds(newSize);
                else setCentsFontSizeThousands(newSize);
            } else {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                if (l === 'title') setTitleFontSize(newSize);
                else if (l === 'deText') setDeFontSize(newSize);
                else if (l === 'normalPrice') setNormalPriceFontSize(newSize);
                else if (l === 'porText') setPorFontSize(newSize);
                else if (l === 'installments') setInstallmentsFontSize(newSize);
            }
        };

        const handleMouseUp = () => {
            resizeRef.current.isResizing = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [titleFontSize, deFontSize, normalPriceFontSize, porFontSize, activeCurrencyFontSize, activeCentsFontSize, installmentsFontSize, activeScale, selectedMagnitude]);

    // ROTACIONAR ELEMENTO ARRASTANDO A SETA CURVADA
    const startRotating = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement(layer);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

        let initialRot = 0;
        if (layer === 'title') initialRot = titleRotation;
        else if (layer === 'deText') initialRot = deRotation;
        else if (layer === 'normalPrice') initialRot = normalPriceRotation;
        else if (layer === 'porText') initialRot = porRotation;
        else if (layer === 'currencySymbol') initialRot = currencyRotation;
        else if (layer === 'promoPrice') initialRot = promoPriceRotation;
        else if (layer === 'cents') initialRot = centsRotation;
        else if (layer === 'installments') initialRot = installmentsRotation;

        rotateRef.current = {
            isRotating: true,
            layer,
            startX: clientX,
            initialRot
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!rotateRef.current.isRotating || !rotateRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;

            const dx = curX - rotateRef.current.startX;
            const newRot = Math.round((rotateRef.current.initialRot + dx * 0.8) % 360);

            const l = rotateRef.current.layer;
            if (l === 'title') setTitleRotation(newRot);
            else if (l === 'deText') setDeRotation(newRot);
            else if (l === 'normalPrice') setNormalPriceRotation(newRot);
            else if (l === 'porText') setPorRotation(newRot);
            else if (l === 'currencySymbol') setCurrencyRotation(newRot);
            else if (l === 'promoPrice') setPromoPriceRotation(newRot);
            else if (l === 'cents') setCentsRotation(newRot);
            else if (l === 'installments') setInstallmentsRotation(newRot);
        };

        const handleMouseUp = () => {
            rotateRef.current.isRotating = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [titleRotation, deRotation, normalPriceRotation, porRotation, currencyRotation, promoPriceRotation, centsRotation, installmentsRotation]);

    // TROCA DE TIPO DE ETIQUETA (ISOLAMENTO DE ESTILOS POR TIPO DE ETIQUETA)
    const handleSelectOpportunityContext = (newOppId: string) => {
        setSelectedOppId(newOppId);

        const oppSaved = localStorage.getItem(getOppTemplateKey(newOppId));
        if (oppSaved) {
            try {
                applySnapshot(JSON.parse(oppSaved));
                return;
            } catch (e) {
                console.error("Erro ao carregar template da modalidade:", e);
            }
        }

        const salvadoSaved = localStorage.getItem(getOppTemplateKey('salvado')) || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
        if (salvadoSaved) {
            try {
                applySnapshot(JSON.parse(salvadoSaved));
            } catch (e) {}
        }
    };

    // APLICAÇÃO DE COR
    const handleColorSelect = (newColor: string) => {
        if (selectedElement === 'title') setTitleColor(newColor);
        else if (selectedElement === 'deText') setDeColor(newColor);
        else if (selectedElement === 'normalPrice') setNormalPriceColor(newColor);
        else if (selectedElement === 'porText') setPorColor(newColor);
        else if (selectedElement === 'currencySymbol') setCurrencyColor(newColor);
        else if (selectedElement === 'promoPrice') setPriceColor(newColor);
        else if (selectedElement === 'cents') setCentsColor(newColor);
        else if (selectedElement === 'installments') setInstallmentsColor(newColor);
        else if (selectedElement === 'background') setBgColor(newColor);

        setColorHistory(prev => {
            const filtered = prev.filter(c => c.toLowerCase() !== newColor.toLowerCase());
            return [newColor, ...filtered].slice(0, 10);
        });
    };

    // ALTERAR FONTE DA CAMADA ATIVA
    const handleFontChange = (fontVal: string) => {
        if (selectedElement === 'title') setTitleFontFamily(fontVal);
        else if (selectedElement === 'deText') setDeFontFamily(fontVal);
        else if (selectedElement === 'normalPrice') setNormalPriceFontFamily(fontVal);
        else if (selectedElement === 'porText') setPorFontFamily(fontVal);
        else if (selectedElement === 'currencySymbol') setCurrencyFontFamily(fontVal);
        else if (selectedElement === 'promoPrice') setPromoPriceFontFamily(fontVal);
        else if (selectedElement === 'cents') setCentsFontFamily(fontVal);
        else if (selectedElement === 'installments') setInstallmentsFontFamily(fontVal);
    };

    const activeFontFamily = 
        selectedElement === 'title' ? titleFontFamily :
        selectedElement === 'deText' ? deFontFamily :
        selectedElement === 'normalPrice' ? normalPriceFontFamily :
        selectedElement === 'porText' ? porFontFamily :
        selectedElement === 'currencySymbol' ? currencyFontFamily :
        selectedElement === 'promoPrice' ? promoPriceFontFamily :
        selectedElement === 'cents' ? centsFontFamily :
        selectedElement === 'installments' ? installmentsFontFamily :
        'Inter, system-ui, sans-serif';

    const activeColor = 
        selectedElement === 'title' ? titleColor :
        selectedElement === 'deText' ? deColor :
        selectedElement === 'normalPrice' ? normalPriceColor :
        selectedElement === 'porText' ? porColor :
        selectedElement === 'currencySymbol' ? currencyColor :
        selectedElement === 'promoPrice' ? priceColor :
        selectedElement === 'cents' ? centsColor :
        selectedElement === 'installments' ? installmentsColor :
        bgColor;

    if (!isOpen) return null;

    const priceLabelLayers: { 
        key: NonNullable<PriceLabelLayerKey>; 
        label: string; 
        icon: string; 
        isVisible: boolean; 
        toggleVisibility: () => void; 
        pos: { x: number; y: number };
        resetPos: () => void;
        desc: string 
    }[] = [
        { 
            key: 'title', 
            label: 'NOME DO PRODUTO', 
            icon: 'bi-fonts', 
            isVisible: showTitle, 
            toggleVisibility: () => setShowTitle(!showTitle), 
            pos: titlePos,
            resetPos: () => { setTitlePos({ x: 0, y: 0 }); setTitleRotation(0); },
            desc: 'Cabeçalho superior' 
        },
        { 
            key: 'deText', 
            label: 'TEXTO "DE"', 
            icon: 'bi-type', 
            isVisible: showDe, 
            toggleVisibility: () => setShowDe(!showDe), 
            pos: dePos,
            resetPos: () => { setDePos({ x: 0, y: 0 }); setDeRotation(0); },
            desc: 'Prefixo do preço original' 
        },
        { 
            key: 'normalPrice', 
            label: 'PREÇO ORIGINAL (DE:)', 
            icon: 'bi-type-strikethrough', 
            isVisible: showNormalPrice, 
            toggleVisibility: () => setShowNormalPrice(!showNormalPrice), 
            pos: normalPricePos,
            resetPos: () => { setNormalPricePos({ x: 0, y: 0 }); setNormalPriceRotation(0); },
            desc: 'Valor riscado horizontalmente' 
        },
        { 
            key: 'porText', 
            label: 'TEXTO "POR:"', 
            icon: 'bi-type', 
            isVisible: showPor, 
            toggleVisibility: () => setShowPor(!showPor), 
            pos: porPos,
            resetPos: () => { setPorPos({ x: 0, y: 0 }); setPorRotation(0); },
            desc: 'Sufixo do preço original' 
        },
        { 
            key: 'currencySymbol', 
            label: 'SÍMBOLO MOEDA (R$)', 
            icon: 'bi-currency-dollar', 
            isVisible: showCurrency, 
            toggleVisibility: () => setShowCurrency(!showCurrency), 
            pos: currencyPos,
            resetPos: () => { setCurrencyPos({ x: 0, y: 0 }); setCurrencyRotation(0); },
            desc: 'Símbolo R$ à esquerda' 
        },
        { 
            key: 'promoPrice', 
            label: 'PREÇO PRINCIPAL (POR:)', 
            icon: 'bi-tag-fill', 
            isVisible: showPromoPrice, 
            toggleVisibility: () => setShowPromoPrice(!showPromoPrice), 
            pos: promoPricePos,
            resetPos: () => { setPromoPricePos({ x: 0, y: 0 }); setPromoPriceRotation(0); },
            desc: 'Valor em destaque grande' 
        },
        { 
            key: 'cents', 
            label: 'CENTAVOS (,00)', 
            icon: 'bi-superscript', 
            isVisible: showCents, 
            toggleVisibility: () => setShowCents(!showCents), 
            pos: centsPos,
            resetPos: () => { setCentsPos({ x: 0, y: 0 }); setCentsRotation(0); },
            desc: 'Dígitos centavos à direita' 
        },
        { 
            key: 'installments', 
            label: 'PARCELAMENTO', 
            icon: 'bi-credit-card-2-front-fill', 
            isVisible: showInstallments, 
            toggleVisibility: () => setShowInstallments(!showInstallments), 
            pos: installmentsPos,
            resetPos: () => { setInstallmentsPos({ x: 0, y: 0 }); setInstallmentsRotation(0); },
            desc: 'Condições de pagamento' 
        },
        { 
            key: 'background', 
            label: 'FUNDO DA ETIQUETA', 
            icon: 'bi-palette-fill', 
            isVisible: true, 
            toggleVisibility: () => {}, 
            pos: { x: 0, y: 0 },
            resetPos: () => {},
            desc: 'Cor de fundo da etiqueta' 
        },
    ];

    const handleCopyImage = async () => {
        if (!previewRef.current) return;
        try {
            const hiddenEls = previewRef.current.querySelectorAll('[data-hide-export="true"]');
            hiddenEls.forEach(el => (el as HTMLElement).style.display = 'none');

            const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: null });
            
            hiddenEls.forEach(el => (el as HTMLElement).style.display = '');

            canvas.toBlob(async (blob) => {
                if (blob && navigator.clipboard && (window as any).ClipboardItem) {
                    await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': blob })]);
                    toast.success('Imagem da etiqueta copiada para a área de transferência!');
                } else {
                    toast.info('Copiar não suportado neste navegador. Use Baixar PNG.');
                }
            });
        } catch (e) {
            toast.error('Erro ao copiar imagem.');
        }
    };

    const handleDownloadPng = async () => {
        if (!previewRef.current) return;
        try {
            const hiddenEls = previewRef.current.querySelectorAll('[data-hide-export="true"]');
            hiddenEls.forEach(el => (el as HTMLElement).style.display = 'none');

            const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: null });
            
            hiddenEls.forEach(el => (el as HTMLElement).style.display = '');

            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiqueta_preco_${selectedOppId}_${Date.now()}.png`;
            a.click();
            toast.success('Download da imagem PNG concluído!');
        } catch (e) {
            toast.error('Erro ao baixar imagem PNG.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-md animate-fade-in overflow-hidden w-screen h-screen">
            {/* CARREGAMENTO DAS FONTES GOOGLE PARA AS ETIQUETAS */}
            <link 
                href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Poppins:wght@400;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap" 
                rel="stylesheet" 
            />
            
            {/* 1. MODAL HEADER FULLWIDTH */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
                        <i className="bi bi-palette-fill text-sm" />
                    </div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                            EDITOR DE ARTE DA ETIQUETA DE PREÇO
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer">
                        <i className="bi bi-x-lg text-xs" />
                    </button>
                </div>
            </div>

            {/* 2. BARRA DE MENU PRINCIPAL (SUPERIOR) */}
            <div className="flex items-center justify-start gap-3 bg-slate-200/80 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-1.5 shrink-0 overflow-x-auto custom-scrollbar">
                
                {/* LADO ESQUERDO: ARQUIVO (DROPDOWN), CAMADAS, MARGEM DE SEGURANÇA & SELEÇÃO DE TIPO DE ETIQUETA */}
                <div className="flex items-center gap-3 shrink-0 flex-nowrap">
                    
                    {/* ARQUIVO DROPDOWN (SEM CONTAINER BRANCO, APENAS TEXTO + SETA, zIndex: 99999) */}
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            className="px-2 py-1 text-xs font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1"
                        >
                            <span>Arquivo</span>
                            <i className="bi bi-chevron-down text-[9px] text-slate-400" />
                        </button>

                        {isFileMenuOpen && (
                            <div 
                                style={{ zIndex: 99999 }}
                                className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-[99999] animate-fade-in"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFileMenuOpen(false);
                                        handleDownloadPng();
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
                                >
                                    <i className="bi bi-file-earmark-arrow-down-fill text-emerald-600 text-sm" />
                                    <span>Baixar PNG</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFileMenuOpen(false);
                                        handleCopyImage();
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
                                >
                                    <i className="bi bi-clipboard-check-fill text-blue-600 text-sm" />
                                    <span>Copiar Imagem</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFileMenuOpen(false);
                                        setSelectedElement('title');
                                        const newTitle = window.prompt("Nome / Título da Arte:", title);
                                        if (newTitle !== null && newTitle.trim()) {
                                            setTitle(newTitle.trim().toUpperCase());
                                            toast.success("Título da arte atualizado!");
                                        }
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                                >
                                    <i className="bi bi-pencil-square text-purple-600 text-sm" />
                                    <span>Nomear Arte</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CAMADAS BUTTON (APENAS ÍCONE) */}
                    <button
                        type="button"
                        onClick={() => setIsLayersModalOpen(true)}
                        title="Gerenciar Camadas"
                        className="p-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-300/50 dark:hover:bg-slate-800 shrink-0"
                    >
                        <i className="bi bi-layers-fill text-blue-600 text-sm" />
                    </button>

                    {/* MARGEM DE SEGURANÇA BUTTON (APENAS ÍCONE) */}
                    <button
                        type="button"
                        onClick={() => setShowSafetyMargin(!showSafetyMargin)}
                        title="Exibir ou ocultar a borda da margem de segurança da impressão"
                        className={`p-1.5 text-xs font-black transition cursor-pointer rounded-lg shrink-0 flex items-center justify-center ${
                            showSafetyMargin 
                                ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50' 
                                : 'text-slate-600 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                        <i className="bi bi-bounding-box-circles text-sm" />
                    </button>

                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

                    {/* SELETOR DE TIPO DE ETIQUETA */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Tipo de Etiqueta:
                        </span>
                        <select
                            value={selectedOppId}
                            onChange={(e) => handleSelectOpportunityContext(e.target.value)}
                            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                        >
                            {allOppOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

                    {/* SELETOR GLOBAL DE ORDEM DE GRANDEZA NO MENU SUPERIOR */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            Grandeza:
                        </span>
                        <select
                            value={selectedMagnitude}
                            onChange={e => handleSwitchMagnitude(e.target.value as 'tens' | 'hundreds' | 'thousands')}
                            className="bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded-xl px-2.5 py-1 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                        >
                            <option value="tens">Dezena (R$ 99)</option>
                            <option value="hundreds">Centena (R$ 999)</option>
                            <option value="thousands">Milhar (R$ 1.499)</option>
                        </select>
                    </div>

                </div>

            </div>

            {/* 3. BARRA DE FERRAMENTAS DO ELEMENTO SELECIONADO */}
            <div className="flex items-center justify-start gap-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-2 shrink-0 overflow-x-auto custom-scrollbar min-h-[44px]">
                
                {/* BOTÃO DESMARCAR (SÓ ÍCONE) */}
                <button
                    type="button"
                    onClick={() => setSelectedElement(null)}
                    disabled={!selectedElement}
                    title="Desmarcar Seleção"
                    className={`w-8 h-8 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center ${
                        selectedElement
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <i className="bi bi-cursor-fill text-xs" />
                </button>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 shrink-0 mx-0.5" />

                {/* SELEÇÃO ATIVA: FERRAMENTAS DA CAMADA ATIVA */}
                {selectedElement ? (
                    <div className="flex items-center gap-3.5 shrink-0 flex-nowrap animate-fade-in">
                        
                        {/* Identificador do Elemento Ativo */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Elemento:</span>
                            <div className="flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs h-8">
                                <i className={`bi ${priceLabelLayers.find(l => l.key === selectedElement)?.icon}`} />
                                <span>{priceLabelLayers.find(l => l.key === selectedElement)?.label}</span>
                            </div>
                        </div>

                        {/* SELETOR DE FONTE / TIPOGRAFIA */}
                        {selectedElement !== 'background' && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Fonte:</span>
                                <select
                                    value={activeFontFamily}
                                    onChange={e => handleFontChange(e.target.value)}
                                    className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold outline-none h-8 cursor-pointer shadow-xs"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* SELETOR DE ORDEM DE GRANDEZA (PARA SÍMBOLO R$, PREÇO PRINCIPAL E CENTAVOS) */}
                        {['currencySymbol', 'promoPrice', 'cents'].includes(selectedElement) && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none">Ordem de Grandeza:</span>
                                <select
                                    value={selectedMagnitude}
                                    onChange={e => handleSwitchMagnitude(e.target.value as 'tens' | 'hundreds' | 'thousands')}
                                    className="bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-xl px-2.5 py-1 text-xs font-black outline-none h-8 cursor-pointer shadow-xs"
                                >
                                    <option value="tens">Dezena (ex: R$ 99)</option>
                                    <option value="hundreds">Centena (ex: R$ 999)</option>
                                    <option value="thousands">Milhar (ex: R$ 1.499)</option>
                                </select>
                            </div>
                        )}

                        {/* TAMANHO DA FONTE PARA ELEMENTOS TEXTUAIS */}
                        {['title', 'deText', 'normalPrice', 'porText', 'installments'].includes(selectedElement) && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Tamanho Fonte:</span>
                                <div className="flex items-center gap-1 h-8">
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={
                                            selectedElement === 'title' ? titleFontSize :
                                            selectedElement === 'deText' ? deFontSize :
                                            selectedElement === 'normalPrice' ? normalPriceFontSize :
                                            selectedElement === 'porText' ? porFontSize :
                                            installmentsFontSize
                                        }
                                        onChange={e => {
                                            const v = Number(e.target.value);
                                            if (selectedElement === 'title') setTitleFontSize(v);
                                            else if (selectedElement === 'deText') setDeFontSize(v);
                                            else if (selectedElement === 'normalPrice') setNormalPriceFontSize(v);
                                            else if (selectedElement === 'porText') setPorFontSize(v);
                                            else if (selectedElement === 'installments') setInstallmentsFontSize(v);
                                        }}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">px</span>
                                </div>
                            </div>
                        )}

                        {/* TAMANHO DA FONTE PARA SÍMBOLO R$ E CENTAVOS (POR ORDEM DE GRANDEZA) */}
                        {['currencySymbol', 'cents'].includes(selectedElement) && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Tamanho Fonte ({selectedMagnitude.toUpperCase()}):</span>
                                <div className="flex items-center gap-1 h-8">
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={selectedElement === 'currencySymbol' ? activeCurrencyFontSize : activeCentsFontSize}
                                        onChange={e => {
                                            const v = Number(e.target.value);
                                            if (selectedElement === 'currencySymbol') {
                                                if (selectedMagnitude === 'tens') setCurrencyFontSizeTens(v);
                                                else if (selectedMagnitude === 'hundreds') setCurrencyFontSizeHundreds(v);
                                                else setCurrencyFontSizeThousands(v);
                                            } else {
                                                if (selectedMagnitude === 'tens') setCentsFontSizeTens(v);
                                                else if (selectedMagnitude === 'hundreds') setCentsFontSizeHundreds(v);
                                                else setCentsFontSizeThousands(v);
                                            }
                                        }}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">px</span>
                                </div>
                            </div>
                        )}

                        {/* ESCALA DO PREÇO PRINCIPAL (POR ORDEM DE GRANDEZA) */}
                        {selectedElement === 'promoPrice' && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Escala Preço ({selectedMagnitude.toUpperCase()}):</span>
                                <div className="flex items-center gap-1 h-8">
                                    <input
                                        type="number"
                                        min="10"
                                        max="2000"
                                        value={activeScale}
                                        onChange={e => {
                                            const v = Number(e.target.value);
                                            if (selectedMagnitude === 'tens') setScaleTens(v);
                                            else if (selectedMagnitude === 'hundreds') setScaleHundreds(v);
                                            else if (selectedMagnitude === 'thousands') setScaleThousands(v);
                                            else setScaleTenThousands(v);
                                        }}
                                        className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">%</span>
                                </div>
                            </div>
                        )}

                        {/* SELETOR DE COR GRADIENTE (SEM RÓTULO E SEM HISTÓRICO) */}
                        <div className="flex items-center shrink-0">
                            <label 
                                className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer overflow-hidden bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-0.5" 
                                title={selectedElement === 'background' ? "Cor do Fundo" : "Cor do Elemento"}
                            >
                                <input
                                    type="color"
                                    value={activeColor}
                                    onChange={e => handleColorSelect(e.target.value)}
                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                />
                                <div className="w-full h-full rounded-lg border border-white/60" style={{ backgroundColor: activeColor }} />
                            </label>
                        </div>

                        {/* VISIBILIDADE TOGGLE (SÓ ÍCONE DE OLHO) */}
                        {(() => {
                            const layer = priceLabelLayers.find(l => l.key === selectedElement);
                            if (!layer || layer.key === 'background') return null;
                            return (
                                <button
                                    type="button"
                                    onClick={layer.toggleVisibility}
                                    title={layer.isVisible ? "Camada Visível (Clique para Ocultar)" : "Camada Oculta (Clique para Exibir)"}
                                    className={`w-8 h-8 rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center shrink-0 shadow-xs ${
                                        layer.isVisible 
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' 
                                            : 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                    }`}
                                >
                                    <i className={`bi ${layer.isVisible ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                </button>
                            );
                        })()}

                    </div>
                ) : (
                    <div className="text-[11px] font-medium text-slate-400 italic">
                        Clique em qualquer elemento na etiqueta abaixo para editá-lo
                    </div>
                )}

            </div>

            {/* MODAL BODY: PREVIEW EM 100% DA LARGURA DISPONÍVEL */}
            <div 
                onClick={() => setSelectedElement(null)}
                className="flex-1 w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-10 bg-slate-200/50 dark:bg-slate-950/80 overflow-y-auto custom-scrollbar relative"
            >
                <div className="w-full max-w-full lg:max-w-5xl xl:max-w-6xl flex flex-col items-center justify-center my-auto px-2 sm:px-4">
                    {/* Etiqueta de Preço: TODAS AS CAMADAS ABSOLUTAS COM BOUNDING BOXES EXATAS (PERMITE EXTRAPOLAR FRONTEIRAS) */}
                    <div 
                        ref={previewRef}
                        style={{ backgroundColor: bgColor }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement('background');
                        }}
                        className={`w-full aspect-[1.75/1] rounded-3xl shadow-2xl relative select-none transition-all duration-200 cursor-pointer overflow-visible ${
                            selectedElement === 'background' ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
                        }`}
                    >
                        {/* GUIA DE MARGEM DE SEGURANÇA DA IMPRESSÃO (APENAS LINHA TRACEJADA SEM RÓTULO) */}
                        {showSafetyMargin && (
                            <div 
                                data-hide-export="true"
                                className="absolute inset-3 sm:inset-4 border border-dashed border-red-500/60 pointer-events-none rounded-2xl z-20"
                            />
                        )}

                        {/* LINHAS GUIA MAGNÉTICAS DE ALINHAMENTO (ÍMÃ ALINHAMENTO HORIZONTAL E VERTICAL) */}
                        {activeGuideX !== null && (
                            <div
                                data-hide-export="true"
                                style={{ left: `calc(50% + ${activeGuideX}px)` }}
                                className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-500 z-40 pointer-events-none shadow-md animate-fade-in"
                            />
                        )}
                        {activeGuideY !== null && (
                            <div
                                data-hide-export="true"
                                style={{ top: `calc(50% + ${activeGuideY}px)` }}
                                className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 z-40 pointer-events-none shadow-md animate-fade-in"
                            />
                        )}

                        {/* 1. CABEÇALHO DA ETIQUETA: NOME DO PRODUTO */}
                        {showTitle && (
                            <div
                                onMouseDown={(e) => startDragging('title', e)}
                                onTouchStart={(e) => startDragging('title', e)}
                                onClick={(e) => handleElementClick('title', e)}
                                style={{ 
                                    color: titleColor, 
                                    fontSize: `${titleFontSize}px`,
                                    fontFamily: titleFontFamily,
                                    transform: `translate(calc(-50% + ${titlePos.x}px), ${titlePos.y}px) rotate(${titleRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'title' ? 30 : 10
                                }}
                                className={`absolute top-3 sm:top-5 left-1/2 w-max max-w-[90%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElement === 'title' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'title' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        NOME DO PRODUTO
                                    </div>
                                )}

                                <span>{title || 'TÍTULO DO PRODUTO'}</span>
                                
                                {selectedElement === 'title' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('title', e)}
                                            onTouchStart={(e) => startResizing('title', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('title', e)}
                                            onTouchStart={(e) => startRotating('title', e)}
                                            title="Arraste para rotacionar elemento"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 2. TEXTO "DE" */}
                        {showDe && (
                            <div
                                onMouseDown={(e) => startDragging('deText', e)}
                                onTouchStart={(e) => startDragging('deText', e)}
                                onClick={(e) => handleElementClick('deText', e)}
                                style={{ 
                                    color: deColor, 
                                    fontSize: `${deFontSize}px`,
                                    fontFamily: deFontFamily,
                                    transform: `translate(${dePos.x}px, ${dePos.y}px) rotate(${deRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'deText' ? 30 : 10
                                }}
                                className={`absolute top-12 sm:top-16 left-6 sm:left-12 w-max inline-flex items-center justify-center font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElement === 'deText' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'deText' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        TEXTO "DE"
                                    </div>
                                )}

                                <span>{deText}</span>
                                {selectedElement === 'deText' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('deText', e)}
                                            onTouchStart={(e) => startResizing('deText', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('deText', e)}
                                            onTouchStart={(e) => startRotating('deText', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 3. PREÇO NORMAL (DE:) RISCADO */}
                        {showNormalPrice && (
                            <div
                                onMouseDown={(e) => startDragging('normalPrice', e)}
                                onTouchStart={(e) => startDragging('normalPrice', e)}
                                onClick={(e) => handleElementClick('normalPrice', e)}
                                style={{
                                    color: normalPriceColor,
                                    fontSize: `${normalPriceFontSize}px`,
                                    fontFamily: normalPriceFontFamily,
                                    transform: `translate(${normalPricePos.x}px, ${normalPricePos.y}px) rotate(${normalPriceRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'normalPrice' ? 30 : 10
                                }}
                                className={`absolute top-12 sm:top-16 left-20 sm:left-28 w-max inline-flex items-center justify-center font-black leading-none px-0.5 py-0.5 whitespace-nowrap select-none transition-shadow ${
                                    selectedElement === 'normalPrice' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'normalPrice' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        PREÇO ORIGINAL
                                    </div>
                                )}

                                <span>R$ {formatDisplayPrice(normalPrice)}</span>
                                <span className="absolute left-0.5 right-0.5 top-1/2 -translate-y-1/2 h-[3px] bg-red-600 rounded-none shadow-xs pointer-events-none" />
                                
                                {selectedElement === 'normalPrice' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('normalPrice', e)}
                                            onTouchStart={(e) => startResizing('normalPrice', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('normalPrice', e)}
                                            onTouchStart={(e) => startRotating('normalPrice', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 4. TEXTO "POR:" */}
                        {showPor && (
                            <div
                                onMouseDown={(e) => startDragging('porText', e)}
                                onTouchStart={(e) => startDragging('porText', e)}
                                onClick={(e) => handleElementClick('porText', e)}
                                style={{ 
                                    color: porColor, 
                                    fontSize: `${porFontSize}px`,
                                    fontFamily: porFontFamily,
                                    transform: `translate(${porPos.x}px, ${porPos.y}px) rotate(${porRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'porText' ? 30 : 10
                                }}
                                className={`absolute top-12 sm:top-16 left-56 sm:left-72 w-max inline-flex items-center justify-center font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElement === 'porText' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'porText' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        TEXTO "POR"
                                    </div>
                                )}

                                <span>{porText}</span>
                                {selectedElement === 'porText' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('porText', e)}
                                            onTouchStart={(e) => startResizing('porText', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('porText', e)}
                                            onTouchStart={(e) => startRotating('porText', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 5. SÍMBOLO DA MOEDA "R$" (POR ORDEM DE GRANDEZA) */}
                        {showCurrency && (
                            <div
                                onMouseDown={(e) => startDragging('currencySymbol', e)}
                                onTouchStart={(e) => startDragging('currencySymbol', e)}
                                onClick={(e) => handleElementClick('currencySymbol', e)}
                                style={{ 
                                    color: currencyColor,
                                    fontSize: `${activeCurrencyFontSize}px`,
                                    fontFamily: currencyFontFamily,
                                    transform: `translate(${currencyPos.x}px, calc(-50% + ${currencyPos.y}px)) rotate(${currencyRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'currencySymbol' ? 30 : 10
                                }}
                                className={`absolute top-1/2 left-4 sm:left-8 w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElement === 'currencySymbol' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'currencySymbol' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        SÍMBOLO MOEDA ({selectedMagnitude.toUpperCase()})
                                    </div>
                                )}

                                <span>{currencySymbol}</span>
                                {selectedElement === 'currencySymbol' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('currencySymbol', e)}
                                            onTouchStart={(e) => startResizing('currencySymbol', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('currencySymbol', e)}
                                            onTouchStart={(e) => startRotating('currencySymbol', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 6. PREÇO PRINCIPAL (POR ORDEM DE GRANDEZA) */}
                        {showPromoPrice && (
                            <div
                                onMouseDown={(e) => startDragging('promoPrice', e)}
                                onTouchStart={(e) => startDragging('promoPrice', e)}
                                onClick={(e) => handleElementClick('promoPrice', e)}
                                style={{ 
                                    color: priceColor,
                                    fontFamily: promoPriceFontFamily,
                                    transform: `translate(calc(-50% + ${promoPricePos.x}px), calc(-50% + ${promoPricePos.y}px)) rotate(${promoPriceRotation}deg) scale(${activeScale / 100})`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'promoPrice' ? 30 : 10
                                }}
                                className={`absolute top-1/2 left-1/2 w-max inline-flex items-center justify-center px-0.5 py-0.5 select-none transition-transform duration-75 whitespace-nowrap ${
                                    selectedElement === 'promoPrice' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'promoPrice' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        PREÇO PRINCIPAL ({selectedMagnitude.toUpperCase()})
                                    </div>
                                )}

                                <span className="text-8xl sm:text-9xl md:text-[10rem] font-black tracking-tighter drop-shadow-md leading-none my-1">
                                    {displayPriceNumber}
                                </span>
                                {selectedElement === 'promoPrice' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('promoPrice', e)}
                                            onTouchStart={(e) => startResizing('promoPrice', e)}
                                            title="Arraste para redimensionar escala do preço"
                                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('promoPrice', e)}
                                            onTouchStart={(e) => startRotating('promoPrice', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 7. CENTAVOS ",00" (POR ORDEM DE GRANDEZA) */}
                        {showCents && (
                            <div
                                onMouseDown={(e) => startDragging('cents', e)}
                                onTouchStart={(e) => startDragging('cents', e)}
                                onClick={(e) => handleElementClick('cents', e)}
                                style={{ 
                                    color: centsColor,
                                    fontSize: `${activeCentsFontSize}px`,
                                    fontFamily: centsFontFamily,
                                    transform: `translate(${centsPos.x}px, calc(-50% + ${centsPos.y}px)) rotate(${centsRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'cents' ? 30 : 10
                                }}
                                className={`absolute top-1/2 right-4 sm:right-8 w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElement === 'cents' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'cents' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        CENTAVOS ({selectedMagnitude.toUpperCase()})
                                    </div>
                                )}

                                <span>{centsText}</span>
                                {selectedElement === 'cents' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('cents', e)}
                                            onTouchStart={(e) => startResizing('cents', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('cents', e)}
                                            onTouchStart={(e) => startRotating('cents', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 8. PARCELAMENTO */}
                        {showInstallments && installments && (
                            <div
                                onMouseDown={(e) => startDragging('installments', e)}
                                onTouchStart={(e) => startDragging('installments', e)}
                                onClick={(e) => handleElementClick('installments', e)}
                                style={{
                                    color: installmentsColor,
                                    fontSize: `${installmentsFontSize}px`,
                                    fontFamily: installmentsFontFamily,
                                    transform: `translate(calc(-50% + ${installmentsPos.x}px), ${installmentsPos.y}px) rotate(${installmentsRotation}deg)`,
                                    cursor: 'move',
                                    zIndex: selectedElement === 'installments' ? 30 : 10
                                }}
                                className={`absolute bottom-3 sm:bottom-5 left-1/2 w-max max-w-[90%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-tight px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElement === 'installments' 
                                        ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                        : 'border border-transparent'
                                }`}
                            >
                                {selectedElement === 'installments' && (
                                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shadow-xs pointer-events-none z-40 whitespace-nowrap">
                                        PARCELAMENTO
                                    </div>
                                )}

                                <span>{installments}</span>
                                {selectedElement === 'installments' && (
                                    <>
                                        <div
                                            onMouseDown={(e) => startResizing('installments', e)}
                                            onTouchStart={(e) => startResizing('installments', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                        <div
                                            onMouseDown={(e) => startRotating('installments', e)}
                                            onTouchStart={(e) => startRotating('installments', e)}
                                            title="Arraste para rotacionar"
                                            className="absolute -bottom-6 -right-6 w-5 h-5 bg-white border border-purple-600 rounded-full cursor-grab z-40 shadow-md hover:scale-125 flex items-center justify-center text-purple-600"
                                        >
                                            <i className="bi bi-arrow-clockwise text-[11px]" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Camadas Flutuante (zIndex: 9999) */}
            {isLayersModalOpen && (
                <div 
                    style={{ zIndex: 9999 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-layers-fill text-blue-600 text-lg" />
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                    Camadas da Etiqueta de Preço
                                </h3>
                            </div>
                            <button type="button" onClick={() => setIsLayersModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <i className="bi bi-x-lg text-sm" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {priceLabelLayers.map(layer => (
                                <div
                                    key={layer.key}
                                    className={`w-full p-3 rounded-2xl flex items-center justify-between border transition-all ${
                                        selectedElement === layer.key
                                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedElement(layer.key);
                                            setIsLayersModalOpen(false);
                                        }}
                                        className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                                    >
                                        <i className={`bi ${layer.icon} text-base text-blue-500`} />
                                        <div>
                                            <span className="text-xs font-black uppercase">{layer.label}</span>
                                            <p className="text-[9px] font-normal lowercase text-slate-400">
                                                {layer.desc}
                                            </p>
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {layer.key !== 'background' && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    layer.toggleVisibility();
                                                }}
                                                className={`p-1.5 rounded-xl text-xs transition cursor-pointer ${
                                                    layer.isVisible 
                                                        ? 'text-blue-600 bg-blue-100 dark:bg-blue-900' 
                                                        : 'text-slate-400 bg-slate-200 dark:bg-slate-800'
                                                }`}
                                                title={layer.isVisible ? "Ocultar camada" : "Exibir camada"}
                                            >
                                                <i className={`bi ${layer.isVisible ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                            </button>
                                        )}

                                        {selectedElement === layer.key && (
                                            <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">Ativa</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Footer Fullwidth com indicação de salvamento automático */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <i className="bi bi-check-circle-fill text-emerald-500 text-sm" />
                    <span>Salvamento Automático Ativo</span>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                    <i className="bi bi-check-lg text-sm" />
                    <span>CONCLUÍDO</span>
                </button>
            </div>

        </div>
    );
};

export default PriceLabelArtEditorModal;
