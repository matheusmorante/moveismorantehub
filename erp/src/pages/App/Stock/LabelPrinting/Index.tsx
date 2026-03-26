import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Product from '../../../types/product.type';
import { saveInventoryMove } from '../../../../pages/utils/inventoryService';
import { supabase } from '@/pages/utils/supabaseConfig';
import LabelGrid from './LabelGrid';
import { formatCurrency, slugify } from '../../../utils/formatters';
import logoMorante from '../../../../assets/logo.jpeg';
import labelMdf from '../../../../assets/label_mdf.png';

export type LabelType = 'round' | 'rect';
export type LabelPreset = 'mdf' | 'store_logo' | 'qr_product' | 'price_only' | 'custom';
export type LabelLayout = 'vertical' | 'horizontal' | 'image-focus';

export interface LabelConfig {
    type: LabelType;
    preset: LabelPreset;
    layout: LabelLayout;
    showName: boolean;
    showPrice: boolean;
    showQR: boolean;
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
    // Margins & Gaps (in mm)
    marginT: number;
    marginB: number;
    marginL: number;
    marginR: number;
    gapH: number;
    gapV: number;
}

const LabelPrinting: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const gridRef = useRef<HTMLDivElement>(null);

    const productIdParam = searchParams.get('productId');
    const isDesignMode = location.pathname.includes('/design');
    const isProductContext = !!location.state?.product || !!productIdParam;

    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [stockInput, setStockInput] = useState<string>('');
    const [justificationInput, setJustificationInput] = useState<string>('Entrada via Etiquetas');
    const [updatingStock, setUpdatingStock] = useState(false);
    const [cellImages, setCellImages] = useState<Record<number, string>>({});
    const cellInputRef = useRef<HTMLInputElement>(null);
    const [activeCellIndex, setActiveCellIndex] = useState<number | null>(null);

    const [config, setConfig] = useState<LabelConfig>({
        type: isProductContext ? 'rect' : 'round',
        preset: isProductContext ? 'qr_product' : 'store_logo',
        layout: isProductContext ? 'horizontal' : 'vertical',
        showName: isProductContext,
        showPrice: false,
        showQR: isProductContext,
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
        // Default values as per user request for round labels (in mm)
        marginT: 8,
        marginB: 8,
        marginL: 9,
        marginR: 9,
        gapH: 10,
        gapV: 2
    });

    useEffect(() => {
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('deleted', false)
                .order('description', { ascending: true });

            if (data && !error) {
                // Transform data into flattened list (Parent + Variations)
                const flattened: any[] = [];
                data.forEach((product: any) => {
                    // Base Product/Parent
                    flattened.push({ ...product, isParent: product.hasVariations });

                    // Variations
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
                
                // If we came from a specific product via state or param
                const stateProduct = location.state?.product as Product;
                const targetProductId = productIdParam || stateProduct?.id;

                if (targetProductId) {
                    // Try to find in flattened list
                    const product = flattened.find(p => p.id === targetProductId);
                    if (product) {
                        handleProductSelect(product);
                    } else if (stateProduct) {
                        // Fallback: use state product directly if not found in list
                        handleProductSelect(stateProduct);
                    }
                }
            }
        };
        fetchProducts();
    }, [productIdParam, location.state]);

    const applyPresetWithConfig = (preset: LabelPreset, baseConfig: LabelConfig) => {
        const newConfig = { ...baseConfig, preset };
        
        switch (preset) {
            case 'mdf':
                newConfig.type = 'round';
                newConfig.layout = 'vertical';
                newConfig.showName = false;
                newConfig.showPrice = false;
                newConfig.showQR = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = false;
                setSelectedImage(labelMdf);
                newConfig.imageScale = 1;
                break;
            case 'store_logo':
                newConfig.type = 'round';
                newConfig.layout = 'vertical';
                newConfig.showName = false;
                newConfig.showPrice = false;
                newConfig.showQR = false;
                newConfig.showStoreLogo = true;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = false;
                if (selectedImage === labelMdf) setSelectedImage(null);
                break;
            case 'qr_product':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = false;
                newConfig.showQR = true;
                newConfig.showSKU = true;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showCustomText = false;
                if (selectedImage === labelMdf) setSelectedImage(null);
                break;
            case 'price_only':
                newConfig.type = 'rect';
                newConfig.layout = 'vertical';
                newConfig.showName = true;
                newConfig.showPrice = true;
                newConfig.showQR = false;
                newConfig.showSKU = true;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = true;
                newConfig.showCustomText = false;
                if (selectedImage === labelMdf) setSelectedImage(null);
                break;
            case 'custom':
                newConfig.type = baseConfig.type === 'round' ? 'round' : 'rect';
                newConfig.layout = 'vertical';
                newConfig.showName = false;
                newConfig.showPrice = false;
                newConfig.showQR = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = false;
                if (selectedImage === labelMdf) setSelectedImage(null);
                break;
        }
        setConfig(newConfig);
    };

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        const variationName = (product as any).variation || (product as any).variationName || (product as any).name;
        // Check if description already contains variation (it might if passed from useProducts)
        let fullName = (product.description || '');
        
        // If it's a variation but description doesn't have the variation name yet
        if (product.isVariation && variationName && !fullName.includes(variationName)) {
            fullName = `${fullName} - ${variationName}`;
        }

        const updatedConfig = {
            ...config,
            text: fullName,
            price: product.unitPrice ? formatCurrency(product.unitPrice) : '',
            sku: product.code || (product as any).sku || '',
            qrContent: `https://moveismorante.com.br/produto/${slugify(fullName)}`
        };
        
        setConfig(updatedConfig);
        if (product.images?.[0]) {
            setSelectedImage(product.images[0]);
        }
    };

    const handleQuickAction = (action: 'price_only' | 'qr_only' | 'full') => {
        if (action === 'price_only') {
            setConfig(prev => ({ ...prev, showPrice: true, showQR: false, showName: true, showSKU: true, showStoreLogo: false }));
        } else if (action === 'qr_only') {
            setConfig(prev => ({ ...prev, showPrice: false, showQR: true, showName: true, showSKU: true, showStoreLogo: false }));
        } else {
            setConfig(prev => ({ ...prev, showPrice: true, showQR: true, showName: true, showSKU: true, showStoreLogo: false }));
        }
    };

    const handleUpdateStock = async () => {
        if (!selectedProduct || !stockInput) return;
        
        const unitsToAdd = parseInt(stockInput);
        if (isNaN(unitsToAdd) || unitsToAdd <= 0) {
            toast.warning('Informe uma quantidade válida para entrada.');
            return;
        }

        setUpdatingStock(true);
        try {
            if (!selectedProduct.id) return;
            
            const currentStock = selectedProduct.stock || 0;
            
            await saveInventoryMove({
                productId: selectedProduct.id,
                productDescription: selectedProduct.description,
                type: 'entry',
                quantity: unitsToAdd,
                date: new Date().toISOString(),
                label: 'Ajuste Manual',
                observation: justificationInput || 'Entrada via Etiquetas'
            }, currentStock);
            
            setSelectedProduct({ ...selectedProduct, stock: currentStock + unitsToAdd });
            setStockInput('');
            
            toast.success(`Estoque atualizado! +${unitsToAdd} unidades.`, {
                position: "bottom-right"
            });
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            toast.error('Ocorreu um erro ao atualizar o estoque.');
        } finally {
            setUpdatingStock(false);
        }
    };
    
    const handleDownloadImage = async () => {
        if (!gridRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(gridRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `etiquetas-${selectedProduct?.description || 'geral'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Imagem gerada com sucesso!');
        } catch (error) {
            console.error('Erro ao baixar imagem:', error);
            toast.error('Erro ao gerar imagem.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (activeCellIndex !== null) {
                    setCellImages(prev => ({ ...prev, [activeCellIndex]: base64 }));
                    setActiveCellIndex(null);
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

    return (
        <>
            <div className="flex flex-col gap-10 max-w-7xl mx-auto py-8 px-6 min-h-screen no-print">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-slide-down">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                        {isDesignMode ? 'Identidade Visual' : 'Logística & Estoque'}
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {isDesignMode ? 'Gerador de Rótulos' : 'Etiquetas de Produto'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-500 mt-2 text-sm font-medium">
                        Personalize e imprima etiquetas profissionais com QR Code e Preços.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center p-4 bg-slate-100 whitespace-nowrap hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                    >
                        <i className="bi bi-arrow-left text-xl" />
                    </button>
                    <button 
                        onClick={handleDownloadImage}
                        disabled={isDownloading}
                        className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-black text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-download" />}
                        Salvar PNG
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                    >
                        <i className="bi bi-printer-fill" />
                        Imprimir Folha
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-4 flex flex-col gap-8 h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                    
                    {/* QUICK ACTIONS - ONLY FOR PRODUCTS */}
                    {isProductContext && (
                        <section className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/30 rounded-[2.5rem] p-6 shadow-xl shadow-blue-200/20 dark:shadow-none space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">⚡ Opções Rápidas</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleQuickAction('price_only')}
                                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-500 transition-all group"
                                >
                                    <i className="bi bi-tag-fill text-xl text-slate-400 group-hover:text-blue-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Com Preço</span>
                                </button>
                                <button 
                                    onClick={() => handleQuickAction('qr_only')}
                                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-500 transition-all group"
                                >
                                    <i className="bi bi-qr-code text-xl text-slate-400 group-hover:text-blue-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Apenas QR</span>
                                </button>
                            </div>
                        </section>
                    )}

                    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Modelos Disponíveis</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => applyPresetWithConfig('qr_product', config)}
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${config.preset === 'qr_product' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                            >
                                <div className="w-10 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <i className="bi bi-qr-code" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-100 tracking-tight">Identificação de Produto</h4>
                                    <p className="text-[9px] text-slate-500">Retangular / QR + Nome + SKU</p>
                                </div>
                            </button>

                            <button
                                onClick={() => applyPresetWithConfig('price_only', config)}
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${config.preset === 'price_only' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-orange-200'}`}
                            >
                                <div className="w-10 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                    <i className="bi bi-tag" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-100 tracking-tight">Etiqueta de Preço</h4>
                                    <p className="text-[9px] text-slate-500">Retangular / Preço + Nome + SKU</p>
                                </div>
                            </button>

                            <button
                                onClick={() => applyPresetWithConfig('mdf', config)}
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${config.preset === 'mdf' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <i className="bi bi-circle-fill" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-100 tracking-tight">Rótulo 100% MDF</h4>
                                    <p className="text-[9px] text-slate-500">Circular / Design Fixo</p>
                                </div>
                            </button>

                            <button
                                onClick={() => applyPresetWithConfig('store_logo', config)}
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${config.preset === 'store_logo' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                    <i className="bi bi-shop" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-100 tracking-tight">Logo da Loja</h4>
                                    <p className="text-[9px] text-slate-500">Circular / apenas logo</p>
                                </div>
                            </button>

                            <button
                                onClick={() => applyPresetWithConfig('custom', config)}
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${config.preset === 'custom' ? 'border-slate-800 bg-slate-50 dark:bg-slate-800/50' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600">
                                    <i className="bi bi-image" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-100 tracking-tight">Personalizado</h4>
                                    <p className="text-[9px] text-slate-500">Retangular ou Circular / Upload Livre</p>
                                </div>
                            </button>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Conteúdo & Personalização</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Nome do Produto</label>
                                <input 
                                    type="text" 
                                    value={config.text}
                                    onChange={e => setConfig({...config, text: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Preço</label>
                                    <input 
                                        type="text" 
                                        value={config.price}
                                        onChange={e => setConfig({...config, price: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-blue-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Código (SKU)</label>
                                    <input 
                                        type="text" 
                                        value={config.sku}
                                        onChange={e => setConfig({...config, sku: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Link do QR Code</label>
                                <input 
                                    type="text" 
                                    value={config.qrContent}
                                    onChange={e => setConfig({...config, qrContent: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-mono"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escala (Imagem ou Logo)</label>
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                        {Math.round((config.imageScale || 1) * 100)}%
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="5" 
                                    step="0.1"
                                    value={config.imageScale}
                                    onChange={e => setConfig({...config, imageScale: parseFloat(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
                                />
                                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span>Menor</span>
                                    <span>Padrão (100%)</span>
                                    <span>Maior</span>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <section>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Elementos Visíveis</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'showName', label: 'Nome' },
                                            { key: 'showPrice', label: 'Preço' },
                                            { key: 'showQR', label: 'QR Code' },
                                            { key: 'showSKU', label: 'SKU' },
                                            { key: 'showStoreName', label: 'Nome Loja' },
                                            { key: 'showStoreLogo', label: 'Logo Loja' }
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={(config as any)[item.key]} 
                                                    onChange={e => setConfig({...config, [item.key]: e.target.checked})} 
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-blue-500" 
                                                />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Formato & Layout</span>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            {(['round', 'rect'] as const).map(t => {
                                                const isRestricted = (config.preset === 'mdf' || config.preset === 'store_logo') && t === 'rect';
                                                const isRestrictedRect = (config.preset === 'qr_product' || config.preset === 'price_only') && t === 'round';
                                                
                                                if (isRestricted || isRestrictedRect) return null;

                                                return (
                                                    <button 
                                                        key={t}
                                                        onClick={() => setConfig({...config, type: t})}
                                                        className={`flex-1 px-2 py-3 rounded-xl border-2 text-[8px] font-black uppercase tracking-tighter transition-all ${config.type === t ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-200'}`}
                                                    >
                                                        {t === 'round' ? <><i className="bi bi-circle mr-1" /> Redondo</> : <><i className="bi bi-bounding-box mr-1" /> Retâng.</>}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {(['vertical', 'horizontal'] as const).map(l => (
                                                <button 
                                                    key={l}
                                                    onClick={() => setConfig({...config, layout: l})}
                                                    className={`px-2 py-3 rounded-xl border-2 text-[8px] font-black uppercase tracking-tighter transition-all ${config.layout === l ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-200'}`}
                                                >
                                                    {l === 'vertical' ? 'Vertical' : 'Horizontal'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                            <i className="bi bi-rulers text-xs" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Config. de Impressão (mm)</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Margem Topo</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={config.marginT} 
                                                        onChange={e => setConfig({...config, marginT: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <i className="bi bi-arrow-up-circle absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Margem Base</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={config.marginB} 
                                                        onChange={e => setConfig({...config, marginB: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <i className="bi bi-arrow-down-circle absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Margem Esq.</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={config.marginL} 
                                                        onChange={e => setConfig({...config, marginL: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <i className="bi bi-arrow-left-circle absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Margem Dir.</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={config.marginR} 
                                                        onChange={e => setConfig({...config, marginR: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <i className="bi bi-arrow-right-circle absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Espaço Horiz.</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={config.gapH} 
                                                        onChange={e => setConfig({...config, gapH: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <i className="bi bi-distribute-horizontal absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Espaço Vert.</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={config.gapV} 
                                                        onChange={e => setConfig({...config, gapV: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <i className="bi bi-distribute-vertical absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </section>

                    {selectedProduct && !isDesignMode && (
                        <section className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 rounded-[2.5rem] p-8 shadow-xl shadow-emerald-200/20 dark:shadow-none space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                <i className="bi bi-box-seam-fill" />
                                Entrada de Estoque
                            </h3>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Qtd entrada..." 
                                    value={stockInput}
                                    onChange={e => setStockInput(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                                />
                                <button 
                                    onClick={handleUpdateStock}
                                    disabled={updatingStock || !stockInput}
                                    className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {updatingStock ? <i className="bi bi-arrow-repeat animate-spin" /> : "OK"}
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-8">
                    {config.preset === 'custom' && (
                        <div className="mb-4 p-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                            <i className="bi bi-info-circle-fill text-blue-400" />
                            Toque em cada etiqueta para subir uma imagem diferente
                        </div>
                    )}
                    <div className="bg-slate-200 dark:bg-slate-950 rounded-[3rem] p-12 flex items-center justify-center shadow-inner overflow-auto min-h-[800px]">
                        <div className="bg-white shadow-2xl origin-top scale-[0.6] md:scale-[0.8] lg:scale-[1]" ref={gridRef}>
                            <LabelGrid 
                                config={config} 
                                image={selectedImage} 
                                cellImages={cellImages}
                                onCellClick={handleCellClick}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Input for per-cell upload */}
            <input 
                type="file" 
                ref={cellInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
            />

        </div>
            
            {/* Print Only View - FORA da div .no-print */}
            <div className="print-only fixed inset-0 bg-white z-[9999]">
                 <LabelGrid 
                    config={config} 
                    image={selectedImage} 
                    cellImages={cellImages} 
                />
            </div>
        </>
    );
};

export default LabelPrinting;
