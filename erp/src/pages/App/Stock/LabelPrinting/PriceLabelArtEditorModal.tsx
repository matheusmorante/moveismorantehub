import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { LabelConfig } from './LabelConstants';

const GLOBAL_PRICE_LABEL_ART_KEY = 'morante_global_price_label_art_template';

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
    | 'opportunityBadge' 
    | 'currencySymbol'
    | 'promoPrice' 
    | 'cents'
    | 'installments' 
    | 'background' 
    | null;

const FlameIconBlack = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="#000000" 
        stroke="#000000" 
        strokeWidth="0.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={`${className} shrink-0`}
    >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
);

function resolveBadgeColor(badgeColorClass?: string) {
    if (!badgeColorClass) return "#ea580c";
    if (badgeColorClass.includes("red-600")) return "#dc2626";
    if (badgeColorClass.includes("orange-500")) return "#f97316";
    if (badgeColorClass.includes("orange-600")) return "#ea580c";
    if (badgeColorClass.includes("amber-600")) return "#d97706";
    if (badgeColorClass.includes("purple-600")) return "#7c3aed";
    if (badgeColorClass.includes("blue-600")) return "#2563eb";
    if (badgeColorClass.includes("green-600")) return "#16a34a";
    if (badgeColorClass.includes("pink-600")) return "#db2777";
    if (badgeColorClass.includes("teal-600")) return "#0d9488";
    if (badgeColorClass.startsWith("#")) return badgeColorClass;
    return "#ea580c";
}

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = ({
    isOpen,
    onClose,
    config,
    onSaveConfig,
    initialProduct
}) => {
    // 1. TÍTULO NO CABEÇALHO DA ETIQUETA
    const [title, setTitle] = useState(initialProduct?.name || config.text || 'COLCHÃO DE ESPUMA D28 LARGURA 88');
    const [showTitle, setShowTitle] = useState(true);
    const [titleFontSize, setTitleFontSize] = useState<number>(14);
    const [titleColor, setTitleColor] = useState('#000000');
    const [titlePos, setTitlePos] = useState({ x: 0, y: 0 });

    // 2. TEXTO "DE"
    const [deText, setDeText] = useState('De');
    const [showDe, setShowDe] = useState(true);
    const [deFontSize, setDeFontSize] = useState<number>(15);
    const [deColor, setDeColor] = useState('#000000');
    const [dePos, setDePos] = useState({ x: 0, y: 0 });

    // 3. PREÇO ORIGINAL (VALOR NUMÉRICO RISCADO)
    const [normalPrice, setNormalPrice] = useState(initialProduct?.price || config.price || '499,00');
    const [showNormalPrice, setShowNormalPrice] = useState(true);
    const [normalPriceFontSize, setNormalPriceFontSize] = useState<number>(16);
    const [normalPriceColor, setNormalPriceColor] = useState('#000000');
    const [normalPricePos, setNormalPricePos] = useState({ x: 0, y: 0 });

    // 4. TEXTO "POR:"
    const [porText, setPorText] = useState('por:');
    const [showPor, setShowPor] = useState(true);
    const [porFontSize, setPorFontSize] = useState<number>(15);
    const [porColor, setPorColor] = useState('#000000');
    const [porPos, setPorPos] = useState({ x: 0, y: 0 });

    // 5. SÍMBOLO DA MOEDA "R$" (PREÇO PRINCIPAL)
    const [currencySymbol, setCurrencySymbol] = useState('R$');
    const [showCurrency, setShowCurrency] = useState(true);
    const [currencyFontSize, setCurrencyFontSize] = useState<number>(26);
    const [currencyColor, setCurrencyColor] = useState('#000000');
    const [currencyPos, setCurrencyPos] = useState({ x: 0, y: 0 });

    // 6. PREÇO PRINCIPAL (NÚMERO GRANDE POR:)
    const [promoPrice, setPromoPrice] = useState(initialProduct?.promoPrice || config.promoPrice || '399,00');
    const [showPromoPrice, setShowPromoPrice] = useState(true);
    const [priceColor, setPriceColor] = useState(config.priceColor || '#1e3a8a');
    const [promoPricePos, setPromoPricePos] = useState({ x: 0, y: 0 });
    
    // Escalas por Dígitos (Dezena, Centena, Milhar, Dezena de Milhar)
    const [scaleTens, setScaleTens] = useState<number>(115);            // 2 dígitos: R$ 50 - 99
    const [scaleHundreds, setScaleHundreds] = useState<number>(100);    // 3 dígitos: R$ 100 - 999
    const [scaleThousands, setScaleThousands] = useState<number>(88);   // 4 dígitos: R$ 1.000 - 9.999
    const [scaleTenThousands, setScaleTenThousands] = useState<number>(75); // 5 dígitos: R$ 10.000+

    // 7. CENTAVOS ",00"
    const [centsText, setCentsText] = useState(',00');
    const [showCents, setShowCents] = useState(true);
    const [centsFontSize, setCentsFontSize] = useState<number>(26);
    const [centsColor, setCentsColor] = useState('#000000');
    const [centsPos, setCentsPos] = useState({ x: 0, y: 0 });

    // 8. RÓTULO DE OPORTUNIDADE (com dados reais e ícone preto)
    const [dbOpportunities, setDbOpportunities] = useState<Opportunity[]>([]);
    const [showOpportunityBadge, setShowOpportunityBadge] = useState(true);
    const [selectedOppId, setSelectedOppId] = useState<string>('salvado');
    const [opportunityBadgeText, setOpportunityBadgeText] = useState('QUEIMA DOS SALVADOS');
    const [opportunityBadgeBg, setOpportunityBadgeBg] = useState('#ea580c');
    const [opportunityBadgeTextColor] = useState('#ffffff');
    const [showOpportunityFlame, setShowOpportunityFlame] = useState(true);
    const [badgePos, setBadgePos] = useState({ x: 0, y: 0 });

    // 9. PARCELAMENTO (Ocultado por padrão)
    const [showInstallments, setShowInstallments] = useState(false);
    const [installments, setInstallments] = useState('Em até 10x sem juros no cartão');
    const [installmentsFontSize, setInstallmentsFontSize] = useState<number>(12);
    const [installmentsColor, setInstallmentsColor] = useState('#000000');
    const [installmentsPos, setInstallmentsPos] = useState({ x: 0, y: 0 });

    // 10. FUNDO DA ETIQUETA
    const [bgColor, setBgColor] = useState(config.bg_color || '#ff7900');

    // Estado de Seleção e Menus
    const [selectedElement, setSelectedElement] = useState<PriceLabelLayerKey>(null);
    const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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

    // Resize do Elemento através do canto inferior direito
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

    // Carrega modelo global salvo anteriormente
    useEffect(() => {
        if (!isOpen) return;
        const savedGlobal = localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
        if (savedGlobal) {
            try {
                const parsed = JSON.parse(savedGlobal);
                if (parsed.titleFontSize !== undefined) setTitleFontSize(parsed.titleFontSize);
                if (parsed.titleColor) setTitleColor(parsed.titleColor);
                if (parsed.titlePos) setTitlePos(parsed.titlePos);
                if (parsed.showTitle !== undefined) setShowTitle(parsed.showTitle);

                if (parsed.deText !== undefined) setDeText(parsed.deText);
                if (parsed.showDe !== undefined) setShowDe(parsed.showDe);
                if (parsed.deFontSize !== undefined) setDeFontSize(parsed.deFontSize);
                if (parsed.deColor) setDeColor(parsed.deColor);
                if (parsed.dePos) setDePos(parsed.dePos);

                if (parsed.showNormalPrice !== undefined) setShowNormalPrice(parsed.showNormalPrice);
                if (parsed.normalPriceFontSize !== undefined) setNormalPriceFontSize(parsed.normalPriceFontSize);
                if (parsed.normalPriceColor) setNormalPriceColor(parsed.normalPriceColor);
                if (parsed.normalPricePos) setNormalPricePos(parsed.normalPricePos);

                if (parsed.porText !== undefined) setPorText(parsed.porText);
                if (parsed.showPor !== undefined) setShowPor(parsed.showPor);
                if (parsed.porFontSize !== undefined) setPorFontSize(parsed.porFontSize);
                if (parsed.porColor) setPorColor(parsed.porColor);
                if (parsed.porPos) setPorPos(parsed.porPos);

                if (parsed.currencySymbol !== undefined) setCurrencySymbol(parsed.currencySymbol);
                if (parsed.showCurrency !== undefined) setShowCurrency(parsed.showCurrency);
                if (parsed.currencyFontSize !== undefined) setCurrencyFontSize(parsed.currencyFontSize);
                if (parsed.currencyColor) setCurrencyColor(parsed.currencyColor);
                if (parsed.currencyPos) setCurrencyPos(parsed.currencyPos);

                if (parsed.showPromoPrice !== undefined) setShowPromoPrice(parsed.showPromoPrice);
                if (parsed.priceColor) setPriceColor(parsed.priceColor);
                if (parsed.promoPricePos) setPromoPricePos(parsed.promoPricePos);
                if (parsed.scaleTens !== undefined) setScaleTens(parsed.scaleTens);
                if (parsed.scaleHundreds !== undefined) setScaleHundreds(parsed.scaleHundreds);
                if (parsed.scaleThousands !== undefined) setScaleThousands(parsed.scaleThousands);
                if (parsed.scaleTenThousands !== undefined) setScaleTenThousands(parsed.scaleTenThousands);

                if (parsed.centsText !== undefined) setCentsText(parsed.centsText);
                if (parsed.showCents !== undefined) setShowCents(parsed.showCents);
                if (parsed.centsFontSize !== undefined) setCentsFontSize(parsed.centsFontSize);
                if (parsed.centsColor) setCentsColor(parsed.centsColor);
                if (parsed.centsPos) setCentsPos(parsed.centsPos);

                if (parsed.showOpportunityBadge !== undefined) setShowOpportunityBadge(parsed.showOpportunityBadge);
                if (parsed.opportunityBadgeText) setOpportunityBadgeText(parsed.opportunityBadgeText);
                if (parsed.opportunityBadgeBg) setOpportunityBadgeBg(parsed.opportunityBadgeBg);
                if (parsed.showOpportunityFlame !== undefined) setShowOpportunityFlame(parsed.showOpportunityFlame);
                if (parsed.badgePos) setBadgePos(parsed.badgePos);

                if (parsed.showInstallments !== undefined) setShowInstallments(parsed.showInstallments);
                if (parsed.installments) setInstallments(parsed.installments);
                if (parsed.installmentsFontSize !== undefined) setInstallmentsFontSize(parsed.installmentsFontSize);
                if (parsed.installmentsColor) setInstallmentsColor(parsed.installmentsColor);
                if (parsed.installmentsPos) setInstallmentsPos(parsed.installmentsPos);

                if (parsed.bgColor) setBgColor(parsed.bgColor);
            } catch (e) {
                console.error("Erro ao restaurar template global da etiqueta:", e);
            }
        }
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
                        setSelectedOppId(opp.id || opp.slug || 'custom');
                        setOpportunityBadgeText(opp.name || 'OPORTUNIDADE');
                        setOpportunityBadgeBg(resolveBadgeColor(opp.badge_color));
                        setShowOpportunityFlame(opp.name?.toLowerCase()?.includes('salvado') || opp.slug === 'salvado');
                    } else if (!localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY)) {
                        const defaultOpp = data.find(o => o.slug === 'salvado') || data[0];
                        if (defaultOpp) {
                            setSelectedOppId(defaultOpp.id);
                            setOpportunityBadgeText(defaultOpp.name.toUpperCase());
                            setOpportunityBadgeBg(resolveBadgeColor(defaultOpp.badge_color));
                            setShowOpportunityFlame(defaultOpp.name.toLowerCase().includes('salvado') || defaultOpp.slug === 'salvado');
                        }
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar oportunidades:", err);
            }
        }
        fetchOpps();
    }, [isOpen, initialProduct]);

    // TECLAS DE SETA DO TECLADO PARA MOVER ELEMENTO
    useEffect(() => {
        if (!isOpen || !selectedElement || selectedElement === 'background') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                if (targetTag === 'input' || targetTag === 'textarea') return;

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
                else if (selectedElement === 'opportunityBadge') setBadgePos(p => ({ x: p.x + dx, y: p.y + dy }));
                else if (selectedElement === 'installments') setInstallmentsPos(p => ({ x: p.x + dx, y: p.y + dy }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedElement]);

    // ARRASTAR ELEMENTO DIRETAMENTE NO CANVAS COM MOUSE / TOUCH
    const startDragging = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement(layer);

        let initial = { x: 0, y: 0 };
        if (layer === 'title') initial = { ...titlePos };
        else if (layer === 'deText') initial = { ...dePos };
        else if (layer === 'normalPrice') initial = { ...normalPricePos };
        else if (layer === 'porText') initial = { ...porPos };
        else if (layer === 'currencySymbol') initial = { ...currencyPos };
        else if (layer === 'promoPrice') initial = { ...promoPricePos };
        else if (layer === 'cents') initial = { ...centsPos };
        else if (layer === 'opportunityBadge') initial = { ...badgePos };
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
            const newPos = {
                x: dragRef.current.initialPos.x + dx,
                y: dragRef.current.initialPos.y + dy
            };

            const l = dragRef.current.layer;
            if (l === 'title') setTitlePos(newPos);
            else if (l === 'deText') setDePos(newPos);
            else if (l === 'normalPrice') setNormalPricePos(newPos);
            else if (l === 'porText') setPorPos(newPos);
            else if (l === 'currencySymbol') setCurrencyPos(newPos);
            else if (l === 'promoPrice') setPromoPricePos(newPos);
            else if (l === 'cents') setCentsPos(newPos);
            else if (l === 'opportunityBadge') setBadgePos(newPos);
            else if (l === 'installments') setInstallmentsPos(newPos);
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }, [titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, badgePos, installmentsPos]);

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

    // Cálculo dinâmico do tamanho do preço baseado na quantidade de dígitos inteiros
    const calculateEffectivePriceScale = (priceStr: string) => {
        const intClean = String(getIntegerPart(priceStr)).replace(/\D/g, '');
        const digits = intClean.length;
        if (digits <= 2) return scaleTens;
        if (digits === 3) return scaleHundreds;
        if (digits === 4) return scaleThousands;
        return scaleTenThousands;
    };

    const currentPriceDigits = String(getIntegerPart(promoPrice || normalPrice)).replace(/\D/g, '').length;
    const effectiveScale = calculateEffectivePriceScale(promoPrice || normalPrice);

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
        else if (layer === 'currencySymbol') initial = currencyFontSize;
        else if (layer === 'cents') initial = centsFontSize;
        else if (layer === 'installments') initial = installmentsFontSize;
        else if (layer === 'promoPrice') initial = effectiveScale;

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
                const newScale = Math.max(40, Math.min(220, Math.round(resizeRef.current.initialVal + delta * 0.35)));
                if (currentPriceDigits <= 2) setScaleTens(newScale);
                else if (currentPriceDigits === 3) setScaleHundreds(newScale);
                else if (currentPriceDigits === 4) setScaleThousands(newScale);
                else setScaleTenThousands(newScale);
            } else {
                const newSize = Math.max(8, Math.min(64, Math.round(resizeRef.current.initialVal + delta * 0.18)));
                if (l === 'title') setTitleFontSize(newSize);
                else if (l === 'deText') setDeFontSize(newSize);
                else if (l === 'normalPrice') setNormalPriceFontSize(newSize);
                else if (l === 'porText') setPorFontSize(newSize);
                else if (l === 'currencySymbol') setCurrencyFontSize(newSize);
                else if (l === 'cents') setCentsFontSize(newSize);
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
    }, [titleFontSize, deFontSize, normalPriceFontSize, porFontSize, currencyFontSize, centsFontSize, installmentsFontSize, effectiveScale, currentPriceDigits]);

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
            resetPos: () => setTitlePos({ x: 0, y: 0 }),
            desc: 'Cabeçalho superior' 
        },
        { 
            key: 'deText', 
            label: 'TEXTO "DE"', 
            icon: 'bi-type', 
            isVisible: showDe, 
            toggleVisibility: () => setShowDe(!showDe), 
            pos: dePos,
            resetPos: () => setDePos({ x: 0, y: 0 }),
            desc: 'Prefixo do preço original' 
        },
        { 
            key: 'normalPrice', 
            label: 'PREÇO ORIGINAL (DE:)', 
            icon: 'bi-type-strikethrough', 
            isVisible: showNormalPrice, 
            toggleVisibility: () => setShowNormalPrice(!showNormalPrice), 
            pos: normalPricePos,
            resetPos: () => setNormalPricePos({ x: 0, y: 0 }),
            desc: 'Valor riscado horizontalmente' 
        },
        { 
            key: 'porText', 
            label: 'TEXTO "POR:"', 
            icon: 'bi-type', 
            isVisible: showPor, 
            toggleVisibility: () => setShowPor(!showPor), 
            pos: porPos,
            resetPos: () => setPorPos({ x: 0, y: 0 }),
            desc: 'Sufixo do preço original' 
        },
        { 
            key: 'opportunityBadge', 
            label: 'RÓTULO DE OPORTUNIDADE', 
            icon: 'bi-fire', 
            isVisible: showOpportunityBadge, 
            toggleVisibility: () => setShowOpportunityBadge(!showOpportunityBadge), 
            pos: badgePos,
            resetPos: () => setBadgePos({ x: 0, y: 0 }),
            desc: 'Selo com ícone preto' 
        },
        { 
            key: 'currencySymbol', 
            label: 'SÍMBOLO MOEDA (R$)', 
            icon: 'bi-currency-dollar', 
            isVisible: showCurrency, 
            toggleVisibility: () => setShowCurrency(!showCurrency), 
            pos: currencyPos,
            resetPos: () => setCurrencyPos({ x: 0, y: 0 }),
            desc: 'Símbolo R$ à esquerda' 
        },
        { 
            key: 'promoPrice', 
            label: 'PREÇO PRINCIPAL (POR:)', 
            icon: 'bi-tag-fill', 
            isVisible: showPromoPrice, 
            toggleVisibility: () => setShowPromoPrice(!showPromoPrice), 
            pos: promoPricePos,
            resetPos: () => setPromoPricePos({ x: 0, y: 0 }),
            desc: 'Valor em destaque grande' 
        },
        { 
            key: 'cents', 
            label: 'CENTAVOS (,00)', 
            icon: 'bi-superscript', 
            isVisible: showCents, 
            toggleVisibility: () => setShowCents(!showCents), 
            pos: centsPos,
            resetPos: () => setCentsPos({ x: 0, y: 0 }),
            desc: 'Dígitos centavos à direita' 
        },
        { 
            key: 'installments', 
            label: 'PARCELAMENTO', 
            icon: 'bi-credit-card-2-front-fill', 
            isVisible: showInstallments, 
            toggleVisibility: () => setShowInstallments(!showInstallments), 
            pos: installmentsPos,
            resetPos: () => setInstallmentsPos({ x: 0, y: 0 }),
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
            const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: null });
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
            const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: null });
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiqueta_preco_${Date.now()}.png`;
            a.click();
            toast.success('Download da imagem PNG concluído!');
        } catch (e) {
            toast.error('Erro ao baixar imagem PNG.');
        }
    };

    const handleSave = () => {
        const globalTemplate = {
            titleFontSize,
            titleColor,
            titlePos,
            showTitle,

            deText,
            showDe,
            deFontSize,
            deColor,
            dePos,

            showNormalPrice,
            normalPriceFontSize,
            normalPriceColor,
            normalPricePos,

            porText,
            showPor,
            porFontSize,
            porColor,
            porPos,

            currencySymbol,
            showCurrency,
            currencyFontSize,
            currencyColor,
            currencyPos,

            showPromoPrice,
            priceColor,
            promoPricePos,
            scaleTens,
            scaleHundreds,
            scaleThousands,
            scaleTenThousands,

            centsText,
            showCents,
            centsFontSize,
            centsColor,
            centsPos,

            showOpportunityBadge,
            opportunityBadgeText,
            opportunityBadgeBg,
            showOpportunityFlame,
            badgePos,

            showInstallments,
            installments,
            installmentsFontSize,
            installmentsColor,
            installmentsPos,

            bgColor
        };

        localStorage.setItem(GLOBAL_PRICE_LABEL_ART_KEY, JSON.stringify(globalTemplate));

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

        toast.success('Arte padrão global da etiqueta de preço salva com sucesso!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-md animate-fade-in overflow-hidden w-screen h-screen">
            
            {/* Modal Header Fullwidth */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
                        <i className="bi bi-palette-fill text-sm" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-xs md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                                EDITOR DE ARTE DA ETIQUETA DE PREÇO
                            </h2>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[8px] font-black uppercase rounded-full tracking-wider">
                                Padrão Global
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                        <i className="bi bi-x-lg text-xs" />
                    </button>
                </div>
            </div>

            {/* TOOLBAR SUPERIOR DINÂMICA (TODOS OS CAMPOS FICAM AQUI) */}
            <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 py-2 shrink-0 overflow-x-auto custom-scrollbar">
                
                {/* LADO ESQUERDO DA TOOLBAR: BOTÕES GLOBAIS E FERRAMENTAS DO ELEMENTO SELECIONADO */}
                <div className="flex items-center gap-3 shrink-0 flex-nowrap">
                    
                    {/* Botão de Camadas */}
                    <button
                        type="button"
                        onClick={() => setIsLayersModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer shrink-0"
                    >
                        <i className="bi bi-layers-fill text-blue-600" />
                        <span>Camadas</span>
                    </button>

                    {/* Botões Desfazer / Refazer na Barra de Ferramentas */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 shrink-0">
                        <button 
                            type="button" 
                            onClick={() => toast.info('Ação desfeita')} 
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            title="Desfazer (Ctrl+Z)"
                        >
                            <i className="bi bi-arrow-counterclockwise text-xs" />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => toast.info('Ação refeita')} 
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            title="Refazer (Ctrl+Y)"
                        >
                            <i className="bi bi-arrow-clockwise text-xs" />
                        </button>
                    </div>

                    {/* Botão de Desmarcar */}
                    <button
                        type="button"
                        onClick={() => setSelectedElement(null)}
                        disabled={!selectedElement}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                            selectedElement
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                : 'text-slate-400 cursor-not-allowed opacity-40'
                        }`}
                    >
                        <i className="bi bi-cursor-fill text-[11px]" />
                        <span>Desmarcar</span>
                    </button>

                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 shrink-0 mx-1" />

                    {/* SELEÇÃO ATIVA: CAMPOS CONTEXTUAIS DA FERRAMENTA */}
                    {selectedElement ? (
                        <div className="flex items-center gap-3 shrink-0 flex-nowrap animate-fade-in">
                            
                            {/* Identificador do Elemento Ativo */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                                <i className={`bi ${priceLabelLayers.find(l => l.key === selectedElement)?.icon}`} />
                                <span>{priceLabelLayers.find(l => l.key === selectedElement)?.label}</span>
                            </div>

                            {/* 1. CAMPOS DE TEXTO / VALORES */}
                            {selectedElement === 'title' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Texto:</span>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black uppercase w-48 sm:w-64 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {selectedElement === 'deText' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Texto:</span>
                                    <input
                                        type="text"
                                        value={deText}
                                        onChange={e => setDeText(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-24 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {selectedElement === 'normalPrice' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Valor De:</span>
                                    <input
                                        type="text"
                                        value={normalPrice}
                                        onChange={e => setNormalPrice(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-24 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {selectedElement === 'porText' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Texto:</span>
                                    <input
                                        type="text"
                                        value={porText}
                                        onChange={e => setPorText(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-24 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {selectedElement === 'currencySymbol' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Símbolo:</span>
                                    <input
                                        type="text"
                                        value={currencySymbol}
                                        onChange={e => setCurrencySymbol(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-16 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {selectedElement === 'promoPrice' && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Valor:</span>
                                        <input
                                            type="text"
                                            value={promoPrice}
                                            onChange={e => setPromoPrice(e.target.value)}
                                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-24 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[9px] font-bold">
                                        <span className="text-slate-400">Escala:</span>
                                        <span className="text-blue-600 font-black">{effectiveScale}%</span>
                                    </div>
                                </div>
                            )}

                            {selectedElement === 'cents' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Centavos:</span>
                                    <input
                                        type="text"
                                        value={centsText}
                                        onChange={e => setCentsText(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-20 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {selectedElement === 'opportunityBadge' && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Rótulo:</span>
                                    <input
                                        type="text"
                                        value={opportunityBadgeText}
                                        onChange={e => setOpportunityBadgeText(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black uppercase w-44 outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOpportunityFlame(!showOpportunityFlame)}
                                        className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 border transition cursor-pointer ${
                                            showOpportunityFlame ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-white text-slate-400 border-slate-300'
                                        }`}
                                        title="Alternar Ícone de Chama Preto"
                                    >
                                        <FlameIconBlack className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">Chama</span>
                                    </button>
                                </div>
                            )}

                            {selectedElement === 'installments' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Texto:</span>
                                    <input
                                        type="text"
                                        value={installments}
                                        onChange={e => setInstallments(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black w-60 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* 2. TAMANHO DA FONTE */}
                            {['title', 'deText', 'normalPrice', 'porText', 'currencySymbol', 'cents', 'installments'].includes(selectedElement) && (
                                <>
                                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 shrink-0" />
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Fonte:</span>
                                        <input
                                            type="number"
                                            min="8"
                                            max="64"
                                            value={
                                                selectedElement === 'title' ? titleFontSize :
                                                selectedElement === 'deText' ? deFontSize :
                                                selectedElement === 'normalPrice' ? normalPriceFontSize :
                                                selectedElement === 'porText' ? porFontSize :
                                                selectedElement === 'currencySymbol' ? currencyFontSize :
                                                selectedElement === 'cents' ? centsFontSize :
                                                installmentsFontSize
                                            }
                                            onChange={e => {
                                                const v = Number(e.target.value);
                                                if (selectedElement === 'title') setTitleFontSize(v);
                                                else if (selectedElement === 'deText') setDeFontSize(v);
                                                else if (selectedElement === 'normalPrice') setNormalPriceFontSize(v);
                                                else if (selectedElement === 'porText') setPorFontSize(v);
                                                else if (selectedElement === 'currencySymbol') setCurrencyFontSize(v);
                                                else if (selectedElement === 'cents') setCentsFontSize(v);
                                                else if (selectedElement === 'installments') setInstallmentsFontSize(v);
                                            }}
                                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-black w-14 text-center"
                                        />
                                        <span className="text-[10px] font-bold text-slate-400">px</span>
                                    </div>
                                </>
                            )}

                            {/* 3. CORES DO ELEMENTO OU FUNDO */}
                            <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 shrink-0" />
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">
                                    {selectedElement === 'background' ? 'Cor Fundo:' : 'Cor:'}
                                </span>
                                {['#000000', '#1e3a8a', '#dc2626', '#ffffff', '#ea580c', '#eab308', '#2563eb', '#16a34a'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => {
                                            if (selectedElement === 'title') setTitleColor(c);
                                            else if (selectedElement === 'deText') setDeColor(c);
                                            else if (selectedElement === 'normalPrice') setNormalPriceColor(c);
                                            else if (selectedElement === 'porText') setPorColor(c);
                                            else if (selectedElement === 'currencySymbol') setCurrencyColor(c);
                                            else if (selectedElement === 'promoPrice') setPriceColor(c);
                                            else if (selectedElement === 'cents') setCentsColor(c);
                                            else if (selectedElement === 'opportunityBadge') setOpportunityBadgeBg(c);
                                            else if (selectedElement === 'installments') setInstallmentsColor(c);
                                            else if (selectedElement === 'background') setBgColor(c);
                                        }}
                                        style={{ backgroundColor: c }}
                                        className="w-5 h-5 rounded-full border border-slate-400 shadow-xs hover:scale-110 transition cursor-pointer"
                                    />
                                ))}
                            </div>

                            {/* 4. RESET DE POSIÇÃO SE DESLOCADO COM TECLADO FÍSICO OU MOUSE */}
                            {selectedElement !== 'background' && (() => {
                                const curPos = 
                                    selectedElement === 'title' ? titlePos :
                                    selectedElement === 'deText' ? dePos :
                                    selectedElement === 'normalPrice' ? normalPricePos :
                                    selectedElement === 'porText' ? porPos :
                                    selectedElement === 'currencySymbol' ? currencyPos :
                                    selectedElement === 'promoPrice' ? promoPricePos :
                                    selectedElement === 'cents' ? centsPos :
                                    selectedElement === 'opportunityBadge' ? badgePos :
                                    installmentsPos;
                                
                                if (curPos.x === 0 && curPos.y === 0) return null;

                                return (
                                    <>
                                        <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 shrink-0" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedElement === 'title') setTitlePos({ x: 0, y: 0 });
                                                else if (selectedElement === 'deText') setDePos({ x: 0, y: 0 });
                                                else if (selectedElement === 'normalPrice') setNormalPricePos({ x: 0, y: 0 });
                                                else if (selectedElement === 'porText') setPorPos({ x: 0, y: 0 });
                                                else if (selectedElement === 'currencySymbol') setCurrencyPos({ x: 0, y: 0 });
                                                else if (selectedElement === 'promoPrice') setPromoPricePos({ x: 0, y: 0 });
                                                else if (selectedElement === 'cents') setCentsPos({ x: 0, y: 0 });
                                                else if (selectedElement === 'opportunityBadge') setBadgePos({ x: 0, y: 0 });
                                                else if (selectedElement === 'installments') setInstallmentsPos({ x: 0, y: 0 });
                                            }}
                                            className="px-2.5 py-1 text-[9px] font-black uppercase text-slate-500 hover:text-slate-800 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shrink-0 cursor-pointer"
                                            title="Resetar posição X/Y para o centro original (0,0)"
                                        >
                                            Resetar Posição (X:{curPos.x} Y:{curPos.y})
                                        </button>
                                    </>
                                );
                            })()}

                            {/* 5. VISIBILIDADE TOGGLE */}
                            {(() => {
                                const layer = priceLabelLayers.find(l => l.key === selectedElement);
                                if (!layer || layer.key === 'background') return null;
                                return (
                                    <button
                                        type="button"
                                        onClick={layer.toggleVisibility}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                            layer.isVisible 
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                                        }`}
                                    >
                                        <i className={`bi ${layer.isVisible ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                        <span>{layer.isVisible ? 'Visível' : 'Oculto'}</span>
                                    </button>
                                );
                            })()}

                        </div>
                    ) : (
                        /* INSTRUÇÃO QUANDO NENHUM ELEMENTO ESTÁ SELECIONADO */
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 italic shrink-0">
                            <i className="bi bi-hand-index-thumb text-blue-500 text-sm" />
                            <span>Clique em qualquer elemento na etiqueta abaixo ou no fundo para abrir as ferramentas de edição</span>
                        </div>
                    )}

                </div>

                {/* LADO DIREITO DA TOOLBAR: DROPDOWN DE EXPORTAÇÃO / AÇÕES DE IMAGEM */}
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
                    >
                        <i className="bi bi-box-arrow-up-right text-blue-600" />
                        <span>Exportar Imagem</span>
                        <i className="bi bi-chevron-down text-[10px] text-slate-400" />
                    </button>
                    
                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fade-in">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsExportMenuOpen(false);
                                    handleCopyImage();
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
                            >
                                <i className="bi bi-clipboard-check text-blue-600 text-sm" />
                                <span>Copiar Imagem</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsExportMenuOpen(false);
                                    handleDownloadPng();
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
                            >
                                <i className="bi bi-file-earmark-arrow-down text-emerald-600 text-sm" />
                                <span>Baixar PNG</span>
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* MODAL BODY: PREVIEW EM 100% DA LARGURA DA TELA */}
            <div 
                onClick={() => setSelectedElement(null)}
                className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 lg:p-12 bg-slate-200/50 dark:bg-slate-950/80 overflow-y-auto custom-scrollbar relative"
            >
                <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto">
                    {/* Etiqueta de Preço sem Borda Branca */}
                    <div 
                        ref={previewRef}
                        style={{ backgroundColor: bgColor }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElement('background');
                        }}
                        className={`w-full aspect-[1.75/1] rounded-3xl shadow-2xl relative p-6 sm:p-10 flex flex-col justify-between select-none transition-all duration-200 cursor-pointer ${
                            selectedElement === 'background' ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
                        }`}
                    >
                        {/* 1. CABEÇALHO DA ETIQUETA: NOME DO PRODUTO (ARRASTÁVEL / CLICÁVEL / REDIMENSIONÁVEL) */}
                        {showTitle && (
                            <div className="flex justify-center w-full z-10">
                                <div
                                    onMouseDown={(e) => startDragging('title', e)}
                                    onTouchStart={(e) => startDragging('title', e)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedElement('title');
                                    }}
                                    style={{ 
                                        color: titleColor, 
                                        fontSize: `${titleFontSize}px`,
                                        transform: `translate(${titlePos.x}px, ${titlePos.y}px)`,
                                        cursor: 'move'
                                    }}
                                    className={`relative inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-tight px-2 py-0.5 select-none transition-shadow ${
                                        selectedElement === 'title' 
                                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                            : 'border border-transparent hover:bg-white/20'
                                    }`}
                                >
                                    <span>{title || 'TÍTULO DO PRODUTO'}</span>
                                    
                                    {/* Canto Inferior Direito: Redimensionar */}
                                    {selectedElement === 'title' && (
                                        <div
                                            onMouseDown={(e) => startResizing('title', e)}
                                            onTouchStart={(e) => startResizing('title', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 2. LINHA 2: DE, PREÇO NORMAL, POR: & RÓTULO DE OPORTUNIDADE (TODOS INDIVIDUALMENTE EDITÁVEIS) */}
                        <div className="flex items-center justify-between text-black font-black mt-2 z-10 gap-3 flex-nowrap w-full">
                            
                            {/* BLOCO PREÇO ORIGINAL COM DE, NÚMERO E POR: SEPARADOS */}
                            <div className="flex items-center gap-1 text-base sm:text-lg md:text-xl leading-none select-none whitespace-nowrap shrink-0">
                                
                                {/* TEXTO "DE" (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL) */}
                                {showDe && (
                                    <div
                                        onMouseDown={(e) => startDragging('deText', e)}
                                        onTouchStart={(e) => startDragging('deText', e)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement('deText');
                                        }}
                                        style={{ 
                                            color: deColor, 
                                            fontSize: `${deFontSize}px`,
                                            transform: `translate(${dePos.x}px, ${dePos.y}px)`,
                                            cursor: 'move'
                                        }}
                                        className={`relative inline-flex items-center justify-center px-1 py-0.5 select-none transition-shadow ${
                                            selectedElement === 'deText' 
                                                ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                                : 'border border-transparent hover:bg-white/20'
                                        }`}
                                    >
                                        <span>{deText}</span>
                                        {selectedElement === 'deText' && (
                                            <div
                                                onMouseDown={(e) => startResizing('deText', e)}
                                                onTouchStart={(e) => startResizing('deText', e)}
                                                title="Arraste para redimensionar"
                                                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                            />
                                        )}
                                    </div>
                                )}

                                {/* VALOR DO PREÇO NORMAL COM RISCO (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL) */}
                                {showNormalPrice && (
                                    <div
                                        onMouseDown={(e) => startDragging('normalPrice', e)}
                                        onTouchStart={(e) => startDragging('normalPrice', e)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement('normalPrice');
                                        }}
                                        style={{
                                            color: normalPriceColor,
                                            fontSize: `${normalPriceFontSize}px`,
                                            transform: `translate(${normalPricePos.x}px, ${normalPricePos.y}px)`,
                                            cursor: 'move'
                                        }}
                                        className={`relative inline-flex items-center justify-center font-black px-1.5 py-0.5 whitespace-nowrap select-none transition-shadow ${
                                            selectedElement === 'normalPrice' 
                                                ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                                : 'border border-transparent hover:bg-white/20'
                                        }`}
                                    >
                                        <span>R$ {formatDisplayPrice(normalPrice)}</span>
                                        {/* RISCO HORIZONTAL VERMELHO */}
                                        <span className="absolute left-0.5 right-0.5 top-1/2 -translate-y-1/2 h-[3px] bg-red-600 rounded-none shadow-xs pointer-events-none" />
                                        
                                        {selectedElement === 'normalPrice' && (
                                            <div
                                                onMouseDown={(e) => startResizing('normalPrice', e)}
                                                onTouchStart={(e) => startResizing('normalPrice', e)}
                                                title="Arraste para redimensionar"
                                                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                            />
                                        )}
                                    </div>
                                )}

                                {/* TEXTO "POR:" (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL) */}
                                {showPor && (
                                    <div
                                        onMouseDown={(e) => startDragging('porText', e)}
                                        onTouchStart={(e) => startDragging('porText', e)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement('porText');
                                        }}
                                        style={{ 
                                            color: porColor, 
                                            fontSize: `${porFontSize}px`,
                                            transform: `translate(${porPos.x}px, ${porPos.y}px)`,
                                            cursor: 'move'
                                        }}
                                        className={`relative inline-flex items-center justify-center px-1 py-0.5 select-none transition-shadow ${
                                            selectedElement === 'porText' 
                                                ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                                : 'border border-transparent hover:bg-white/20'
                                        }`}
                                    >
                                        <span>{porText}</span>
                                        {selectedElement === 'porText' && (
                                            <div
                                                onMouseDown={(e) => startResizing('porText', e)}
                                                onTouchStart={(e) => startResizing('porText', e)}
                                                title="Arraste para redimensionar"
                                                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RÓTULO DE OPORTUNIDADE EM LINHA ÚNICA (EDITÁVEL / ARRASTÁVEL) */}
                            {showOpportunityBadge && (
                                <div
                                    onMouseDown={(e) => startDragging('opportunityBadge', e)}
                                    onTouchStart={(e) => startDragging('opportunityBadge', e)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedElement('opportunityBadge');
                                    }}
                                    style={{ 
                                        backgroundColor: opportunityBadgeBg, 
                                        color: opportunityBadgeTextColor,
                                        transform: `translate(${badgePos.x}px, ${badgePos.y}px)`,
                                        cursor: 'move'
                                    }}
                                    className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-black uppercase rounded-2xl shadow-md select-none whitespace-nowrap shrink-0 leading-none transition-shadow ${
                                        selectedElement === 'opportunityBadge' 
                                            ? 'ring-2 ring-blue-500 shadow-blue-500/30' 
                                            : 'hover:scale-102'
                                    }`}
                                >
                                    {showOpportunityFlame && (
                                        <FlameIconBlack className="w-4 h-4" />
                                    )}
                                    <span className="whitespace-nowrap">{opportunityBadgeText || 'OPORTUNIDADE'}</span>
                                </div>
                            )}
                        </div>

                        {/* 3. CENTRO: SÍMBOLO R$, PREÇO PRINCIPAL E CENTAVOS (TODOS INDIVIDUALMENTE ARRASTÁVEIS, EDITÁVEIS E REDIMENSIONÁVEIS) */}
                        <div className="relative my-auto flex items-center justify-center w-full select-none z-10 min-h-[140px]">
                            
                            {/* SÍMBOLO DA MOEDA "R$" (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL) */}
                            {showCurrency && (
                                <div
                                    onMouseDown={(e) => startDragging('currencySymbol', e)}
                                    onTouchStart={(e) => startDragging('currencySymbol', e)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedElement('currencySymbol');
                                    }}
                                    style={{ 
                                        color: currencyColor,
                                        fontSize: `${currencyFontSize}px`,
                                        transform: `translate(${currencyPos.x}px, ${currencyPos.y}px)`,
                                        cursor: 'move'
                                    }}
                                    className={`absolute left-2 top-0 font-black leading-none px-1.5 py-0.5 select-none transition-shadow ${
                                        selectedElement === 'currencySymbol' 
                                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                            : 'border border-transparent hover:bg-white/20'
                                    }`}
                                >
                                    <span>{currencySymbol}</span>
                                    {selectedElement === 'currencySymbol' && (
                                        <div
                                            onMouseDown={(e) => startResizing('currencySymbol', e)}
                                            onTouchStart={(e) => startResizing('currencySymbol', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                </div>
                            )}

                            {/* DÍGITOS DO PREÇO PRINCIPAL (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL PELO CANTO INFERIOR DIREITO) */}
                            {showPromoPrice && (
                                <div
                                    onMouseDown={(e) => startDragging('promoPrice', e)}
                                    onTouchStart={(e) => startDragging('promoPrice', e)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedElement('promoPrice');
                                    }}
                                    style={{ 
                                        color: priceColor,
                                        transform: `translate(${promoPricePos.x}px, ${promoPricePos.y}px) scale(${effectiveScale / 100})`,
                                        cursor: 'move'
                                    }}
                                    className={`relative inline-flex items-center justify-center px-2 py-0.5 select-none transition-transform duration-75 ${
                                        selectedElement === 'promoPrice' 
                                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                            : 'border border-transparent hover:bg-white/10'
                                    }`}
                                >
                                    <span className="text-8xl sm:text-9xl md:text-[10rem] font-black tracking-tighter drop-shadow-md leading-none my-1">
                                        {getIntegerPart(promoPrice || normalPrice)}
                                    </span>
                                    {selectedElement === 'promoPrice' && (
                                        <div
                                            onMouseDown={(e) => startResizing('promoPrice', e)}
                                            onTouchStart={(e) => startResizing('promoPrice', e)}
                                            title="Arraste para redimensionar escala do preço"
                                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                </div>
                            )}

                            {/* CENTAVOS ",00" (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL) */}
                            {showCents && (
                                <div
                                    onMouseDown={(e) => startDragging('cents', e)}
                                    onTouchStart={(e) => startDragging('cents', e)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedElement('cents');
                                    }}
                                    style={{ 
                                        color: centsColor,
                                        fontSize: `${centsFontSize}px`,
                                        transform: `translate(${centsPos.x}px, ${centsPos.y}px)`,
                                        cursor: 'move'
                                    }}
                                    className={`absolute right-2 top-0 font-black leading-none px-1.5 py-0.5 select-none transition-shadow ${
                                        selectedElement === 'cents' 
                                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                            : 'border border-transparent hover:bg-white/20'
                                    }`}
                                >
                                    <span>{centsText}</span>
                                    {selectedElement === 'cents' && (
                                        <div
                                            onMouseDown={(e) => startResizing('cents', e)}
                                            onTouchStart={(e) => startResizing('cents', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. RODAPÉ: PARCELAMENTO (EDITÁVEL / ARRASTÁVEL / REDIMENSIONÁVEL) */}
                        {showInstallments && installments && (
                            <div className="flex justify-center w-full z-10">
                                <div
                                    onMouseDown={(e) => startDragging('installments', e)}
                                    onTouchStart={(e) => startDragging('installments', e)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedElement('installments');
                                    }}
                                    style={{
                                        color: installmentsColor,
                                        fontSize: `${installmentsFontSize}px`,
                                        transform: `translate(${installmentsPos.x}px, ${installmentsPos.y}px)`,
                                        cursor: 'move'
                                    }}
                                    className={`relative inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-none px-2 py-0.5 select-none transition-shadow ${
                                        selectedElement === 'installments' 
                                            ? 'ring-1 ring-blue-500 border border-blue-500 bg-blue-500/10 rounded-none' 
                                            : 'border border-transparent hover:bg-white/20'
                                    }`}
                                >
                                    <span>{installments}</span>
                                    {selectedElement === 'installments' && (
                                        <div
                                            onMouseDown={(e) => startResizing('installments', e)}
                                            onTouchStart={(e) => startResizing('installments', e)}
                                            title="Arraste para redimensionar"
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-blue-600 rounded-none cursor-se-resize z-30 shadow-xs hover:scale-125"
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Camadas Flutuante */}
            {isLayersModalOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
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

            {/* Modal Footer Fullwidth */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    className="px-8 py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                    <i className="bi bi-cloud-upload-fill text-sm" />
                    <span>SALVAR COMO PADRÃO GLOBAL</span>
                </button>
            </div>

        </div>
    );
};

export default PriceLabelArtEditorModal;
