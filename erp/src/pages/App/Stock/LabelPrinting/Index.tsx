import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Product from '../../../types/product.type';
import { saveInventoryMove } from '../../../../pages/utils/inventoryService';
import { supabase } from '@/pages/utils/supabaseConfig';
import LabelGrid, { LabelItemConfig, LogoItemConfig } from './LabelGrid';
import LabelGridModelModal, { GridModel } from './LabelGridModelModal';
import { formatCurrency } from '../../../utils/formatters';
import labelMdf from '../../../../assets/label_mdf.png';
import logoMorante from '../../../../assets/logo.jpeg';
import LabelQueue from './LabelQueue';
import LabelImageModal from './LabelImageModal';
import { 
    LabelType, LabelPreset, LabelLayout, LabelConfig, CustomLabel, DEFAULT_LAYOUT_MODELS 
} from './LabelConstants';
import { 
    calculateLabelDimensions, processProductData, mapModelToDb, mapDbToModel 
} from './LabelUtils';

const LabelPrinting: React.FC = () => {
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
        // Logos e Rótulos são sempre modo simples (apenas imagem)
        if (cat === 'logos') {
            setPrintingMode('simple');
        }
        
        if (cat) {
            setSearchParams(prev => { prev.set('cat', cat); return prev; }, { replace: true });
            
            if (cat !== 'logos') {
                setPrintingMode('advanced');
            }
        } else {
            setSearchParams(prev => { prev.delete('cat'); return prev; }, { replace: true });
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
            if (finalCat === 'logos') setPrintingMode('simple');
            else setPrintingMode('advanced');
        }
    }, [searchParams, selectedCategory]);

    const [products, setProducts] = useState<Product[]>([]);
    const [printingMode, setPrintingMode] = useState<'simple' | 'advanced'>('simple');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(0.7);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [cellImages, setCellImages] = useState<Record<number, string>>({});
    const cellInputRef = useRef<HTMLInputElement>(null);
    const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);
    const [layoutModalOpen, setLayoutModalOpen] = useState(false);
    const [gridModalOpen, setGridModalOpen] = useState(false); 
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
    const [hiddenDefaultIds, setHiddenDefaultIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('hidden_default_layout_ids') || '[]'); } catch { return []; }
    });

    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [modelToCopy, setModelToCopy] = useState<GridModel | null>(null);
    const [modelToDelete, setModelToDelete] = useState<string | null>(null);
    const [copyAnchor, setCopyAnchor] = useState<DOMRect | null>(null);

    const [defaultLayoutIds, setDefaultLayoutIds] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem('default_label_layout_ids') || '{}'); } catch { return {}; }
    });
    
    // Estados de lista e paginação
    const [labelItems, setLabelItems] = useState<LabelItemConfig[]>([]);
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
    const ITEMS_PER_PAGE = 50;


    const [config, setConfig] = useState<LabelConfig>({
        type: isProductContext ? 'rect' : 'round',
        preset: isProductContext ? 'qr_product' : 'store_logo',
        layout: isProductContext ? 'horizontal' : 'vertical',
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

    const selectLayout = (model: GridModel) => {
        const autoPreset: LabelPreset = model.category === 'precos' ? 'price_only' : 
                                       model.category === 'identificacao' ? 'qr_product' : 
                                       model.category === 'logos' ? 'store_logo' : 'qr_product';

        setConfig(prefConfig => ({
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
        }));
    };

    const applyPresetWithConfig = (preset: LabelPreset, baseConfig: LabelConfig) => {
        const newConfig: LabelConfig = { ...baseConfig, preset };
        if (preset === 'qr_product' || preset === 'barcode_only') newConfig.category = 'identificacao';
        else if (preset === 'price_only' || preset === 'promotional_price') newConfig.category = 'precos';
        else if (preset === 'store_logo') newConfig.category = 'logos';

        switch (preset) {
            case 'store_logo':
                newConfig.type = 'round';
                newConfig.layout = 'vertical';
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

        // 2. Busca Seletiva (Apenas o que a etiqueta usa) para economizar Banda (Egress)
        const { data, error } = await supabase
            .from('products')
            .select('id, description, unitPrice, costPrice, stock, active, hasVariations, variations, images, categoryIds, category, unit')
            .eq('deleted', false)
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
            const { data, error } = await supabase
                .from('label_layouts')
                .select('*')
                .order('name', { ascending: true });

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
    }, []);

    useEffect(() => {
        const cat = selectedCategory || catFromUrl;
        if (!cat) return;

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
    }, [catFromUrl, selectedCategory, defaultLayoutIds]);

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

    const handleProductSelect = (product: Product) => {
        const variationName = (product as any).variation || (product as any).variationName || (product as any).name;
        let fullName = (product.description || '');
        if (product.isVariation && variationName && !fullName.includes(variationName)) {
            fullName = `${fullName} - ${variationName}`;
        }

        // Limpeza de sufixos indesejados (como " - Restaurado") para etiquetas de preço
        // O usuário solicitou remover " - Restaurado" e qualquer outro texto extra após o traço nas etiquetas de preço
        if (selectedCategory === 'precos') {
            // Removemos qualquer coisa após o primeiro " - " (espaço-hífen-espaço)
            // Isso garante que apenas o nome principal do produto seja exibido, sem variações ou estados (ex: Restaurado)
            fullName = fullName.split(' - ')[0];
        }

        const newItem: LabelItemConfig = {
            name: fullName,
            price: product.unitPrice ? formatCurrency(product.unitPrice) : 
                   (product as any).price ? formatCurrency((product as any).price) : 'R$ 0,00',
            promoPrice: '',
            sku: product.sku || '', 
            quantity: 1,
            extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : []
        };

        setLabelItems(prev => [...prev, newItem]);
        toast.success(`${fullName} adicionado à lista.`);
    };

    const handleDownloadImage = async () => {
        if (!gridRef.current) return;
        setIsDownloading(true);
        try {
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
                    setLabelItems(prev => [...prev, newItem]);
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
        setLogoItems(prev => [...prev, newItem]);
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
        if (config.preset === 'custom') {
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
            
            if (type === 'name') setConfig(prev => ({ ...prev, nameFontSize: newSize }));
            else if (type === 'price') setConfig(prev => ({ ...prev, priceFontSize: newSize }));
            else if (type === 'promo') setConfig(prev => ({ ...prev, promoPriceFontSize: newSize }));
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

    return (
        <>
            <div className={`flex flex-col gap-10 max-w-[1600px] mx-auto py-8 px-6 min-h-screen no-print transition-all`}>
                <header className="mb-10 animate-slide-in">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {selectedCategory && (
                                <button 
                                    onClick={() => setSelectedCategory(null)}
                                    className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all text-slate-400"
                                >
                                    <i className="bi bi-chevron-left text-xl" />
                                </button>
                            )}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                                selectedCategory === 'identificacao' ? 'bg-slate-900 shadow-slate-900/20' : 
                                selectedCategory === 'precos' ? 'bg-amber-500 shadow-amber-500/20' :
                                selectedCategory === 'logos' ? 'bg-purple-600 shadow-purple-600/20' :
                                selectedCategory === 'posts' ? 'bg-pink-600 shadow-pink-600/20' :
                                'bg-blue-600 shadow-blue-500/20'
                            }`}>
                                <i className={`bi ${
                                    selectedCategory === 'identificacao' ? 'bi-qr-code-scan' : 
                                    selectedCategory === 'precos' ? 'bi-tag-fill' :
                                    selectedCategory === 'logos' ? 'bi-palette-fill' :
                                    selectedCategory === 'posts' ? 'bi-instagram' :
                                    'bi-printer-fill'
                                } text-white text-xl`} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase leading-none mb-1">
                                    {selectedCategory === 'identificacao' ? 'Etiqueta de Identificação do Produto' : 
                                     selectedCategory === 'precos' ? 'Etiqueta de Preço' :
                                     selectedCategory === 'logos' ? 'Etiqueta de Logotipo e Rótulo' :
                                     selectedCategory === 'posts' ? 'Posts para Redes Sociais' :
                                     'Gerador de Etiquetas'}
                                </h1>
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                    {selectedCategory === 'identificacao' ? 'Gestão de Inventário' : 
                                     selectedCategory === 'precos' ? 'Vendas e Gôndola' :
                                     selectedCategory === 'logos' ? 'Marca e Institucional' :
                                     selectedCategory === 'posts' ? 'Marketing Digital' :
                                     'Morante Móveis'}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {!selectedCategory ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-12 animate-fade-in max-w-5xl mx-auto">
                        {[
                            { id: 'precos', title: 'Etiqueta de Preço', desc: 'Sinalização de preços e promoções de gôndola', icon: 'bi-tag-fill', preset: 'price_only' },
                            { id: 'identificacao', title: 'Etiqueta de Identificação do Produto', desc: 'Códigos de barras e especificações técnicas de estoque', icon: 'bi-qr-code-scan', preset: 'qr_product' },
                            { id: 'logos', title: 'Etiqueta de Logotipo e Rótulo', desc: 'Rótulos institucionais e logos personalizados', icon: 'bi-palette-fill', preset: 'store_logo' },
                            { id: 'posts', title: 'Posts para Redes Sociais', desc: 'Criação de artes para Instagram e Facebook (1:1)', icon: 'bi-instagram', preset: 'social_square' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setSelectedCategory(cat.id as any);
                                    applyPresetWithConfig(cat.preset as any, config);
                                }}
                                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-800 text-left hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group flex flex-col min-h-[240px] relative overflow-hidden"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-600 transition-all duration-300`}>
                                    <i className={`bi ${cat.icon} text-2xl text-slate-400 group-hover:text-white transition-colors`} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">{cat.title}</h3>
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 leading-relaxed flex-1">{cat.desc}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-10 animate-fade-in">
                        <div className="space-y-6">
                            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Modelos de Etiqueta</h3>
                                        {isSelectMode && (
                                            <span className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase">{selectedModelIds.length} selecionados</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isSelectMode ? (
                                            <>
                                                <button 
                                                    onClick={() => setIsSelectMode(true)}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:scale-110 transition-all font-black text-[9px] uppercase tracking-widest border border-slate-100"
                                                >
                                                    <i className="bi bi-check-all mr-2" />Selecionar Vários
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={async () => {
                                                        if (selectedModelIds.length === 0) {
                                                            setIsSelectMode(false);
                                                            return;
                                                        }
                                                        if (window.confirm(`Deseja excluir ${selectedModelIds.length} modelos?`)) {
                                                            for (const id of selectedModelIds) {
                                                                await handleDeleteLayout(id);
                                                            }
                                                            setSelectedModelIds([]);
                                                            setIsSelectMode(false);
                                                        }
                                                    }}
                                                    className="p-3 bg-red-500 text-white rounded-2xl hover:scale-110 transition-all font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-500/20"
                                                >
                                                    <i className="bi bi-trash3-fill mr-2" />Excluir Selecionados
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setIsSelectMode(false);
                                                        setSelectedModelIds([]);
                                                    }}
                                                    className="p-3 bg-slate-900 text-white rounded-2xl hover:scale-110 transition-all font-black text-[9px] uppercase tracking-widest"
                                                >
                                                    Cancelar
                                                </button>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => {
                                                setEditingGridModel(null);
                                                setGridModalOpen(true);
                                            }}
                                            className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:scale-110 transition-all font-black text-xs uppercase"
                                        >
                                            <i className="bi bi-plus-lg mr-2" />Novo
                                        </button>
                                    </div>
                                </div>

                                {/* Seletor de Tipo de Etiqueta (Redonda vs Personalizada - Apenas para Logos) */}
                                {selectedCategory === 'logos' && (
                                    <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 rounded-2xl flex-col gap-3">
                                        {/* Seletor de Tipo (Formatos) */}
                                        <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                            {[
                                                { id: 'rect', label: 'Retangular', icon: 'bi-app' },
                                                { id: 'round', label: 'Redonda', icon: 'bi-circle' }
                                            ].map(type => (
                                                <button 
                                                    key={type.id}
                                                    onClick={() => handleTypeChange(type.id as LabelType)}
                                                    className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${config.type === type.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    <i className={`bi ${type.icon}`} />
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            {config.type === 'round' ? 'Formato circular fixo (ideal para selos)' : 'O formato será definido pelas colunas e linhas da grade'}
                                        </p>
                                    </div>
                                )}

                                {/* Seletor de Modo de Impressão (Opcional apenas para Preços) */}
                                {selectedCategory === 'precos' && (
                                    <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-sm">
                                            <button 
                                                onClick={() => setPrintingMode('simple')}
                                                className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    printingMode === 'simple' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                <i className="bi bi-image mr-2" /> Etiquetas por Imagens
                                            </button>
                                            <button 
                                                onClick={() => setPrintingMode('advanced')}
                                                className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${printingMode === 'advanced' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            >
                                                <i className="bi bi-layers-half" />
                                                Design Avançado
                                                <span className="px-1.5 py-0.5 bg-blue-400 text-white text-[8px] font-black rounded-md shadow-sm">BETA</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className={`grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar transition-all duration-300 ${printingMode === 'simple' ? 'bg-blue-50/20 dark:bg-blue-900/5 rounded-2xl p-2' : ''}`}>
                                    {printingMode === 'simple' && (
                                        <div className="px-3 py-2 bg-blue-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest mb-2 animate-in fade-in slide-in-from-top-1">
                                            <i className="bi bi-info-circle mr-2" /> Usando apenas o Layout do Modelo
                                        </div>
                                    )}
                                    {layoutModels.map(model => (
                                        <div key={model.id} className="group relative hover:z-[60]">
                                            <div
                                                onClick={() => {
                                                    if (isSelectMode) {
                                                        setSelectedModelIds(prev => 
                                                            prev.includes(model.id) ? prev.filter(id => id !== model.id) : [...prev, model.id]
                                                        );
                                                    } else {
                                                        selectLayout(model);
                                                    }
                                                }}
                                                className={`w-full flex items-center gap-4 p-3 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                                                    selectedModelIds.includes(model.id) || config.layoutId === model.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                                }`}
                                            >
                                                {isSelectMode ? (
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedModelIds.includes(model.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                        <i className={`bi ${selectedModelIds.includes(model.id) ? 'bi-check-lg' : 'bi-app'}`} />
                                                    </div>
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${config.layoutId === model.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`bi ${model.icon}`} />
                                                    </div>
                                                )}
                                                <div className="flex-1 overflow-hidden pr-24">
                                                     <div className="flex items-center gap-2 mb-0.5">
                                                         <div className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white truncate" title={model.name}>
                                                              {model.name}
                                                          </div>
                                                         <button 
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 const dims = calculateLabelDimensions(model);
                                                                 toast.info(
                                                                     <div className="p-1">
                                                                         <p className="font-black uppercase text-[10px] mb-2 border-b pb-1 text-blue-600">Especificações do Modelo</p>
                                                                         <p className="text-[11px] mb-1"><b>Etiqueta:</b> {dims.width} x {dims.height} mm</p>
                                                                         <p className="text-[11px] mb-1"><b>Grade:</b> {model.columns} col x {model.rows} lin</p>
                                                                         <p className="text-[11px] mb-1"><b>Papel:</b> {model.paperSize}</p>
                                                                         <p className="text-[11px]"><b>Capacidade:</b> {model.columns * model.rows} etiquetas/folha</p>
                                                                     </div>,
                                                                     { autoClose: 6000, position: 'top-center', icon: <i className="bi bi-info-circle-fill text-blue-500" /> }
                                                                 );
                                                             }}
                                                             className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors shrink-0"
                                                         >
                                                             <i className="bi bi-info-circle text-[10px] text-slate-500" />
                                                         </button>
                                                     </div>
                                                     <div className="flex flex-col gap-1 overflow-hidden">
                                                         <div className="flex items-center gap-2">
                                                             <span className="px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 rounded-md text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase shrink-0">
                                                                 {model.paperSize}
                                                             </span>
                                                             {(() => {
                                                                 const dims = calculateLabelDimensions(model);
                                                                 return (
                                                                     <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate">
                                                                          {dims.width}x{dims.height}mm • {model.columns * model.rows} un/folha
                                                                     </span>
                                                                 );
                                                             })()}
                                                         </div>
                                                         <div className="flex items-center gap-2 text-[7.5px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none">
                                                             <span>M: {model.marginT}/{model.marginB}/{model.marginL}/{model.marginR}mm</span>
                                                             <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                                             <span>E: {model.gapH}/{model.gapV}mm</span>
                                                         </div>
                                                     </div>
                                                 </div>
                                            </div>
                                            
                                            {!isSelectMode && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                     <button 
                                                         onClick={(e) => { e.stopPropagation(); toggleDefaultLayout(model.id, selectedCategory!); }}
                                                         className={`w-7 h-7 rounded-lg border transition-all shadow-sm flex items-center justify-center ${
                                                             defaultLayoutIds[`${selectedCategory}_${model.type || 'rect'}`] === model.id 
                                                                 ? 'bg-yellow-400 border-yellow-500 text-white hover:bg-yellow-500' 
                                                                 : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                                                         }`}
                                                         title="Definir como padrão"
                                                     >
                                                         <i className={`bi ${defaultLayoutIds[selectedCategory!] === model.id ? 'bi-star-fill' : 'bi-star'} text-[10px]`} />
                                                     </button>

                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicateLayout(model); }}
                                                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                                                        title="Duplicar"
                                                    >
                                                        <i className="bi bi-files text-[10px]" />
                                                    </button>

                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setModelToCopy(model); 
                                                            setIsCopyModalOpen(true); 
                                                        }}
                                                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-all shadow-sm"
                                                        title="Copiar para outra categoria"
                                                    >
                                                        <i className="bi bi-send-fill text-[10px]" />
                                                    </button>

                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setEditingGridModel(model); setGridModalOpen(true); }}
                                                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                                                        title="Editar"
                                                    >
                                                        <i className="bi bi-pencil-fill text-[10px]" />
                                                    </button>

                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setModelToDelete(model.id); }}
                                                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                                                        title="Excluir"
                                                    >
                                                        <i className="bi bi-trash-fill text-[10px]" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex flex-col gap-10">
                                    {/* SEÇÃO DA FILA (PRODUTOS OU LOGOS) */}
                                    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col transition-all">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 mb-8">
                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                                    {selectedCategory === 'logos' ? 'Gerenciar Etiquetas' : 'Itens na Fila de Impressão'}
                                                </h3>
                                                {selectedCategory === 'logos' && (
                                                    <p className="text-[8px] font-bold text-slate-300 uppercase">Organize e configure seus ativos para impressão</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {selectedCategory === 'logos' && (
                                                    <button 
                                                        onClick={() => setIsAssetManagerModalOpen(true)}
                                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-slate-100 dark:border-slate-700 shadow-sm"
                                                    >
                                                        <i className="bi bi-grid-fill" /> Biblioteca de Logotipos / Rótulos
                                                    </button>
                                                )}
                                                
                                                {(selectedCategory === 'logos' ? logoItems.length > 0 : labelItems.length > 0) && (
                                                    <button 
                                                        onClick={() => {
                                                            if (window.confirm('Deseja limpar todos os itens da fila?')) {
                                                                if (selectedCategory === 'logos') setLogoItems([]);
                                                                else setLabelItems([]);
                                                            }
                                                        }}
                                                        className="p-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-all font-black text-[9px] uppercase tracking-widest border border-red-100 dark:border-red-900/30"
                                                    >
                                                        <i className="bi bi-trash3-fill" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-8 items-start">
                                            <div className="space-y-6 shrink-0">
                                                {((selectedCategory as string) === 'logos') ? null : (
                                                    <div className="space-y-6">
                                                        {printingMode === 'simple' ? (
                                                            <div className="space-y-6">
                                                                <div 
                                                                    onClick={() => cellInputRef.current?.click()}
                                                                    className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-[2rem] text-center group cursor-pointer transition-all hover:bg-blue-100/50"
                                                                >
                                                                    <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                                        <i className="bi bi-cloud-arrow-up text-xl" />
                                                                    </div>
                                                                    <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-1">Carregar Imagem da Etiqueta</p>
                                                                    <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">A imagem preencherá a etiqueta</p>
                                                                </div>
                                                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                    <p className="text-[9px] font-black uppercase text-slate-400 text-center leading-relaxed">
                                                                        A etiqueta não será customizada. <br /> Use apenas imagens com o design final.
                                                                    </p>
                                                                </div>
                                                                <input 
                                                                    type="file" 
                                                                    ref={cellInputRef} 
                                                                    className="hidden" 
                                                                    accept="image/*" 
                                                                    onChange={handleLogoUpload} 
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                <p className="text-[9px] font-black uppercase text-slate-400 text-center leading-relaxed">
                                                                    O Modo Simples ignora o design do sistema. <br /> A folha usará as margens e quantidade do modelo escolhido.
                                                                </p>
                                                            </div>
                                                        )}
                                                        {printingMode !== 'simple' && (
                                                            <div className="space-y-4">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adicionar Produtos</label>
                                                                <div className="relative group/add">
                                                                    <select 
                                                                        onChange={e => {
                                                                            const p = products.find(p => String(p.id) === e.target.value);
                                                                            if (p) handleProductSelect(p);
                                                                            e.target.value = ""; 
                                                                        }}
                                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl pl-10 pr-12 py-3 text-[11px] font-black uppercase appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all group-hover/add:border-blue-500"
                                                                    >
                                                                        <option value="">Buscar Produto ({products.length} carr.)...</option>
                                                                        {products.map(p => (
                                                                            <option key={p.id} value={String(p.id)}>{p.description}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[10px] pointer-events-none">
                                                                        <i className="bi bi-plus-lg" />
                                                                    </div>
                                                                </div>
                                                                {hasMoreProducts && (
                                                                    <button 
                                                                        onClick={() => fetchAllProducts(true)}
                                                                        className="w-full py-2 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors"
                                                                    >
                                                                        <i className="bi bi-arrow-down-short text-lg" /> Carregar Mais Produtos
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                                                <div className="space-y-4">
                                                    {selectedCategory === 'logos' ? (
                                                        <LabelQueue 
                                                            labelItems={logoItems} 
                                                            setLabelItems={setLogoItems} 
                                                            printingMode="simple" 
                                                        />
                                                    ) : (
                                                        <LabelQueue 
                                                            labelItems={labelItems} 
                                                            setLabelItems={setLabelItems} 
                                                            printingMode={printingMode} 
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* SEÇÃO DO RESULTADO FINAL (Abaixo da Fila, Full Width) */}
                                    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col items-center animate-fade-in transition-all">
                                        <div className="flex items-center justify-between mb-6 w-full">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Resultado Final</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleDownloadImage}
                                                    disabled={isDownloading}
                                                    className="p-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <i className="bi bi-download" /> Imagem
                                                </button>
                                            <button 
                                                    onClick={() => window.print()}
                                                    className="p-2.5 px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg hover:scale-105"
                                                >
                                                    <i className="bi bi-printer" /> Imprimir
                                                </button>
                                            </div>
                                        </div>

                                     <div 
                                         ref={previewContainerRef}
                                         className={`w-full bg-slate-50 dark:bg-slate-950 rounded-[2rem] flex flex-col items-center border border-slate-100 dark:border-slate-800 relative transition-all duration-500 overflow-auto custom-scrollbar group/preview ${
                                             isPreviewFullscreen ? 'fixed inset-0 z-[200] rounded-none bg-white dark:bg-black p-10' : 'p-6'
                                         }`}
                                     >
                                         {/* Toolbar Flutuante */}
                                         <div className="sticky top-0 z-50 flex items-center gap-2 mb-6 pointer-events-auto">
                                             <div className="flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
                                                 {/* Paginação */}
                                                 {(() => {
                                                     const totalCells = config.columns * config.rows;
                                                     const count = ((selectedCategory as string) === 'logos') 
                                                         ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                                                         : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                                                     const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
                                                     
                                                     return (
                                                         <div className="flex items-center gap-1">
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(0, prev - 1)); }}
                                                                 disabled={currentPage === 0}
                                                                 className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 transition-all"
                                                             >
                                                                 <i className="bi bi-chevron-left" />
                                                             </button>
                                                             <div className="px-3 py-2 flex items-center gap-1.5 text-[10px] font-black text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                                 <span className="text-blue-500">{currentPage + 1}</span>
                                                                 <span className="text-slate-300">/</span>
                                                                 <span>{totalPagesCount}</span>
                                                             </div>
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPagesCount - 1, prev + 1)); }}
                                                                 disabled={currentPage >= totalPagesCount - 1}
                                                                 className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 transition-all"
                                                             >
                                                                 <i className="bi bi-chevron-right" />
                                                             </button>
                                                         </div>
                                                     );
                                                 })()}

                                                 <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                                                 <button 
                                                     onClick={() => setPreviewZoom(prev => Math.max(0.1, prev - 0.1))}
                                                     className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                                 >
                                                     <i className="bi bi-zoom-out" />
                                                 </button>
                                                 <div className="text-[10px] font-black w-10 text-center text-slate-500">{Math.round(previewZoom * 100)}%</div>
                                                 <button 
                                                     onClick={() => setPreviewZoom(prev => Math.min(2.0, prev + 0.1))}
                                                     className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                                 >
                                                     <i className="bi bi-zoom-in" />
                                                 </button>
                                             </div>
                                         </div>

                                         <div style={{ 
                                             transform: `scale(${previewZoom})`, 
                                             transformOrigin: 'top center',
                                             transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                         }} className="relative mb-20 origin-top">
                                             <div ref={gridRef} className="shadow-2xl bg-white">
                                                 <LabelGrid 
                                                     config={{ ...config, printingMode }} 
                                                     image={selectedImage} 
                                                     cellImages={cellImages}
                                                     onCellClick={handleCellClick}
                                                     labelItems={labelItems}
                                                     logoItems={logoItems}
                                                     currentPage={currentPage}
                                                 />
                                             </div>
                                         </div>
                                     </div>
                                 </section>
                             </div>
                         </div>
                     </div>
                 )}
             </div>

            <div className="print-only fixed inset-0 bg-white z-[9999]">
                 {(() => {
                    const totalCells = config.columns * config.rows;
                    const count = ((selectedCategory as string) === 'logos') 
                        ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                        : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                    const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);

                    return Array.from({ length: totalPagesCount }).map((_, pageIdx) => (
                        <div key={pageIdx} style={{ pageBreakAfter: 'always' }}>
                            <LabelGrid 
                                config={{ ...config, printingMode }} 
                                image={selectedImage} 
                                cellImages={cellImages}
                                labelItems={labelItems}
                                logoItems={logoItems}
                                currentPage={pageIdx}
                            />
                        </div>
                    ));
                 })()}
            </div>

            <LabelGridModelModal 
                isOpen={gridModalOpen} 
                onClose={() => { setGridModalOpen(false); setEditingGridModel(null); }} 
                editingModel={editingGridModel}
                currentCategory={selectedCategory}
                existingModels={[...DEFAULT_LAYOUT_MODELS, ...customLayouts]}
                previewImage={selectedImage}
                onSave={async (newModel) => {
                    // 1. Determinar quem é o alvo da atualização (targetId)
                    const isSystemDefault = editingGridModel ? DEFAULT_LAYOUT_MODELS.some(m => m.id === editingGridModel.id) : false;
                    const existingOverride = isSystemDefault 
                        ? customLayouts.find(c => c.baseModelId === editingGridModel!.id)
                        : null;

                    const targetId = existingOverride?.id || (isSystemDefault ? null : editingGridModel?.id);
                    const isUpdateAction = !!targetId;

                    // 2. Verificar se já existe um modelo IDÊNTICO (mesmas dimensões) que não seja este mesmo que estou editando
                    const isIdentical = (m1: GridModel, m2: GridModel) => {
                        const fieldsToCompare: (keyof GridModel)[] = [
                            'columns', 'rows', 'marginT', 'marginB', 'marginL', 'marginR', 
                            'gapH', 'gapV', 'paperSize', 'type', 'category'
                        ];
                        return fieldsToCompare.every(field => m1[field] === m2[field]);
                    };

                    const identicalLayout = customLayouts.find(m => 
                        m.id !== targetId && // Não ser o override atual
                        m.id !== (editingGridModel?.id || '') && // Não ser o padrão original
                        isIdentical(m, newModel)
                    );

                    if (identicalLayout) {
                        toast.info(`Este modelo de etiqueta já existe (como "${identicalLayout.name}").`);
                        setGridModalOpen(false);
                        setEditingGridModel(null);
                        return;
                    }

                    // 3. Preparar e Salvar
                    const isDbWriteable = isUpdateAction && !String(targetId).startsWith('custom_');
                    const modelToSave = { 
                        ...newModel, 
                        category: selectedCategory as any,
                        baseModelId: (isSystemDefault ? editingGridModel!.id : (editingGridModel?.baseModelId || undefined)) as string | undefined
                    };
                    const dbModel = mapModelToDb(modelToSave);

                    let finalModel: GridModel | null = null;
                    let savedToDb = false;
                    let resultError: any = null;

                    try {
                        if (isDbWriteable) {
                            const { data, error } = await supabase.from('label_layouts').update(dbModel).eq('id', targetId).select().single();
                            if (data && !error) { finalModel = mapDbToModel(data); savedToDb = true; } else { resultError = error; }
                        } else if (!isUpdateAction) {
                            const { data, error } = await supabase.from('label_layouts').insert([dbModel]).select().single();
                            if (data && !error) { finalModel = mapDbToModel(data); savedToDb = true; } else { resultError = error; }
                        }
                    } catch (e) {
                        console.error('Erro no Supabase:', e);
                        resultError = e;
                    }

                    // 4. Contingência Local
                    if (!finalModel) {
                        const localId = targetId || `custom_${Date.now()}`;
                        finalModel = { ...modelToSave, id: localId as any } as GridModel;
                    }

                    // 5. Atualizar Estado (Substituição por Origem e ID)
                    setCustomLayouts(prev => {
                        const targetBaseId = finalModel!.baseModelId;
                        const targetId = finalModel!.id;

                        const filtered = prev.filter(m => {
                            const isOldId = String(m.id) === String(targetId);
                            const isOldOverride = targetBaseId && m.baseModelId === targetBaseId;
                            
                            // Se for o mesmo ID ou for um override da mesma etiqueta base, removemos o antigo
                            return !isOldId && !isOldOverride;
                        });

                        const newList = [...filtered, finalModel!];
                        localStorage.setItem('custom_label_layouts', JSON.stringify(newList));
                        return newList;
                    });
                        
                    if (finalModel && (editingGridModel?.id === config.layoutId || config.layoutId === finalModel.id)) {
                        selectLayout(finalModel);
                    }

                    // Notificar usuário
                    if (savedToDb) {
                        toast.success('Modelo atualizado no banco!');
                    } else {
                        const quota = resultError?.message?.includes('quota') || resultError?.status === 402;
                        toast.warning(
                            <div className="flex flex-col gap-1">
                                <p className="font-bold text-[10px] uppercase tracking-widest text-slate-800">Salvo Localmente</p>
                                <p className="text-[9px] opacity-70">
                                    {quota ? 'Limite de dados (Quota) atingido. ' : 'Falha na rede. '}
                                    As alterações foram salvas neste computador.
                                </p>
                            </div>, { autoClose: 9000 }
                        );
                    }
                    setGridModalOpen(false);
                    setEditingGridModel(null);
                }}
            />

            {/* Modal de Cópia de Layout para outra Categoria */}
            {isCopyModalOpen && modelToCopy && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-300" onClick={() => setIsCopyModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in fade-in duration-300">
                        <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                                <i className="bi bi-files-alternate text-2xl" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">Enviar Cópia</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Selecione a categoria de destino</p>
                        </div>
                        
                        <div className="p-10 space-y-3">
                            {(['identificacao', 'precos', 'logos', 'posts'] as const)
                                .filter(c => c !== selectedCategory)
                                .filter(c => {
                                    // Etiquetas redondas só são compatíveis com a categoria 'logos'
                                    if (modelToCopy.type === 'round') {
                                        return c === 'logos';
                                    }
                                    return true;
                                })
                                .map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => {
                                        handleCopyToCategory(modelToCopy!, cat);
                                        setIsCopyModalOpen(false);
                                    }}
                                    className="w-full p-6 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group active:scale-95 shadow-sm hover:shadow-xl hover:shadow-blue-500/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-slate-700/50 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                            <i className={`bi bi-${cat === 'identificacao' ? 'qr-code-scan' : cat === 'precos' ? 'tag-fill' : cat === 'logos' ? 'palette-fill' : 'instagram'}`} />
                                        </div>
                                        <span>
                                            {cat === 'identificacao' ? 'Identificação / ID' : 
                                             cat === 'precos' ? 'Preços de Venda' : 
                                             cat === 'logos' ? 'Logos e Rótulos' : 'Marketing / Posts'}
                                        </span>
                                    </div>
                                    <i className="bi bi-chevron-right text-xs group-hover:translate-x-1 transition-transform" />
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => setIsCopyModalOpen(false)}
                            className="bg-slate-100 dark:bg-slate-800 p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Exclusão */}
            {modelToDelete && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModelToDelete(null)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="px-10 py-10 text-center">
                            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mx-auto mb-6">
                                <i className="bi bi-trash3-fill text-3xl" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-3">Excluir Modelo?</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-relaxed px-4">
                                {DEFAULT_LAYOUT_MODELS.some(m => m.id === modelToDelete) 
                                    ? 'Este modelo é padrão. Deseja apenas ocultá-lo da sua lista?' 
                                    : 'Esta ação não pode ser desfeita. O layout será removido permanentemente.'}
                            </p>
                        </div>
                        
                        <div className="flex border-t border-slate-50 dark:border-slate-800">
                            <button 
                                onClick={() => setModelToDelete(null)}
                                className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDeleteLayout}
                                className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-l border-slate-50 dark:border-slate-800"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
             {/* Input Global oculto para upload de imagens de marca e rótulos */}
            <input 
                type="file" 
                ref={cellInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleLogoUpload} 
            />

            {/* Modal de Novo Asset (Upload de Imagem) - Z-INDEX 400 para ficar sobre a biblioteca */}
            {isNewLogoModalOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsNewLogoModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                <i className="bi bi-image text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Confirmar Novo Ativo</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dê um nome para este logotipo / rótulo</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="aspect-square w-full rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden p-4 group">
                                <img 
                                    src={newLogoImage} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain transition-transform group-hover:scale-110" 
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Nome do Ativo</label>
                                <input 
                                    type="text"
                                    value={newLogoName}
                                    onChange={e => setNewLogoName(e.target.value.toUpperCase())}
                                    placeholder="EX: LOGO MORANTE PRINCIPAL"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setIsNewLogoModalOpen(false)}
                                    className="flex-1 px-6 py-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmNewLogo}
                                    className="flex-[1.5] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center"
                                >
                                    Salvar na Biblioteca
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Gerenciamento do Banco de Ativos (Biblioteca) */}
            {isAssetManagerModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsAssetManagerModalOpen(false)}
                    />
                    <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
                                    <i className="bi bi-images text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Biblioteca de Logotipos / Rótulos</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gerencie seus ativos visuais para etiquetas</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAssetManagerModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                                <i className="bi bi-x-lg text-lg" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ativos Disponíveis ({availableLogos.length})</h4>
                                    <button 
                                        onClick={() => cellInputRef.current?.click()}
                                        className="px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                    >
                                        <i className="bi bi-cloud-arrow-up-fill" />Subir Novo Logotipo/Rótulo
                                    </button>
                                </div>
                                
                                {availableLogos.length === 0 ? (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                        <i className="bi bi-image text-4xl text-slate-200 mb-4 block" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Sua biblioteca está vazia</p>
                                        <button onClick={() => cellInputRef.current?.click()} className="mt-4 text-[9px] font-black uppercase text-indigo-600 hover:underline">Carregar meu primeiro ativo</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                        {availableLogos.map(logo => (
                                            <div key={logo.id} className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all">
                                                <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-slate-50 dark:bg-slate-900 mb-3 relative">
                                                    <img src={logo.image} alt="" className="w-full h-full object-contain p-2" />
                                                    <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleAddLogoToQueue(logo); }}
                                                            className="px-4 py-2 rounded-xl bg-white text-indigo-600 text-[9px] font-black uppercase hover:scale-110 active:scale-95 transition-all shadow-lg"
                                                        >
                                                            Selecionar
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteAvailableLogo(logo.id); }}
                                                            className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                                                            title="Deletar permanentemente"
                                                        >
                                                            <i className="bi bi-trash3-fill" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="px-1 truncate">
                                                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{logo.name || 'SEM NOME'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Os ativos selecionados serão adicionados à fila de impressão principal</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de CRUD de Rótulo Customizado */}
            {isLabelModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsLabelModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <i className="bi bi-bookmark-plus-fill text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                                        {editingLabel ? 'Editar Rótulo' : 'Criar Novo Rótulo'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vincule uma imagem ao seu banco de rótulos prontos</p>
                                </div>
                            </div>
                            <button onClick={() => setIsLabelModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Nome do Rótulo</label>
                                        <input 
                                            type="text"
                                            value={labelFormName}
                                            onChange={e => setLabelFormName(e.target.value)}
                                            placeholder="EX: RÓTULO VINHO TINTO 750ML"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-outfit"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Visualização Atual</label>
                                        <div className="aspect-square w-full rounded-[2.5rem] bg-slate-50 dark:bg-slate-950/40 border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center p-6 group">
                                            {labelFormImage ? (
                                                <img src={labelFormImage} alt="" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" />
                                            ) : (
                                                <div className="text-center">
                                                    <i className="bi bi-image text-4xl text-slate-200 mb-2 block" />
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Nenhuma imagem selecionada</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block px-2">Selecione uma Imagem da Biblioteca</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {availableLogos.length === 0 ? (
                                            <div className="col-span-3 py-10 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">Sua biblioteca de imagens está vazia.<br/>Suba imagens primeiro.</p>
                                            </div>
                                        ) : (
                                            availableLogos.map(logo => (
                                                <button 
                                                    key={logo.id}
                                                    onClick={() => {
                                                        setLabelFormImage(logo.image);
                                                        if (!labelFormName) setLabelFormName(logo.name);
                                                    }}
                                                    className={`aspect-square rounded-2xl border-2 p-2 relative overflow-hidden transition-all ${labelFormImage === logo.image ? 'border-blue-500 bg-blue-50' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200'}`}
                                                >
                                                    <img src={logo.image} alt="" className="w-full h-full object-contain" />
                                                    {labelFormImage === logo.image && (
                                                        <div className="absolute top-1 right-1 bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                                                            <i className="bi bi-check text-[10px]" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-8 shrink-0">
                            <button 
                                onClick={() => setIsLabelModalOpen(false)}
                                className="flex-1 px-8 py-5 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveCustomLabel}
                                className="flex-[1.5] px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center"
                            >
                                {editingLabel ? 'Salvar Alterações' : 'Criar Rótulo Definido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
             <LabelImageModal 
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                currentCategory={selectedCategory}
                onSelect={(image) => {
                    if (selectedCategory === 'logos') {
                        setLogoItems(prev => [...prev, { image, quantity: 1, imageFit: config.imageFit || 'contain', name: 'DA BIBLIOTECA' }]);
                    } else {
                        setSelectedImage(image);
                    }
                    setIsImageModalOpen(false);
                    toast.success('Imagem selecionada da biblioteca!');
                }}
             />
        </>
    );
};

export default LabelPrinting;
