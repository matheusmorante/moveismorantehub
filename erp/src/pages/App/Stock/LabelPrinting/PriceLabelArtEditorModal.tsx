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
    const [selectedOppId, setSelectedOppId] = useState<string>('none');

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
    const [selectedElements, setSelectedElements] = useState<Set<PriceLabelLayerKey>>(new Set());
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isOppSelectModalOpen, setIsOppSelectModalOpen] = useState(false);
    const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);
    const [showColorPickerDropdown, setShowColorPickerDropdown] = useState(false);

    // ESTADO DO MODAL DE PREENCHIMENTO DE DADOS / BUSCA DE PRODUTO DA LISTA
    const [isDataFillModalOpen, setIsDataFillModalOpen] = useState(false);
    const [dataFillTab, setDataFillTab] = useState<'search' | 'manual'>('search');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);

    const extractProductName = (prod: any): string => {
        const candidate = prod.name || prod.title || prod.marketplaceTitle || prod.description || 'PRODUTO SEM NOME';
        return String(candidate).split('\n')[0].trim().toUpperCase();
    };

    // Efeito para buscar produtos no Supabase e no Cache Local quando o usuário digita na aba de busca
    useEffect(() => {
        if (!isDataFillModalOpen || dataFillTab !== 'search') return;
        
        let isCurrent = true;
        const timer = setTimeout(async () => {
            setIsSearchingProducts(true);
            try {
                // 1. Coletar do localStorage como primeira fonte instantânea
                let localItems: any[] = [];
                try {
                    const rawLocal = localStorage.getItem('local_products');
                    if (rawLocal) {
                        const parsed = JSON.parse(rawLocal);
                        if (Array.isArray(parsed)) localItems = parsed;
                    }
                } catch (e) {}

                const term = productSearchTerm.trim().toLowerCase();

                // Filtrar itens do cache local se houver busca
                let filteredLocal = localItems;
                if (term) {
                    filteredLocal = localItems.filter((p: any) => {
                        const desc = String(p.name || p.title || p.marketplaceTitle || p.description || '').toLowerCase();
                        const code = String(p.code || p.sku || '').toLowerCase();
                        return desc.includes(term) || code.includes(term);
                    });
                }

                // 2. Buscar também no Supabase para garantir produtos recém-criados no banco
                let dbData: any[] = [];
                try {
                    let query = supabase
                        .from('products')
                        .select('*, product_images(*)')
                        .eq('deleted', false)
                        .order('created_at', { ascending: false })
                        .limit(40);

                    if (term) {
                        query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,code.ilike.%${term}%`);
                    }

                    const res = await query;
                    if (res.data) dbData = res.data;
                } catch (dbErr) {
                    console.warn('[Etiqueta] Aviso ao consultar Supabase:', dbErr);
                }

                if (isCurrent) {
                    const combinedMap = new Map();

                    // Adicionar do localStorage primeiro
                    filteredLocal.forEach((p: any) => {
                        if (p && p.id) {
                            combinedMap.set(String(p.id), {
                                id: String(p.id),
                                name: extractProductName(p),
                                description: extractProductName(p),
                                code: p.code || p.sku || '',
                                unit_price: p.unitPrice ?? p.price ?? p.unit_price ?? 0,
                                promo_price: p.promoPrice ?? p.promo_price ?? 0,
                                images: Array.isArray(p.images) ? p.images : (p.image_url ? [p.image_url] : [])
                            });
                        }
                    });

                    // Complementar com do Supabase
                    if (Array.isArray(dbData)) {
                        dbData.forEach((p: any) => {
                            let imgs: string[] = [];
                            if (Array.isArray(p.product_images) && p.product_images.length > 0) {
                                imgs = p.product_images.map((imgObj: any) => imgObj.image_url).filter(Boolean);
                            } else if (Array.isArray(p.images)) {
                                imgs = p.images;
                            } else if (p.image_url) {
                                imgs = [p.image_url];
                            }

                            const resolvedName = extractProductName(p);
                            combinedMap.set(String(p.id), {
                                id: String(p.id),
                                name: resolvedName,
                                description: resolvedName,
                                code: p.code || p.sku || '',
                                unit_price: p.price ?? p.unit_price ?? 0,
                                promo_price: p.promo_price ?? 0,
                                images: imgs
                            });
                        });
                    }

                    setSearchResults(Array.from(combinedMap.values()));
                }
            } catch (e) {
                console.error("Erro ao buscar produtos para etiqueta:", e);
            } finally {
                if (isCurrent) setIsSearchingProducts(false);
            }
        }, 150);

        return () => {
            isCurrent = false;
            clearTimeout(timer);
        };
    }, [isDataFillModalOpen, dataFillTab, productSearchTerm]);

    // Função para aplicar os dados de um produto selecionado da lista (apenas Nome/Título)
    const handleApplyProductToLabel = (prod: any) => {
        const prodName = extractProductName(prod);
        setTitle(prodName);
        setShowTitle(true);

        setIsDataFillModalOpen(false);
        toast.success(`Nome "${prodName}" aplicado na etiqueta!`);
    };

    const isInitializedRef = useRef(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const prevSelectedRef = useRef<PriceLabelLayerKey>(null);
    
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
        
        let savedGlobal = oppSaved;
        if (!savedGlobal) {
            if (selectedOppId === 'none') {
                savedGlobal = localStorage.getItem(getOppTemplateKey('none')) || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
            } else if (selectedOppId === 'salvado') {
                savedGlobal = salvadoSaved || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
            } else {
                savedGlobal = salvadoSaved || ultimasSaved || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
            }
        }
        
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
        const baseOptions = [{ id: 'none', name: 'SEM OPORTUNIDADE' }];

        if (dbOpportunities && dbOpportunities.length > 0) {
            const oppsMapped = dbOpportunities.map(opp => ({
                id: opp.id || opp.slug || opp.name,
                name: opp.name.toUpperCase()
            }));
            return [...baseOptions, ...oppsMapped];
        }
        return [...baseOptions, { id: 'salvado', name: 'QUEIMA DOS SALVADOS' }];
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

    // SELEÇÃO INTELIGENTE DE ELEMENTOS (ALTERNÂNCIA DE CAMADAS SOBREPOSTAS AO RE-CLICAR E SHIFT MULTISELEÇÃO)
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

        if (e.shiftKey) {
            setSelectedElements(prev => {
                const next = new Set(prev);
                if (next.has(layerKey)) {
                    next.delete(layerKey);
                } else {
                    next.add(layerKey);
                }
                
                // Atualiza o selectedElement principal
                if (next.size > 0) {
                    const arr = Array.from(next);
                    setSelectedElement(arr[arr.length - 1]);
                } else {
                    setSelectedElement(null);
                }
                return next;
            });
        } else {
            setSelectedElements(new Set<PriceLabelLayerKey>([layerKey]));

            if (prevSelectedRef.current === layerKey) {
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
                    setSelectedElements(new Set([nextLayer.key]));
                    return;
                }
            }

            setSelectedElement(layerKey);
        }
    }, [selectedElement, selectedElements, showTitle, showDe, showNormalPrice, showPor, showCurrency, showPromoPrice, showCents, showInstallments]);

    // ARRASTATOR DE ELEMENTOS NO CANVAS COM ÍMÃ E LINHAS GUIA MAGNÉTICAS (SUPORTE A MULTISELEÇÃO E MOVIMENTAÇÃO CONJUNTA)
    const startDragging = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        
        prevSelectedRef.current = selectedElement;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Determina o grupo ativo de elementos para movimentação
        let activeElements = new Set(selectedElements);
        if (!activeElements.has(layer)) {
            activeElements = new Set([layer]);
            setSelectedElements(activeElements);
            setSelectedElement(layer);
        }

        // Armazena a posição inicial de todas as camadas selecionadas
        const initialPositions = {} as Record<string, { x: number; y: number }>;
        activeElements.forEach((key) => {
            if (key) {
                let pos = { x: 0, y: 0 };
                if (key === 'title') pos = { ...titlePos };
                else if (key === 'deText') pos = { ...dePos };
                else if (key === 'normalPrice') pos = { ...normalPricePos };
                else if (key === 'porText') pos = { ...porPos };
                else if (key === 'currencySymbol') pos = { ...currencyPos };
                else if (key === 'promoPrice') pos = { ...promoPricePos };
                else if (key === 'cents') pos = { ...centsPos };
                else if (key === 'installments') pos = { ...installmentsPos };
                initialPositions[key] = pos;
            }
        });

        dragRef.current = {
            isDragging: true,
            layer,
            startX: clientX,
            startY: clientY,
            initialPos: initialPositions[layer] || { x: 0, y: 0 },
            initialPositions
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!dragRef.current.isDragging || !dragRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
            
            const dx = Math.round((curX - dragRef.current.startX));
            const dy = Math.round((curY - dragRef.current.startY));

            // Elemento principal arrastado (que ditará as correções e o ímã)
            const primaryKey = dragRef.current.layer;
            const primaryStartPos = dragRef.current.initialPositions?.[primaryKey];
            if (!primaryStartPos) return;

            let nextPrimaryX = primaryStartPos.x + dx;
            let nextPrimaryY = primaryStartPos.y + dy;

            // Alinhamento Magnético no Elemento Principal
            const SNAP_THRESHOLD = 6;
            const targets: { x: number; y: number }[] = [
                { x: 0, y: 0 } // Centro da etiqueta
            ];

            if (showTitle && primaryKey !== 'title') targets.push(titlePos);
            if (showDe && primaryKey !== 'deText') targets.push(dePos);
            if (showNormalPrice && primaryKey !== 'normalPrice') targets.push(normalPricePos);
            if (showPor && primaryKey !== 'porText') targets.push(porPos);
            if (showCurrency && primaryKey !== 'currencySymbol') targets.push(currencyPos);
            if (showPromoPrice && primaryKey !== 'promoPrice') targets.push(promoPricePos);
            if (showCents && primaryKey !== 'cents') targets.push(centsPos);
            if (showInstallments && primaryKey !== 'installments') targets.push(installmentsPos);

            let guideX: number | null = null;
            let guideY: number | null = null;

            for (const t of targets) {
                if (Math.abs(nextPrimaryX - t.x) <= SNAP_THRESHOLD) {
                    nextPrimaryX = t.x;
                    guideX = t.x;
                }
                if (Math.abs(nextPrimaryY - t.y) <= SNAP_THRESHOLD) {
                    nextPrimaryY = t.y;
                    guideY = t.y;
                }
            }

            setActiveGuideX(guideX);
            setActiveGuideY(guideY);

            // Deslocamento efetivo final pós alinhamento magnético
            const finalDx = nextPrimaryX - primaryStartPos.x;
            const finalDy = nextPrimaryY - primaryStartPos.y;

            // Move todas as camadas selecionadas juntas com a mesma variação
            activeElements.forEach((key) => {
                if (!key) return;
                const startPos = dragRef.current.initialPositions?.[key];
                if (!startPos) return;

                const finalPos = {
                    x: startPos.x + finalDx,
                    y: startPos.y + finalDy
                };

                if (key === 'title') setTitlePos(finalPos);
                else if (key === 'deText') setDePos(finalPos);
                else if (key === 'normalPrice') setNormalPricePos(finalPos);
                else if (key === 'porText') setPorPos(finalPos);
                else if (key === 'currencySymbol') setCurrencyPos(finalPos);
                else if (key === 'promoPrice') setPromoPricePos(finalPos);
                else if (key === 'cents') setCentsPos(finalPos);
                else if (key === 'installments') setInstallmentsPos(finalPos);
            });
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
        selectedElements, titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, installmentsPos,
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
        setSelectedElements(new Set(layer ? [layer] : []));

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
        setSelectedElements(new Set(layer ? [layer] : []));

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

        let fallbackSaved = null;
        if (newOppId === 'none') {
            fallbackSaved = localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
        } else {
            fallbackSaved = localStorage.getItem(getOppTemplateKey('salvado')) || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
        }
        if (fallbackSaved) {
            try {
                applySnapshot(JSON.parse(fallbackSaved));
            } catch (e) {}
        }
    };

    // SELEÇÃO UNIFICADA PLANO CARTESIANO (TIPO DE ETIQUETA X GRANDEZA)
    const handleSelectCartesianPreset = (newOppId: string, newMag: 'tens' | 'hundreds' | 'thousands') => {
        if (newOppId !== selectedOppId) {
            setSelectedOppId(newOppId);
            const oppSaved = localStorage.getItem(getOppTemplateKey(newOppId));
            let loadedSnapshot: any = null;
            if (oppSaved) {
                try {
                    loadedSnapshot = JSON.parse(oppSaved);
                } catch (e) {}
            }
            if (!loadedSnapshot) {
                const salvadoSaved = localStorage.getItem(getOppTemplateKey('salvado')) || localStorage.getItem(GLOBAL_PRICE_LABEL_ART_KEY);
                if (salvadoSaved) {
                    try { loadedSnapshot = JSON.parse(salvadoSaved); } catch (e) {}
                }
            }
            if (loadedSnapshot) {
                applySnapshot({
                    ...loadedSnapshot,
                    selectedOppId: newOppId,
                    selectedMagnitude: newMag
                });
                return;
            }
        }

        if (newMag !== selectedMagnitude) {
            handleSwitchMagnitude(newMag);
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

    // EDICAO DE FONTE E TAMANHO EM LOTE PARA MULTISELECAO
    const handleBatchFontSize = (v: number) => {
        selectedElements.forEach(key => {
            if (key === 'title') setTitleFontSize(v);
            else if (key === 'deText') setDeFontSize(v);
            else if (key === 'normalPrice') setNormalPriceFontSize(v);
            else if (key === 'porText') setPorFontSize(v);
            else if (key === 'installments') setInstallmentsFontSize(v);
            else if (key === 'currencySymbol') {
                if (selectedMagnitude === 'tens') setCurrencyFontSizeTens(v);
                else if (selectedMagnitude === 'hundreds') setCurrencyFontSizeHundreds(v);
                else setCurrencyFontSizeThousands(v);
            } else if (key === 'cents') {
                if (selectedMagnitude === 'tens') setCentsFontSizeTens(v);
                else if (selectedMagnitude === 'hundreds') setCentsFontSizeHundreds(v);
                else setCentsFontSizeThousands(v);
            } else if (key === 'promoPrice') {
                if (selectedMagnitude === 'tens') setScaleTens(Math.round(v * 4.5));
                else if (selectedMagnitude === 'hundreds') setScaleHundreds(Math.round(v * 4));
                else setScaleThousands(Math.round(v * 3.5));
            }
        });
    };

    const handleBatchFontFamily = (fontVal: string) => {
        selectedElements.forEach(key => {
            if (key === 'title') setTitleFontFamily(fontVal);
            else if (key === 'deText') setDeFontFamily(fontVal);
            else if (key === 'normalPrice') setNormalPriceFontFamily(fontVal);
            else if (key === 'porText') setPorFontFamily(fontVal);
            else if (key === 'currencySymbol') setCurrencyFontFamily(fontVal);
            else if (key === 'cents') setCentsFontFamily(fontVal);
            else if (key === 'promoPrice') setPromoPriceFontFamily(fontVal);
            else if (key === 'installments') setInstallmentsFontFamily(fontVal);
        });
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
                                        setSelectedElements(new Set(['title']));
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

                    {/* SELETOR UNIFICADO: PLANO CARTESIANO (TIPO DE ETIQUETA × GRANDEZA) */}
                    <div className="flex items-center shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsOppSelectModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-blue-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider"
                            title="Escolher Tipo de Etiqueta e Grandeza"
                        >
                            <i className="bi bi-tag-fill text-blue-600 dark:text-blue-400 text-sm" />
                            <span>Tipo de Etiqueta</span>
                            <i className="bi bi-chevron-down text-[9px] text-slate-400" />
                        </button>
                    </div>

                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

                    {/* BOTÃO PREENCHER DADOS */}
                    <button
                        type="button"
                        onClick={() => setIsDataFillModalOpen(true)}
                        title="Preencher dados da etiqueta ou puxar produto da lista"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-emerald-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
                    >
                        <i className="bi bi-pencil-square text-emerald-600 dark:text-emerald-400 text-sm" />
                        <span>Preencher Dados</span>
                    </button>

                </div>

            </div>

            {/* 3. BARRA DE FERRAMENTAS DO ELEMENTO SELECIONADO */}
            <div className="flex items-center justify-start gap-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-2 shrink-0 overflow-x-auto custom-scrollbar min-h-[44px]">
                
                {/* BOTÃO DESMARCAR (SÓ ÍCONE) */}
                <button
                    type="button"
                    onClick={() => {
                        setSelectedElement(null);
                        setSelectedElements(new Set());
                    }}
                    disabled={!selectedElement && selectedElements.size === 0}
                    title="Desmarcar Seleção"
                    className={`w-8 h-8 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center ${
                        selectedElement || selectedElements.size > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <i className="bi bi-cursor-fill text-xs" />
                </button>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 shrink-0 mx-0.5" />

                {/* SELEÇÃO ATIVA: FERRAMENTAS DA CAMADA ATIVA */}
                {selectedElements.size > 1 ? (
                    <div className="flex items-center gap-3.5 shrink-0 flex-nowrap animate-fade-in">
                        {/* Identificador de Seleção em Lote */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Seleção:</span>
                            <div className="flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs h-8">
                                <i className="bi bi-layers-half text-xs" />
                                <span>{selectedElements.size} Elementos</span>
                            </div>
                        </div>

                        {/* SELETOR DE FONTE EM LOTE */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Fonte (Lote):</span>
                            <select
                                value=""
                                onChange={e => handleBatchFontFamily(e.target.value)}
                                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold outline-none h-8 cursor-pointer shadow-xs"
                            >
                                <option value="" disabled>Alterar tipografia...</option>
                                {FONT_OPTIONS.map(font => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* TAMANHO DA FONTE EM LOTE */}
                        <div className="flex flex-col gap-0.5 items-start shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">Tamanho (Lote):</span>
                            <div className="flex items-center gap-1 h-8">
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    placeholder="Ex: 24"
                                    onChange={e => handleBatchFontSize(Number(e.target.value))}
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                />
                                <span className="text-[10px] font-bold text-slate-400">px</span>
                            </div>
                        </div>
                    </div>
                ) : selectedElement ? (
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

                        {/* SELETOR DE COR COMPACTO COM POPUP FLUTUANTE */}
                        <div className="relative shrink-0 flex items-center">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPickerDropdown(!showColorPickerDropdown);
                                }}
                                className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer overflow-hidden p-0.5 bg-white dark:bg-slate-900 active:scale-95 transition-all"
                                title="Alterar Cor"
                            >
                                <div className="w-full h-full rounded-lg border border-white/60" style={{ backgroundColor: activeColor }} />
                            </button>

                            {showColorPickerDropdown && (
                                <>
                                    {/* Overlay desfocado cobrindo a tela */}
                                    <div 
                                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9999]" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowColorPickerDropdown(false);
                                        }} 
                                    />
                                    
                                    {/* Modal flutuante de cor centralizado e premium */}
                                    <div 
                                        onClick={(e) => e.stopPropagation()}
                                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 z-[10000] animate-fade-in flex flex-col gap-4"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                            <div className="flex items-center gap-2">
                                                <i className="bi bi-palette-fill text-blue-600 dark:text-blue-400" />
                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                                    Escolha de Cor
                                                </span>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowColorPickerDropdown(false)} 
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            >
                                                <i className="bi bi-x-lg text-xs" />
                                            </button>
                                        </div>

                                        {/* Seletor Gradiente e Cor Ativa */}
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-3">
                                            <label className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md cursor-pointer overflow-hidden bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-0.5 shrink-0 hover:scale-105 active:scale-95 transition-all">
                                                <input
                                                    type="color"
                                                    value={activeColor}
                                                    onChange={e => handleColorSelect(e.target.value)}
                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                />
                                                <div className="w-full h-full rounded-lg border border-white/60" style={{ backgroundColor: activeColor }} />
                                            </label>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Cor Selecionada</span>
                                                <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{activeColor}</span>
                                            </div>
                                        </div>

                                        {/* Cores Recentes */}
                                        {colorHistory.length > 0 && (
                                            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Cores Usadas Recentemente:</span>
                                                <div className="grid grid-cols-5 gap-2 select-none">
                                                    {colorHistory.map((color, cIdx) => (
                                                        <button
                                                            key={`${color}-${cIdx}`}
                                                            type="button"
                                                            onClick={() => {
                                                                handleColorSelect(color);
                                                                setShowColorPickerDropdown(false);
                                                            }}
                                                            className={`w-9 h-9 rounded-xl border shadow-2xs hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                                                color.toLowerCase() === activeColor.toLowerCase() 
                                                                    ? 'border-blue-500 dark:border-blue-400 scale-105 ring-2 ring-blue-500/20' 
                                                                    : 'border-slate-300/40 dark:border-slate-700/60'
                                                            }`}
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
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
                onClick={() => {
                    setSelectedElement(null);
                    setSelectedElements(new Set());
                }}
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
                            setSelectedElements(new Set(['background']));
                            prevSelectedRef.current = 'background';
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
                                    zIndex: selectedElements.has('title') ? 30 : 10
                                }}
                                className={`absolute top-3 sm:top-5 left-1/2 w-max max-w-[90%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElements.has('title') 
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
                                    zIndex: selectedElements.has('deText') ? 30 : 10
                                }}
                                className={`absolute top-12 sm:top-16 left-6 sm:left-12 w-max inline-flex items-center justify-center font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElements.has('deText') 
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
                                    zIndex: selectedElements.has('normalPrice') ? 30 : 10
                                }}
                                className={`absolute top-12 sm:top-16 left-20 sm:left-28 w-max inline-flex items-center justify-center font-black leading-none px-0.5 py-0.5 whitespace-nowrap select-none transition-shadow ${
                                    selectedElements.has('normalPrice') 
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
                                    zIndex: selectedElements.has('porText') ? 30 : 10
                                }}
                                className={`absolute top-12 sm:top-16 left-56 sm:left-72 w-max inline-flex items-center justify-center font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElements.has('porText') 
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
                                    zIndex: selectedElements.has('currencySymbol') ? 30 : 10
                                }}
                                className={`absolute top-1/2 left-4 sm:left-8 w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElements.has('currencySymbol') 
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
                                    zIndex: selectedElements.has('promoPrice') ? 30 : 10
                                }}
                                className={`absolute top-1/2 left-1/2 w-max inline-flex items-center justify-center px-0.5 py-0.5 select-none transition-transform duration-75 whitespace-nowrap ${
                                    selectedElements.has('promoPrice') 
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
                                    zIndex: selectedElements.has('cents') ? 30 : 10
                                }}
                                className={`absolute top-1/2 right-4 sm:right-8 w-max font-black leading-none px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElements.has('cents') 
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
                                    zIndex: selectedElements.has('installments') ? 30 : 10
                                }}
                                className={`absolute bottom-3 sm:bottom-5 left-1/2 w-max max-w-[90%] inline-flex items-center justify-center font-black uppercase tracking-tight text-center leading-tight px-0.5 py-0.5 select-none transition-shadow whitespace-nowrap ${
                                    selectedElements.has('installments') 
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
                                        selectedElements.has(layer.key)
                                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            if (e.shiftKey) {
                                                setSelectedElements(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(layer.key)) next.delete(layer.key);
                                                    else next.add(layer.key);
                                                    if (next.size > 0) {
                                                        const arr = Array.from(next);
                                                        const last = arr[arr.length - 1];
                                                        setSelectedElement(last);
                                                        prevSelectedRef.current = last;
                                                    } else {
                                                        setSelectedElement(null);
                                                        prevSelectedRef.current = null;
                                                    }
                                                    return next;
                                                });
                                            } else {
                                                setSelectedElement(layer.key);
                                                setSelectedElements(new Set([layer.key]));
                                                prevSelectedRef.current = layer.key;
                                                setIsLayersModalOpen(false);
                                            }
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

            {/* Modal de Seleção de Oportunidades & Grandeza (zIndex: 9999) */}
            {isOppSelectModalOpen && (
                <div 
                    style={{ zIndex: 9999 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Topo do Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <i className="bi bi-tag-fill text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Tipo de Etiqueta</h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Selecione o modelo e a ordem de grandeza</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsOppSelectModalOpen(false)}
                                className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <i className="bi bi-x-lg text-xs" />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-4">
                            {allOppOptions.map(opp => {
                                const isSelectedOpp = selectedOppId === opp.id;
                                return (
                                    <div 
                                        key={opp.id} 
                                        className={`p-4 rounded-2xl border transition-all ${
                                            isSelectedOpp 
                                                ? 'border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10' 
                                                : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${isSelectedOpp ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                                                {opp.name}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                                            {[
                                                { mag: 'tens' as const, label: 'Dezena', desc: 'até R$ 99', icon: '10' },
                                                { mag: 'hundreds' as const, label: 'Centena', desc: 'R$ 100 a R$ 999', icon: '100' },
                                                { mag: 'thousands' as const, label: 'Milhar', desc: 'R$ 1.000 ou mais', icon: '1k' }
                                            ].map(item => {
                                                const isSel = isSelectedOpp && selectedMagnitude === item.mag;
                                                return (
                                                    <button
                                                        key={item.mag}
                                                        type="button"
                                                        onClick={() => {
                                                            handleSelectCartesianPreset(opp.id, item.mag);
                                                            setIsOppSelectModalOpen(false);
                                                        }}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                                            isSel 
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95' 
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mb-1.5 ${isSel ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            {item.icon}
                                                        </span>
                                                        <span className="text-xs font-black">{item.label}</span>
                                                        <span className={`text-[9px] font-bold mt-0.5 ${isSel ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>{item.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Preenchimento de Dados da Etiqueta / Puxar Produto (zIndex: 9999) */}
            {isDataFillModalOpen && (
                <div 
                    style={{ zIndex: 9999 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Topo do Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-black">
                                    <i className="bi bi-pencil-square" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        Dados da Etiqueta de Preço
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold">
                                        Preencha manualmente os campos ou selecione um produto do catálogo
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsDataFillModalOpen(false)} 
                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                            >
                                <i className="bi bi-x-lg text-sm" />
                            </button>
                        </div>

                        {/* Navegação por Abas do Modal */}
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl mb-4 shrink-0 border border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDataFillTab('search')}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    dataFillTab === 'search'
                                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className="bi bi-search text-sm" />
                                <span>Puxar Produto da Lista</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDataFillTab('manual')}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    dataFillTab === 'manual'
                                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className="bi bi-sliders text-sm" />
                                <span>Preenchimento Manual</span>
                            </button>
                        </div>

                        {/* Conteúdo Aba 1: Puxar Produto da Lista */}
                        {dataFillTab === 'search' && (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
                                {/* Campo de Busca */}
                                <div className="relative shrink-0">
                                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                                    <input
                                        type="text"
                                        value={productSearchTerm}
                                        onChange={(e) => setProductSearchTerm(e.target.value)}
                                        placeholder="Digite o nome, código ou SKU do produto..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                                    />
                                    {isSearchingProducts && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Lista de Resultados */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[220px]">
                                    {searchResults.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400">
                                            <i className="bi bi-box-seam text-3xl mb-2 block text-slate-300 dark:text-slate-700" />
                                            <p className="text-xs font-bold">Nenhum produto encontrado</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Digite um termo no campo acima para pesquisar no catálogo do ERP</p>
                                        </div>
                                    ) : (
                                        searchResults.map(prod => {
                                            const name = extractProductName(prod);
                                            const hasPromo = Number(prod.promo_price || 0) > 0;
                                            const mainImage = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null;

                                            return (
                                                <div
                                                    key={prod.id}
                                                    onClick={() => handleApplyProductToLabel(prod)}
                                                    className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                                                            {mainImage ? (
                                                                <img src={mainImage} alt={name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <i className="bi bi-image text-slate-300 text-lg" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-black text-slate-800 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase">
                                                                {name}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {prod.code && (
                                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-md uppercase">
                                                                        CÓD: {prod.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0 text-right">
                                                        <div>
                                                            {hasPromo ? (
                                                                <>
                                                                    <span className="text-[10px] text-slate-400 line-through block font-bold">
                                                                        R$ {Number(prod.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                                                                        R$ {Number(prod.promo_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm font-black text-slate-800 dark:text-white block">
                                                                    R$ {Number(prod.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider group-hover:bg-emerald-700 shadow-sm transition"
                                                        >
                                                            Puxar
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Conteúdo Aba 2: Preenchimento Manual */}
                        {dataFillTab === 'manual' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 min-h-[220px]">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Nome / Título do Produto</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value.toUpperCase())}
                                        placeholder="Ex: COLCHÃO DE ESPUMA D28..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Preço Normal (DE:)</label>
                                        <input
                                            type="text"
                                            value={normalPrice}
                                            onChange={(e) => setNormalPrice(e.target.value)}
                                            placeholder="Ex: 499,00"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Preço Principal Reais (POR:)</label>
                                        <input
                                            type="text"
                                            value={promoPrice}
                                            onChange={(e) => setPromoPrice(e.target.value)}
                                            placeholder="Ex: 299"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Centavos</label>
                                        <input
                                            type="text"
                                            value={centsText}
                                            onChange={(e) => setCentsText(e.target.value)}
                                            placeholder="Ex: ,00"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Símbolo da Moeda</label>
                                        <input
                                            type="text"
                                            value={currencySymbol}
                                            onChange={(e) => setCurrencySymbol(e.target.value)}
                                            placeholder="Ex: R$"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Frase de Parcelamento</label>
                                    <input
                                        type="text"
                                        value={installments}
                                        onChange={(e) => setInstallments(e.target.value)}
                                        placeholder="Ex: Em até 10x sem juros no cartão"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDataFillModalOpen(false);
                                        toast.success("Campos atualizados na etiqueta!");
                                    }}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md mt-2 cursor-pointer"
                                >
                                    Aplicar na Etiqueta
                                </button>
                            </div>
                        )}
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
                    className="px-8 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                    <i className="bi bi-box-arrow-right text-sm" />
                    <span>SAIR</span>
                </button>
            </div>

        </div>
    );
};

export default PriceLabelArtEditorModal;
