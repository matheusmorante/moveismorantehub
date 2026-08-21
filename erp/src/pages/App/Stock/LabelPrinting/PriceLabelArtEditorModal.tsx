import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { LabelConfig } from './LabelConstants';

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
    };
}

export const PriceLabelArtEditorModal: React.FC<PriceLabelArtEditorModalProps> = ({
    isOpen,
    onClose,
    config,
    onSaveConfig,
    initialProduct
}) => {
    // Form States
    const [title, setTitle] = useState(initialProduct?.name || config.text || 'COLCHÃO DE ESPUMA D28 LARGURA 88');
    const [normalPrice, setNormalPrice] = useState(initialProduct?.price || config.price || '499,00');
    const [promoPrice, setPromoPrice] = useState(initialProduct?.promoPrice || config.promoPrice || '399,00');
    const [installments, setInstallments] = useState('Em até 10x sem juros no cartão');
    const [technicalSpecs, setTechnicalSpecs] = useState('L 88cm · A 12cm · P 188cm');
    
    // Identidade da Loja
    const [brandName, setBrandName] = useState('MÓVEIS MORANTE');
    const [slogan, setSlogan] = useState('Qualidade que cabe no seu bolso');
    const [address, setAddress] = useState('RUA CASCAVEL, 306, GUARAITUBA, COLOMBO');

    // Ajustes Visuais
    const [showStoreLogo, setShowStoreLogo] = useState(true);
    const [showOfferBadge, setShowOfferBadge] = useState(true);
    const [showInstallments, setShowInstallments] = useState(true);
    const [bgColor, setBgColor] = useState(config.bg_color || '#ff7900');
    const [priceColor, setPriceColor] = useState(config.priceColor || '#1e3a8a');
    const [priceScale, setPriceScale] = useState<number>(100);

    // Estado de Seleção e Camadas (marketing style)
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [isLayersModalOpen, setIsLayersModalOpen] = useState(false);

    const priceLabelLayers = [
        { key: 'title', label: 'TÍTULO DO PRODUTO', icon: 'bi-fonts' },
        { key: 'promoPrice', label: 'PREÇO PRINCIPAL (POR:)', icon: 'bi-tag-fill' },
        { key: 'normalPrice', label: 'PREÇO ORIGINAL (DE:)', icon: 'bi-type-strikethrough' },
        { key: 'installments', label: 'PARCELAMENTO', icon: 'bi-credit-card-2-front-fill' },
        { key: 'technicalSpecs', label: 'MEDIDAS TÉCNICAS', icon: 'bi-aspect-ratio-fill' },
        { key: 'brand', label: 'NOME DA MARCA / LOGO', icon: 'bi-shop' },
        { key: 'slogan', label: 'SLOGAN DA LOJA', icon: 'bi-chat-quote-fill' },
        { key: 'address', label: 'ENDEREÇO NO RODAPÉ', icon: 'bi-geo-alt-fill' },
    ];

    const previewRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

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

    const getCentsPart = (val: string) => {
        const clean = formatDisplayPrice(val);
        const parts = clean.split(',');
        return parts[1] !== undefined ? `,${parts[1].padEnd(2, '0').slice(0, 2)}` : ',00';
    };

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
        onSaveConfig({
            text: title,
            price: normalPrice,
            promoPrice: promoPrice,
            showPromoPrice: true,
            bg_color: bgColor,
            priceColor: priceColor,
            promoPriceColor: priceColor,
            priceFormat: 'split',
            showName: true,
        });
        toast.success('Arte da etiqueta de preço salva e aplicada com sucesso!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
                            <i className="bi bi-palette-fill text-lg" />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">
                                EDITOR DE ARTE DA ETIQUETA DE PREÇO
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                                {title || 'Personalize os dados e o design promocional da etiqueta de preço'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toast.info('Ação desfeita')} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors">
                            <i className="bi bi-arrow-counterclockwise text-sm" />
                        </button>
                        <button type="button" onClick={() => toast.info('Ação refeita')} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors">
                            <i className="bi bi-arrow-clockwise text-sm" />
                        </button>
                        <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                            <i className="bi bi-x-lg text-sm" />
                        </button>
                    </div>
                </div>

                {/* Toolbar Estilo Photoshop / Marketing */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 px-8 py-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsLayersModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm cursor-pointer"
                    >
                        <i className="bi bi-layers-fill text-blue-600" />
                        <span>Camadas</span>
                    </button>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                    <button
                        type="button"
                        onClick={() => setSelectedElement(null)}
                        disabled={!selectedElement}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            selectedElement
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                : 'text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <i className="bi bi-cursor-fill" />
                        <span>Limpar Seleção</span>
                    </button>

                    <span className="text-[10px] font-bold text-slate-400 ml-auto hidden sm:inline uppercase tracking-widest">
                        {selectedElement ? `Selecionado: ${priceLabelLayers.find(l => l.key === selectedElement)?.label}` : 'Nenhum elemento selecionado'}
                    </span>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: LIVE CANVA PREVIEW */}
                        <div className="lg:col-span-5 flex flex-col items-center gap-5 sticky top-0">
                            
                            {/* Canvas Wrapper */}
                            <div className="w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-inner">
                                <div 
                                    ref={previewRef}
                                    style={{ backgroundColor: bgColor }}
                                    className="w-full aspect-[1.8/1] rounded-2xl shadow-2xl relative p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 border-2 border-white/20"
                                >
                                    {/* Top Line: De R$ XXX por: */}
                                    <div className="flex items-center justify-between text-black font-black">
                                        <div className="flex items-center gap-1.5 text-sm md:text-base leading-none">
                                            <span>De</span>
                                            <span className="relative text-red-600 font-extrabold px-1">
                                                R$ {formatDisplayPrice(normalPrice)}
                                                <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-600 -translate-y-1/2 rounded-full" />
                                            </span>
                                            <span>por:</span>
                                        </div>

                                        {showOfferBadge && (
                                            <span className="px-2 py-0.5 bg-yellow-400 text-black text-[9px] font-black uppercase rounded-lg shadow-sm">
                                                OFERTA
                                            </span>
                                        )}
                                    </div>

                                    {/* Main Split Price (Integer + Currency + Cents) */}
                                    <div 
                                        style={{ transform: `scale(${priceScale / 100})` }}
                                        className="relative my-auto flex items-center justify-center w-full transition-transform duration-200"
                                    >
                                        {/* R$ Symbol Top Left */}
                                        <span className="absolute left-2 top-0 text-black font-black text-xl md:text-2xl leading-none">
                                            R$
                                        </span>

                                        {/* Big Integer Number */}
                                        <span 
                                            style={{ color: priceColor }}
                                            className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter drop-shadow-md leading-none my-1"
                                        >
                                            {getIntegerPart(promoPrice || normalPrice)}
                                        </span>

                                        {/* Cents Top Right */}
                                        <span className="absolute right-2 top-0 text-black font-black text-xl md:text-2xl leading-none">
                                            {getCentsPart(promoPrice || normalPrice)}
                                        </span>
                                    </div>

                                    {/* Footer Details: Installments / Specs / Brand */}
                                    <div className="flex flex-col gap-1 border-t border-black/10 pt-2 text-black">
                                        {showInstallments && installments && (
                                            <p className="text-[10px] font-black uppercase tracking-tight text-center leading-none">
                                                {installments}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-black/80">
                                            <span>{technicalSpecs}</span>
                                            {showStoreLogo && <span className="font-black text-black">{brandName}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons below Preview */}
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={handleCopyImage}
                                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                >
                                    <i className="bi bi-copy text-sm text-slate-400" />
                                    <span>COPIAR IMAGEM</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadPng}
                                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                >
                                    <i className="bi bi-download text-sm text-slate-400" />
                                    <span>BAIXAR PNG</span>
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: EDITOR FORM SECTIONS */}
                        <div className="lg:col-span-7 space-y-6">

                            {/* Section 1: Informações do Produto */}
                            <div className="p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
                                    <span className="text-xs font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-md">Aa</span>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                                        INFORMAÇÕES DO PRODUTO
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                            TÍTULO NA ETIQUETA
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="Ex: Colchão de Espuma D28..."
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                PREÇO NORMAL (DE:)
                                            </label>
                                            <input
                                                type="text"
                                                value={normalPrice}
                                                onChange={e => setNormalPrice(e.target.value)}
                                                placeholder="499,00"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                PREÇO PROMO (POR:)
                                            </label>
                                            <input
                                                type="text"
                                                value={promoPrice}
                                                onChange={e => setPromoPrice(e.target.value)}
                                                placeholder="399,00"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-blue-600 dark:text-blue-400"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                            PARCELAMENTO
                                        </label>
                                        <input
                                            type="text"
                                            value={installments}
                                            onChange={e => setInstallments(e.target.value)}
                                            placeholder="Em até 10x sem juros no cartão"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                            MEDIDAS TÉCNICAS
                                        </label>
                                        <input
                                            type="text"
                                            value={technicalSpecs}
                                            onChange={e => setTechnicalSpecs(e.target.value)}
                                            placeholder="L 88cm · A 12cm · P 188cm"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all text-slate-600 dark:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Identidade da Loja */}
                            <div className="p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                                    <i className="bi bi-shop text-sm" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                                        IDENTIDADE DA LOJA
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                NOME DA MARCA
                                            </label>
                                            <input
                                                type="text"
                                                value={brandName}
                                                onChange={e => setBrandName(e.target.value)}
                                                placeholder="MÓVEIS MORANTE"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                SLOGAN
                                            </label>
                                            <input
                                                type="text"
                                                value={slogan}
                                                onChange={e => setSlogan(e.target.value)}
                                                placeholder="Qualidade que cabe no seu bolso"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                            ENDEREÇO NO RODAPÉ
                                        </label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            placeholder="RUA CASCAVEL, 306, GUARAITUBA, COLOMBO"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all text-slate-600 dark:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Ajustes Visuais */}
                            <div className="p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400">
                                    <i className="bi bi-sliders text-sm" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                                        AJUSTES VISUAIS
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showStoreLogo}
                                            onChange={e => setShowStoreLogo(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">Nome da Marca</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showOfferBadge}
                                            onChange={e => setShowOfferBadge(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">Selo Oferta</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showInstallments}
                                            onChange={e => setShowInstallments(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">Parcelamento</span>
                                    </label>
                                </div>

                                {/* Color Themes Palette */}
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                        COR DE FUNDO DA ETIQUETA
                                    </label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {[
                                            { label: 'Laranja Oferta', bg: '#ff7900', text: '#1e3a8a' },
                                            { label: 'Amarelo Vivo', bg: '#eab308', text: '#000000' },
                                            { label: 'Vermelho Promo', bg: '#dc2626', text: '#ffffff' },
                                            { label: 'Azul Destaque', bg: '#2563eb', text: '#ffffff' },
                                            { label: 'Verde Especial', bg: '#16a34a', text: '#ffffff' },
                                            { label: 'Branco Padrão', bg: '#ffffff', text: '#1e293b' },
                                        ].map((theme) => (
                                            <button
                                                key={theme.label}
                                                type="button"
                                                onClick={() => {
                                                    setBgColor(theme.bg);
                                                    setPriceColor(theme.text);
                                                }}
                                                style={{ backgroundColor: theme.bg }}
                                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all cursor-pointer shadow-sm ${
                                                    bgColor === theme.bg 
                                                        ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' 
                                                        : 'border-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                <span style={{ color: theme.bg === '#ffffff' ? '#000' : (theme.bg === '#eab308' || theme.bg === '#ff7900' ? '#000' : '#fff') }}>
                                                    {theme.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Slider para Tamanho do Preço */}
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        <span>TAMANHO DO PREÇO PRINCIPAL</span>
                                        <span className="text-blue-600 dark:text-blue-400">{priceScale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="60"
                                        max="150"
                                        value={priceScale}
                                        onChange={e => setPriceScale(parseInt(e.target.value))}
                                        className="w-full accent-pink-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-8 py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                        <i className="bi bi-cloud-upload-fill text-sm" />
                        <span>SALVAR & PUBLICAR ARTE</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PriceLabelArtEditorModal;
