import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Product, { Variation } from '../../types/product.type';
import { saveVariation } from '@/pages/utils/productService';
import { toast } from "react-toastify";
import { generateProductCode } from '@/pages/utils/formatters';
import InitialStockList from './components/InitialStockList';

interface VariationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string;
    parentProduct: Product;
    variation: Variation | null;
    onSuccess?: () => void;
}

const VariationFormModal = ({ isOpen, onClose, parentId, parentProduct, variation, onSuccess }: VariationFormModalProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Variation | null>(null);

    useEffect(() => {
        if (variation) {
            setFormData({ ...variation });
        }
    }, [variation, isOpen]);

    useEffect(() => {
        if (!formData) return;
        const cost = formData.costPrice || 0;
        const freightVal = formData.freightCost || 0;
        const freightType = formData.freightType || 'fixed';

        let freightAmount = 0;
        if (freightType === 'percentage') {
            freightAmount = cost * (freightVal / 100);
        } else {
            freightAmount = freightVal;
        }

        const ipi = formData.ipiPercent || 0;
        const final = (cost + freightAmount) * (1 + ipi / 100);

        if (Math.abs(final - (formData.finalPurchasePrice || 0)) > 0.01) {
            setFormData(prev => prev ? { ...prev, finalPurchasePrice: Number(final.toFixed(2)) } : null);
        }
    }, [formData?.costPrice, formData?.freightCost, formData?.freightType, formData?.ipiPercent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        setLoading(true);
        try {
            await saveVariation(parentId, formData);
            toast.success("Variação atualizada com sucesso!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar a variação.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !formData) return null;

    const allSync = formData.syncUnitPrice && formData.syncCostPrice && formData.syncDescription;

    const toggleAllSync = () => {
        const target = !allSync;
        setFormData(prev => prev ? {
            ...prev,
            syncUnitPrice: target,
            syncCostPrice: target,
            syncDescription: target,
            syncWithParent: target,
            // If turning ON, we should probably update values immediately
            unitPrice: target ? (parentProduct.unitPrice || 0) : prev.unitPrice,
            costPrice: target ? (parentProduct.costPrice || 0) : prev.costPrice,
            freightCost: target ? (parentProduct.freightCost || 0) : prev.freightCost,
            freightType: target ? (parentProduct.freightType || 'fixed') : prev.freightType,
            ipiPercent: target ? (parentProduct.ipiPercent || 0) : prev.ipiPercent,
        } : null);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div 
                className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden"
                style={{ height: 'min(85vh, 700px)' }}
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            Editar Variação
                        </h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                            {parentProduct.description} - <span className="text-blue-600">{formData.name}</span>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={toggleAllSync}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${allSync ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}
                    >
                        <i className={`bi bi-link-45deg text-sm ${allSync ? 'rotate-0' : '-rotate-45'} transition-transform`}></i>
                        {allSync ? "Sincronizado" : "Sincronizar Tudo"}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-between">
                                Atributos (Ex: Cor, Tamanho)
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newAttrs = [...(formData.attributes || []), { name: "", value: "" }];
                                        setFormData({ ...formData, attributes: newAttrs });
                                    }}
                                    className="p-1 px-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                    <i className="bi bi-plus-lg mr-1"></i> Adicionar
                                </button>
                            </label>

                            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                                {(formData.attributes || []).length === 0 && (
                                    <p className="text-[10px] text-slate-400 italic py-2">Nenhum atributo definido.</p>
                                )}
                                {(formData.attributes || []).map((attr, idx) => (
                                    <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                                        <input
                                            type="text"
                                            placeholder="Nome (Ex: Cor)"
                                            value={attr.name}
                                            onChange={(e) => {
                                                const newAttrs = [...(formData.attributes || [])];
                                                newAttrs[idx].name = e.target.value;
                                                setFormData({ ...formData, attributes: newAttrs });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Valor (Ex: Azul)"
                                            value={attr.value}
                                            onChange={(e) => {
                                                const newAttrs = [...(formData.attributes || [])];
                                                newAttrs[idx].value = e.target.value;
                                                setFormData({ ...formData, attributes: newAttrs });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, attributes: formData.attributes?.filter((_, i) => i !== idx) });
                                            }}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <i className="bi bi-trash3 text-xs"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-between">
                                    Nome / Descrição
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-bold text-slate-400">Gerar com Atributos?</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if ((formData.attributes || []).length > 0) {
                                                    const autoName = formData.attributes!.map(a => a.value).filter(v => v).join(' / ');
                                                    if (autoName) setFormData({ ...formData, name: autoName });
                                                }
                                            }}
                                            className="p-1 px-2 border border-slate-100 dark:border-slate-800 rounded-lg text-[9px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            title="Gerar nome a partir dos atributos"
                                        >
                                            <i className="bi bi-magic mr-1"></i> Auto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, syncDescription: !formData.syncDescription })}
                                            className={`text-lg transition-colors ${formData.syncDescription ? 'text-blue-600' : 'text-slate-300'}`}
                                            title="Herança do Pai"
                                        >
                                            <i className="bi bi-link-45deg"></i>
                                        </button>
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Ex: Azul / P"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-between">
                                    SKU / Código Único
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.name && !parentProduct.description) {
                                                return toast.warning("Defina o nome da variação primeiro");
                                            }
                                            const base = parentProduct.description || "PROD";
                                            const varName = formData.name ? ` ${formData.name}` : "";
                                            const newCode = generateProductCode(`${base}${varName}`);
                                            setFormData({ ...formData, sku: newCode });
                                            toast.info(`SKU Sugerido: ${newCode}`);
                                        }}
                                        className="p-1 px-2 border border-slate-100 dark:border-slate-800 rounded-lg text-[9px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        title="Sugerir SKU"
                                    >
                                        <i className="bi bi-magic mr-1"></i> Sugerir
                                    </button>
                                </label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="SKU-001"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 shrink-0">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-between">
                            Galeria da Variação (Máx 15)
                            <span className="text-[9px] text-slate-300 font-bold uppercase">Selecione da galeria do pai</span>
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[180px] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 custom-scrollbar">
                            {((parentProduct as any).parentImages || parentProduct.images || []).map((url: string, idx: number) => {
                                const isSelected = formData.images?.includes(url);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            const currentImages = formData.images || [];
                                            if (isSelected) {
                                                setFormData({ ...formData, images: currentImages.filter(img => img !== url) });
                                            } else {
                                                if (currentImages.length >= 15) {
                                                    toast.warning("Limite de 15 fotos atingido.");
                                                    return;
                                                }
                                                setFormData({ ...formData, images: [...currentImages, url] });
                                            }
                                        }}
                                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={url} alt={`Galeria ${idx}`} className="w-full h-full object-cover" />
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                                <i className="bi bi-check text-white text-sm"></i>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                            {(!parentProduct.images && !(parentProduct as any).parentImages) && (
                                <div className="col-span-full py-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    Nenhuma imagem no produto pai
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-5 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <i className="bi bi-tag text-blue-600"></i> Precificação e Custos
                            </h4>
                            <div className="flex items-center gap-3">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Sincronizar Venda
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = !formData.syncUnitPrice;
                                        setFormData({ 
                                            ...formData, 
                                            syncUnitPrice: target,
                                            unitPrice: target ? (parentProduct.unitPrice || 0) : formData.unitPrice
                                        });
                                    }}
                                    className={`text-lg transition-colors ${formData.syncUnitPrice ? 'text-blue-600' : 'text-slate-300'}`}
                                    title="Herdar do pai"
                                >
                                    <i className="bi bi-link-45deg"></i>
                                </button>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Sincronizar Custos
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = !formData.syncCostPrice;
                                        setFormData({ 
                                            ...formData, 
                                            syncCostPrice: target,
                                            costPrice: target ? (parentProduct.costPrice || 0) : formData.costPrice,
                                            freightCost: target ? (parentProduct.freightCost || 0) : formData.freightCost,
                                            freightType: target ? (parentProduct.freightType || 'fixed') : formData.freightType,
                                            ipiPercent: target ? (parentProduct.ipiPercent || 0) : formData.ipiPercent
                                        });
                                    }}
                                    className={`text-lg transition-colors ${formData.syncCostPrice ? 'text-blue-600' : 'text-slate-300'}`}
                                    title="Herdar do pai"
                                >
                                    <i className="bi bi-link-45deg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    Preço de Venda (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={formData.syncUnitPrice}
                                    value={formData.unitPrice || 0}
                                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                                    className={`w-full px-4 py-3 rounded-2xl outline-none text-sm font-black transition-all ${formData.syncUnitPrice ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent' : 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 text-blue-600 dark:text-blue-400'}`}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    Preço Base de Custo
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={formData.syncCostPrice}
                                    value={formData.costPrice || 0}
                                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                                    className={`w-full px-4 py-3 rounded-2xl outline-none text-sm font-black transition-all ${formData.syncCostPrice ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent' : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Frete ({formData.freightType === 'percentage' ? '%' : 'R$'})
                                    </label>
                                    <div className={`flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg gap-0.5 scale-75 origin-right ${formData.syncCostPrice ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, freightType: 'fixed' })}
                                            className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${formData.freightType === 'fixed' || !formData.freightType ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            $
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, freightType: 'percentage' })}
                                            className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${formData.freightType === 'percentage' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            %
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={formData.syncCostPrice}
                                    value={formData.freightCost || 0}
                                    onChange={(e) => setFormData({ ...formData, freightCost: parseFloat(e.target.value) })}
                                    className={`w-full px-4 py-3 rounded-2xl outline-none text-sm font-black transition-all ${formData.syncCostPrice ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent' : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}
                                    placeholder={formData.freightType === 'percentage' ? "0.00 %" : "0.00"}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">IPI (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    disabled={formData.syncCostPrice}
                                    value={formData.ipiPercent || 0}
                                    onChange={(e) => setFormData({ ...formData, ipiPercent: parseFloat(e.target.value) })}
                                    className={`w-full px-4 py-3 rounded-2xl outline-none text-sm font-black transition-all ${formData.syncCostPrice ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent' : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Preço de Compra Final</label>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">R$ {(formData.finalPurchasePrice || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Lançar Estoque Inicial?</h4>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, launchInitialStock: !formData.launchInitialStock })}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.launchInitialStock ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                            >
                                {formData.launchInitialStock ? 'Sim, Lançar' : 'Não Lançar'}
                            </button>
                        </div>

                        {formData.launchInitialStock && (
                            <div className="animate-in zoom-in-95 duration-300">
                                <InitialStockList
                                    entries={formData.initialStockEntries || []}
                                    onChange={(entries) => {
                                        const totalStock = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                                        const avgCost = entries.length > 0
                                            ? entries.reduce((acc, curr) => acc + (curr.finalUnitCost || 0), 0) / entries.length
                                            : 0;

                                        setFormData({
                                            ...formData,
                                            initialStockEntries: entries,
                                            stock: totalStock,
                                            costPrice: avgCost
                                        });
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-6 shrink-0">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex flex-col">
                                {formData.launchInitialStock ? 'Saldo de Lotes' : 'Estoque Atual'}
                                {!!variation?.id && !formData.launchInitialStock && <span className="text-[8px] text-amber-500 font-bold lowercase tracking-normal mt-0.5">(altere na tela anterior)</span>}
                            </label>
                            <input
                                type="number"
                                value={formData.stock || 0}
                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                                disabled={(!!variation?.id && !formData.launchInitialStock) || formData.launchInitialStock}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Alerta (Mín)</label>
                            <input
                                type="number"
                                value={formData.minStock || 0}
                                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1 h-full">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, active: true })}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.active ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${formData.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    Ativo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, active: false })}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.active ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${!formData.active ? 'bg-red-500' : 'bg-slate-300'}`} />
                                    Inativo
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex gap-4 shrink-0 bg-white dark:bg-slate-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Salvando..." : "Concluir Cadastro"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    , document.body);
};

export default VariationFormModal;
