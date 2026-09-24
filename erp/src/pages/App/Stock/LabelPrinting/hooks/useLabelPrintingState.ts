import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Product from '../../../../types/product.type';
import { saveInventoryMove } from '../../../../utils/inventoryService';
import { supabase } from '@/pages/utils/supabaseConfig';
import LabelGrid, { LabelItemConfig, LogoItemConfig } from '../components/LabelGrid';
import LabelGridModelModal, { GridModel } from '../modals/LabelGridModelModal';
import { formatCurrency } from '../../../../utils/formatters';
import labelMdf from '../../../../../assets/label_mdf.png';
import logoMorante from '../../../../../assets/logo-morante.svg';
import LabelQueue from '../components/LabelQueue';
import ProductSearchInput from '../components/ProductSearchInput';
import LabelImageModal from '../modals/LabelImageModal';
import PriceLabelArtEditorModal from '../modals/PriceLabelArtEditorModal';
import { LabelType, LabelPreset, LabelLayout, LabelConfig, CustomLabel, DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';
import {     calculateLabelDimensions, processProductData, mapModelToDb, mapDbToModel 
} from '../utils/LabelUtils';
import {
    publishPriceLabelTemplateUpdate,
    subscribeToPriceLabelTemplateUpdates,
} from '../services/priceLabelTemplateSync';
import { useLabelPrintMode } from '../hooks/useLabelPrintMode';
import { LabelPrintingCategoryTabs, CategoryType } from '../components/LabelPrintingCategoryTabs';

 // remove sections import from hook

export const useLabelPrintingState = () => {
    const [isPrinting, setIsPrinting] = useState(false);
    const rawPrintLabels = useLabelPrintMode();

    const handlePrintLabels = async () => {
        if (selectedCategory === 'identificacao' && labelItems.length > 0) {
            setIsPrinting(true);
            try {
                // Fazer cópia do labelItems atual
                const updatedItems = [...labelItems];
                
                // Agrupar quantidades por variationId para fazer menos chamadas ou apenas iterar
                for (let i = 0; i < updatedItems.length; i++) {
                    const item = updatedItems[i];
                    if (item.variationId && !item.isBlank) {
                        const quantity = Math.max(1, Number(item.quantity) || 1);
                        
                        // Chamar RPC no Supabase
                        const { data, error } = await supabase.rpc('allocate_label_sequences', {
                            p_variation_id: item.variationId,
                            p_count: quantity
                        });
                        
                        if (error) {
                            console.error('Erro ao alocar sequencial:', error);
                            toast.error(`Erro ao gerar sequencial para ${item.name}`);
                            throw error;
                        }
                        
                        if (data && data.length > 0) {
                            const { start_sequence, end_sequence } = data[0];
                            const allocatedInstances = [];
                            for (let seq = start_sequence; seq <= end_sequence; seq++) {
                                allocatedInstances.push(seq.toString().padStart(6, '0'));
                            }
                            updatedItems[i].instances = allocatedInstances;
                        }
                    }
                }
                
                // Atualizar o estado com os sequenciais reais
                setLabelItems(updatedItems);
                
                // Dar um pequeno tempo para o React renderizar os novos Canvas de QR Code
                setTimeout(() => {
                    rawPrintLabels();
                    setIsPrinting(false);
                }, 800);
            } catch (err) {
                console.error(err);
                setIsPrinting(false);
                toast.error("A impressão foi abortada devido a um erro na geração dos identificadores.");
            }
        } else {
            rawPrintLabels();
        }
    };
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const gridRef = useRef<HTMLDivElement>(null);

    const [hiddenLayoutIds, setHiddenLayoutIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('hidden_label_layouts');
        return saved ? JSON.parse(saved) : [];
    });

    const productIdParam = searchParams.get('productId');
    const isProductContext = !!location.state?.product || !!productIdParam;

    const VALID_CATEGORIES = ['identificacao', 'precos', 'logos', 'posts'] as const;
    type CategoryType = typeof VALID_CATEGORIES[number];

    const catFromUrl = (searchParams.get('cat') || searchParams.get('category')) as CategoryType | null;
    const presetFromUrl = searchParams.get('preset') as LabelPreset | null;

    // Detectar categoria a partir do preset se cat não estiver presente
    const inferredCat: CategoryType | null = VALID_CATEGORIES.includes(catFromUrl as CategoryType) ? catFromUrl : (
        presetFromUrl === 'qr_product' || presetFromUrl === 'barcode_only' ? 'identificacao' :
        presetFromUrl === 'price_only' || presetFromUrl === 'promotional_price' ? 'precos' :
        presetFromUrl === 'store_logo' ? 'logos' :
        null
    );

    const [selectedCategory, setSelectedCategoryState] = useState<CategoryType | null>(
        inferredCat || 'logos'
    );

    const setSelectedCategory = (cat: CategoryType | null) => {
        setSelectedCategoryState(cat);
        // Logos e Posts são sempre modo simples (apenas imagem)
        if (cat === 'logos' || cat === 'posts') {
            setPrintingMode('simple');
        }
        
        if (cat) {
            setSearchParams((prev: any) => { prev.set('cat', cat); return prev; }, { replace: true });
            
            if (cat !== 'logos' && cat !== 'posts') {
                setPrintingMode('advanced');
            }
        } else {
            setSearchParams((prev: any) => { prev.delete('cat'); return prev; }, { replace: true });
        }
    };

    // Sincronizar o estado interno com a URL quando houver navegação externa ou via menu
    useEffect(() => {
        const cat = (searchParams.get('cat') || searchParams.get('category')) as CategoryType | null;
        const preset = searchParams.get('preset') as LabelPreset | null;
        
        const finalCat: CategoryType | null = VALID_CATEGORIES.includes(cat as CategoryType) ? cat : (
            preset === 'qr_product' || preset === 'barcode_only' ? 'identificacao' :
            preset === 'price_only' || preset === 'promotional_price' ? 'precos' :
            preset === 'store_logo' ? 'logos' :
            null
        );

        if (finalCat && finalCat !== selectedCategory) {
            setSelectedCategoryState(finalCat);
            if (finalCat === 'logos' || finalCat === 'posts') setPrintingMode('simple');
            else setPrintingMode('advanced');
        }
    }, [searchParams, selectedCategory]);

    const [products, setProducts] = useState<Product[]>([]);
    const [printingMode, setPrintingMode] = useState<'simple' | 'advanced'>('advanced');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(0.6);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const previewScaleRef = useRef<HTMLDivElement>(null);
    const [cellImages, setCellImages] = useState<Record<number, string>>({});
    const cellInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);
    const [layoutModalOpen, setLayoutModalOpen] = useState(false);
    const [gridModalOpen, setGridModalOpen] = useState(false); 
    const [isModelManagerModalOpen, setIsModelManagerModalOpen] = useState(false);
    const [isPriceLabelArtEditorOpen, setIsPriceLabelArtEditorOpen] = useState(false);

    useEffect(() => {
        if (location.pathname === '/templates/price-label') setIsPriceLabelArtEditorOpen(true);
    }, [location.pathname]);
    const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
    const [productAddQty, setProductAddQty] = useState<number>(1);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isNewLogoModalOpen, setIsNewLogoModalOpen] = useState(false);
    const [newLogoName, setNewLogoName] = useState('');
    const [newLogoImage, setNewLogoImage] = useState('');
    
    // CRUD de Rótulos Customizados
    const [customLabels, setCustomLabels] = useState<CustomLabel[]>(() => {
        const saved = localStorage.getItem('label_custom_labels');
        return saved ? JSON.parse(saved) : [];
    });
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [editingLabel, setEditingLabel] = useState<CustomLabel | null>(null);
    const [labelFormName, setLabelFormName] = useState('');
    const [labelFormImage, setLabelFormImage] = useState('');
    const [lastSelectedRoundModelId, setLastSelectedRoundModelId] = useState<string>(() => localStorage.getItem('lastSelectedRoundModelId') || 'round-small');
    const [lastSelectedRectModelId, setLastSelectedRectModelId] = useState<string>(() => localStorage.getItem('lastSelectedRectModelId') || 'labels-image-compact');
    const [isAssetManagerModalOpen, setIsAssetManagerModalOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState<GridModel | null>(null);
    const [editingGridModel, setEditingGridModel] = useState<GridModel | null>(null);
    const [customLayouts, setCustomLayouts] = useState<GridModel[]>([]);
    const [savedArtConfigs, setSavedArtConfigs] = useState<Record<string, any>>({});
    const [hiddenDefaultIds, setHiddenDefaultIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('hidden_default_layout_ids') || '[]'); } catch { return []; }
    });
    const [artVersion, setArtVersion] = useState(0);

    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [modelToCopy, setModelToCopy] = useState<GridModel | null>(null);
    const [modelToDelete, setModelToDelete] = useState<string | null>(null);
    const [copyAnchor, setCopyAnchor] = useState<DOMRect | null>(null);

    const [defaultLayoutIds, setDefaultLayoutIds] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem('default_label_layout_ids') || '{}'); } catch { const handleSaveNewLogo = (e?: any) => {};
    return {
        editingGridModel, setEditingGridModel,
        handleSaveNewLogo,}; }
    });
    
    // Estados de lista e paginação separados por modo (Por Imagens vs Design Avançado)
    const [simpleLabelItems, setSimpleLabelItems] = useState<LabelItemConfig[]>([]);
    const [advancedLabelItems, setAdvancedLabelItems] = useState<LabelItemConfig[]>([]);

    const labelItems = printingMode === 'simple' ? simpleLabelItems : advancedLabelItems;
    const setLabelItems = (updater: React.SetStateAction<LabelItemConfig[]>) => {
        if (printingMode === 'simple') {
            setSimpleLabelItems(updater);
        } else {
            setAdvancedLabelItems(updater);
        }
    };
    const [logoItems, setLogoItems] = useState<LogoItemConfig[]>([]);
    const [availableLogos, setAvailableLogos] = useState<{ id: string; image: string; name: string }[]>(() => {
        const saved = localStorage.getItem('label_available_logos');
        const defaultLogos = [
            { id: 'logo_mdf_std', image: labelMdf, name: '100% MDF' },
            { id: 'logo_morante_std', image: logoMorante, name: 'MÓVEIS MORANTE' }
        ];
        if (!saved) return defaultLogos;
        try { 
            const parsed = JSON.parse(saved);
            // Garantir que os logos padrão sempre existam mesmo se houver salvos
            const combined = [...defaultLogos];
            parsed.forEach((l: any) => {
                if (!combined.some(c => c.id === l.id)) combined.push(l);
            });
            return combined;
        } catch { return defaultLogos; }
    });
    const [currentPage, setCurrentPage] = useState(0);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const ITEMS_PER_PAGE = 15;


    const [config, setConfig] = useState<LabelConfig>({
        type: 'rect',
        preset: isProductContext ? 'qr_product' : 'store_logo',
        layout: isProductContext ? 'horizontal' : 'horizontal',
        showName: isProductContext,
        showPrice: false,
        showBarcode: isProductContext,
        showSKU: isProductContext,
        showStoreName: !isProductContext,
        showStoreLogo: !isProductContext,
        showCustomText: false,
        text: '',
        price: '',
        sku: '',
        qrContent: '',
        customText: 'Qualidade Garantida',
        imageScale: 1,
        marginT: 8,
        marginB: 8,
        marginL: 9,
        marginR: 9,
        gapH: 10,
        gapV: 2,
        columns: 2,
        rows: 3,
        layoutId: '2x3_std',
        paperSize: 'A4',
        showPromoPrice: false,
        promoPrice: '',
        oldPriceColor: '#94a3b8',
        priceColor: '#1e293b',
        promoPriceColor: '#2563eb',
        nameColor: '#0f172a',
        promoColor: '#16a34a',
        nameFontSize: 10,
        category: 'identificacao',
        priceFontSize: 28,
        promoPriceFontSize: 24,
        promoFontSize: 18,
        imageFit: 'contain',
    });

    useEffect(() => subscribeToPriceLabelTemplateUpdates(({ layoutId, artConfig }) => {
        setSavedArtConfigs((prev: any) => ({
            ...prev,
            [layoutId]: artConfig,
            'preco_2x5_restored': artConfig,
        }));
        setConfig((prev: any) => ({ ...prev, artConfig }));
        setArtVersion((prev: any) => prev + 1);
    }), []);

    const selectLayout = (model: GridModel) => {
        const autoPreset: LabelPreset = model.category === 'precos' ? 'price_only' : 
                                       model.category === 'identificacao' ? 'qr_product' : 
                                       model.category === 'logos' ? 'store_logo' : 'qr_product';

        setConfig((prefConfig: any) => ({
            ...prefConfig,
            layoutId: model.id,
            preset: autoPreset,
            columns: model.columns,
            rows: model.rows,
            marginT: model.marginT,
            marginB: model.marginB,
            marginL: model.marginL,
            marginR: model.marginR,
            gapH: model.gapH,
            gapV: model.gapV,
            paperSize: model.paperSize,
            paperWidth: model.paperWidth,
            paperHeight: model.paperHeight,
            type: model.type || 'rect',
            category: model.category || prefConfig.category, 
            
            // Design e Tipografia (Normal)
            nameFontSize: model.nameFontSize || prefConfig.nameFontSize,
            nameColor: model.nameColor || '#1e293b',
            nameBold: model.nameBold,
            nameAlign: model.nameAlign,
            nameVAlign: model.nameVAlign,
            priceFontSize: model.priceFontSize || prefConfig.priceFontSize,
            priceColor: model.priceColor || '#1e293b',
            priceBold: model.priceBold,
            priceAlign: model.priceAlign,
            priceVAlign: model.priceVAlign,
            fontFamily: model.fontFamily || 'Inter',
            
            // Fontes por Faixa
            priceFontSizeTens: model.priceFontSizeTens,
            priceFontSizeHundreds: model.priceFontSizeHundreds,
            priceFontSizeThousands: model.priceFontSizeThousands,
            priceFontSizeTenThousands: model.priceFontSizeTenThousands,

            // Posições e Dimensões (Normal)
            namePosX: model.namePosX,
            namePosY: model.namePosY,
            nameWidth: model.nameWidth,
            nameHeight: model.nameHeight,
            pricePosX: model.pricePosX,
            pricePosY: model.pricePosY,
            priceWidth: model.priceWidth,
            priceHeight: model.priceHeight,
            barcodePosX: model.barcodePosX,
            barcodePosY: model.barcodePosY,
            dePricePorGroupPos: model.dePricePorGroupPos,
            dePricePorGroupRotation: model.dePricePorGroupRotation,
            dePricePorGroupGap: model.dePricePorGroupGap,
            artConfig: savedArtConfigs[model.id] || model.artConfig || prefConfig.artConfig,

            // Estilos Promocionais (Novo Preço)
            promoPriceFontSize: model.promoPriceFontSize || 24,
            promoPriceColor: model.promoPriceColor || '#2563eb',
            promoPriceBold: model.promoPriceBold,
            promoPriceAlign: model.promoPriceAlign,
            promoPriceVAlign: model.promoPriceVAlign,
            promoPosX: model.promoPosX,
            promoPosY: model.promoPosY,
            promoWidth: model.promoWidth,
            promoHeight: model.promoHeight,
            
            // Preço Antigo
            oldPriceFontSize: model.oldPriceFontSize,
            oldPriceColor: model.oldPriceColor || '#94a3b8',
            oldPriceBold: model.oldPriceBold,
            oldPriceAlign: model.oldPriceAlign,
            oldPriceVAlign: model.oldPriceVAlign,
            oldPricePosX: model.oldPricePosX,
            oldPricePosY: model.oldPricePosY,
            oldPriceWidth: model.oldPriceWidth,
            oldPriceHeight: model.oldPriceHeight,

            // Nome no Modo Promo
            promoNameFontSize: model.promoNameFontSize,
            promoNameColor: model.promoNameColor || '#1e293b',
            promoNameBold: model.promoNameBold,
            promoNameAlign: model.promoNameAlign,
            promoNameVAlign: model.promoNameVAlign,
            promoNamePosX: model.promoNamePosX,
            promoNamePosY: model.promoNamePosY,
            promoNameWidth: model.promoNameWidth,
            promoNameHeight: model.promoNameHeight,
            promoNameBgColor: model.promoNameBgColor,

            // Barcode Promo
            promoBarcodePosX: model.promoBarcodePosX,
            promoBarcodePosY: model.promoBarcodePosY,

            // Promo Label (Texto PROMOÇÃO)
            promoFontSize: model.promoFontSize,
            promoColor: model.promoColor,
            promoBold: model.promoBold,
            promoAlign: model.promoAlign,
            promoVAlign: model.promoVAlign,

            // Preço Split (Normal)
            priceFormat: model.priceFormat || 'standard',
            priceSymbolFontSize: model.priceSymbolFontSize,
            priceSymbolColor: model.priceSymbolColor,
            priceSymbolBold: model.priceSymbolBold,
            priceSymbolPosX: model.priceSymbolPosX,
            priceSymbolPosY: model.priceSymbolPosY,
            priceDecimalsFontSize: model.priceDecimalsFontSize,
            priceDecimalsColor: model.priceDecimalsColor,
            priceDecimalsBold: model.priceDecimalsBold,
            priceDecimalsPosX: model.priceDecimalsPosX,
            priceDecimalsPosY: model.priceDecimalsPosY,

            // Preço Split (Promo)
            promoPriceSymbolFontSize: model.promoPriceSymbolFontSize,
            promoPriceSymbolColor: model.promoPriceSymbolColor,
            promoPriceSymbolBold: model.promoPriceSymbolBold,
            promoPriceSymbolPosX: model.promoPriceSymbolPosX,
            promoPriceSymbolPosY: model.promoPriceSymbolPosY,
            promoPriceDecimalsFontSize: model.promoPriceDecimalsFontSize,
            promoPriceDecimalsColor: model.promoPriceDecimalsColor,
            promoPriceDecimalsBold: model.promoPriceDecimalsBold,
            promoPriceDecimalsPosX: model.promoPriceDecimalsPosX,
            promoPriceDecimalsPosY: model.promoPriceDecimalsPosY,

            // Cores de Fundo e Campos Extras
            bg_color: model.bg_color || '#ffffff',
            nameBgColor: model.nameBgColor || 'transparent',
            priceBgColor: model.priceBgColor || 'transparent',
            promoBgColor: model.promoBgColor || 'transparent',
            extraFields: model.extraFields || [],
            extraFieldsPromo: model.extraFieldsPromo || [],

            // Visibilidade padrão (pode ser ajustada pelo usuário mas começa assim)
            showName: true,
            showPrice: model.category === 'precos',
            showBarcode: model.category !== 'precos',
            showStoreLogo: model.category !== 'precos',
            imageScale: model.imageScale || 1,
        }));
    };

    const applyPresetWithConfig = (preset: LabelPreset, baseConfig: LabelConfig) => {
        const newConfig: LabelConfig = { ...baseConfig, preset };
        if (preset === 'qr_product' || preset === 'barcode_only') newConfig.category = 'identificacao';
        else if (preset === 'price_only' || preset === 'promotional_price') newConfig.category = 'precos';
        else if (preset === 'store_logo') newConfig.category = 'logos';
        else if (preset === 'social_square') newConfig.category = 'posts';

        switch (preset) {
            case 'store_logo':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = false;
                newConfig.showPrice = false;
                newConfig.showBarcode = false;
                newConfig.showStoreLogo = true;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = false;
                break;
            case 'qr_product':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = false;
                newConfig.showBarcode = true;
                newConfig.showSKU = true;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showCustomText = false;
                break;
            case 'price_only':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = true;
                newConfig.showBarcode = false;
                newConfig.showSKU = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showCustomText = false;
                break;
            case 'social_square':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = true;
                newConfig.showBarcode = false;
                newConfig.showSKU = false;
                newConfig.showStoreLogo = true;
                newConfig.showStoreName = true;
                newConfig.showCustomText = false;
                break;
        }
        setConfig(newConfig);
    };


    const fetchAllProducts = async (isLoadMore = false) => {
        // 1. Tentar Cache se não for "Carregar Mais"
        if (!isLoadMore) {
            const cached = sessionStorage.getItem('label_products_cache');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.length > 0) {
                        setProducts(parsed);
                        // Verifica se o cache é muito pequeno, se for, busca mais pra garantir
                        if (parsed.length >= ITEMS_PER_PAGE) return; 
                    }
                } catch (e) { console.error('Erro no cache:', e); }
            }
        }

        const from = isLoadMore ? products.length : 0;
        const to = from + ITEMS_PER_PAGE - 1;

        // 2. Busca Seletiva para economizar Banda (Egress)
        const { data, error } = await supabase
            .from('products')
            .select(`
                id, name, title, description, code, sku, unit_price, cost_price,
                price, promo_price, stock, active, deleted_at, has_variations,
                category, unit, images, is_combo,
                variations:product_variations(
                    id, name, description, sku, price, promo_price, stock, image_url, active
                )
            `)
            .is('deleted_at', null)
            .order('description', { ascending: true })
            .range(from, to);

        if (data && !error) {
            const flattened = processProductData(data);
            const updatedProducts = isLoadMore ? [...products, ...flattened] : flattened;
            
            setProducts(updatedProducts);
            setHasMoreProducts(data.length === ITEMS_PER_PAGE);
            
            // Gravar no Cache para economizar requisições futuras
            sessionStorage.setItem('label_products_cache', JSON.stringify(updatedProducts));
        } else if (error) {
            console.error('Erro ao buscar produtos:', error);
            toast.error('Erro ao carregar produtos. Verifique sua conexão.');
        }
    };

    useEffect(() => {
        const fetchCustomLayouts = async () => {
            const [{ data, error }, { data: artData }] = await Promise.all([
                supabase
                .from('label_layouts')
                .select('*')
                .order('name', { ascending: true }),
                supabase.from('label_art_configs').select('layout_id, category, art_config')
            ]);

            let artConfigsMap = artData ? Object.fromEntries(artData.map((item: any) => [item.layout_id, item.art_config])) : {};

            // LIMPEZA AUTOMÁTICA DE CACHE / LOCALSTORAGE ANTIGO NO AMBIENTE DEV E PROD
            try {
                const legacyKeys = [
                    'morante_global_price_label_art_template',
                    'morante_hub_opp_colors_map',
                    'price_label_art_global',
                    'morante_art_templates_migrated'
                ];
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('morante_price_label_art_template_') || legacyKeys.includes(key))) {
                        localStorage.removeItem(key);
                    }
                }
            } catch (err) {
                console.error('Erro ao limpar cache antigo do localStorage:', err);
            }

            setSavedArtConfigs(artConfigsMap);

            if (data && !error) {
                const mapped: GridModel[] = data.map((m: any) => mapDbToModel(m));
                setCustomLayouts(mapped);
                localStorage.setItem('custom_label_layouts', JSON.stringify(mapped));
            } else {
                const saved = localStorage.getItem('custom_label_layouts');
                if (saved) {
                    try { setCustomLayouts(JSON.parse(saved)); } catch (e) { console.error(e); }
                }
            }
        };
        fetchCustomLayouts();
        fetchAllProducts();
    }, []);

    useEffect(() => {
        const artConfig = savedArtConfigs[config.layoutId || ''];
        if (artConfig && config.artConfig !== artConfig) {
            setConfig((prev: any) => ({ ...prev, artConfig }));
        }
    }, [config.layoutId, savedArtConfigs]);

    useEffect(() => {
        const cat = selectedCategory || catFromUrl;
        if (!cat) return;

        // Para Etiqueta de Preço, por padrão selecionar o modelo de 10 Etiquetas (2x5)
        if (cat === 'precos') {
            const defaultId = defaultLayoutIds['precos_rect'] || defaultLayoutIds['precos'];
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const targetId = defaultId || 'preco_2x5_restored';
            const found = models.find(m => m.id === targetId) || models.find(m => m.id === 'preco_2x5_restored');
            if (found) {
                selectLayout(found);
                return;
            }
        }

        // Para Etiqueta de Identificação, por padrão selecionar o modelo de 10 Etiquetas (2x5)
        if (cat === 'identificacao') {
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const found = models.find(m => m.id === 'ident_2x5' || m.baseModelId === 'ident_2x5');
            if (found) {
                selectLayout(found);
                return;
            }
        }

        const type = config.type || 'rect';
        const defaultId = defaultLayoutIds[`${cat}_${type}`] || defaultLayoutIds[cat]; // Fallback para chave antiga se existir
        
        if (defaultId) {
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const found = models.find(m => m.id === defaultId);
            if (found) {
                selectLayout(found);
                return;
            }
        }

        const presetMap: Record<string, LabelPreset> = {
            precos: 'price_only',
            identificacao: 'qr_product',
            logos: 'store_logo',
            posts: 'social_square',
        };
        const preset = presetMap[cat];
        if (preset) {
            applyPresetWithConfig(preset as LabelPreset, {
                ...config,
                showBarcode: cat !== 'precos',
                showStoreLogo: cat !== 'precos',
            });
        }
    }, [catFromUrl, selectedCategory, defaultLayoutIds, savedArtConfigs]);

    const layoutModels = (() => {
        // 1. Coletar modelos padrão (originais)
        const defaults = DEFAULT_LAYOUT_MODELS.filter(m => {
            const sameCategory = m.category === selectedCategory;
            const sameType = m.type === config.type;
            return sameCategory && sameType && !hiddenDefaultIds.includes(m.id);
        });
        
        // 2. Coletar modelos customizados
        const customs = customLayouts.filter(m => {
            const sameCategory = m.category === selectedCategory;
            const sameType = m.type === config.type;
            return sameCategory && sameType;
        });
        
        // Mapa final indexado pela ORIGEM do modelo para evitar duplicidade visual
        const finalMap = new Map<string, GridModel>();

        // 3. Primeiro, alimentamos o mapa com os padrões
        defaults.forEach(def => {
            finalMap.set(def.id, def);
        });

        // 4. Depois, sobrescrevemos com os customizados que são overrides ou adicionamos novos
        customs.forEach(c => {
            if (c.baseModelId) {
                // Se é um override, ele assume o lugar do padrão no Mapa
                finalMap.set(c.baseModelId, c);
            } else {
                // Se é um modelo criado do zero pelo usuário, ele ganha seu próprio espaço
                finalMap.set(c.id, c);
            }
        });

        return Array.from(finalMap.values());
    })();

    // Efeito para trocar o modelo selecionado ao trocar de categoria
    // Efeito para trocar o modelo selecionado ao trocar de categoria
    useEffect(() => {
        if (!selectedCategory || layoutModels.length === 0) return;
        
        const type = config.type || 'rect';
        const key = `${selectedCategory}_${type}`;
        const savedId = defaultLayoutIds[key] || defaultLayoutIds[selectedCategory];
        
        const targetModel = layoutModels.find(m => m.id === savedId) || layoutModels[0];
        
        if (targetModel && (config.layoutId !== targetModel.id || config.category !== selectedCategory || config.type !== type)) {
            selectLayout(targetModel);
        }
    }, [selectedCategory, config.type, layoutModels.length]);

    const handleDuplicateLayout = async (model: GridModel) => {
        const newModel = { 
            ...model, 
            id: undefined as any, // Deixa o DB gerar novo ID
            name: `${model.name} (Cópia)` 
        };
        
        // Usar o mesmo mapeador do onSave para garantir que o design seja copiado
        const dbModel = mapModelToDb(newModel);
        
        const { data, error } = await supabase
            .from('label_layouts')
            .insert([dbModel])
            .select()
            .single();

        if (data && !error) {
            const saved = mapDbToModel(data);
            const updated = [...customLayouts, saved];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout duplicado e salvo no banco!');
        } else {
            // Fallback for local
            const localModel: GridModel = { ...newModel, id: `custom_${Date.now()}` as any };
            const updated = [...customLayouts, localModel];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout duplicado (Local)');
        }
    };

    const toggleDefaultLayout = (modelId: string, category: string) => {
        const model = [...DEFAULT_LAYOUT_MODELS, ...customLayouts].find(m => m.id === modelId);
        if (!model) return;

        const key = `${category}_${model.type || 'rect'}`;
        const newDefaults = { ...defaultLayoutIds, [key]: modelId };
        setDefaultLayoutIds(newDefaults);
        localStorage.setItem('default_label_layout_ids', JSON.stringify(newDefaults));
        toast.info(`Modelo definido como padrão para ${model.type === 'round' ? 'etiquetas redondas' : 'etiquetas retangulares'}.`);
    };

    const handleDeleteLayout = async (modelId: string) => {
        const isSystemDefault = DEFAULT_LAYOUT_MODELS.some(m => m.id === modelId);
        const isLocalOnly = String(modelId).startsWith('custom_');

        if (isSystemDefault) {
            if (!hiddenDefaultIds.includes(modelId)) {
                const updated = [...hiddenDefaultIds, modelId];
                setHiddenDefaultIds(updated);
                localStorage.setItem('hidden_default_layout_ids', JSON.stringify(updated));
            }
        } else {
            // Remover localmente primeiro para UX instantânea
            const updatedCustom = customLayouts.filter(m => m.id !== modelId);
            setCustomLayouts(updatedCustom);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updatedCustom));

            if (!isLocalOnly) {
                try {
                    const dbId = /^\d+$/.test(modelId) ? Number(modelId) : modelId;
                    await supabase.from('label_layouts').delete().eq('id', dbId);
                } catch (e) {
                    console.error('Erro na requisição de deleção:', e);
                }
            }
        }

        if (config.layoutId === modelId) {
            const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts.filter(m => m.id !== modelId)];
            const available = allModels.filter(m => 
                m.id !== modelId && !hiddenDefaultIds.includes(m.id) && m.category === selectedCategory
            );
            if (available.length > 0) selectLayout(available[0]);
        }
    };

    const confirmDeleteLayout = async () => {
        if (!modelToDelete) return;
        await handleDeleteLayout(modelToDelete);
        toast.success('Modelo excluído ou ocultado com sucesso.');
        setModelToDelete(null);
    };

    const handleCopyToCategory = async (model: GridModel, targetCat: 'identificacao' | 'precos' | 'logos' | 'posts') => {
        const newModel = { 
            ...model, 
            id: undefined as any, 
            category: targetCat,
            name: model.name
        };
        
        const dbModel = mapModelToDb(newModel);
        const { data, error } = await supabase
            .from('label_layouts')
            .insert([dbModel])
            .select()
            .single();

        if (data && !error) {
            const saved = mapDbToModel(data);
            const updated = [...customLayouts, saved];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            const catName = targetCat === 'identificacao' ? 'Identificação' : 
                            targetCat === 'precos' ? 'Preços' : 
                            targetCat === 'logos' ? 'Logos' : 'Posts';
            toast.success(`Copiado com sucesso para ${catName}`);
        } else {
            console.error('Erro ao exportar layout:', error);
            // Fallback Local
            const localModel: GridModel = { ...newModel, id: `custom_${Date.now()}` as any };
            const updated = [...customLayouts, localModel];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Copiado para outra categoria (Local)');
        }
    };

    const selectModelId = (modelId: string) => {
        const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
        const model = allModels.find(m => m.id === modelId);
        if (model) {
            setCurrentModel(model);
            selectLayout(model);

            // Atualiza o rastreamento do último modelo por tipo
            if (model.type === 'round') {
                setLastSelectedRoundModelId(modelId);
            } else {
                setLastSelectedRectModelId(modelId);
            }
        }
    };

    const handleTypeChange = (type: LabelType) => {
        const newConfig = { ...config, type };
        setConfig(newConfig);

        // Prioridade 1: Modelo Favorito (Estrela) para este formato
        // Prioridade 2: Último selecionado para este formato
        // Prioridade 3: Modelo padrão do sistema
        const defaultKey = `${selectedCategory}_${type}`;
        const targetId = defaultLayoutIds[defaultKey] || (type === 'round' ? lastSelectedRoundModelId : lastSelectedRectModelId);
        
        const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
        const targetModel = allModels.find(m => m.id === targetId) || 
                          (type === 'round' 
                              ? DEFAULT_LAYOUT_MODELS.find(m => m.category === (selectedCategory || 'logos') && m.type === 'round') 
                              : DEFAULT_LAYOUT_MODELS.find(m => m.category === (selectedCategory || 'logos') && m.type === 'rect'));
        
        if (targetModel) {
            setCurrentModel(targetModel);
            selectLayout(targetModel);
        }
    };

    const handleProductSelect = (product: Product, quantity: number = 1) => {
        const productTitle = product.title || product.name || product.description || '';
        const variationName = (product as any).variation || (product as any).variationName;
        let fullName = productTitle;
        if (product.isVariation && variationName) {
            fullName = variationName;
        }

        // Limpeza de sufixos indesejados (como " - Restaurado") para etiquetas de preço
        if (selectedCategory === 'precos') {
            fullName = fullName.split(' - ')[0];
        }

        const rawProductOpportunity = (product as any).opportunity || (product as any).opportunities;
        const productOpportunity = Array.isArray(rawProductOpportunity)
            ? rawProductOpportunity[0]
            : rawProductOpportunity;
        const opportunityId = (product as any).opportunityId ||
            (product as any).opportunity_id ||
            productOpportunity?.id ||
            (productOpportunity?.slug) ||
            ((product as any).condition === 'salvado' ? 'salvado' : 'none');

        const productImages = (product.images || (product as any).product_images || []) as { image_url: string; is_main: boolean }[];
        const parentImages = ((product as any).parentImages || []) as { image_url: string; is_main: boolean }[];
        
        let initialImage = '';
        const allImages = [...productImages, ...parentImages];
        if (allImages.length > 0) {
            const mainImg = allImages.find(img => img.is_main);
            initialImage = mainImg ? mainImg.image_url : allImages[0].image_url;
        }

        const newItem: LabelItemConfig = {
            name: fullName,
            price: product.unitPrice ? formatCurrency(product.unitPrice) : 
                   (product as any).price ? formatCurrency((product as any).price) : 'R$ 0,00',
            promoPrice: (product as any).promoPrice ? formatCurrency((product as any).promoPrice) : 
                        (product as any).promo_price ? formatCurrency((product as any).promo_price) : '',
            showPromoPrice: Boolean((product as any).promoPrice || (product as any).promo_price),
            sku: product.sku || '', 
            quantity: Math.max(1, quantity),
            extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : [],
            opportunityId,
            productImages,
            parentImages,
            currentImageIndex: 0,
            image: initialImage,
            productId: product.isVariation ? (product as any).parentId : product.id,
            variationId: product.isVariation ? product.id : undefined,
            printingMode: 'advanced',
            instances: selectedCategory === 'identificacao' ? Array.from({ length: Math.max(1, quantity) }).map(() => '000XXX') : []
        };

        setLabelItems((prev: any) => [...prev, newItem]);
        toast.success(`${fullName} (${quantity} un) adicionado à lista.`);
    };

    const handleAddBlankLabel = (qty: number = 1) => {
        const quantity = Math.max(1, qty);
        if (selectedCategory === 'logos') {
            const newItem: LogoItemConfig = {
                image: '',
                quantity: quantity,
                imageFit: config.imageFit || 'contain',
                scale: config.imageScale || 1,
                rotation: 0,
                name: selectedCategory === 'precos' ? '' : 'ETIQUETA EM BRANCO',
                price: '',
                promoPrice: '',
                sku: '',
                isBlank: true as any
            };
            setLogoItems((prev: any) => [...prev, newItem]);
        } else {
            const newItem: LabelItemConfig = {
                name: 'ETIQUETA EM BRANCO',
                price: '',
                promoPrice: '',
                sku: '',
                quantity: quantity,
                isBlank: true,
                printingMode: 'simple',
                extraFields: []
            };
            setLabelItems((prev: any) => [...prev, newItem]);
        }
        if (selectedCategory !== 'precos') {
            toast.success(`Etiqueta em branco (${quantity} un) adicionada à fila.`);
        }
    };

    const handleReorderItems = (draggedIdx: number, targetIdx: number) => {
        const isLogos = selectedCategory === 'logos';
        const sourceItems = isLogos ? logoItems : labelItems;

        // 1. Desmembrar a fila atual em itens individuais de tamanho 1
        const flattenedItems: any[] = [];
        sourceItems.forEach(item => {
            const qty = Number(item.quantity || 0);
            for (let i = 0; i < qty; i++) {
                flattenedItems.push({ ...item, quantity: 1 });
            }
        });

        if (draggedIdx < 0 || draggedIdx >= flattenedItems.length || targetIdx < 0 || targetIdx >= flattenedItems.length) {
            return;
        }

        // 2. Mover o item
        const [movedItem] = flattenedItems.splice(draggedIdx, 1);
        flattenedItems.splice(targetIdx, 0, movedItem);

        // 3. Recompactar a fila unindo vizinhos iguais adjacentes
        const compactQueue: any[] = [];
        flattenedItems.forEach(item => {
            const last = compactQueue[compactQueue.length - 1];
            
            const isSame = last && (
                (item.isBlank && last.isBlank) ||
                (!item.isBlank && !last.isBlank && (
                    (isLogos && item.image === last.image && item.name === last.name) ||
                    (!isLogos && item.name === last.name && item.sku === last.sku && item.price === last.price && item.promoPrice === last.promoPrice)
                ))
            );

            if (isSame) {
                last.quantity += 1;
            } else {
                compactQueue.push({ ...item });
            }
        });

        // 4. Salvar no estado apropriado
        if (isLogos) {
            setLogoItems(compactQueue);
        } else {
            setLabelItems(compactQueue);
        }
    };

    const handleDownloadImage = async () => {
        if (!gridRef.current) return;
        setIsDownloading(true);
        const previewScaleElement = previewScaleRef.current;
        const previousTransform = previewScaleElement?.style.transform;
        try {
            if (previewScaleElement) previewScaleElement.style.transform = 'none';
            const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `etiquetas-${selectedProduct?.description || 'geral'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Imagem gerada com sucesso!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar imagem.');
        } finally {
            if (previewScaleElement) previewScaleElement.style.transform = previousTransform || '';
            setIsDownloading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            
            if (selectedCategory === 'logos') {
                setNewLogoImage(base64);
                setNewLogoName(file.name.split('.')[0].toUpperCase().substring(0, 30));
                setIsNewLogoModalOpen(true);
            } else {
                setSelectedImage(base64);
                // Adicionar automaticamente à fila para conveniência no modo simples
                if (selectedCategory === 'precos') {
                    const newItem: LabelItemConfig = {
                        name: "", // Usuário removeu a necessidade do nome da etiqueta
                        price: '',
                        sku: '',
                        quantity: 1,
                        image: base64,
                        imageFit: 'contain'
                    };
                    setLabelItems((prev: any) => [...prev, newItem]);
                }
                toast.success('Imagem adicionada à fila.');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleConfirmNewLogo = () => {
        if (!newLogoName.trim()) {
            toast.error('Informe um nome para a imagem.');
            return;
        }

        const newLogo = {
            id: `logo_${Date.now()}`,
            image: newLogoImage,
            name: newLogoName.trim()
        };

        const updated = [...availableLogos, newLogo];
        setAvailableLogos(updated);
        localStorage.setItem('label_available_logos', JSON.stringify(updated));
        
        setIsNewLogoModalOpen(false);
        setNewLogoName('');
        setNewLogoImage('');
        toast.success('Logotipo adicionado ao seu banco de imagens!');
    };

    const handleDeleteAvailableLogo = (id: string) => {
        if (!window.confirm('Excluir este logotipo do seu banco de imagens?')) return;
        const updated = availableLogos.filter(l => l.id !== id);
        setAvailableLogos(updated);
        localStorage.setItem('label_available_logos', JSON.stringify(updated));
        toast.info('Imagem removida do banco.');
    };

    const handleAddLogoToQueue = (logo: { image: string, name: string }) => {
        if (selectedCategory === 'logos') {
            const newItem: LogoItemConfig = {
                image: logo.image,
                quantity: 1,
                imageFit: config.imageFit || 'contain',
                scale: config.imageScale || 1,
                rotation: 0,
                name: logo.name,
                price: '',
                promoPrice: '',
                sku: '',
                extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : []
            };
            setLogoItems((prev: any) => [...prev, newItem]);
        } else {
            const newItem: LabelItemConfig = {
                image: logo.image,
                quantity: 1,
                imageFit: config.imageFit || 'cover',
                scale: config.imageScale || 1,
                rotation: 0,
                name: logo.name,
                price: '',
                promoPrice: '',
                sku: '',
                extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : [],
                showName: false,
                isLogoOnly: true
            };
            if (printingMode === 'simple') {
                setSimpleLabelItems((prev: any) => [...prev, newItem]);
            } else {
                setAdvancedLabelItems((prev: any) => [...prev, newItem]);
            }
        }
        setIsAssetManagerModalOpen(false);
        toast.success(`${logo.name} adicionado à fila.`);
    };

    const handleSaveCustomLabel = () => {
        if (!labelFormName.trim() || !labelFormImage) {
            toast.error('Preencha o nome e selecione uma imagem.');
            return;
        }

        const newLabel: CustomLabel = {
            id: editingLabel?.id || `label_${Date.now()}`,
            name: labelFormName.trim().toUpperCase(),
            image: labelFormImage,
            extraFields: editingLabel?.extraFields || config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : []
        };

        let updated: CustomLabel[];
        if (editingLabel) {
            updated = customLabels.map(l => l.id === editingLabel.id ? newLabel : l);
        } else {
            updated = [...customLabels, newLabel];
        }

        setCustomLabels(updated);
        localStorage.setItem('label_custom_labels', JSON.stringify(updated));
        
        setIsLabelModalOpen(false);
        setEditingLabel(null);
        setLabelFormName('');
        setLabelFormImage('');
        toast.success(editingLabel ? 'Rótulo atualizado!' : 'Rótulo criado com sucesso!');
    };

    const handleDeleteCustomLabel = (id: string) => {
        if (!window.confirm('Excluir este rótulo permanentemente?')) return;
        const updated = customLabels.filter(l => l.id !== id);
        setCustomLabels(updated);
        localStorage.setItem('label_custom_labels', JSON.stringify(updated));
        toast.info('Rótulo removido.');
    };

    const handleCellClick = (index: number) => {
        if (config.preset === 'custom' && selectedCategory !== 'posts') {
            setActiveCellIndex(index);
            cellInputRef.current?.click();
        }
    };

    const [isResizing, setIsResizing] = useState<'name' | 'price' | 'promo' | null>(null);
    const [startY, setStartY] = useState(0);
    const [startSize, setStartSize] = useState(0);

    const handleResizeStart = (e: React.MouseEvent, type: 'name' | 'price' | 'promo', currentSize: number) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(type);
        setStartY(e.clientY);
        setStartSize(currentSize);
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startY - moveEvent.clientY;
            const newSize = Math.max(6, Math.min(120, startSize + (deltaY * 0.5)));
            
            if (type === 'name') setConfig((prev: any) => ({ ...prev, nameFontSize: newSize }));
            else if (type === 'price') setConfig((prev: any) => ({ ...prev, priceFontSize: newSize }));
            else if (type === 'promo') setConfig((prev: any) => ({ ...prev, promoPriceFontSize: newSize }));
        };

        const handleMouseUp = () => {
            setIsResizing(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
        localStorage.setItem('lastSelectedRoundModelId', lastSelectedRoundModelId);
    }, [lastSelectedRoundModelId]);

    useEffect(() => {
        localStorage.setItem('lastSelectedRectModelId', lastSelectedRectModelId);
    }, [lastSelectedRectModelId]);


    return {
        editingGridModel, setEditingGridModel,
        selectedCategory,
        printingMode,
        setPrintingMode,
        config,
        setConfig,
        gridModalOpen,
        setGridModalOpen,
        isModelManagerModalOpen,
        setIsModelManagerModalOpen,
        DEFAULT_LAYOUT_MODELS,
        customLayouts,
        products,
        selectedProductToAdd,
        setSelectedProductToAdd,
        productAddQty,
        setProductAddQty,
        handleProductSelect,
        handleAddBlankLabel,
        labelItems,
        setLabelItems,
        logoItems,
        setLogoItems,
        isDownloading,
        artVersion,
        setArtVersion,
        savedArtConfigs,
        setSavedArtConfigs,
        selectedImage,
        cellImages,
        handleCellClick,
        currentPage,
        setCurrentPage,
        handleDownloadImage,
        isPrinting,
        printLabels: handlePrintLabels,
        layoutModels,
        applyPresetWithConfig,
        setCustomLabels,
        currentModel,
        isImageModalOpen,
        setIsImageModalOpen,
        editingLabel,
        setEditingLabel,
        labelFormName,
        setLabelFormName,
        labelFormImage,
        setLabelFormImage,
        handleSaveCustomLabel,
        isPriceLabelArtEditorOpen,
        setIsPriceLabelArtEditorOpen,
        isAssetManagerModalOpen,
        setIsAssetManagerModalOpen,
        isNewLogoModalOpen,
        setIsNewLogoModalOpen,
        newLogoName,
        setNewLogoName,
        newLogoImage,
        setNewLogoImage,
        previewContainerRef,
        previewScaleRef,
        gridRef,
        previewZoom,
        setPreviewZoom,
        isPreviewFullscreen
    };
};
