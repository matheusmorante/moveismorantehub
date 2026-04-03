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

export type LabelType = 'round' | 'rect';
export type LabelPreset = 'mdf' | 'store_logo' | 'qr_product' | 'barcode_only' | 'price_only' | 'promotional_price' | 'custom' | 'social_square';
export type LabelLayout = 'vertical' | 'horizontal' | 'image-focus';

export interface LabelConfig {
    type: LabelType;
    preset: LabelPreset;
    layout: LabelLayout;
    showName: boolean;
    showPrice: boolean;
    showBarcode: boolean;
    showSKU: boolean;
    showStoreName: boolean;
    showStoreLogo: boolean;
    showCustomText: boolean;
    text: string;
    price: string;
    sku: string;
    qrContent: string;
    customText: string;
    imageScale: number;
    marginT: number;
    marginB: number;
    marginL: number;
    marginR: number;
    gapH: number;
    gapV: number;
    columns: number;
    rows: number;
    showPromoPrice: boolean;
    promoPrice: string;
    layoutId?: string;
    paperSize: string;
    paperWidth?: number;
    paperHeight?: number;
    category: string;
    // Design e Interatividade
    nameFontSize: number;
    nameColor: string;
    nameBold?: boolean;
    nameAlign?: 'left' | 'center' | 'right';
    nameVAlign?: 'top' | 'middle' | 'bottom';
    priceFontSize: number;
    priceColor: string;
    priceBold?: boolean;
    priceAlign?: 'left' | 'center' | 'right';
    priceVAlign?: 'top' | 'middle' | 'bottom';
    promoFontSize?: number;
    promoColor?: string;
    promoBold?: boolean;
    promoAlign?: 'left' | 'center' | 'right';
    promoVAlign?: 'top' | 'middle' | 'bottom';
    promoPriceFontSize: number;
    promoPriceColor: string;
    oldPriceColor: string;
    // Posições
    namePosX?: number;
    namePosY?: number;
    pricePosX?: number;
    pricePosY?: number;
    promoPosX?: number;
    promoPosY?: number;
    barcodePosX?: number;
    barcodePosY?: number;
    // Fontes por faixa
    priceFontSizeHundreds?: number;
    priceFontSizeThousands?: number;
    // Dimensões e Áreas
    labelWidth?: number;
    labelHeight?: number;
    nameWidth?: number;
    nameHeight?: number;
    priceWidth?: number;
    priceHeight?: number;
    promoWidth?: number;
    promoHeight?: number;
    // Estilos Independentes Promo/Antigo
    promoPriceBold?: boolean;
    promoPriceAlign?: 'left' | 'center' | 'right';
    promoPriceVAlign?: 'top' | 'middle' | 'bottom';
    oldPriceBold?: boolean;
    oldPriceFontSize?: number;
    oldPriceAlign?: 'left' | 'center' | 'right';
    oldPriceVAlign?: 'top' | 'middle' | 'bottom';
    bg_color?: string;
    nameBgColor?: string;
    priceBgColor?: string;
    promoBgColor?: string;
}

