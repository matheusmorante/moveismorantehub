import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { LabelConfig } from './LabelConstants';
import { PriceLabelArtRenderer } from './PriceLabelArtRenderer';
import { calculateLabelPhysicalSize } from './LabelPhysicalGeometry';

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
    | 'dePricePorGroup'
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
    const isStandaloneTemplate = window.location.pathname === '/templates/price-label';
    const rawArtworkSize = calculateLabelPhysicalSize(config);
    const artworkSizeMm = (rawArtworkSize && rawArtworkSize.widthMm >= rawArtworkSize.heightMm)
        ? rawArtworkSize
        : { widthMm: 100, heightMm: 56 };
    // COR DE FUNDO PADRÃO
    const getDefaultBg = (oppId: string) => oppId === 'salvado' ? (config.bg_color || '#ff7900') : '#ffffff';

    // MARGEM DE SEGURANÇA DA IMPRESSÃO
    const [showSafetyMargin, setShowSafetyMargin] = useState(true);

    // HISTÓRICO DE CORES USADAS RECENTEMENTE
    const [colorHistory, setColorHistory] = useState<string[]>([
        '#000000', '#1e3a8a', '#dc2626', '#ea580c', '#ffffff', '#2563eb', '#16a34a', '#ff7900', '#7c3aed'
    ]);

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
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isCenterMenuOpen, setIsCenterMenuOpen] = useState(false);
    const [isOppSelectModalOpen, setIsOppSelectModalOpen] = useState(false);
    const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);
    const [showColorPickerDropdown, setShowColorPickerDropdown] = useState(false);
    const pendingGradientColorRef = useRef<string | null>(null);

    const handleCenterElement = (elementKey: string | null) => {
        if (!elementKey || elementKey === 'background') return;
        switch (elementKey) {
            case 'title':
                setTitlePos({ x: 0, y: 0 });
                break;
            case 'dePricePorGroup':
                setDePricePorGroupPos({ x: 0, y: 0 });
                break;
            case 'deText':
                setDePos({ x: 0, y: 0 });
                break;
            case 'normalPrice':
                setNormalPricePos({ x: 0, y: 0 });
                break;
            case 'porText':
                setPorPos({ x: 0, y: 0 });
                break;
            case 'currencySymbol':
                setCurrencyPos({ x: 0, y: 0 });
                break;
            case 'promoPrice':
                setPromoPricePos({ x: 0, y: 0 });
                break;
            case 'cents':
                setCentsPos({ x: 0, y: 0 });
                break;
            case 'installments':
                setInstallmentsPos({ x: 0, y: 0 });
                break;
            default:
                break;
        }
        setSelectedElement(elementKey as any);
        setSelectedElements(new Set([elementKey as any]));
        const labelName = priceLabelLayers.find(l => l.key === elementKey)?.label || elementKey;
        toast.success(`Componente "${labelName}" centralizado na etiqueta!`);
    };

    const closeColorPicker = () => {
        const color = pendingGradientColorRef.current;
        if (color) {
            setColorHistory(prev => [color, ...prev.filter(item => item.toLowerCase() !== color.toLowerCase())].slice(0, 10));
            pendingGradientColorRef.current = null;
        }
        setShowColorPickerDropdown(false);
    };

    // SISTEMA DE HISTÓRICO (REFS DECLARADAS NO TOPO DO COMPONENTE)
    const undoStackRef = useRef<any[]>([]);
    const redoStackRef = useRef<any[]>([]);
    const isApplyingHistoryRef = useRef<boolean>(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    // ESTADO DO MODAL DE TESTE DE VALORES (SLIDERS DE 0 A 9 POR DÍGITO)
    const [isTestValuesModalOpen, setIsTestValuesModalOpen] = useState(false);
    const testValuesBackupRef = useRef<{ promoPrice: string; normalPrice: string } | null>(null);

    // Sliders de Teste para o Preço Principal (Dezena, Centena, Milhar)
    const [testDezenaD1, setTestDezenaD1] = useState(3);
    const [testDezenaD2, setTestDezenaD2] = useState(9);

    const [testCentenaD1, setTestCentenaD1] = useState(3);
    const [testCentenaD2, setTestCentenaD2] = useState(9);
    const [testCentenaD3, setTestCentenaD3] = useState(9);

    const [testMilharD1, setTestMilharD1] = useState(1);
    const [testMilharD2, setTestMilharD2] = useState(3);
    const [testMilharD3, setTestMilharD3] = useState(9);
    const [testMilharD4, setTestMilharD4] = useState(9);

    // Sliders de Teste para o Preço Antigo (normalPrice)
    const [testNormalD1, setTestNormalD1] = useState(4);
    const [testNormalD2, setTestNormalD2] = useState(9);
    const [testNormalD3, setTestNormalD3] = useState(9);

    const openTestValuesModal = () => {
        testValuesBackupRef.current = {
            promoPrice,
            normalPrice
        };
        setIsTestValuesModalOpen(true);
    };

    const closeTestValuesModal = () => {
        if (testValuesBackupRef.current) {
            setPromoPrice(testValuesBackupRef.current.promoPrice);
            setNormalPrice(testValuesBackupRef.current.normalPrice);
        }
        setIsTestValuesModalOpen(false);
    };

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
        initialPositions: Partial<Record<string, { x: number; y: number }>>;
    }>({
        isDragging: false,
        layer: null,
        startX: 0,
        startY: 0,
        initialPos: { x: 0, y: 0 },
        initialPositions: {}
    });

    // Resize do Elemento
    const resizeRef = useRef<{
        isResizing: boolean;
        layer: PriceLabelLayerKey;
        startX: number;
        startY: number;
        initialVal: number;
        initialTens?: number;
        initialHundreds?: number;
        initialThousands?: number;
        initialTenThousands?: number;
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


    // SNAPSHOT DOS VALORES DE ESTILO E POSICIONAMENTO DA MAGNITUDE ATUAL
    // oppColorsMap é global (não por grandeza), salvo somente no getSnapshot
    const getMagnitudeSnapshot = useCallback(() => ({
        title, showTitle, titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands, titleColor, titleFontFamily, titlePos, titleRotation,
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
        title, showTitle, titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands, titleColor, titleFontFamily, titlePos, titleRotation,
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
            ...Object.fromEntries(Object.entries(magnitudeTemplates).map(([magnitude, template]) => [
                magnitude,
                { ...template, ...sharedLayout }
            ])),
            [selectedMagnitude]: curMagState
        };
        return {
            selectedOppId,
            selectedMagnitude,
            magnitudeTemplates: fullTemplates,
            oppColorsMap,
            ...curMagState
        };
    }, [selectedOppId, selectedMagnitude, magnitudeTemplates, getMagnitudeSnapshot, oppColorsMap,
        titlePos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, installmentsPos, dePricePorGroupPos,
        titleFontSizeTens, titleFontSizeHundreds, titleFontSizeThousands,
        deFontSizeTens, deFontSizeHundreds, deFontSizeThousands,
        normalPriceFontSizeTens, normalPriceFontSizeHundreds, normalPriceFontSizeThousands,
        porFontSizeTens, porFontSizeHundreds, porFontSizeThousands,
        currencyFontSizeTens, currencyFontSizeHundreds, currencyFontSizeThousands,
        scaleTens, scaleHundreds, scaleThousands, scaleTenThousands,
        centsFontSizeTens, centsFontSizeHundreds, centsFontSizeThousands,
        installmentsFontSizeTens, installmentsFontSizeHundreds, installmentsFontSizeThousands]);

    // APLICA O SNAPSHOT DE UMA ORDEM DE GRANDEZA ESPECÍFICA
    const applyMagnitudeSnapshot = (s: any) => {
        if (!s) return;
        if (s.title !== undefined) setTitle(s.title);
        if (s.showTitle !== undefined) setShowTitle(s.showTitle);
        if (s.titleFontSizeTens !== undefined) setTitleFontSizeTens(s.titleFontSizeTens); else if (s.titleFontSize !== undefined) setTitleFontSizeTens(s.titleFontSize);
        if (s.titleFontSizeHundreds !== undefined) setTitleFontSizeHundreds(s.titleFontSizeHundreds); else if (s.titleFontSize !== undefined) setTitleFontSizeHundreds(s.titleFontSize);
        if (s.titleFontSizeThousands !== undefined) setTitleFontSizeThousands(s.titleFontSizeThousands); else if (s.titleFontSize !== undefined) setTitleFontSizeThousands(s.titleFontSize);

        if (s.titleColor) setTitleColor(s.titleColor);
        if (s.titleFontFamily) setTitleFontFamily(s.titleFontFamily);
        if (s.titlePos && (s.titlePos.x !== 0 || s.titlePos.y !== 0)) setTitlePos(s.titlePos); else setTitlePos({ x: 0, y: -160 });
        if (s.titleRotation !== undefined) setTitleRotation(s.titleRotation);

        if (s.deText !== undefined) setDeText(s.deText);
        if (s.showDe !== undefined) setShowDe(s.showDe);
        if (s.deFontSizeTens !== undefined) setDeFontSizeTens(s.deFontSizeTens); else if (s.deFontSize !== undefined) setDeFontSizeTens(s.deFontSize);
        if (s.deFontSizeHundreds !== undefined) setDeFontSizeHundreds(s.deFontSizeHundreds); else if (s.deFontSize !== undefined) setDeFontSizeHundreds(s.deFontSize);
        if (s.deFontSizeThousands !== undefined) setDeFontSizeThousands(s.deFontSizeThousands); else if (s.deFontSize !== undefined) setDeFontSizeThousands(s.deFontSize);

        if (s.deColor) setDeColor(s.deColor);
        if (s.deFontFamily) setDeFontFamily(s.deFontFamily);
        if (s.dePos) setDePos(s.dePos);
        if (s.deRotation !== undefined) setDeRotation(s.deRotation);

        if (s.normalPrice !== undefined) setNormalPrice(s.normalPrice);
        if (s.showNormalPrice !== undefined) setShowNormalPrice(s.showNormalPrice);
        if (s.normalPriceFontSizeTens !== undefined) setNormalPriceFontSizeTens(s.normalPriceFontSizeTens); else if (s.normalPriceFontSize !== undefined) setNormalPriceFontSizeTens(s.normalPriceFontSize);
        if (s.normalPriceFontSizeHundreds !== undefined) setNormalPriceFontSizeHundreds(s.normalPriceFontSizeHundreds); else if (s.normalPriceFontSize !== undefined) setNormalPriceFontSizeHundreds(s.normalPriceFontSize);
        if (s.normalPriceFontSizeThousands !== undefined) setNormalPriceFontSizeThousands(s.normalPriceFontSizeThousands); else if (s.normalPriceFontSize !== undefined) setNormalPriceFontSizeThousands(s.normalPriceFontSize);

        if (s.normalPriceColor) setNormalPriceColor(s.normalPriceColor);
        if (s.normalPriceFontFamily) setNormalPriceFontFamily(s.normalPriceFontFamily);
        if (s.normalPricePos) setNormalPricePos(s.normalPricePos);
        if (s.normalPriceRotation !== undefined) setNormalPriceRotation(s.normalPriceRotation);

        if (s.porText !== undefined) setPorText(s.porText);
        if (s.showPor !== undefined) setShowPor(s.showPor);
        if (s.porFontSizeTens !== undefined) setPorFontSizeTens(s.porFontSizeTens); else if (s.porFontSize !== undefined) setPorFontSizeTens(s.porFontSize);
        if (s.porFontSizeHundreds !== undefined) setPorFontSizeHundreds(s.porFontSizeHundreds); else if (s.porFontSize !== undefined) setPorFontSizeHundreds(s.porFontSize);
        if (s.porFontSizeThousands !== undefined) setPorFontSizeThousands(s.porFontSizeThousands); else if (s.porFontSize !== undefined) setPorFontSizeThousands(s.porFontSize);

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
        if (s.centsFontSizeTens !== undefined) setCentsFontSizeTens(s.centsFontSizeTens);
        else if (s.centsFontSize !== undefined) setCentsFontSizeTens(s.centsFontSize);
        if (s.centsFontSizeHundreds !== undefined) setCentsFontSizeHundreds(s.centsFontSizeHundreds);
        else if (s.centsFontSize !== undefined) setCentsFontSizeHundreds(s.centsFontSize);
        if (s.centsFontSizeThousands !== undefined) setCentsFontSizeThousands(s.centsFontSizeThousands);
        else if (s.centsFontSize !== undefined) setCentsFontSizeThousands(s.centsFontSize);

        if (s.centsColor) setCentsColor(s.centsColor);
        if (s.centsFontFamily) setCentsFontFamily(s.centsFontFamily);
        if (s.centsPos && (s.centsPos.x !== 0 || s.centsPos.y !== 0)) setCentsPos(s.centsPos); else setCentsPos({ x: 260, y: -10 });
        if (s.centsRotation !== undefined) setCentsRotation(s.centsRotation);

        if (s.showInstallments !== undefined) setShowInstallments(s.showInstallments);
        if (s.installments) setInstallments(s.installments);
        if (s.installmentsFontSizeTens !== undefined) setInstallmentsFontSizeTens(s.installmentsFontSizeTens); else if (s.installmentsFontSize !== undefined) setInstallmentsFontSizeTens(s.installmentsFontSize);
        if (s.installmentsFontSizeHundreds !== undefined) setInstallmentsFontSizeHundreds(s.installmentsFontSizeHundreds); else if (s.installmentsFontSize !== undefined) setInstallmentsFontSizeHundreds(s.installmentsFontSize);
        if (s.installmentsFontSizeThousands !== undefined) setInstallmentsFontSizeThousands(s.installmentsFontSizeThousands); else if (s.installmentsFontSize !== undefined) setInstallmentsFontSizeThousands(s.installmentsFontSize);

        if (s.installmentsColor) setInstallmentsColor(s.installmentsColor);
        if (s.installmentsFontFamily) setInstallmentsFontFamily(s.installmentsFontFamily);
        if (s.installmentsPos) setInstallmentsPos(s.installmentsPos);
        if (s.installmentsRotation !== undefined) setInstallmentsRotation(s.installmentsRotation);

        if (s.dePricePorGroupPos && (s.dePricePorGroupPos.x !== 0 || s.dePricePorGroupPos.y !== 0)) setDePricePorGroupPos(s.dePricePorGroupPos); else setDePricePorGroupPos({ x: -40, y: -80 });
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
            setTitlePos(currentLayout.titlePos); setDePos(currentLayout.dePos); setNormalPricePos(currentLayout.normalPricePos);
            setPorPos(currentLayout.porPos); setCurrencyPos(currentLayout.currencyPos); setPromoPricePos(currentLayout.promoPricePos);
            setCentsPos(currentLayout.centsPos); setInstallmentsPos(currentLayout.installmentsPos); setDePricePorGroupPos(currentLayout.dePricePorGroupPos);
            setTitleFontSizeTens(currentLayout.titleFontSizeTens); setTitleFontSizeHundreds(currentLayout.titleFontSizeHundreds); setTitleFontSizeThousands(currentLayout.titleFontSizeThousands);
            setDeFontSizeTens(currentLayout.deFontSizeTens); setDeFontSizeHundreds(currentLayout.deFontSizeHundreds); setDeFontSizeThousands(currentLayout.deFontSizeThousands);
            setNormalPriceFontSizeTens(currentLayout.normalPriceFontSizeTens); setNormalPriceFontSizeHundreds(currentLayout.normalPriceFontSizeHundreds); setNormalPriceFontSizeThousands(currentLayout.normalPriceFontSizeThousands);
            setPorFontSizeTens(currentLayout.porFontSizeTens); setPorFontSizeHundreds(currentLayout.porFontSizeHundreds); setPorFontSizeThousands(currentLayout.porFontSizeThousands);
            setCurrencyFontSizeTens(currentLayout.currencyFontSizeTens); setCurrencyFontSizeHundreds(currentLayout.currencyFontSizeHundreds); setCurrencyFontSizeThousands(currentLayout.currencyFontSizeThousands);
            setScaleTens(currentLayout.scaleTens); setScaleHundreds(currentLayout.scaleHundreds); setScaleThousands(currentLayout.scaleThousands); setScaleTenThousands(currentLayout.scaleTenThousands);
            setCentsFontSizeTens(currentLayout.centsFontSizeTens); setCentsFontSizeHundreds(currentLayout.centsFontSizeHundreds); setCentsFontSizeThousands(currentLayout.centsFontSizeThousands);
            setInstallmentsFontSizeTens(currentLayout.installmentsFontSizeTens); setInstallmentsFontSizeHundreds(currentLayout.installmentsFontSizeHundreds); setInstallmentsFontSizeThousands(currentLayout.installmentsFontSizeThousands);
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
            applyMagnitudeSnapshot(targetState);
        }
    };

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

    // Carrega modelo salvo no Supabase (Fonte Única da Verdade) por Oportunidade ou Global
    useEffect(() => {
        if (!isOpen) {
            isInitializedRef.current = false;
            return;
        }

        const loadArtConfigFromSupabase = async () => {
            const layoutId = String(config?.layoutId || 'preco_2x5_restored');
            let dbArtConfig = config?.artConfig;

            if (!dbArtConfig) {
                const { data } = await supabase
                    .from('label_art_configs')
                    .select('art_config')
                    .eq('layout_id', layoutId)
                    .maybeSingle();
                if (data?.art_config) {
                    dbArtConfig = data.art_config;
                }
            }

            if (dbArtConfig) {
                if (dbArtConfig.oppColorsMap && typeof dbArtConfig.oppColorsMap === 'object') {
                    setOppColorsMap(dbArtConfig.oppColorsMap);
                }

                const effectiveOppId = selectedOppId || 'none';
                const snapshotToApply = dbArtConfig.opportunities?.[effectiveOppId]
                    || dbArtConfig.opportunities?.['none']
                    || dbArtConfig.opportunities?.['default']
                    || dbArtConfig.opportunities?.['salvado']
                    || dbArtConfig.globalSnapshot;

                if (snapshotToApply) {
                    applySnapshot({ ...snapshotToApply, selectedOppId: effectiveOppId }, isInitializedRef.current);
                } else {
                    const initialBg = selectedOppId === 'none' ? '#ffffff' : (selectedOppId === 'salvado' ? '#ff7900' : '#ffffff');
                    setBgColor(initialBg);
                }
            } else {
                const initialBg = selectedOppId === 'none' ? '#ffffff' : (selectedOppId === 'salvado' ? '#ff7900' : '#ffffff');
                setBgColor(initialBg);
            }

            setTimeout(() => {
                isInitializedRef.current = true;
            }, 100);
        };

        loadArtConfigFromSupabase();
    }, [isOpen, selectedOppId, config?.layoutId, config?.artConfig]);

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

    // SINCRONIZA AS CORES DOS ELEMENTOS COM A VISÃO DO TIPO DE ETIQUETA SELECIONADO
    // ATENÇÃO: Só roda após inicialização concluída para não sobrescrever as cores
    // restauradas pelo applySnapshot durante a abertura do modal.
    useEffect(() => {
        if (!selectedOppId) return;
        // Bloqueia durante inicialização para não sobrescrever snapshot carregado
        if (!isInitializedRef.current) return;

        const currentOppColors = oppColorsMap[selectedOppId] || {};

        setTitleColor(currentOppColors['title'] || '#000000');
        setDeColor(currentOppColors['deText'] || '#000000');
        setNormalPriceColor(currentOppColors['normalPrice'] || '#000000');
        setPorColor(currentOppColors['porText'] || '#000000');
        setCurrencyColor(currentOppColors['currencySymbol'] || '#000000');
        setPriceColor(currentOppColors['promoPrice'] || '#1e3a8a');
        setCentsColor(currentOppColors['cents'] || '#000000');
        setInstallmentsColor(currentOppColors['installments'] || '#000000');
        const savedBackground = currentOppColors['background'];
        setBgColor(savedBackground && savedBackground !== 'transparent' ? savedBackground : defaultBgColor);
    }, [selectedOppId, oppColorsMap, defaultBgColor]);

    const handleSaveAndExit = () => {
        const currentSnapshot = getSnapshot();

        const fullArtConfig = {
            ...(config.artConfig || {}),
            globalSnapshot: currentSnapshot,
            oppColorsMap: {
                ...(config.artConfig?.oppColorsMap || {}),
                ...oppColorsMap,
            },
            opportunities: {
                ...(config.artConfig?.opportunities || {}),
                default: currentSnapshot,
                none: currentSnapshot,
                [selectedOppId]: currentSnapshot,
            },
        };

        const targetLayoutId = String(config.layoutId || 'preco_2x5_restored');
        supabase.from('label_art_configs').upsert({
            layout_id: targetLayoutId,
            category: 'precos',
            art_config: fullArtConfig,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'layout_id' }).then(({ error }) => {
            if (error) console.error('Erro ao sincronizar template com Supabase:', error);
        });

        const saveResult = onSaveConfig({
            artConfig: fullArtConfig,
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
            dePricePorGroupPos,
            dePricePorGroupRotation,
            dePricePorGroupGap,
            artConfig: fullArtConfig,
        });
        Promise.resolve(saveResult).finally(onClose);
    };

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
                else if (selectedElement === 'dePricePorGroup') setDePricePorGroupPos(p => ({ x: p.x + dx, y: p.y + dy }));
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
    }, [isOpen, selectedElement, handleUndo, handleRedo]);

    // SELEÇÃO INTELIGENTE DE ELEMENTOS (ALTERNÂNCIA DE CAMADAS SOBREPOSTAS AO RE-CLICAR E SHIFT MULTISELEÇÃO)
    const handleElementClick = useCallback((layerKey: PriceLabelLayerKey, e: React.MouseEvent) => {
        e.stopPropagation();

        const visibleLayers: { key: PriceLabelLayerKey; label: string }[] = [
            { key: 'title', label: 'Nome do Produto' },
            { key: 'dePricePorGroup', label: 'Grupo De / Preço / Por (Flex)' },
            { key: 'deText', label: 'Texto "De"' },
            { key: 'normalPrice', label: 'Preço Original' },
            { key: 'porText', label: 'Texto "Por"' },
            { key: 'currencySymbol', label: 'Símbolo R$' },
            { key: 'promoPrice', label: 'Preço Principal' },
            { key: 'cents', label: 'Centavos' },
            { key: 'installments', label: 'Parcelamento' }
        ];

        if (e.shiftKey) {
            // Clicar com Shift em qualquer um dos itens do grupo (De, Preço Original, Por) seleciona o AGRUPAMENTO (dePricePorGroup)
            if (['deText', 'normalPrice', 'porText', 'dePricePorGroup'].includes(layerKey as string)) {
                setSelectedElement('dePricePorGroup');
                setSelectedElements(new Set<PriceLabelLayerKey>(['dePricePorGroup']));
                return;
            }

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
        if (!layer) return;
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
                else if (key === 'dePricePorGroup') pos = { ...dePricePorGroupPos };
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
            
            const el = previewRef.current;
            const s = el ? Math.min(el.clientWidth / 840, el.clientHeight / 480) : 1;
            const currentScale = s > 0 ? s : 1;
            const dx = Math.round((curX - dragRef.current.startX) / currentScale);
            const dy = Math.round((curY - dragRef.current.startY) / currentScale);

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
                else if (key === 'dePricePorGroup') setDePricePorGroupPos(finalPos);
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
        selectedElement, selectedElements, titlePos, dePricePorGroupPos, dePos, normalPricePos, porPos, currencyPos, promoPricePos, centsPos, installmentsPos,
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

    // VALOR EXIBIDO DO PREÇO PRINCIPAL
    const displayPriceNumber = useMemo(() => {
        return getIntegerPart(promoPrice || normalPrice || '1.999');
    }, [promoPrice, normalPrice]);

    // Valores dinâmicos para renderização baseados na Ordem de Grandeza ativa ou selecionada
    const activeTitleFontSize = selectedMagnitude === 'tens' ? titleFontSizeTens : selectedMagnitude === 'hundreds' ? titleFontSizeHundreds : titleFontSizeThousands;
    const activeDeFontSize = selectedMagnitude === 'tens' ? deFontSizeTens : selectedMagnitude === 'hundreds' ? deFontSizeHundreds : deFontSizeThousands;
    const activeNormalPriceFontSize = selectedMagnitude === 'tens' ? normalPriceFontSizeTens : selectedMagnitude === 'hundreds' ? normalPriceFontSizeHundreds : normalPriceFontSizeThousands;
    const activePorFontSize = selectedMagnitude === 'tens' ? porFontSizeTens : selectedMagnitude === 'hundreds' ? porFontSizeHundreds : porFontSizeThousands;
    const activeInstallmentsFontSize = selectedMagnitude === 'tens' ? installmentsFontSizeTens : selectedMagnitude === 'hundreds' ? installmentsFontSizeHundreds : installmentsFontSizeThousands;

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
        if (layer === 'title') initial = activeTitleFontSize;
        else if (layer === 'deText') initial = activeDeFontSize;
        else if (layer === 'normalPrice') initial = activeNormalPriceFontSize;
        else if (layer === 'porText') initial = activePorFontSize;
        else if (layer === 'currencySymbol') initial = activeCurrencyFontSize;
        else if (layer === 'cents') initial = activeCentsFontSize;
        else if (layer === 'installments') initial = activeInstallmentsFontSize;
        else if (layer === 'promoPrice') initial = activeScale;

        resizeRef.current = {
            isResizing: true,
            layer,
            startX: clientX,
            startY: clientY,
            initialVal: initial,
            initialTens: scaleTens,
            initialHundreds: scaleHundreds,
            initialThousands: scaleThousands,
            initialTenThousands: scaleTenThousands
        };

        const handleMouseMove = (moveEvt: MouseEvent | TouchEvent) => {
            if (!resizeRef.current.isResizing || !resizeRef.current.layer) return;
            const curX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const curY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

            const delta = (curX - resizeRef.current.startX) + (curY - resizeRef.current.startY);
            const l = resizeRef.current.layer;

            if (l === 'promoPrice') {
                const deltaPx = Math.round(delta * 0.18);
                setScaleTens(Math.max(10, (resizeRef.current.initialTens ?? scaleTens) + deltaPx));
                setScaleHundreds(Math.max(10, (resizeRef.current.initialHundreds ?? scaleHundreds) + deltaPx));
                setScaleThousands(Math.max(10, (resizeRef.current.initialThousands ?? scaleThousands) + deltaPx));
                setScaleTenThousands(Math.max(10, (resizeRef.current.initialTenThousands ?? scaleTenThousands) + deltaPx));
            } else if (l === 'currencySymbol') {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                setCurrencyFontSizeTens(newSize);
                setCurrencyFontSizeHundreds(newSize);
                setCurrencyFontSizeThousands(newSize);
            } else if (l === 'cents') {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                setCentsFontSizeTens(newSize);
                setCentsFontSizeHundreds(newSize);
                setCentsFontSizeThousands(newSize);
            } else {
                const newSize = Math.max(4, Math.round(resizeRef.current.initialVal + delta * 0.18));
                if (l === 'title') {
                    setTitleFontSizeTens(newSize);
                    setTitleFontSizeHundreds(newSize);
                    setTitleFontSizeThousands(newSize);
                } else if (l === 'deText') {
                    setDeFontSizeTens(newSize);
                    setDeFontSizeHundreds(newSize);
                    setDeFontSizeThousands(newSize);
                } else if (l === 'normalPrice') {
                    setNormalPriceFontSizeTens(newSize);
                    setNormalPriceFontSizeHundreds(newSize);
                    setNormalPriceFontSizeThousands(newSize);
                } else if (l === 'porText') {
                    setPorFontSizeTens(newSize);
                    setPorFontSizeHundreds(newSize);
                    setPorFontSizeThousands(newSize);
                } else if (l === 'installments') {
                    setInstallmentsFontSizeTens(newSize);
                    setInstallmentsFontSizeHundreds(newSize);
                    setInstallmentsFontSizeThousands(newSize);
                }
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
    }, [activeTitleFontSize, activeDeFontSize, activeNormalPriceFontSize, activePorFontSize, activeCurrencyFontSize, activeCentsFontSize, activeInstallmentsFontSize, activeScale, selectedMagnitude]);

    // ROTACIONAR ELEMENTO ARRASTANDO A SETA CURVADA
    const startRotating = useCallback((layer: PriceLabelLayerKey, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement(layer);
        setSelectedElements(new Set(layer ? [layer] : []));

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

        let initialRot = 0;
        if (layer === 'title') initialRot = titleRotation;
        else if (layer === 'dePricePorGroup') initialRot = dePricePorGroupRotation;
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
            else if (l === 'dePricePorGroup') setDePricePorGroupRotation(newRot);
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
        const dbArtConfig = config?.artConfig;
        if (dbArtConfig) {
            const snapshotToApply = dbArtConfig.opportunities?.[newOppId]
                || dbArtConfig.opportunities?.['none']
                || dbArtConfig.opportunities?.['default']
                || dbArtConfig.opportunities?.['salvado']
                || dbArtConfig.globalSnapshot;
            if (snapshotToApply) {
                applySnapshot({ ...snapshotToApply, selectedOppId: newOppId }, true);
            }
        }
    };

    // SELEÇÃO UNIFICADA PLANO CARTESIANO (TIPO DE ETIQUETA X GRANDEZA)
    const handleSelectCartesianPreset = (newOppId: string, newMag: 'tens' | 'hundreds' | 'thousands') => {
        if (newMag !== selectedMagnitude) {
            handleSwitchMagnitude(newMag);
        }
    };

    // APLICAÇÃO DE COR
    const handleColorSelect = (newColor: string, addToHistory = true) => {
        if (selectedElement === 'title') setTitleColor(newColor);
        else if (selectedElement === 'deText') setDeColor(newColor);
        else if (selectedElement === 'normalPrice') setNormalPriceColor(newColor);
        else if (selectedElement === 'porText') setPorColor(newColor);
        else if (selectedElement === 'currencySymbol') setCurrencyColor(newColor);
        else if (selectedElement === 'promoPrice') setPriceColor(newColor);
        else if (selectedElement === 'cents') setCentsColor(newColor);
        else if (selectedElement === 'installments') setInstallmentsColor(newColor);
        else if (selectedElement === 'background') setBgColor(newColor);

        // Persiste a cor no mapa por tipo de etiqueta ativo
        if (selectedElement && selectedOppId) {
            setOppColorsMap(prev => ({
                ...prev,
                [selectedOppId]: {
                    ...(prev[selectedOppId] || {}),
                    [selectedElement]: newColor
                }
            }));
        }

        if (addToHistory) {
            setColorHistory(prev => {
                const filtered = prev.filter(c => c.toLowerCase() !== newColor.toLowerCase());
                return [newColor, ...filtered].slice(0, 10);
            });
        }
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
            if (key === 'title') { setTitleFontSizeTens(v); setTitleFontSizeHundreds(v); setTitleFontSizeThousands(v); }
            else if (key === 'deText') { setDeFontSizeTens(v); setDeFontSizeHundreds(v); setDeFontSizeThousands(v); }
            else if (key === 'normalPrice') { setNormalPriceFontSizeTens(v); setNormalPriceFontSizeHundreds(v); setNormalPriceFontSizeThousands(v); }
            else if (key === 'porText') { setPorFontSizeTens(v); setPorFontSizeHundreds(v); setPorFontSizeThousands(v); }
            else if (key === 'installments') { setInstallmentsFontSizeTens(v); setInstallmentsFontSizeHundreds(v); setInstallmentsFontSizeThousands(v); }
            else if (key === 'currencySymbol') {
                if (selectedMagnitude === 'tens') setCurrencyFontSizeTens(v);
                else if (selectedMagnitude === 'hundreds') setCurrencyFontSizeHundreds(v);
                else setCurrencyFontSizeThousands(v);
            } else if (key === 'cents') {
                if (selectedMagnitude === 'tens') setCentsFontSizeTens(v);
                else if (selectedMagnitude === 'hundreds') setCentsFontSizeHundreds(v);
                else setCentsFontSizeThousands(v);
            } else if (key === 'promoPrice') {
                if (selectedMagnitude === 'tens') setScaleTens(v);
                else if (selectedMagnitude === 'hundreds') setScaleHundreds(v);
                else setScaleThousands(v);
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
        (bgColor && bgColor !== 'transparent' ? bgColor : oppColorsMap[selectedOppId]?.background || defaultBgColor);

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

            const canvas = await html2canvas(previewRef.current, {
                scale: 1,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: previewRef.current.clientWidth,
                height: previewRef.current.clientHeight,
                scrollX: 0,
                scrollY: 0
            });
            
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

            const canvas = await html2canvas(previewRef.current, {
                scale: 1,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: previewRef.current.clientWidth,
                height: previewRef.current.clientHeight,
                scrollX: 0,
                scrollY: 0
            });
            
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
        <div className={`fixed inset-0 z-50 flex flex-col animate-fade-in overflow-hidden w-screen h-screen ${isStandaloneTemplate ? 'bg-white dark:bg-slate-950' : 'bg-slate-900/90 backdrop-blur-md'}`}>
            {/* CARREGAMENTO DAS FONTES GOOGLE PARA AS ETIQUETAS */}
            <link 
                href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Poppins:wght@400;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap" 
                rel="stylesheet" 
            />
            
            {/* 1. MODAL HEADER FULLWIDTH */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 relative z-30">
                <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
                        <i className="bi bi-palette-fill text-sm" />
                    </div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                            TEMPLATE DA ETIQUETA DE PREÇO
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        title="Desfazer alterações (Ctrl+Z)"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="bi bi-arrow-counterclockwise text-sm"></i>
                        <span className="hidden sm:inline">Desfazer</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        title="Refazer alterações (Ctrl+Y)"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="bi bi-arrow-clockwise text-sm"></i>
                        <span className="hidden sm:inline">Refazer</span>
                    </button>

                    <button type="button" onClick={onClose} className="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 text-slate-500 hover:text-red-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ml-1 text-xs font-black">
                        <i className="bi bi-arrow-left text-xs" />
                        <span>Voltar ao ERP</span>
                    </button>
                </div>
            </div>

            {/* 2. BARRA DE MENU PRINCIPAL (SUPERIOR) */}
            <div className="flex items-center justify-start gap-3 bg-slate-200/80 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-1.5 shrink-0 overflow-visible relative z-[1000]">
                
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
                                className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-[1100] animate-fade-in"
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

                    {/* SELETOR DE CONTEXTO: TIPO DE ETIQUETA (VISÃO DE CONTEXTO) */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
                        <i className="bi bi-tag-fill text-blue-600 dark:text-blue-400 text-xs shrink-0" />
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider shrink-0">
                            Visão:
                        </span>
                        <select
                            value={selectedOppId}
                            onChange={(e) => setSelectedOppId(e.target.value)}
                            className="bg-transparent text-slate-800 dark:text-white text-xs font-black uppercase outline-none cursor-pointer pr-1"
                            title="Alternar visão de contexto do tipo de etiqueta"
                        >
                            {allOppOptions.map(opp => (
                                <option key={opp.id} value={opp.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold">
                                    {opp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

                    {/* BOTÃO PRODUTO MODELO */}
                    <button
                        type="button"
                        onClick={() => setIsDataFillModalOpen(true)}
                        title="Escolher produto modelo ou preencher dados da etiqueta"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-emerald-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
                    >
                        <i className="bi bi-box-seam-fill text-emerald-600 dark:text-emerald-400 text-sm" />
                        <span>Produto Modelo</span>
                    </button>

                    {/* BOTÃO TESTE DE VALORES */}
                    <button
                        type="button"
                        onClick={openTestValuesModal}
                        title="Simular e testar numerações nos preços da etiqueta com sliders (0 a 9)"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
                    >
                        <i className="bi bi-sliders text-purple-600 dark:text-purple-400 text-sm" />
                        <span>Teste de Valores</span>
                    </button>

                </div>

            </div>

            {/* 3. BARRA DE FERRAMENTAS DO ELEMENTO SELECIONADO */}
            <div className="flex items-center justify-start gap-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-2 shrink-0 overflow-visible relative z-30 min-h-[44px]">
                
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
                        {selectedElement !== 'background' && selectedElement !== 'dePricePorGroup' && (
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



                        {/* CONTROLE DE ESPAÇAMENTO (GAP) DO GRUPO FLEX DE/POR */}
                        {selectedElement === 'dePricePorGroup' && (
                            <div className="flex flex-col gap-0.5 items-start shrink-0">
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none">Espaçamento do Grupo:</span>
                                <div className="flex items-center gap-1 h-8">
                                    <input
                                        type="number"
                                        min="0"
                                        max="200"
                                        value={dePricePorGroupGap}
                                        onChange={e => setDePricePorGroupGap(Number(e.target.value))}
                                        className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">px</span>
                                </div>
                            </div>
                        )}

                        {/* SELETOR DE TAMANHO FLUTUANTE (TEXTO LIMPO SEM BORDA OU BG) */}
                        {selectedElement !== 'background' && selectedElement !== 'dePricePorGroup' && (
                            <div className="relative shrink-0 flex items-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSizeDropdown(!showSizeDropdown);
                                    }}
                                    className="px-2 py-1 text-xs font-black text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent border-0 cursor-pointer flex items-center gap-1.5 transition-colors"
                                >
                                    <span>Tamanho</span>
                                    <i className={`bi bi-chevron-down text-[10px] transition-transform ${showSizeDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showSizeDropdown && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[100]" 
                                            onClick={() => setShowSizeDropdown(false)} 
                                        />
                                        <div 
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[200] animate-fade-in flex flex-col gap-3"
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                                    Tamanho da Fonte (px)
                                                </span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowSizeDropdown(false)}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                >
                                                    <i className="bi bi-x-lg text-xs" />
                                                </button>
                                            </div>

                                            {selectedElement === 'promoPrice' ? (
                                                <>
                                                    {/* 1. DEZENA */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Dezena:</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={scaleTens}
                                                                    onChange={e => setScaleTens(Number(e.target.value))}
                                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">px</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPromoPriceTens(!showPromoPriceTens)}
                                                                title={showPromoPriceTens ? "Ocultar Dezena" : "Exibir Dezena"}
                                                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                                                    showPromoPriceTens
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                                                }`}
                                                            >
                                                                <i className={`bi ${showPromoPriceTens ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* 2. CENTENA */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Centena:</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={scaleHundreds}
                                                                    onChange={e => setScaleHundreds(Number(e.target.value))}
                                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">px</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPromoPriceHundreds(!showPromoPriceHundreds)}
                                                                title={showPromoPriceHundreds ? "Ocultar Centena" : "Exibir Centena"}
                                                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                                                    showPromoPriceHundreds
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                                                }`}
                                                            >
                                                                <i className={`bi ${showPromoPriceHundreds ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* 3. MILHAR */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Milhar:</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="1000"
                                                                    value={scaleThousands}
                                                                    onChange={e => setScaleThousands(Number(e.target.value))}
                                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">px</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPromoPriceThousands(!showPromoPriceThousands)}
                                                                title={showPromoPriceThousands ? "Ocultar Milhar" : "Exibir Milhar"}
                                                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                                                    showPromoPriceThousands
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                                                                }`}
                                                            >
                                                                <i className={`bi ${showPromoPriceThousands ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                /* TAMANHO ÚNICO PARA TODOS OS OUTROS ELEMENTOS */
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tamanho da Fonte:</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="1000"
                                                            value={
                                                                selectedElement === 'title' ? titleFontSizeTens :
                                                                selectedElement === 'deText' ? deFontSizeTens :
                                                                selectedElement === 'normalPrice' ? normalPriceFontSizeTens :
                                                                selectedElement === 'porText' ? porFontSizeTens :
                                                                selectedElement === 'currencySymbol' ? currencyFontSizeTens :
                                                                selectedElement === 'cents' ? centsFontSizeTens :
                                                                installmentsFontSizeTens
                                                            }
                                                            onChange={e => {
                                                                const v = Number(e.target.value);
                                                                if (selectedElement === 'title') { setTitleFontSizeTens(v); setTitleFontSizeHundreds(v); setTitleFontSizeThousands(v); }
                                                                else if (selectedElement === 'deText') { setDeFontSizeTens(v); setDeFontSizeHundreds(v); setDeFontSizeThousands(v); }
                                                                else if (selectedElement === 'normalPrice') { setNormalPriceFontSizeTens(v); setNormalPriceFontSizeHundreds(v); setNormalPriceFontSizeThousands(v); }
                                                                else if (selectedElement === 'porText') { setPorFontSizeTens(v); setPorFontSizeHundreds(v); setPorFontSizeThousands(v); }
                                                                else if (selectedElement === 'currencySymbol') { setCurrencyFontSizeTens(v); setCurrencyFontSizeHundreds(v); setCurrencyFontSizeThousands(v); }
                                                                else if (selectedElement === 'cents') { setCentsFontSizeTens(v); setCentsFontSizeHundreds(v); setCentsFontSizeThousands(v); }
                                                                else if (selectedElement === 'installments') { setInstallmentsFontSizeTens(v); setInstallmentsFontSizeHundreds(v); setInstallmentsFontSizeThousands(v); }
                                                            }}
                                                            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-20 text-center h-8"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-400">px</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* SELETOR DE COR COMPACTO COM POPUP FLUTUANTE */}
                        {selectedElement !== 'dePricePorGroup' && (
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
                                            closeColorPicker();
                                        }} 
                                    />
                                    
                                    {/* Modal flutuante de cor por Tipo de Etiqueta */}
                                    <div 
                                        onClick={(e) => e.stopPropagation()}
                                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 z-[10000] animate-fade-in flex flex-col max-h-[85vh]"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                                                    <i className="bi bi-palette-fill text-base" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                        Cores por Tipo de Etiqueta
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-bold">
                                                        Configure a cor e veja as cores recentes para cada modalidade
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                        onClick={closeColorPicker} 
                                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                            >
                                                <i className="bi bi-x-lg text-xs" />
                                            </button>
                                        </div>

                                        {/* Lista de Tópicos por Tipo de Etiqueta */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                                            {allOppOptions.map(opp => {
                                                const isCurrentActiveOpp = selectedOppId === opp.id;
                                                const oppColor = (() => {
                                                    if (selectedElement && oppColorsMap[opp.id]?.[selectedElement]) {
                                                        return oppColorsMap[opp.id][selectedElement];
                                                    }
                                                    if (selectedElement === 'background') return getDefaultBg(opp.id);
                                                    if (selectedElement === 'promoPrice') return '#1e3a8a';
                                                    if (selectedElement === 'title' || selectedElement === 'deText' || selectedElement === 'normalPrice' || selectedElement === 'porText' || selectedElement === 'currencySymbol' || selectedElement === 'cents' || selectedElement === 'installments') {
                                                        return '#000000';
                                                    }
                                                    return '#000000';
                                                })();

                                                const handleOppColorChange = (color: string) => {
                                                    if (!selectedElement) return;
                                                    setOppColorsMap(prev => ({
                                                        ...prev,
                                                        [opp.id]: {
                                                            ...(prev[opp.id] || {}),
                                                            [selectedElement]: color
                                                        }
                                                    }));
                                                    if (isCurrentActiveOpp) {
                                                        handleColorSelect(color, false);
                                                    }
                                                    pendingGradientColorRef.current = color;
                                                };

                                                return (
                                                    <div 
                                                        key={opp.id}
                                                        className={`p-4 rounded-2xl border transition-all ${
                                                            isCurrentActiveOpp 
                                                                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                                        }`}
                                                    >
                                                        {/* Nome do Tipo de Etiqueta */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${isCurrentActiveOpp ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                                                                    {opp.name}
                                                                </span>
                                                            </div>
                                                            {isCurrentActiveOpp && (
                                                                <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-md">
                                                                    VISÃO ATUAL
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Seletor de Cor + Hex */}
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <label className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md cursor-pointer overflow-hidden bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-0.5 shrink-0 hover:scale-105 active:scale-95 transition-all">
                                                                <input
                                                                    type="color"
                                                                    value={oppColor}
                                                                    onChange={e => handleOppColorChange(e.target.value)}
                                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                                />
                                                                <div className="w-full h-full rounded-lg border border-white/60" style={{ backgroundColor: oppColor }} />
                                                            </label>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Cor da Fonte</span>
                                                                <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{oppColor}</span>
                                                            </div>
                                                        </div>

                                                        {/* Cores Recentes Usadas */}
                                                        {colorHistory.length > 0 && (
                                                            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                                                                    Cores Recentes:
                                                                </span>
                                                                <div className="flex items-center gap-1.5 flex-wrap select-none">
                                                                    {colorHistory.map((color, cIdx) => (
                                                                        <button
                                                                            key={`${opp.id}-${color}-${cIdx}`}
                                                                            type="button"
                                                                            onClick={() => handleOppColorChange(color)}
                                                                            className={`w-7 h-7 rounded-lg border shadow-2xs hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                                                                color.toLowerCase() === oppColor.toLowerCase() 
                                                                                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20' 
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
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        )}

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
            {(() => {
                const activeTitleFontSize = selectedMagnitude === 'tens' ? titleFontSizeTens : selectedMagnitude === 'hundreds' ? titleFontSizeHundreds : titleFontSizeThousands;
                const activeDeFontSize = selectedMagnitude === 'tens' ? deFontSizeTens : selectedMagnitude === 'hundreds' ? deFontSizeHundreds : deFontSizeThousands;
                const activeNormalPriceFontSize = selectedMagnitude === 'tens' ? normalPriceFontSizeTens : selectedMagnitude === 'hundreds' ? normalPriceFontSizeHundreds : normalPriceFontSizeThousands;
                const activePorFontSize = selectedMagnitude === 'tens' ? porFontSizeTens : selectedMagnitude === 'hundreds' ? porFontSizeHundreds : porFontSizeThousands;
                const activeCurrencyFontSize = selectedMagnitude === 'tens' ? currencyFontSizeTens : selectedMagnitude === 'hundreds' ? currencyFontSizeHundreds : currencyFontSizeThousands;
                const activeCentsFontSize = selectedMagnitude === 'tens' ? centsFontSizeTens : selectedMagnitude === 'hundreds' ? centsFontSizeHundreds : centsFontSizeThousands;
                const activeInstallmentsFontSize = selectedMagnitude === 'tens' ? installmentsFontSizeTens : selectedMagnitude === 'hundreds' ? installmentsFontSizeHundreds : installmentsFontSizeThousands;
                const activePromoPriceScale = selectedMagnitude === 'tens' ? scaleTens : selectedMagnitude === 'hundreds' ? scaleHundreds : scaleThousands;

                return (
                    <div 
                        onClick={() => {
                            setSelectedElement(null);
                            setSelectedElements(new Set());
                        }}
                        className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 lg:p-14 bg-slate-200/50 dark:bg-slate-950/80 overflow-y-auto custom-scrollbar relative z-20"
                    >
                        <div className="w-full max-w-full lg:max-w-4xl xl:max-w-5xl flex flex-col items-center justify-center my-auto p-4 sm:p-6 overflow-visible">
                            {/* Etiqueta de Preço: Renderizador Unificado 1:1 */}
                            <PriceLabelArtRenderer
                                    containerRefOut={previewRef}
                                    mode="edit"
                                    data={{
                                        artWidthMm: artworkSizeMm.widthMm,
                                        artHeightMm: artworkSizeMm.heightMm,
                                    title,
                                    showTitle,
                                    titleFontSize: activeTitleFontSize,
                                    titleColor,
                                    titleFontFamily,
                                    titlePos,
                                    titleRotation,

                                    deText,
                                    showDe,
                                    deFontSize: activeDeFontSize,
                                    deColor,
                                    deFontFamily,
                                    deRotation,

                                    normalPrice: isTestValuesModalOpen ? `${testNormalD1}${testNormalD2}${testNormalD3},00` : formatDisplayPrice(normalPrice),
                                    showNormalPrice,
                                    normalPriceFontSize: activeNormalPriceFontSize,
                                    normalPriceColor,
                                    normalPriceFontFamily,
                                    normalPriceRotation,

                                    porText,
                                    showPor,
                                    porFontSize: activePorFontSize,
                                    porColor,
                                    porFontFamily,
                                    porRotation,

                                    dePricePorGroupPos,
                                    dePricePorGroupRotation,
                                    dePricePorGroupGap,

                                    currencySymbol,
                                    showCurrency,
                                    currencyFontSize: activeCurrencyFontSize,
                                    currencyColor,
                                    currencyFontFamily,
                                    currencyPos,
                                    currencyRotation,

                                    promoPrice: promoPrice,
                                    showPromoPrice,
                                    priceScale: activePromoPriceScale,
                                    priceColor,
                                    promoPriceFontFamily,
                                    promoPricePos,
                                    promoPriceRotation,

                                    centsText,
                                    showCents,
                                    centsFontSize: activeCentsFontSize,
                                    centsColor,
                                    centsFontFamily,
                                    centsPos,
                                    centsRotation,

                                    installments,
                                    showInstallments,
                                    installmentsFontSize: activeInstallmentsFontSize,
                                    installmentsColor,
                                    installmentsFontFamily,
                                    installmentsPos,
                                    installmentsRotation,

                                    bgColor: bgColor && bgColor !== 'transparent'
                                        ? bgColor
                                        : oppColorsMap[selectedOppId]?.background || defaultBgColor,

                                    showPromoPriceThousands,
                                    showPromoPriceHundreds,
                                    showPromoPriceTens,
                                    scaleThousands,
                                    scaleHundreds,
                                    scaleTens,
                                    testMilharStr: isTestValuesModalOpen ? `${testMilharD1}.${testMilharD2}${testMilharD3}${testMilharD4}` : undefined,
                                    testCentenaStr: isTestValuesModalOpen ? `${testCentenaD1}${testCentenaD2}${testCentenaD3}` : undefined,
                                    testDezenaStr: isTestValuesModalOpen ? `${testDezenaD1}${testDezenaD2}` : undefined,
                                    selectedMagnitude
                                    }}
                                    selectedElement={selectedElement}
                                    selectedElements={selectedElements}
                                    onSelectElement={handleElementClick}
                                    startDragging={startDragging}
                                    startResizing={startResizing}
                                    startRotating={startRotating}
                                    showSafetyMargin={showSafetyMargin}
                                    activeGuideX={activeGuideX}
                                    activeGuideY={activeGuideY}
                            />
                        </div>
                    </div>
                );
            })()}

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
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCenterElement(layer.key);
                                                    }}
                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs"
                                                    title="Trazer este componente para o centro exato (0, 0) da etiqueta"
                                                >
                                                    <i className="bi bi-crosshair text-xs" />
                                                    <span>Centralizar</span>
                                                </button>

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
                                            </>
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
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Selecione o modelo da etiqueta</p>
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
                        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-3">
                            {allOppOptions.map(opp => {
                                const isSelectedOpp = selectedOppId === opp.id;
                                return (
                                    <button
                                        key={opp.id}
                                        type="button"
                                        onClick={() => {
                                            handleSelectCartesianPreset(opp.id, 'thousands');
                                            setIsOppSelectModalOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                            isSelectedOpp 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95' 
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50/50 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2.5 h-2.5 rounded-full ${isSelectedOpp ? 'bg-white ring-2 ring-white/40' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                            <span className="text-xs font-black uppercase tracking-wider">{opp.name}</span>
                                        </div>

                                        {isSelectedOpp ? (
                                            <span className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-xl tracking-wider">
                                                SELECIONADO
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase">
                                                Usar Modelo
                                            </span>
                                        )}
                                    </button>
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
                                        Produto Modelo & Dados
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

            {/* Modal Footer Fullwidth */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <i className="bi bi-info-circle-fill text-blue-500 text-sm" />
                    <span>As alterações serão salvas ao sair</span>
                </div>

                <button
                    type="button"
                    onClick={handleSaveAndExit}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                    <i className="bi bi-check2-circle text-sm" />
                    <span>SALVAR E SAIR</span>
                </button>
            </div>

            {/* Modal de Teste de Valores (Simulador com Sliders 0-9 por dígito) */}
            {isTestValuesModalOpen && (
                <div 
                    style={{ zIndex: 10000 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Topo do Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg font-black">
                                    <i className="bi bi-sliders" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        Simulador / Teste de Numeração
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold">
                                        Arraste as bolinhas para testar como os números se comportam na arte
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={closeTestValuesModal} 
                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                            >
                                <i className="bi bi-x-lg text-sm" />
                            </button>
                        </div>

                        {/* Conteúdo com Sliders */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
                            
                            {/* SEÇÃO 1: PREÇO PRINCIPAL */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                    <i className="bi bi-hash text-sm" />
                                    Preço Principal (Dezena, Centena, Milhar)
                                </h4>

                                {/* DEZENA */}
                                <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dezena:</span>
                                        <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                                            {testDezenaD1}{testDezenaD2}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">1º Dígito: {testDezenaD1}</span>
                                            <input type="range" min="0" max="9" value={testDezenaD1} onChange={e => setTestDezenaD1(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">2º Dígito: {testDezenaD2}</span>
                                            <input type="range" min="0" max="9" value={testDezenaD2} onChange={e => setTestDezenaD2(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                {/* CENTENA */}
                                <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Centena:</span>
                                        <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                                            {testCentenaD1}{testCentenaD2}{testCentenaD3}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">1º Dígito: {testCentenaD1}</span>
                                            <input type="range" min="0" max="9" value={testCentenaD1} onChange={e => setTestCentenaD1(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">2º Dígito: {testCentenaD2}</span>
                                            <input type="range" min="0" max="9" value={testCentenaD2} onChange={e => setTestCentenaD2(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">3º Dígito: {testCentenaD3}</span>
                                            <input type="range" min="0" max="9" value={testCentenaD3} onChange={e => setTestCentenaD3(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                {/* MILHAR */}
                                <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Milhar:</span>
                                        <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                                            {testMilharD1}.{testMilharD2}{testMilharD3}{testMilharD4}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400">1º D: {testMilharD1}</span>
                                            <input type="range" min="0" max="9" value={testMilharD1} onChange={e => setTestMilharD1(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400">2º D: {testMilharD2}</span>
                                            <input type="range" min="0" max="9" value={testMilharD2} onChange={e => setTestMilharD2(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400">3º D: {testMilharD3}</span>
                                            <input type="range" min="0" max="9" value={testMilharD3} onChange={e => setTestMilharD3(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400">4º D: {testMilharD4}</span>
                                            <input type="range" min="0" max="9" value={testMilharD4} onChange={e => setTestMilharD4(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO 2: PREÇO ANTIGO (normalPrice) */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <i className="bi bi-tag text-sm" />
                                    Preço Anterior / Antigo ("DE")
                                </h4>

                                <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Valor Antigo R$:</span>
                                        <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg">
                                            R$ {testNormalD1}{testNormalD2}{testNormalD3},00
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">1º Dígito: {testNormalD1}</span>
                                            <input type="range" min="0" max="9" value={testNormalD1} onChange={e => setTestNormalD1(Number(e.target.value))} className="w-full accent-emerald-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">2º Dígito: {testNormalD2}</span>
                                            <input type="range" min="0" max="9" value={testNormalD2} onChange={e => setTestNormalD2(Number(e.target.value))} className="w-full accent-emerald-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400">3º Dígito: {testNormalD3}</span>
                                            <input type="range" min="0" max="9" value={testNormalD3} onChange={e => setTestNormalD3(Number(e.target.value))} className="w-full accent-emerald-600 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Rodapé do Modal */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 shrink-0 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold">
                                * Ao fechar, os valores originais serão restaurados automaticamente
                            </span>
                            <button
                                type="button"
                                onClick={closeTestValuesModal}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md active:scale-95 transition-all"
                            >
                                Concluir Teste
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PriceLabelArtEditorModal;
