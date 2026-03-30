import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Product from '../../../types/product.type';
import { saveInventoryMove } from '../../../../pages/utils/inventoryService';
import { supabase } from '@/pages/utils/supabaseConfig';
import LabelGrid from './LabelGrid';
import LabelModelCreationModal from './LabelModelCreationModal';
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
    const [layoutModalOpen, setLayoutModalOpen] = useState(false); // Modal de config por modelo
    const [creationModalOpen, setCreationModalOpen] = useState(false); // Modal de criação de modelo

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
                newConfig.showBarcode = false;
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
                newConfig.showBarcode = false;
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
                newConfig.showBarcode = true;
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
                newConfig.showBarcode = false;
                newConfig.showSKU = false;
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
                newConfig.showBarcode = false;
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
            qrContent: product.code || (product as any).sku || '' // Mudado de URL para SKU/Code
        };
        
        setConfig(updatedConfig);
        if (product.images?.[0]) {
            setSelectedImage(product.images[0]);
        }
    };

    const handleQuickAction = (action: 'price_only' | 'qr_only' | 'full') => {
        if (action === 'price_only') {
            setConfig(prev => ({ ...prev, showPrice: true, showBarcode: false, showName: true, showSKU: true, showStoreLogo: false }));
        } else if (action === 'qr_only') {
            setConfig(prev => ({ ...prev, showPrice: false, showBarcode: true, showName: true, showSKU: true, showStoreLogo: false }));
        } else {
            setConfig(prev => ({ ...prev, showPrice: true, showBarcode: true, showName: true, showSKU: true, showStoreLogo: false }));
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
                        Personalize e imprima etiquetas profissionais com Código de Barras e Preços.
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
                    
                    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Modelos Disponíveis</h3>
                            <button
                                onClick={() => setCreationModalOpen(true)}
                                title="Criar modelo personalizado com imagem"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-[9px] font-black uppercase tracking-widest"
                            >
                                <i className="bi bi-plus-circle-fill" />
                                Criar Modelo
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { preset: 'qr_product' as LabelPreset, label: 'Identificação de Produto', sub: 'Retangular / Barras + Nome + SKU', color: 'blue', icon: 'bi-qr-code', shape: 'rounded-lg', bg: 'blue' },
                                { preset: 'price_only' as LabelPreset, label: 'Etiqueta de Preço', sub: 'Retangular / Preço + Nome + SKU', color: 'orange', icon: 'bi-tag', shape: 'rounded-lg', bg: 'orange' },
                                { preset: 'mdf' as LabelPreset, label: 'Rótulo 100% MDF', sub: 'Circular / Design Fixo', color: 'emerald', icon: 'bi-circle-fill', shape: 'rounded-full', bg: 'emerald' },
                                { preset: 'store_logo' as LabelPreset, label: 'Logo da Loja', sub: 'Circular / apenas logo', color: 'indigo', icon: 'bi-shop', shape: 'rounded-full', bg: 'indigo' },
                                { preset: 'custom' as LabelPreset, label: 'Personalizado', sub: 'Retangular ou Circular / Upload Livre', color: 'slate', icon: 'bi-image', shape: 'rounded-xl', bg: 'slate' },
                            ].map(({ preset, label, sub, color, icon, shape, bg }) => (
                                <div key={preset} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                    config.preset === preset
                                        ? `border-${color}-500 bg-${color}-50/50 dark:bg-${color}-900/10`
                                        : 'border-slate-100 dark:border-slate-800'
                                }`}>
                                    <button
                                        onClick={() => applyPresetWithConfig(preset, config)}
                                        className="flex items-center gap-4 flex-1 text-left"
                                    >
                                        <div className={`w-10 h-10 ${shape} bg-${bg}-100 dark:bg-${bg}-900/30 flex items-center justify-center text-${bg}-600 shrink-0`}>
                                            <i className={`bi ${icon}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-100 tracking-tight">{label}</h4>
                                            <p className="text-[9px] text-slate-500">{sub}</p>
                                        </div>
                                    </button>
                                    {/* Botão engrenagem: abre modal de config do modelo ativo */}
                                    {config.preset === preset && (
                                        <button
                                            onClick={() => setLayoutModalOpen(true)}
                                            title="Configurar layout e escala"
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                        >
                                            <i className="bi bi-gear-fill text-sm" />
                                        </button>
                                    )}
                                </div>
                            ))}
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Conteúdo das Barras (SKU/EAN)</label>
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
            {/* Modal de Configuração de Layout por Modelo */}
            {layoutModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setLayoutModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Configuração do Modelo</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Layout, Escala e Margens</p>
                            </div>
                            <button onClick={() => setLayoutModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <i className="bi bi-x-lg text-lg" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Layout: só para modelos rect */}
                            {(config.preset === 'qr_product' || config.preset === 'price_only' || config.preset === 'custom') && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Layout dos Elementos</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['vertical', 'horizontal'] as const).map(l => (
                                            <button
                                                key={l}
                                                onClick={() => setConfig({...config, layout: l})}
                                                className={`px-4 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                    config.layout === l
                                                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                                        : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-blue-200'
                                                }`}
                                            >
                                                <i className={`bi ${l === 'vertical' ? 'bi-layout-text-window-reverse' : 'bi-layout-text-sidebar-reverse'}`} />
                                                {l === 'vertical' ? 'Vertical' : 'Horizontal'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Escala da imagem/logo */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escala (Imagem / Logo)</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min={50} max={500} step={1}
                                            value={Math.round((config.imageScale || 1) * 100)}
                                            onChange={e => setConfig({...config, imageScale: Math.max(0.5, Math.min(5, (parseInt(e.target.value) || 100) / 100))})}
                                            className="w-16 text-center text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                        <span className="text-[10px] font-black text-slate-400">%</span>
                                    </div>
                                </div>
                                <input
                                    type="range" min="0.5" max="5" step="0.05"
                                    value={config.imageScale}
                                    onChange={e => setConfig({...config, imageScale: parseFloat(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    <span>50%</span><span>100%</span><span>500%</span>
                                </div>
                            </div>
                            {/* Margens */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block flex items-center gap-2"><i className="bi bi-rulers" /> Margens e Espaçamento (mm)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'marginT', label: 'Topo', icon: 'bi-arrow-up-circle' },
                                        { key: 'marginB', label: 'Base', icon: 'bi-arrow-down-circle' },
                                        { key: 'marginL', label: 'Esq.', icon: 'bi-arrow-left-circle' },
                                        { key: 'marginR', label: 'Dir.', icon: 'bi-arrow-right-circle' },
                                        { key: 'gapH', label: 'Esp. Horiz.', icon: 'bi-distribute-horizontal' },
                                        { key: 'gapV', label: 'Esp. Vert.', icon: 'bi-distribute-vertical' },
                                    ].map(({ key, label, icon }) => (
                                        <div key={key} className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={(config as any)[key]}
                                                    onChange={e => setConfig({...config, [key]: parseFloat(e.target.value) || 0})}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold pl-8 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                                <i className={`bi ${icon} absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setLayoutModalOpen(false)}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200/50"
                            >
                                <i className="bi bi-check-circle mr-2" />Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Criação de Modelo */}
            <LabelModelCreationModal
                isOpen={creationModalOpen}
                onClose={() => setCreationModalOpen(false)}
                onApply={(imageDataUrl, scale) => {
                    setSelectedImage(imageDataUrl);
                    setConfig(prev => ({ ...prev, preset: 'custom', imageScale: scale, type: 'rect' }));
                }}
            />
            </>);
};

export default LabelPrinting;