const DEFAULT_LAYOUT_MODELS: GridModel[] = [
    // Identificação
    { id: '1x1_std', name: '1 Etiqueta (1x1)', columns: 1, rows: 1, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 0, gapV: 0, icon: 'bi-square', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '2x2_std', name: '4 Etiquetas (2x2)', columns: 2, rows: 2, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 10, gapV: 10, icon: 'bi-grid-fill', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '2x3_std', name: '6 Etiquetas (2x3)', columns: 2, rows: 3, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-1x2', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '3x3_std', name: '9 Etiquetas (3x3)', columns: 3, rows: 3, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-3x3', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    
    // Preços (Gôndola) - Com tipografia padrão
    { id: 'preco_1x1', name: '1 Etiqueta (1x1)', columns: 1, rows: 1, marginT: 20, marginB: 20, marginL: 20, marginR: 20, gapH: 0, gapV: 0, icon: 'bi-card-text', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 12, nameColor: '#1e293b', priceFontSize: 32, priceColor: '#1e293b', promoPriceFontSize: 24, promoPriceColor: '#16a34a', bg_color: '#ffffff' },
    { id: 'preco_2x4', name: '8 Etiquetas (2x4)', columns: 2, rows: 4, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 10, icon: 'bi-tags', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 10, nameColor: '#1e293b', priceFontSize: 24, priceColor: '#1e293b', promoPriceFontSize: 20, promoPriceColor: '#16a34a', bg_color: '#ffffff' },
    { id: 'preco_3x7', name: '21 Etiquetas (3x7)', columns: 3, rows: 7, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 2, gapV: 2, icon: 'bi-grid-3x3-gap', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 7, nameColor: '#1e293b', priceFontSize: 14, priceColor: '#1e293b', promoPriceFontSize: 11, promoPriceColor: '#16a34a', bg_color: '#ffffff' },
    { id: 'preco_3x9_a4', name: '27 Etiquetas (3x9)', columns: 3, rows: 9, marginT: 10, marginB: 10, marginL: 5, marginR: 5, gapH: 4, gapV: 0, icon: 'bi-grid-3x3-gap-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 7, nameColor: '#1e293b', priceFontSize: 12, priceColor: '#1e293b', promoFontSize: 10, promoColor: '#16a34a' },
    { id: 'preco_4x10_a4', name: '40 Etiquetas (4x10)', columns: 4, rows: 10, marginT: 10, marginB: 10, marginL: 5, marginR: 5, gapH: 4, gapV: 0, icon: 'bi-grid-3x2-gap-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 6, nameColor: '#1e293b', priceFontSize: 10, priceColor: '#1e293b', promoFontSize: 8, promoColor: '#16a34a' },
    { id: 'preco_2x5_a4', name: '10 Etiquetas (2x5)', columns: 2, rows: 5, marginT: 9.5, marginB: 9.5, marginL: 4, marginR: 4, gapH: 2.5, gapV: 0, icon: 'bi-grid-1x2-fill', paperSize: 'A4', category: 'precos', type: 'rect', nameFontSize: 11, nameColor: '#1e293b', priceFontSize: 28, priceColor: '#1e293b', promoFontSize: 22, promoColor: '#16a34a' },

    // Logos e Rótulos (Redondos ou Retangulares)
    { id: 'logo_round_3x3', name: '9 Etiquetas (Redonda) (3x3)', columns: 3, rows: 3, marginT: 15, marginB: 15, marginL: 15, marginR: 15, gapH: 10, gapV: 10, icon: 'bi-circle', paperSize: 'A4', category: 'logos', type: 'round' },
    { id: 'logo_rect_2x2', name: '4 Etiquetas (Retangular) (2x2)', columns: 2, rows: 2, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 10, gapV: 10, icon: 'bi-square', paperSize: 'A4', category: 'logos', type: 'rect' },

    // Posts para Redes Sociais
    { id: 'post_square', name: 'Post Individual (1x1)', columns: 1, rows: 1, marginT: 0, marginB: 0, marginL: 0, marginR: 0, gapH: 0, gapV: 0, icon: 'bi-instagram', paperSize: 'A4', category: 'posts', type: 'rect' },
];

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
    const [selectedCategory, setSelectedCategoryState] = useState<CategoryType | null>(
        VALID_CATEGORIES.includes(catFromUrl as CategoryType) ? catFromUrl : null
    );

    const setSelectedCategory = (cat: CategoryType | null) => {
        setSelectedCategoryState(cat);
        if (cat) {
            setSearchParams(prev => { prev.set('cat', cat); return prev; }, { replace: true });
        } else {
            setSearchParams(prev => { prev.delete('cat'); return prev; }, { replace: true });
        }
    };

    const [products, setProducts] = useState<Product[]>([]);
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
    const [editingGridModel, setEditingGridModel] = useState<GridModel | null>(null);
    const [customLayouts, setCustomLayouts] = useState<GridModel[]>([]);
    const [hiddenDefaultIds, setHiddenDefaultIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('hidden_default_layout_ids') || '[]'); } catch { return []; }
    });

    const [defaultLayoutIds, setDefaultLayoutIds] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem('default_label_layout_ids') || '{}'); } catch { return {}; }
    });
    
    // Estados de lista e paginação
    const [labelItems, setLabelItems] = useState<LabelItemConfig[]>([]);
    const [logoItems, setLogoItems] = useState<LogoItemConfig[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        const fetchCustomLayouts = async () => {
            // Tenta buscar do Supabase primeiro
            const { data, error } = await supabase
                .from('label_layouts')
                .select('*')
                .order('name', { ascending: true });

            if (data && !error) {
                const mapped: GridModel[] = data.map((m: any) => ({
                    id: String(m.id),
                    name: m.name,
                    marginT: m.margin_t,
                    marginB: m.margin_b,
                    marginL: m.margin_l,
                    marginR: m.margin_r,
                    gapH: m.gap_h,
                    gapV: m.gap_v,
                    columns: m.columns,
                    rows: m.rows,
                    paperSize: m.paper_size,
                    paperWidth: m.paper_width,
                    paperHeight: m.paper_height,
                    category: m.category,
                    icon: m.icon,
                    type: m.type,
                    barcodePosX: m.barcode_pos_x,
                    barcodePosY: m.barcode_pos_y,
                    priceFontSizeHundreds: m.price_font_size_hundreds,
                    priceFontSizeThousands: m.price_font_size_thousands,
                    nameWidth: m.name_width,
                    nameHeight: m.name_height,
                    priceWidth: m.price_width,
                    priceHeight: m.price_height,
                    promoWidth: m.promo_width,
                    promoHeight: m.promo_height,
                    nameBold: m.name_bold,
                    nameAlign: m.name_align,
                    nameVAlign: m.name_valign,
                    priceBold: m.price_bold,
                    priceAlign: m.price_align,
                    priceVAlign: m.price_valign,
                    promoBold: m.promo_bold,
                    promoAlign: m.promo_align,
                    promoVAlign: m.promo_valign,
                    bg_color: m.bg_color,
                }));
                setCustomLayouts(mapped);
                localStorage.setItem('custom_label_layouts', JSON.stringify(mapped));
            } else {
                // Fallback para localStorage se o banco falhar (tabela não existir ou erro de rede)
                const saved = localStorage.getItem('custom_label_layouts');
                if (saved) {
                    try {
                        setCustomLayouts(JSON.parse(saved));
                    } catch (e) {
                        console.error("Erro ao carregar layouts do localStorage", e);
                    }
                }
            }
        };

        fetchCustomLayouts();
    }, []);

    // Restaurar preset ou layout padrão quando a categoria muda ou a página carrega
    useEffect(() => {
        const cat = selectedCategory || catFromUrl;
        if (!cat) return;

        // Se houver um layout padrão definido para esta categoria, aplica ele
        const defaultId = defaultLayoutIds[cat];
        if (defaultId) {
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const found = models.find(m => m.id === defaultId);
            if (found) {
                selectLayout(found);
                return;
            }
        }

        // Fallback para presets se não houver padrão
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
                showBarcode: cat !== 'precos', // Preços não mostram barcode por padrão agora
                showStoreLogo: cat !== 'precos', // Preços não mostram logo por padrão agora
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [catFromUrl, selectedCategory, defaultLayoutIds]);

    const layoutModels = [...DEFAULT_LAYOUT_MODELS.filter(m => !hiddenDefaultIds.includes(m.id)), ...customLayouts].filter(m => m.category === selectedCategory);

    const handleDuplicateLayout = async (model: GridModel) => {
        const newModel = { 
            ...model, 
            id: undefined, // Deixa o DB gerar novo ID
            name: `${model.name} (Cópia)` 
        };
        
        const { data, error } = await supabase
            .from('label_layouts')
            .insert([{
                name: newModel.name,
                category: newModel.category,
                columns: newModel.columns,
                rows: newModel.rows,
                margin_t: newModel.marginT,
                margin_b: newModel.marginB,
                margin_l: newModel.marginL,
                margin_r: newModel.marginR,
                gap_h: newModel.gapH,
                gap_v: newModel.gapV,
                paper_size: newModel.paperSize,
                paper_width: newModel.paperWidth,
                paper_height: newModel.paperHeight,
                icon: newModel.icon,
                type: newModel.type
            }])
            .select()
            .single();

        if (data && !error) {
            const saved = {
                ...data,
                marginT: data.margin_t,
                marginB: data.margin_b,
                marginL: data.margin_l,
                marginR: data.margin_r,
                gapH: data.gap_h,
                gapV: data.gap_v,
                paperWidth: data.paper_width,
                paperHeight: data.paper_height
            };
            const updated = [...customLayouts, saved];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout duplicado e salvo no banco!');
        } else {
            // Fallback for local
            const localModel = { ...newModel, id: `custom_${Date.now()}` };
            const updated = [...customLayouts, localModel];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout duplicado (Local)');
        }
    };

    const selectLayout = (model: GridModel) => {
        // Mapear preset automático pela categoria
        const autoPreset: LabelPreset = model.category === 'precos' ? 'price_only' : 
                                       model.category === 'identificacao' ? 'qr_product' : 
                                       model.category === 'logos' ? 'store_logo' : 'qr_product';

        setConfig({
            ...config,
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
            type: model.type || 'rect',
            nameFontSize: model.nameFontSize || config.nameFontSize,
            priceFontSize: model.priceFontSize || config.priceFontSize,
            promoPriceFontSize: model.promoFontSize || config.promoPriceFontSize,
            promoFontSize: model.promoFontSize || 9,
            namePosX: model.namePosX,
            namePosY: model.namePosY,
            pricePosX: model.pricePosX,
            pricePosY: model.pricePosY,
            promoPosX: model.promoPosX,
            promoPosY: model.promoPosY,
            barcodePosX: model.barcodePosX,
            barcodePosY: model.barcodePosY,
            priceFontSizeHundreds: model.priceFontSizeHundreds,
            priceFontSizeThousands: model.priceFontSizeThousands,
            nameWidth: model.nameWidth,
            nameHeight: model.nameHeight,
            priceWidth: model.priceWidth,
            priceHeight: model.priceHeight,
            promoWidth: model.promoWidth,
            promoHeight: model.promoHeight,
            nameBold: model.nameBold,
            nameAlign: model.nameAlign,
            nameVAlign: model.nameVAlign,
            priceBold: model.priceBold,
            priceAlign: model.priceAlign,
            priceVAlign: model.priceVAlign,
            promoBold: model.promoBold,
            promoAlign: model.promoAlign,
            promoVAlign: model.promoVAlign,
            nameColor: model.nameColor || '#1e293b',
            priceColor: model.priceColor || '#1e293b',
            promoColor: model.promoColor || '#16a34a',
            category: model.category || config.category, // Persistir a categoria do modelo na config
            showName: true, // Sempre mostrar nome ao escolher layout
            showPrice: model.category === 'precos', // Mostrar preço por padrão se for categoria precos
            showBarcode: model.category !== 'precos', // Forçar desligamento de barcode em preços
            showStoreLogo: model.category !== 'precos', // Forçar desligamento de logo em preços
        });
    };

    const toggleDefaultLayout = (modelId: string, category: string) => {
        const newDefaults = { ...defaultLayoutIds, [category]: modelId };
        setDefaultLayoutIds(newDefaults);
        localStorage.setItem('default_label_layout_ids', JSON.stringify(newDefaults));
        toast.info('Modelo definido como padrão para esta categoria.');
    };

    const handleDeleteLayout = async (modelId: string) => {
        const isSystemDefault = DEFAULT_LAYOUT_MODELS.some(m => m.id === modelId);
        
        const confirmMsg = isSystemDefault 
            ? 'Este é um modelo padrão de fábrica. Deseja ocultá-lo da lista?' 
            : 'Tem certeza que deseja excluir permanentemente este modelo de etiqueta?';

        if (!window.confirm(confirmMsg)) return;

        if (isSystemDefault) {
            // Não deleta do código, apenas oculta localmente
            const updated = [...hiddenDefaultIds, modelId];
            setHiddenDefaultIds(updated);
            localStorage.setItem('hidden_default_layout_ids', JSON.stringify(updated));
            toast.info('Modelo ocultado da lista.');
        } else {
            // Layout customizado: deleta do Supabase
            try {
                const { error } = await supabase
                    .from('label_layouts')
                    .delete()
                    .eq('id', modelId);

                const updated = customLayouts.filter(m => m.id !== modelId);
                setCustomLayouts(updated);
                localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
                
                if (!error) {
                    toast.success('Layout excluído com sucesso!');
                } else {
                    toast.warning('Removido localmente (erro ao sincronizar com banco).');
                }
            } catch (e) {
                console.error(e);
            }
        }

        // Se o modelo excluído for o atual, reseta para o primeiro disponível
        if (config.layoutId === modelId) {
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const available = models.filter(m => 
                m.id !== modelId && !hiddenDefaultIds.includes(m.id) && m.category === selectedCategory
            );
            if (available.length > 0) {
                selectLayout(available[0]);
            }
        }
    };

    const handleCopyToCategory = (model: GridModel, targetCat: 'identificacao' | 'precos' | 'logos') => {
        const newModel = { 
            ...model, 
            id: `custom_${Date.now()}`, 
            category: targetCat,
            name: `${model.name} (Exportado)`
        };
        const updated = [...customLayouts, newModel];
        setCustomLayouts(updated);
        localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
        toast.success(`Copiado para ${targetCat === 'identificacao' ? 'Identificação' : targetCat === 'precos' ? 'Preços' : 'Logos'}`);
    };

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
        text: 'PRODUTO EXEMPLO',
        price: 'R$ 0,00',
        sku: 'SKU-001',
        qrContent: 'https://moveismorante.com.br',
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
    });

    // Resetar página quando a categoria muda ou a fila altera
    useEffect(() => {
        const totalCells = config.columns * config.rows;
        const count = selectedCategory === 'logos' 
            ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
            : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
        const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);

        if (currentPage >= totalPagesCount) {
            setCurrentPage(Math.max(0, totalPagesCount - 1));
        }
    }, [selectedCategory, labelItems, logoItems, config.columns, config.rows, currentPage]);

    useEffect(() => {
        fetchAllProducts();
    }, [productIdParam, location.state]);

    const fetchAllProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('deleted', false)
            .order('description', { ascending: true });

        if (data && !error) {
            const flattened: any[] = [];
            data.forEach((product: any) => {
                flattened.push({ ...product, isParent: product.hasVariations });
                if (product.hasVariations && product.variations) {
                    product.variations.forEach((v: any) => {
                        flattened.push({
                            ...product,
                            id: `${product.id}_${v.sku}`,
                            sku: v.sku,
                            description: v.syncDescription ? `${product.description} - ${v.name}` : v.name,
                            variationName: v.name,
                            unitPrice: v.unitPrice,
                            costPrice: v.costPrice,
                            stock: v.stock,
                            active: v.active,
                            images: v.images || [],
                            parentImages: product.images || [],
                            isVariation: true,
                            parentId: product.id,
                            categoryIds: product.categoryIds,
                            category: product.category,
                            unit: product.unit
                        });
                    });
                }
            });
            setProducts(flattened);
        }
    };

    const applyPresetWithConfig = (preset: LabelPreset, baseConfig: LabelConfig) => {
        const newConfig: LabelConfig = { ...baseConfig, preset };
        
        // Mapeamento de Categoria
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
                newConfig.layout = 'vertical';
                newConfig.showName = true;
                newConfig.showPrice = true;
                newConfig.showBarcode = false; // Desativado conforme pedido
                newConfig.showSKU = false;
                newConfig.showStoreLogo = false; // Desativado conforme pedido
                newConfig.showStoreName = false; // Removido StoreName também para limpar
                newConfig.showCustomText = false;
                break;
            case 'social_square':
                newConfig.type = 'rect';
                newConfig.layout = 'vertical';
                newConfig.showName = true;
                newConfig.showPrice = false;
                newConfig.showBarcode = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = true;
                break;
            case 'custom':
                newConfig.type = baseConfig.type === 'round' ? 'round' : 'rect';
                newConfig.layout = 'vertical';
                newConfig.showName = false;
                newConfig.showPrice = false;
                newConfig.showBarcode = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = false;
                break;
        }
        setConfig(newConfig);
    };

    const handleProductSelect = (product: Product) => {
        const variationName = (product as any).variation || (product as any).variationName || (product as any).name;
        let fullName = (product.description || '');
        if (product.isVariation && variationName && !fullName.includes(variationName)) {
            fullName = `${fullName} - ${variationName}`;
        }

        const newItem: LabelItemConfig = {
            name: fullName,
            // Sincronizar o preço cadastrado
            price: product.unitPrice ? formatCurrency(product.unitPrice) : 
                   (product as any).price ? formatCurrency((product as any).price) : 'R$ 0,00',
            promoPrice: '',
            sku: '', 
            quantity: 1
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
        } finally {
            setIsDownloading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (selectedCategory === 'logos') {
                    setLogoItems(prev => [...prev, { image: base64, quantity: 1, scale: 1 }]);
                } else {
                    setSelectedImage(base64);
                }
            };
            reader.readAsDataURL(file);
        }
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
                            <div className={`w-12 h-12 ${selectedCategory === 'identificacao' ? 'bg-slate-900 shadow-slate-900/20' : 'bg-blue-600 shadow-blue-500/20'} rounded-2xl flex items-center justify-center shadow-lg transition-all`}>
                                <i className={`bi ${selectedCategory === 'identificacao' ? 'bi-qr-code-scan' : 'bi-printer-fill'} text-white text-xl`} />
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
                        {/* Painel de Configuração - full width */}
                        <div className="space-y-6">
                            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Modelos de Etiqueta</h3>
                                    <button 
                                         onClick={() => {
                                             setEditingGridModel(null);
                                             setGridModalOpen(true);
                                         }}
                                         className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:scale-110 transition-all font-black text-xs uppercase"
                                     >
                                         <i className="bi bi-plus-lg mr-2" />Novo Modelo
                                     </button>
                                 </div>
                                 <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                     {layoutModels.map(model => (
                                         <div key={model.id} className="group relative hover:z-[60]">
                                             <button
                                                 onClick={() => selectLayout(model)}
                                                 className={`w-full flex items-center gap-4 p-3 rounded-2xl border-2 transition-all text-left ${
                                                     config.layoutId === model.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                                 }`}
                                             >
                                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${config.layoutId === model.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                     <i className={`bi ${model.icon}`} />
                                                 </div>
                                                 <div className="flex-1 overflow-hidden pr-16">
                                                     <div className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white truncate" title={model.name}>
                                                         {model.name}
                                                     </div>
                                                     <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                                                         <span className="px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 rounded-md text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase shrink-0">
                                                             {model.paperSize}
                                                         </span>
                                                         <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate">
                                                             M:{model.marginT} {model.marginB} {model.marginL} {model.marginR} | G:{model.gapH} {model.gapV}
                                                         </span>
                                                     </div>
                                                 </div>
                                             </button>
                                             
                                             <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                  {/* Set as Default */}
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); toggleDefaultLayout(model.id, selectedCategory!); }}
                                                      className={`w-7 h-7 rounded-lg border transition-all shadow-sm flex items-center justify-center ${
                                                          defaultLayoutIds[selectedCategory!] === model.id 
                                                              ? 'bg-yellow-400 border-yellow-500 text-white hover:bg-yellow-500' 
                                                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                                                      }`}
                                                      title="Definir como padrão"
                                                  >
                                                      <i className={`bi ${defaultLayoutIds[selectedCategory!] === model.id ? 'bi-star-fill' : 'bi-star'} text-[10px]`} />
                                                  </button>

                                                  {/* Duplicate */}
                                                 <button 
                                                     onClick={(e) => { e.stopPropagation(); handleDuplicateLayout(model); }}
                                                     className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                                                     title="Duplicar"
                                                 >
                                                     <i className="bi bi-files text-[10px]" />
                                                 </button>
                                                 
                                                 {/* Move/Copy to other category */}
                                                 <div className="relative group/copy">
                                                     <button 
                                                         className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-500 transition-all shadow-sm"
                                                         title="Enviar para outra categoria"
                                                     >
                                                         <i className="bi bi-arrow-right-short text-[14px]" />
                                                     </button>
                                                     <div className="absolute top-[80%] right-0 pt-2 hidden group-hover/copy:block z-[100] min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
                                                         <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden">
                                                             {(['identificacao', 'precos', 'logos'] as const).filter(c => c !== selectedCategory).map(cat => (
                                                                 <button 
                                                                     key={cat}
                                                                     onClick={(e) => { e.stopPropagation(); handleCopyToCategory(model, cat); }}
                                                                     className="w-full px-4 py-2.5 text-[9px] font-black uppercase text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                                                 >
                                                                     Copiar para {cat === 'identificacao' ? 'ID' : cat === 'precos' ? 'Preço' : 'Logos'}
                                                                 </button>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 </div>

                                                 {/* Edit */}
                                                 <button 
                                                     onClick={(e) => { e.stopPropagation(); setEditingGridModel(model); setGridModalOpen(true); }}
                                                     className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                                                     title="Editar"
                                                 >
                                                     <i className="bi bi-pencil-fill text-[10px]" />
                                                 </button>

                                                 {/* Excluir - aparece em todos os layouts */}
                                                 <button 
                                                     onClick={(e) => { e.stopPropagation(); handleDeleteLayout(model.id); }}
                                                     className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                                                     title="Excluir"
                                                 >
                                                     <i className="bi bi-trash-fill text-[10px]" />
                                                 </button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                            </section>

                            <div className="flex flex-col gap-10 items-stretch">
                                 {/* SEÇÃO DA FILA (PRODUTOS OU LOGOS) */}
                                 <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6 flex flex-col">
                                     <div className="flex items-center justify-between shrink-0">
                                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                             {selectedCategory === 'logos' ? 'Fila de Logos' : 'Produtos Selecionados'}
                                         </h3>
                                         <div className="flex items-center gap-3">
                                             {(selectedCategory === 'logos' ? logoItems.length > 0 : labelItems.length > 0) && (
                                                 <button 
                                                     onClick={() => {
                                                         if (window.confirm('Deseja limpar todos os itens da fila?')) {
                                                             if (selectedCategory === 'logos') setLogoItems([]);
                                                             else setLabelItems([]);
                                                         }
                                                     }}
                                                     className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors tracking-widest"
                                                 >
                                                     Limpar Fila
                                                 </button>
                                             )}
                                         </div>
                                     </div>

                                     <div className="space-y-6 shrink-0">
                                         {selectedCategory === 'logos' && (
                                             <div className="flex flex-col gap-2">
                                                 <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest block mb-2">Imagem da Etiqueta de Logotipo / Rótulo</label>
                                                 <button 
                                                     onClick={() => cellInputRef.current?.click()}
                                                     className="p-5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-[2rem] hover:bg-blue-100/50 transition-all font-black text-xs uppercase flex flex-col items-center gap-3 group"
                                                 >
                                                     <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                         <i className="bi bi-upload text-xl" />
                                                     </div>
                                                     Adicionar Nova Imagem
                                                 </button>
                                             </div>
                                         )}

                                         {selectedCategory !== 'logos' && (
                                             <div className="relative group/add">
                                                 <div className="flex flex-col gap-2">
                                                     <div className="relative">
                                                         <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                                         <select 
                                                             onChange={(e) => {
                                                                 const p = products.find(prod => String(prod.id) === e.target.value);
                                                                 if (p) handleProductSelect(p);
                                                                 e.target.value = ""; // Reset select
                                                             }}
                                                             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl pl-10 pr-12 py-3 text-[11px] font-black uppercase appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all group-hover/add:border-blue-500"
                                                         >
                                                             <option value="">Buscar Produto p/ Adicionar...</option>
                                                             {products.map(p => (
                                                                 <option key={p.id} value={String(p.id)}>{p.description}</option>
                                                             ))}
                                                         </select>
                                                         <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[10px] pointer-events-none">
                                                             <i className="bi bi-plus-lg" />
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}
                                     </div>

                                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                                         <div className="space-y-4">
                                             {selectedCategory === 'logos' ? (
                                                 logoItems.map((item, idx) => (
                                                     <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                         <div className="w-20 h-20 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                                                             <img src={item.image} style={{ transform: `scale(${item.scale || 1})` }} className="max-w-[80%] max-h-[80%] object-contain transition-transform" alt="Logo Preview" />
                                                         </div>
                                                         <div className="flex-1 space-y-3">
                                                             <h4 className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-tight">
                                                                 {item.name || `Imagem #${idx + 1}`}
                                                             </h4>
                                                             <div className="flex items-center gap-4">
                                                                 <div className="flex-1">
                                                                     <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Qtd. Etiquetas</label>
                                                                     <input 
                                                                         type="number" 
                                                                         min="1"
                                                                         value={item.quantity}
                                                                         onChange={e => {
                                                                             const newItems = [...logoItems];
                                                                             newItems[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                                                             setLogoItems(newItems);
                                                                         }}
                                                                         className="w-full bg-slate-900 text-white border-0 rounded-xl px-4 py-2 text-[11px] font-black text-center outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                     />
                                                                 </div>
                                                                 <div className="flex-1">
                                                                     <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Escala ({Math.round((item.scale || 1) * 100)}%)</label>
                                                                     <input 
                                                                         type="range" 
                                                                         min="0.1"
                                                                         max="2.0"
                                                                         step="0.1"
                                                                         value={item.scale || 1}
                                                                         onChange={e => {
                                                                             const newItems = [...logoItems];
                                                                             newItems[idx].scale = parseFloat(e.target.value);
                                                                             setLogoItems(newItems);
                                                                         }}
                                                                         className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                                     />
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         <button 
                                                             onClick={() => setLogoItems(prev => prev.filter((_, i) => i !== idx))}
                                                             className="w-12 h-12 rounded-[1.2rem] bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                         >
                                                             <i className="bi bi-trash3-fill text-lg" />
                                                         </button>
                                                     </div>
                                                 ))
                                             ) : (
                                                 labelItems.map((item, idx) => (
                                                     <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                         <div className="flex justify-between items-start">
                                                             <div className="flex-1">
                                                                 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Título do Produto</label>
                                                                 <input 
                                                                     type="text" 
                                                                     value={item.name}
                                                                     onChange={e => {
                                                                         const newItems = [...labelItems];
                                                                         newItems[idx].name = e.target.value;
                                                                         setLabelItems(newItems);
                                                                     }}
                                                                     className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-blue-500/30"
                                                                 />
                                                             </div>
                                                             <button 
                                                                 onClick={() => setLabelItems(prev => prev.filter((_, i) => i !== idx))}
                                                                 className="ml-3 w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xs"
                                                             >
                                                                 <i className="bi bi-x-lg" />
                                                             </button>
                                                         </div>

                                                         <div className="grid grid-cols-2 gap-3">
                                                             <div>
                                                                 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Preço</label>
                                                                 <input 
                                                                     type="text" 
                                                                     value={item.price}
                                                                     onChange={e => {
                                                                         const newItems = [...labelItems];
                                                                         newItems[idx].price = e.target.value;
                                                                         setLabelItems(newItems);
                                                                     }}
                                                                     className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black text-blue-600 outline-none"
                                                                 />
                                                             </div>
                                                             <div>
                                                                 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Promo (Opcional)</label>
                                                                 <input 
                                                                     type="text" 
                                                                     value={item.promoPrice || ''}
                                                                     placeholder="R$ 0,00"
                                                                     onChange={e => {
                                                                         const newItems = [...labelItems];
                                                                         newItems[idx].promoPrice = e.target.value;
                                                                         setLabelItems(newItems);
                                                                     }}
                                                                     className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black text-emerald-600 outline-none"
                                                                 />
                                                             </div>
                                                         </div>

                                                         <div className="grid grid-cols-2 gap-3">
                                                             <div>
                                                                 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Código / SKU</label>
                                                                 <input 
                                                                     type="text" 
                                                                     value={item.sku}
                                                                     onChange={e => {
                                                                         const newItems = [...labelItems];
                                                                         newItems[idx].sku = e.target.value;
                                                                         setLabelItems(newItems);
                                                                     }}
                                                                     className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black outline-none"
                                                                 />
                                                             </div>
                                                             <div>
                                                                 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Qtd. Etiquetas</label>
                                                                 <input 
                                                                     type="number" 
                                                                     min="1"
                                                                     value={item.quantity}
                                                                     onChange={e => {
                                                                         const newItems = [...labelItems];
                                                                         newItems[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                                                         setLabelItems(newItems);
                                                                     }}
                                                                     className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-[10px] font-black outline-none"
                                                                 />
                                                             </div>
                                                         </div>
                                                     </div>
                                                 ))
                                             )}
                                             {(selectedCategory === 'logos' ? logoItems.length === 0 : labelItems.length === 0) && (
                                                 <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                                                     <i className="bi bi-arrow-up-circle text-4xl mb-4 opacity-10" />
                                                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Adicione itens para começar</p>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 </section>

                                 {/* SEÇÃO DO RESULTADO FINAL (Abaixo da Fila, Full Width) */}
                                 <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col items-center animate-fade-in">
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

                                     {selectedCategory === 'precos' && (
                                         <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl text-[10px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-3 w-full">
                                             <i className="bi bi-info-circle-fill text-lg" />
                                             <span>Use o zoom para conferir detalhes. A impressão sairá em alta definição.</span>
                                         </div>
                                     )}

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
                                                     const count = selectedCategory === 'logos' 
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
                                                     config={config} 
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
                    const count = selectedCategory === 'logos' 
                        ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                        : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                    const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);

                    return Array.from({ length: totalPagesCount }).map((_, pageIdx) => (
                        <div key={pageIdx} style={{ pageBreakAfter: 'always' }}>
                            <LabelGrid 
                                config={config} 
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
                onSave={async (newModel) => {
                    // 1. Resolver conflito de nome com sufixos alfabéticos
                    let finalName = newModel.name;
                    const allCurrentModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
                    const categoryModels = allCurrentModels.filter(m => 
                        m.category === selectedCategory && 
                        m.id !== (editingGridModel?.id || '')
                    );

                    let suffixCode = 0; // 0 = sem sufixo, 1 = A, 2 = B...
                    const getCandidateName = (code: number) => {
                        if (code === 0) return finalName;
                        return `${finalName} - ${String.fromCharCode(64 + code)}`;
                    };

                    while (categoryModels.some(m => m.name === getCandidateName(suffixCode))) {
                        suffixCode++;
                    }
                    finalName = getCandidateName(suffixCode);

                    const modelToSave = { ...newModel, name: finalName, category: selectedCategory as any };
                    
                    // 2. Lógica de Persistência no Supabase
                    const dbModel = {
                        name: modelToSave.name,
                        category: modelToSave.category,
                        columns: modelToSave.columns,
                        rows: modelToSave.rows,
                        margin_t: modelToSave.marginT,
                        margin_b: modelToSave.marginB,
                        margin_l: modelToSave.marginL,
                        margin_r: modelToSave.marginR,
                        gap_h: modelToSave.gapH,
                        gap_v: modelToSave.gapV,
                        paper_size: modelToSave.paperSize,
                        paper_width: modelToSave.paperWidth,
                        paper_height: modelToSave.paperHeight,
                        icon: modelToSave.icon,
                        type: modelToSave.type,
                        name_font_size: Math.round(modelToSave.nameFontSize || 7),
                        name_color: modelToSave.nameColor,
                        price_font_size: Math.round(modelToSave.priceFontSize || 11),
                        price_color: modelToSave.priceColor,
                        promo_font_size: Math.round(modelToSave.promoFontSize || 9),
                        promo_color: modelToSave.promoColor,
                        name_pos_x: Math.round(modelToSave.namePosX ?? 50),
                        name_pos_y: Math.round(modelToSave.namePosY ?? 30),
                        price_pos_x: Math.round(modelToSave.pricePosX ?? 50),
                        price_pos_y: Math.round(modelToSave.pricePosY ?? 60),
                        promo_pos_x: Math.round(modelToSave.promoPosX ?? 50),
                        promo_pos_y: Math.round(modelToSave.promoPosY ?? 75),
                        barcode_pos_x: Math.round(modelToSave.barcodePosX ?? 50),
                        barcode_pos_y: Math.round(modelToSave.barcodePosY ?? 90),
                        price_font_size_hundreds: modelToSave.priceFontSizeHundreds ? Math.round(modelToSave.priceFontSizeHundreds) : null,
                        price_font_size_thousands: modelToSave.priceFontSizeThousands ? Math.round(modelToSave.priceFontSizeThousands) : null,
                        promo_price_color: modelToSave.promoPriceColor,
                        old_price_color: modelToSave.oldPriceColor,
                        promo_price_font_size: Math.round(modelToSave.promoPriceFontSize || 24),
                        name_width: Math.round(modelToSave.nameWidth || 80),
                        name_height: Math.round(modelToSave.nameHeight || 20),
                        price_width: Math.round(modelToSave.priceWidth || 80),
                        price_height: Math.round(modelToSave.priceHeight || 30),
                        promo_width: Math.round(modelToSave.promoWidth || 80),
                        promo_height: Math.round(modelToSave.promoHeight || 40),
                        name_bold: modelToSave.nameBold,
                        name_align: modelToSave.nameAlign,
                        name_valign: modelToSave.nameVAlign,
                        price_bold: modelToSave.priceBold,
                        price_align: modelToSave.priceAlign,
                        price_valign: modelToSave.priceVAlign,
                        promo_bold: modelToSave.promoBold,
                        promo_align: modelToSave.promoAlign,
                        promo_valign: modelToSave.promoVAlign,
                        promo_price_bold: modelToSave.promoPriceBold,
                        promo_price_align: modelToSave.promoPriceAlign,
                        promo_price_valign: modelToSave.promoPriceVAlign,
                        old_price_bold: modelToSave.oldPriceBold,
                        old_price_font_size: Math.round(modelToSave.oldPriceFontSize || 7),
                        old_price_align: modelToSave.oldPriceAlign,
                        old_price_valign: modelToSave.oldPriceVAlign,
                        bg_color: modelToSave.bg_color,
                        name_bg_color: modelToSave.nameBgColor,
                        price_bg_color: modelToSave.priceBgColor,
                        promo_bg_color: modelToSave.promoBgColor,
                    };

                    let resultData: any = null;
                    let resultError: any = null;

                    const isSystemDefault = DEFAULT_LAYOUT_MODELS.some(m => m.id === editingGridModel?.id);
                    const isUpdating = editingGridModel?.id && !isSystemDefault && !String(editingGridModel.id).startsWith('custom_');

                    if (isUpdating) {
                        const { data, error } = await supabase
                            .from('label_layouts')
                            .update(dbModel)
                            .eq('id', editingGridModel!.id)
                            .select()
                            .single();
                        resultData = data;
                        resultError = error;
                    } else {
                        const { data, error } = await supabase
                            .from('label_layouts')
                            .insert([dbModel])
                            .select()
                            .single();
                        resultData = data;
                        resultError = error;
                    }

                    if (resultData && !resultError) {
                        const saved = {
                            ...resultData,
                            marginT: resultData.margin_t,
                            marginB: resultData.margin_b,
                            marginL: resultData.margin_l,
                            marginR: resultData.margin_r,
                            gapH: resultData.gap_h,
                            gapV: resultData.gap_v,
                            paperWidth: resultData.paper_width,
                            paperHeight: resultData.paper_height,
                            nameFontSize: resultData.name_font_size,
                            nameColor: resultData.name_color,
                            priceFontSize: resultData.price_font_size,
                            priceColor: resultData.price_color,
                            promoFontSize: resultData.promo_font_size,
                            promoColor: resultData.promo_color,
                            nameWidth: resultData.name_width,
                            nameHeight: resultData.name_height,
                            priceWidth: resultData.price_width,
                            priceHeight: resultData.price_height,
                            promoWidth: resultData.promo_width,
                            promoHeight: resultData.promo_height,
                            namePosX: resultData.name_pos_x,
                            namePosY: resultData.name_pos_y,
                            pricePosX: resultData.price_pos_x,
                            pricePosY: resultData.price_pos_y,
                            promoPosX: resultData.promo_pos_x,
                            promoPosY: resultData.promo_pos_y,
                            barcodePosX: resultData.barcode_pos_x,
                            barcodePosY: resultData.barcode_pos_y,
                            nameBold: resultData.name_bold,
                            nameAlign: resultData.name_align,
                            nameVAlign: resultData.name_valign,
                            priceBold: resultData.price_bold,
                            priceAlign: resultData.price_align,
                            priceVAlign: resultData.price_valign,
                            promoBold: resultData.promo_bold,
                            promoAlign: resultData.promo_align,
                            promoVAlign: resultData.promo_valign,
                            promoPriceBold: resultData.promo_price_bold,
                            promoPriceAlign: resultData.promo_price_align,
                            promoPriceVAlign: resultData.promo_price_valign,
                            oldPriceBold: resultData.old_price_bold,
                            oldPriceFontSize: resultData.old_price_font_size,
                            oldPriceAlign: resultData.old_price_align,
                            oldPriceVAlign: resultData.old_price_valign,
                            priceFontSizeHundreds: resultData.price_font_size_hundreds,
                            priceFontSizeThousands: resultData.price_font_size_thousands,
                            promoPriceColor: resultData.promo_price_color,
                            oldPriceColor: resultData.old_price_color,
                            promoPriceFontSize: resultData.promo_price_font_size,
                            bg_color: resultData.bg_color,
                            nameBgColor: resultData.name_bg_color,
                            priceBgColor: resultData.price_bg_color,
                            promoBgColor: resultData.promo_bg_color,
                        };
                        
                        let updatedCustom;
                        if (isUpdating) {
                            updatedCustom = customLayouts.map(m => m.id === editingGridModel!.id ? saved : m);
                        } else {
                            updatedCustom = [...customLayouts.filter(l => l.id !== editingGridModel?.id), saved];
                        }
                        
                        setCustomLayouts(updatedCustom);
                        localStorage.setItem('custom_label_layouts', JSON.stringify(updatedCustom));
                        
                        if (editingGridModel?.id === config.layoutId || config.layoutId === saved.id) {
                            selectLayout(saved);
                        }

                        toast.success('Modelo salvo com sucesso no banco!');
                    } else {
                        console.error('Erro ao salvar no Supabase:', resultError);
                        toast.error(`Erro ao salvar no banco: ${resultError?.message || 'Erro desconhecido'}`);
                        // Não fazemos o fallback local para custom_id para não enganar o usuário
                    }
                    
                    setGridModalOpen(false);
                    setEditingGridModel(null);
                }}
            />
        </>
    );
};

export default LabelPrinting;
