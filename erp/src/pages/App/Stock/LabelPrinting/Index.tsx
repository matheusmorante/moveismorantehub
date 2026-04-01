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
    oldPriceColor: string;
    promoPriceColor: string;
    productNameColor: string;
    layoutId?: string;
    paperSize: string;
    paperWidth?: number;
    paperHeight?: number;
    nameFontSize: number;
    priceFontSize: number;
    promoPriceFontSize: number;
    labelWidth?: number;
    labelHeight?: number;
    category: string;
}

const DEFAULT_LAYOUT_MODELS: GridModel[] = [
    // Identificação
    { id: '1x1_std', name: '1 Etiqueta (1x1)', columns: 1, rows: 1, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 0, gapV: 0, icon: 'bi-square', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '2x2_std', name: '4 Etiquetas (2x2)', columns: 2, rows: 2, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 10, gapV: 10, icon: 'bi-grid-fill', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '2x3_std', name: '6 Etiquetas (2x3)', columns: 2, rows: 3, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-1x2', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    { id: '3x3_std', name: '9 Etiquetas (3x3)', columns: 3, rows: 3, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 5, icon: 'bi-grid-3x3', paperSize: 'A4', category: 'identificacao', type: 'rect' },
    
    // Preços (Gôndola)
    { id: 'preco_1x1', name: '1 Etiqueta (1x1)', columns: 1, rows: 1, marginT: 20, marginB: 20, marginL: 20, marginR: 20, gapH: 0, gapV: 0, icon: 'bi-card-text', paperSize: 'A4', category: 'precos', type: 'rect' },
    { id: 'preco_2x4', name: '8 Etiquetas (2x4)', columns: 2, rows: 4, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 5, gapV: 10, icon: 'bi-tags', paperSize: 'A4', category: 'precos', type: 'rect' },
    { id: 'preco_3x7', name: '21 Etiquetas (3x7)', columns: 3, rows: 7, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 2, gapV: 2, icon: 'bi-grid-3x3-gap', paperSize: 'A4', category: 'precos', type: 'rect' },

    // Logos e Rótulos (Redondos ou Retangulares)
    { id: 'logo_round_3x3', name: '9 Etiquetas (Redonda) (3x3)', columns: 3, rows: 3, marginT: 15, marginB: 15, marginL: 15, marginR: 15, gapH: 10, gapV: 10, icon: 'bi-circle', paperSize: 'A4', category: 'logos', type: 'round' },
    { id: 'logo_rect_2x2', name: '4 Etiquetas (Retangular) (2x2)', columns: 2, rows: 2, marginT: 10, marginB: 10, marginL: 10, marginR: 10, gapH: 10, gapV: 10, icon: 'bi-square', paperSize: 'A4', category: 'logos', type: 'rect' },

    // Posts para Redes Sociais
    { id: 'post_square', name: 'Post Individual (1x1)', columns: 1, rows: 1, marginT: 0, marginB: 0, marginL: 0, marginR: 0, gapH: 0, gapV: 0, icon: 'bi-instagram', paperSize: 'A4', category: 'posts', type: 'rect' },
];

const LabelPrinting: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const gridRef = useRef<HTMLDivElement>(null);

    const productIdParam = searchParams.get('productId');
    const isProductContext = !!location.state?.product || !!productIdParam;

    const [selectedCategory, setSelectedCategory] = useState<'identificacao' | 'precos' | 'logos' | 'posts' | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(0.5);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [cellImages, setCellImages] = useState<Record<number, string>>({});
    const cellInputRef = useRef<HTMLInputElement>(null);
    const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);
    const [layoutModalOpen, setLayoutModalOpen] = useState(false);
    const [gridModalOpen, setGridModalOpen] = useState(false); 
    const [editingGridModel, setEditingGridModel] = useState<GridModel | null>(null);
    const [customLayouts, setCustomLayouts] = useState<GridModel[]>([]);
    
    // Estados de lista e paginação
    const [labelItems, setLabelItems] = useState<LabelItemConfig[]>([]);
    const [logoItems, setLogoItems] = useState<LogoItemConfig[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('custom_label_layouts');
        if (saved) {
            try {
                setCustomLayouts(JSON.parse(saved));
            } catch (e) {
                console.error("Erro ao carregar layouts customizados", e);
            }
        }
    }, []);

    const layoutModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts].filter(m => m.category === selectedCategory);

    const handleDuplicateLayout = (model: GridModel) => {
        const newModel = { 
            ...model, 
            id: `custom_${Date.now()}`, 
            name: `${model.name} (Cópia)` 
        };
        const updated = [...customLayouts, newModel];
        setCustomLayouts(updated);
        localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
        toast.success('Layout duplicado!');
    };

    const handleDeleteLayout = (modelId: string) => {
        if (!modelId.startsWith('custom_')) {
            toast.error('Modelos padrão não podem ser excluídos.');
            return;
        }
        if (window.confirm('Tem certeza que deseja excluir permanentemente este modelo de layout?')) {
            const updated = customLayouts.filter(m => m.id !== modelId);
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout excluído.');
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
        promoPriceColor: '#2563eb',
        productNameColor: '#0f172a',
        nameFontSize: 10,
        category: 'identificacao',
        priceFontSize: 28,
        promoPriceFontSize: 24,
    });

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
                newConfig.showBarcode = false;
                newConfig.showSKU = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = true;
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
            price: product.unitPrice ? formatCurrency(product.unitPrice) : 'R$ 0,00',
            promoPrice: '',
            sku: '', // Padrão vazio conforme pedido
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
            <div className={`flex flex-col gap-10 max-w-7xl mx-auto py-8 px-6 min-h-screen no-print transition-all`}>
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
                        {/* Painel de Configuração (Esquerda) - 2/3 */}
                        <div className="lg:col-span-8 space-y-6">
                            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Opções de Layouts</h3>
                                    <button 
                                         onClick={() => {
                                             setEditingGridModel(null);
                                             setGridModalOpen(true);
                                         }}
                                         className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:scale-110 transition-all font-black text-xs uppercase"
                                     >
                                         <i className="bi bi-plus-lg mr-2" />Novo Layout
                                     </button>
                                 </div>
                                 <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                     {layoutModels.map(model => (
                                         <div key={model.id} className="group relative hover:z-[60]">
                                             <button
                                                 onClick={() => setConfig({
                                                     ...config,
                                                     layoutId: model.id,
                                                     columns: model.columns,
                                                     rows: model.rows,
                                                     marginT: model.marginT,
                                                     marginB: model.marginB,
                                                     marginL: model.marginL,
                                                     marginR: model.marginR,
                                                     gapH: model.gapH,
                                                     gapV: model.gapV,
                                                     paperSize: model.paperSize,
                                                     type: model.type || 'rect'
                                                 })}
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

                                                 {/* Delete (only for custom) */}
                                                 {model.id.startsWith('custom_') && (
                                                     <button 
                                                         onClick={(e) => { e.stopPropagation(); handleDeleteLayout(model.id); }}
                                                         className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                                                         title="Excluir"
                                                     >
                                                         <i className="bi bi-trash-fill text-[10px]" />
                                                     </button>
                                                 )}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                            </section>

                            {/* NOVA SEÇÃO: LISTA DE ITENS (PRODUTOS OU LOGOS) */}
                            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        {selectedCategory === 'logos' ? 'Fila de Impressão (Logos)' : 'Fila de Impressão (Produtos)'}
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
                                    </div>
                                </div>

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

                                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
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
                                                            <div className="flex items-center gap-3">
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
                                        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-slate-400">
                                            <i className="bi bi-list-check text-4xl mb-4 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">{selectedCategory === 'logos' ? 'Nenhum logo adicionado' : 'Busque um produto acima'}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {selectedCategory !== 'identificacao' && selectedCategory !== 'logos' && (
                                <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Ajustes Visuais Adicionais</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Cor do Texto</label>
                                                <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-2 items-center gap-2">
                                                    <input 
                                                        type="color" value={config.productNameColor} 
                                                        onChange={e => setConfig({...config, productNameColor: e.target.value})}
                                                        className="w-8 h-8 rounded-lg appearance-none border-none bg-transparent cursor-pointer"
                                                    />
                                                    <span className="text-[10px] font-bold font-monospace uppercase">{config.productNameColor}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Cor do Preço</label>
                                                <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-2 items-center gap-2">
                                                    <input 
                                                        type="color" value={config.promoPriceColor} 
                                                        onChange={e => setConfig({...config, promoPriceColor: e.target.value})}
                                                        className="w-8 h-8 rounded-lg appearance-none border-none bg-transparent cursor-pointer"
                                                    />
                                                    <span className="text-[10px] font-bold font-monospace uppercase">{config.promoPriceColor}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Preview da Folha (Direita) - 1/3 */}
                        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-8 self-start">
                            {selectedCategory === 'precos' && (
                                <div className="p-4 bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                                    <i className="bi bi-info-circle-fill text-blue-500" />
                                    <span>Arraste os marcadores azuis no preview para ajustar fontes.</span>
                                </div>
                            )}

                            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Resultado Final</h3>
                                        {(() => {
                                            const totalCells = config.columns * config.rows;
                                            const count = selectedCategory === 'logos' 
                                                ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                                                : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                                            const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
                                            return (
                                                <div className="hidden sm:flex px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl items-center gap-2 animate-in fade-in duration-500">
                                                    <i className="bi bi-layers-fill text-blue-500 text-[10px]" />
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                        {count} {count === 1 ? 'Etiqueta' : 'Etiquetas'} ({totalPagesCount} {totalPagesCount === 1 ? 'Folha' : 'Folhas'})
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleDownloadImage}
                                            disabled={isDownloading}
                                            className="p-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                        >
                                            <i className="bi bi-download mr-1" /> Imagem
                                        </button>
                                        <button 
                                            onClick={() => window.print()}
                                            className="p-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase transition-all"
                                        >
                                            <i className="bi bi-printer mr-1" /> Imprimir
                                        </button>
                                    </div>
                                </div>

                                <div 
                                    ref={previewContainerRef}
                                    className={`bg-slate-50 dark:bg-slate-950 rounded-[1.5rem] flex flex-col items-center border border-slate-100 dark:border-slate-800 relative transition-all duration-500 overflow-auto custom-scrollbar group/preview ${
                                        isPreviewFullscreen ? 'fixed inset-0 z-[200] rounded-none bg-white dark:bg-black p-10' : 'p-4'
                                    }`} 
                                    style={{ height: isPreviewFullscreen ? '100vh' : '620px' }}
                                >
                                    {/* Toolbar Flutuante de Preview */}
                                    <div className="sticky top-0 z-50 flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-1 p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
                                            {/* Paginação Integrada */}
                                            {(() => {
                                                const totalCells = config.columns * config.rows;
                                                const count = selectedCategory === 'logos' 
                                                    ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                                                    : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                                                const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
                                                
                                                return (
                                                    <div className="flex items-center gap-1 mr-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(0, prev - 1)); }}
                                                            disabled={currentPage === 0}
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 transition-all"
                                                            title="Folha Anterior"
                                                        >
                                                            <i className="bi bi-chevron-left" />
                                                        </button>
                                                        <div className="px-3 py-2 flex items-center gap-1.5 text-[10px] font-black text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                            <span className="text-blue-500">{String(currentPage + 1).padStart(2, '0')}</span>
                                                            <span className="text-slate-300 dark:text-slate-600">/</span>
                                                            <span className="text-slate-400">{String(totalPagesCount).padStart(2, '0')}</span>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPagesCount - 1, prev + 1)); }}
                                                            disabled={currentPage >= totalPagesCount - 1}
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 transition-all font-black text-lg"
                                                            title="Próxima Folha"
                                                        >
                                                            <i className="bi bi-chevron-right" />
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                                            <button 
                                                onClick={() => setPreviewZoom(prev => Math.max(0.1, prev - 0.1))}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all font-black text-lg"
                                                title="Diminuir Zoom"
                                            >
                                                <i className="bi bi-dash" />
                                            </button>
                                            <div 
                                                className="px-4 py-2 text-[10px] font-black uppercase text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
                                                onClick={() => setPreviewZoom(0.5)}
                                                title="Reset Zoom"
                                            >
                                                {Math.round(previewZoom * 100)}%
                                            </div>
                                            <button 
                                                onClick={() => setPreviewZoom(prev => Math.min(2.0, prev + 0.1))}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all font-black text-lg"
                                                title="Aumentar Zoom"
                                            >
                                                <i className="bi bi-plus" />
                                            </button>
                                            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                                            <button 
                                                onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black ${
                                                    isPreviewFullscreen ? 'bg-blue-500 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                                                }`}
                                                title={isPreviewFullscreen ? "Sair da Tela Cheia" : "Ver em Tela Cheia"}
                                            >
                                                <i className={`bi ${isPreviewFullscreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'} text-[12px]`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        transform: `scale(${previewZoom})`, 
                                        transformOrigin: 'top center',
                                        marginTop: '0mm',
                                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} className="relative mb-20">
                                        <div ref={gridRef} className="shadow-2xl relative bg-white">
                                            <LabelGrid 
                                                config={config} 
                                                image={selectedImage} 
                                                cellImages={cellImages}
                                                onCellClick={handleCellClick}
                                                labelItems={labelItems}
                                                logoItems={logoItems}
                                                currentPage={currentPage}
                                            />
                                            
                                            {/* Handles de Redimensionamento Interativo (Apenas quando visível) */}
                                            {selectedCategory === 'precos' && (
                                                <div className="absolute inset-0 pointer-events-none group/handles" style={{
                                                    top: `${config.marginT}mm`,
                                                    left: `${config.marginL}mm`,
                                                    width: `calc((100% - ${config.marginL + config.marginR}mm - ${config.gapH * (config.columns - 1)}mm) / ${config.columns})`,
                                                    height: `calc((100% - ${config.marginT + config.marginB}mm - ${config.gapV * (config.rows - 1)}mm) / ${config.rows})`,
                                                }}>
                                                    {config.showName && (
                                                        <div 
                                                            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 border-4 border-white rounded-full pointer-events-auto cursor-ns-resize shadow-xl opacity-0 group-hover/handles:opacity-100 transition-opacity flex items-center justify-center animate-pulse"
                                                            onMouseDown={(e) => handleResizeStart(e, 'name', config.nameFontSize)}
                                                        />
                                                    )}
                                                    {config.showPrice && (
                                                        <div 
                                                            className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full pointer-events-auto cursor-ns-resize shadow-xl opacity-0 group-hover/handles:opacity-100 transition-opacity flex items-center justify-center animate-pulse"
                                                            onMouseDown={(e) => handleResizeStart(e, 'price', config.priceFontSize)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Controles de Paginação */}
                                    {(() => {
                                        const totalCells = config.columns * config.rows;
                                        const count = selectedCategory === 'logos' 
                                            ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                                            : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                                        const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
                                        
                                        return (
                                            <>
                                            </>
                                        );
                                    })()}
                                </div>
                            </section>
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
                onSave={(newModel) => {
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

                    const modelWithUniqueName = { ...newModel, name: finalName };

                    // 2. Lógica de Persistência
                    let updated: GridModel[];
                    if (editingGridModel) {
                        const saveId = editingGridModel.id.startsWith('custom_') ? editingGridModel.id : `custom_${Date.now()}`;
                        const finalModel = { ...modelWithUniqueName, id: saveId, category: selectedCategory as any };
                        
                        if (editingGridModel.id.startsWith('custom_')) {
                            updated = customLayouts.map(m => m.id === saveId ? finalModel : m);
                        } else {
                            updated = [...customLayouts, finalModel];
                        }
                    } else {
                        updated = [...customLayouts, {...modelWithUniqueName, id: `custom_${Date.now()}`, category: selectedCategory as any}];
                    }
                    
                    const onlyCustom = updated.filter(m => m.id.startsWith('custom_'));
                    setCustomLayouts(onlyCustom);
                    localStorage.setItem('custom_label_layouts', JSON.stringify(onlyCustom));
                    setGridModalOpen(false);
                    setEditingGridModel(null);
                    toast.success('Layout salvo com sucesso!');
                }}
            />
        </>
    );
};

export default LabelPrinting;
