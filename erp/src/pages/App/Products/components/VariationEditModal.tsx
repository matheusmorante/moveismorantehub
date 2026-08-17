import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Variation } from "../../../types/product.type";
import ComboItemSelector from "./ComboItemSelector";
import { generateProductCode } from '@/pages/utils/formatters';
import { generateVariationSku, parseVariationImages } from '@/pages/utils/productService';
import VariationType from "../../../types/variation.type";
import { subscribeToVariations } from "../../../utils/variationService";
import AttributeSelectionModal from "./AttributeSelectionModal";
import AttributeManagementModal from "./AttributeManagementModal";
import { supabase } from '@/pages/utils/supabaseConfig';

interface VariationEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    variation: Variation | null;
    parentProduct?: {
        id?: string;
        parentId?: string;
        description?: string;
        unitPrice?: number;
        costPrice?: number;
        isCombo?: boolean;
        mainSupplierId?: string;
        images?: string[];
        width?: number;
        height?: number;
        depth?: number;
        weight?: number;
        ipiPercent?: number;
        freightCost?: number;
        code?: string;
    };
    onSave: (updatedVariation: Variation) => void;
    suppliers?: any[];
}

const VariationEditModal = ({ isOpen, onClose, variation, parentProduct, onSave, suppliers = [] }: VariationEditModalProps) => {
    const [localVariation, setLocalVariation] = useState<Variation | null>(null);
    const [activeTab, setActiveTab] = useState<'geral' | 'fotos' | 'technical' | 'financeiro' | 'combo'>('geral');
    const [availableVariations, setAvailableVariations] = useState<VariationType[]>([]);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const [allParentImages, setAllParentImages] = useState<string[]>(parentProduct?.images || []);

    useEffect(() => {
        const realParentId = (parentProduct as any)?.parentId || parentProduct?.id;
        if (realParentId && isOpen) {
            supabase
                .from('product_images')
                .select('url')
                .eq('product_id', realParentId)
                .order('display_order', { ascending: true })
                .then(({ data }) => {
                    if (data && data.length > 0) {
                        setAllParentImages(data.map(i => i.url));
                    } else if (parentProduct?.images?.length) {
                        setAllParentImages(parentProduct.images);
                    }
                });
        } else if (parentProduct?.images?.length) {
            setAllParentImages(parentProduct.images);
        }
    }, [parentProduct, isOpen]);

    useEffect(() => {
        const unsubscribe = subscribeToVariations((data) => {
            setAvailableVariations(data.filter(v => v.active && !v.deleted));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (variation) {
            setLocalVariation({ 
                ...variation,
                images: parseVariationImages((variation as any).image_url, variation.images),
                // Sincronizações ativas por padrão
                syncUnitPrice: variation.syncUnitPrice !== undefined ? variation.syncUnitPrice : true,
                syncCostPrice: variation.syncCostPrice !== undefined ? variation.syncCostPrice : true,
                syncDescription: variation.syncDescription !== undefined ? variation.syncDescription : true,
                syncWidth: variation.syncWidth !== undefined ? variation.syncWidth : true,
                syncHeight: variation.syncHeight !== undefined ? variation.syncHeight : true,
                syncDepth: variation.syncDepth !== undefined ? variation.syncDepth : true,
                syncWeight: variation.syncWeight !== undefined ? variation.syncWeight : true,
                syncIpi: variation.syncIpi !== undefined ? variation.syncIpi : true,
                syncFreight: variation.syncFreight !== undefined ? variation.syncFreight : true
            });
        } else {
            setLocalVariation(null);
        }
        setActiveTab('geral');
    }, [variation, isOpen]);

    if (!localVariation || !isOpen) return null;

    const handleChange = (field: keyof Variation, value: any) => {
        setLocalVariation(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleSave = () => {
        let finalVariation = { ...localVariation };
        if (!finalVariation.sku || finalVariation.sku.trim() === '') {
            const parentCode = (parentProduct as any)?.code || '000000';
            finalVariation.sku = generateVariationSku(parentCode, 0);
        }
        onSave(finalVariation);
        onClose();
    };

    const generateVariationName = (attrs: { name: string, value: string, showName?: boolean }[]) => {
        const sortedKeys = attrs.filter(a => a.name).sort((a, b) => a.name.localeCompare(b.name));
        const attrParts = sortedKeys.map(a => {
            const val = a.value.toUpperCase() || '?';
            return a.showName !== false ? `${a.name.toUpperCase()}:${val}` : val;
        }).join(' ');
        const baseTitle = parentProduct?.description || '';
        return attrParts ? `${baseTitle} ${attrParts}`.toUpperCase() : baseTitle.toUpperCase();
    };

    const handleAttributesChange = (nextAttrs: any[]) => {
        const newName = generateVariationName(nextAttrs);
        setLocalVariation(prev => {
            if (!prev) return null;
            const parentCode = (parentProduct as any)?.code || '000000';
            const currentSku = prev.sku || '';
            const matchSuffix = currentSku.match(/-(\d{2})$/);
            const varIndex = matchSuffix ? parseInt(matchSuffix[1], 10) - 1 : 0;
            const next = { ...prev, attributes: nextAttrs, name: newName, sku: generateVariationSku(parentCode, varIndex) };
            return next;
        });
    };

    const toggleGalleryImage = (url: string) => {
        const currentImages = localVariation.images || [];
        const isSelected = currentImages.includes(url);
        
        let nextImages;
        if (isSelected) {
            nextImages = currentImages.filter(img => img !== url);
        } else {
            nextImages = [...currentImages, url];
        }
        handleChange('images', nextImages);
    };

    // Custos calculados
    const currentCostPrice = localVariation.syncCostPrice ? (parentProduct?.costPrice || 0) : (localVariation.costPrice || 0);
    const currentIpiPercent = localVariation.syncIpi ? (parentProduct?.ipiPercent || 0) : (localVariation.ipiPercent || 0);
    const currentFreightCost = localVariation.syncFreight ? (parentProduct?.freightCost || 0) : (localVariation.freightCost || 0);
    const finalCalculatedCost = currentCostPrice + (currentCostPrice * (currentIpiPercent / 100)) + currentFreightCost;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div 
                className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden" 
                style={{ height: 'min(85vh, 720px)' }}
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <i className="bi bi-grid-3x3-gap text-blue-600" />
                            Editar Variação
                        </h3>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                            {localVariation.name || "Título Pendente"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 border-b border-slate-50 dark:border-slate-800 flex gap-6 shrink-0 bg-slate-50/50 dark:bg-slate-950/20 overflow-x-auto scrollbar-none">
                    {[
                        { id: 'geral', label: 'Cadastro Geral', icon: 'bi-info-circle' },
                        { id: 'fotos', label: 'Fotos', icon: 'bi-images' },
                        { id: 'technical', label: 'Informações Técnicas', icon: 'bi-ruler' },
                        { id: 'financeiro', label: 'Estoque e Precificação', icon: 'bi-box-seam' },
                        ...(parentProduct?.isCombo ? [{ id: 'combo', label: 'Combo', icon: 'bi-layers' }] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <i className={`bi ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0 p-8 custom-scrollbar">
                    {/* ABA CADASTRO GERAL */}
                    {activeTab === 'geral' && (
                        <div className="space-y-6">
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Composição da Variação</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const availableAttr = availableVariations.find(v => !(localVariation.attributes || []).some(a => a.name === v.name));
                                            const newAttrName = availableAttr ? availableAttr.name : "";
                                            const nextAttrs = [...(localVariation.attributes || []), { name: newAttrName, value: "", showName: true }];
                                            handleAttributesChange(nextAttrs);
                                        }}
                                        className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        + Adicionar Atributo
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(localVariation.attributes || []).map((attr, idx) => {
                                        const currentAttr = availableVariations.find(v => v.name === attr.name);
                                        const attrVals = currentAttr ? currentAttr.options : [];

                                        return (
                                            <div key={idx} className="flex items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-left-1">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] text-slate-400 font-black uppercase">Atributo</label>
                                                    <select
                                                        value={attr.name}
                                                        onChange={e => {
                                                            const newName = e.target.value;
                                                            const nextAttrs = [...(localVariation.attributes || [])];
                                                            nextAttrs[idx] = { ...nextAttrs[idx], name: newName, value: "" };
                                                            handleAttributesChange(nextAttrs);
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-100"
                                                    >
                                                        <option value="" disabled>Selecionar...</option>
                                                        {attr.name && !availableVariations.some(v => v.name === attr.name) && (
                                                            <option value={attr.name}>{attr.name}</option>
                                                        )}
                                                        {availableVariations.map(v => (
                                                            <option key={v.id} value={v.name} disabled={(localVariation.attributes || []).some(a => a.name === v.name) && v.name !== attr.name}>
                                                                {v.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] text-slate-400 font-black uppercase">Valor</label>
                                                    <select
                                                        value={attr.value}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const nextAttrs = [...(localVariation.attributes || [])];
                                                            nextAttrs[idx] = { ...nextAttrs[idx], value: val };
                                                            handleAttributesChange(nextAttrs);
                                                        }}
                                                        required
                                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-100"
                                                    >
                                                        <option value="" disabled>Selecione...</option>
                                                        {attr.value && !attrVals.some(opt => opt.value === attr.value) && (
                                                            <option value={attr.value}>{attr.value}</option>
                                                        )}
                                                        {attrVals.map(opt => (
                                                            <option key={opt.id} value={opt.value}>{opt.value}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextAttrs = [...(localVariation.attributes || [])];
                                                            nextAttrs[idx] = { ...nextAttrs[idx], showName: !nextAttrs[idx].showName };
                                                            handleAttributesChange(nextAttrs);
                                                        }}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${attr.showName !== false ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                        title={attr.showName !== false ? "Ocultar nome no título" : "Mostrar nome no título"}
                                                    >
                                                        <i className={`bi ${attr.showName !== false ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextAttrs = localVariation.attributes!.filter((_, i) => i !== idx);
                                                            handleAttributesChange(nextAttrs);
                                                        }}
                                                        className="w-9 h-9 flex items-center justify-center text-slate-355 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                        title="Remover Atributo"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Código SKU da Variação</label>
                                    </div>
                                    <input
                                        value={localVariation.sku || ''}
                                        onChange={(e) => handleChange('sku', e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold text-xs text-slate-800 dark:text-slate-100"
                                        placeholder="SKU-VARIAÇÃO"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA FOTOS */}
                    {activeTab === 'fotos' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Fotos do Produto Pai</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                    Todas as fotos do produto pai estão visíveis abaixo. Clique nas imagens para selecionar quais pertencem a esta variação (as fotos selecionadas ficarão circuladas de azul).
                                </p>
                            </div>

                            <div className="transition-colors rounded-3xl border-2 border-dashed border-slate-150 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-950/10">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {(allParentImages.length > 0 ? allParentImages : (parentProduct?.images || [])).length > 0 ? (
                                        (allParentImages.length > 0 ? allParentImages : (parentProduct?.images || [])).map((url, idx) => {
                                            const isSelected = localVariation.images?.includes(url);
                                            const selectIndex = localVariation.images?.indexOf(url);
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => toggleGalleryImage(url)}
                                                    className={`relative group aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-4 ${
                                                        isSelected 
                                                            ? 'border-blue-600 ring-4 ring-blue-500/50 scale-[1.02] opacity-100 shadow-md' 
                                                            : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-blue-300'
                                                    }`}
                                                >
                                                    <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                            <i className="bi bi-check-lg text-sm font-black" />
                                                        </div>
                                                    )}
                                                    {isSelected && selectIndex === 0 && (
                                                        <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm border border-white/25">
                                                            Capa
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                                            <i className="bi bi-images text-3xl opacity-20"></i>
                                            <p className="text-[9px] font-black uppercase tracking-widest">Nenhuma foto adicionada no produto pai.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA INFORMAÇÕES TÉCNICAS */}
                    {activeTab === 'technical' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Descrição da Variação */}
                            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                        Descrição da Variação
                                    </h4>
                                    <button 
                                        type="button"
                                        onClick={() => handleChange('syncDescription', !localVariation.syncDescription)}
                                        className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${localVariation.syncDescription ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                        title={localVariation.syncDescription ? "Desvincular Descrição do Pai" : "Sincronizar Descrição com o Pai"}
                                    >
                                        <i className={`bi ${localVariation.syncDescription ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'}`}></i>
                                        <span className="text-[9px] font-black uppercase">{localVariation.syncDescription ? 'Herdado do Pai' : 'Manual'}</span>
                                    </button>
                                </div>

                                {localVariation.syncDescription ? (
                                    <div className="w-full mt-2 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs font-semibold text-slate-500 flex items-start justify-between min-h-[80px]">
                                        <span>{parentProduct?.description || 'Descrição do produto pai'}</span>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md shrink-0 ml-2">Herdado</span>
                                    </div>
                                ) : (
                                    <textarea
                                        rows={4}
                                        value={localVariation.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Descrição específica desta variação (se vazia, herdará do pai no e-commerce)..."
                                        className="w-full mt-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 resize-none dark:text-slate-100"
                                    />
                                )}
                            </div>

                            {/* Dimensões Físicas da Variação */}
                            <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                                    Dimensões e Peso
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Largura */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between h-6">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Largura</label>
                                            <button 
                                                type="button"
                                                onClick={() => handleChange('syncWidth', !localVariation.syncWidth)}
                                                className={`p-1 rounded-lg transition-all ${localVariation.syncWidth ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                                title={localVariation.syncWidth ? "Desvincular Largura do Pai" : "Sincronizar Largura com o Pai"}
                                            >
                                                <i className={`bi ${localVariation.syncWidth ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                            </button>
                                        </div>
                                        {localVariation.syncWidth ? (
                                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                                <span>{parentProduct?.width || 0} cm</span>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    step="0.1"
                                                    value={localVariation.width || ''}
                                                    onChange={(e) => handleChange('width', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold pointer-events-none">cm</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Profundidade */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between h-6">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Profundidade</label>
                                            <button 
                                                type="button"
                                                onClick={() => handleChange('syncDepth', !localVariation.syncDepth)}
                                                className={`p-1 rounded-lg transition-all ${localVariation.syncDepth ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                                title={localVariation.syncDepth ? "Desvincular Profundidade do Pai" : "Sincronizar Profundidade com o Pai"}
                                            >
                                                <i className={`bi ${localVariation.syncDepth ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                            </button>
                                        </div>
                                        {localVariation.syncDepth ? (
                                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                                <span>{parentProduct?.depth || 0} cm</span>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    step="0.1"
                                                    value={localVariation.depth || ''}
                                                    onChange={(e) => handleChange('depth', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold pointer-events-none">cm</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Altura */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between h-6">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Altura</label>
                                            <button 
                                                type="button"
                                                onClick={() => handleChange('syncHeight', !localVariation.syncHeight)}
                                                className={`p-1 rounded-lg transition-all ${localVariation.syncHeight ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                                title={localVariation.syncHeight ? "Desvincular Altura do Pai" : "Sincronizar Altura com o Pai"}
                                            >
                                                <i className={`bi ${localVariation.syncHeight ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                            </button>
                                        </div>
                                        {localVariation.syncHeight ? (
                                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                                <span>{parentProduct?.height || 0} cm</span>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    step="0.1"
                                                    value={localVariation.height || ''}
                                                    onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold pointer-events-none">cm</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Peso */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between h-6">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Peso Bruto</label>
                                            <button 
                                                type="button"
                                                onClick={() => handleChange('syncWeight', !localVariation.syncWeight)}
                                                className={`p-1 rounded-lg transition-all ${localVariation.syncWeight ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                                title={localVariation.syncWeight ? "Desvincular Peso do Pai" : "Sincronizar Peso com o Pai"}
                                            >
                                                <i className={`bi ${localVariation.syncWeight ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                            </button>
                                        </div>
                                        {localVariation.syncWeight ? (
                                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                                <span>{parentProduct?.weight || 0} kg</span>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    step="0.001"
                                                    value={localVariation.weight || ''}
                                                    onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-455 font-bold pointer-events-none">kg</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA ESTOQUE E PRECIFICAÇÃO */}
                    {activeTab === 'financeiro' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Preços e Composição de Custos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Preço de Venda */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                                            Preço de Venda
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => handleChange('syncUnitPrice', !localVariation.syncUnitPrice)}
                                            className={`p-1 rounded-lg transition-all ${localVariation.syncUnitPrice ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                            title={localVariation.syncUnitPrice ? "Desvincular Preço do Pai" : "Sincronizar Preço com o Pai"}
                                        >
                                            <i className={`bi ${localVariation.syncUnitPrice ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                        </button>
                                    </div>
                                    {localVariation.syncUnitPrice ? (
                                        <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                            <span>R$ {(parentProduct?.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={localVariation.unitPrice || 0}
                                                onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Preço de Custo Base */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-455">
                                            Preço de Custo Base
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => handleChange('syncCostPrice', !localVariation.syncCostPrice)}
                                            className={`p-1 rounded-lg transition-all ${localVariation.syncCostPrice ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                            title={localVariation.syncCostPrice ? "Desvincular Custo do Pai" : "Sincronizar Custo com o Pai"}
                                        >
                                            <i className={`bi ${localVariation.syncCostPrice ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                        </button>
                                    </div>
                                    {localVariation.syncCostPrice ? (
                                        <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                            <span>R$ {(parentProduct?.costPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={localVariation.costPrice || 0}
                                                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Taxa de IPI */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-455">
                                            Taxa de IPI
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => handleChange('syncIpi', !localVariation.syncIpi)}
                                            className={`p-1 rounded-lg transition-all ${localVariation.syncIpi ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                            title={localVariation.syncIpi ? "Desvincular IPI do Pai" : "Sincronizar IPI com o Pai"}
                                        >
                                            <i className={`bi ${localVariation.syncIpi ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                        </button>
                                    </div>
                                    {localVariation.syncIpi ? (
                                        <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                            <span>{parentProduct?.ipiPercent || 0} %</span>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={localVariation.ipiPercent || 0}
                                                onChange={(e) => handleChange('ipiPercent', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-xs pointer-events-none">%</span>
                                        </div>
                                    )}
                                </div>

                                {/* Frete */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-455">
                                            Frete Rateado
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => handleChange('syncFreight', !localVariation.syncFreight)}
                                            className={`p-1 rounded-lg transition-all ${localVariation.syncFreight ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
                                            title={localVariation.syncFreight ? "Desvincular Frete do Pai" : "Sincronizar Frete com o Pai"}
                                        >
                                            <i className={`bi ${localVariation.syncFreight ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                                        </button>
                                    </div>
                                    {localVariation.syncFreight ? (
                                        <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                            <span>R$ {(parentProduct?.freightCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Herdado</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={localVariation.freightCost || 0}
                                                onChange={(e) => handleChange('freightCost', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Preço de Custo Final (Calculado) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 h-6 flex items-center">
                                        Preço de Custo Final (Calculado)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                        <input
                                            type="number"
                                            readOnly
                                            value={finalCalculatedCost.toFixed(2)}
                                            className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-black text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                 {/* Estoque Atual */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 h-6 flex items-center gap-1.5">
                                        Estoque Atual (Físico)
                                    </label>
                                    <input
                                        type="number"
                                        value={(localVariation.stock === null || localVariation.stock === undefined) ? 0 : localVariation.stock}
                                        onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 text-emerald-600 dark:text-emerald-400"
                                        placeholder="0"
                                    />
                                </div>

                                {/* Estoque Mínimo */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 h-6 flex items-center gap-1.5">
                                        Estoque Mínimo (Alerta)
                                    </label>
                                    <input
                                        type="number"
                                        value={(localVariation.minStock === null || localVariation.minStock === undefined) ? '' : localVariation.minStock}
                                        onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 text-amber-600 dark:text-amber-400"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA COMBO */}
                    {activeTab === 'combo' && parentProduct?.isCombo && (
                        <div className="space-y-6">
                            <ComboItemSelector
                                currentItems={localVariation.comboItems || []}
                                onAdd={(item) => handleChange('comboItems', [...(localVariation.comboItems || []), item])}
                                onRemove={(idx) => handleChange('comboItems', localVariation.comboItems?.filter((_, i) => i !== idx))}
                                onUpdateQuantity={(idx, qty) => {
                                    const items = [...(localVariation.comboItems || [])];
                                    items[idx].quantity = qty;
                                    handleChange('comboItems', items);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                    >
                        Concluir Cadastro
                    </button>
                </div>
            </div>

            {/* Modals */}
            <AttributeSelectionModal
                isOpen={isSelectionModalOpen}
                onClose={() => setIsSelectionModalOpen(false)}
                onSelect={(attr) => {
                    const currentAttrs = localVariation.attributes || [];
                    const exists = currentAttrs.find(a => a.name === attr.name);
                    
                    let newAttrs;
                    const attrWithShowName = { ...attr, showName: true };
                    if (exists) {
                        newAttrs = currentAttrs.map(a => a.name === attr.name ? attrWithShowName : a);
                    } else {
                        newAttrs = [...currentAttrs, attrWithShowName];
                    }
                    
                    handleAttributesChange(newAttrs);
                }}
                onManageAttributes={() => {
                    setIsSelectionModalOpen(false);
                    setIsManagementModalOpen(true);
                }}
            />

            <AttributeManagementModal
                isOpen={isManagementModalOpen}
                onClose={() => setIsManagementModalOpen(false)}
            />
        </div>
    , document.body);
};

export default VariationEditModal;
