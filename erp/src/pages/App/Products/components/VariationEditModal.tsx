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
import InitialStockList from './InitialStockList';
import { toast } from "react-toastify";
import CurrencyInput from '@/components/CurrencyInput';
import { toTitleCase } from '@/pages/utils/textUtils';

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
    const [activeTab, setActiveTab] = useState<'geral' | 'fotos' | 'technical' | 'financeiro' | 'fiscal' | 'combo'>('geral');
    const [availableVariations, setAvailableVariations] = useState<VariationType[]>([]);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const [allParentImages, setAllParentImages] = useState<string[]>(parentProduct?.images || []);
    const [diferenciarTitulo, setDiferenciarTitulo] = useState<boolean>(false);
    const [varDiscountPercent, setVarDiscountPercent] = useState("");
    const [varDiscountFixed, setVarDiscountFixed] = useState("");

    const getParentDiscountPercent = () => {
        const orig = parentProduct?.unitPrice || 0;
        const promo = parentProduct?.promoPrice || 0;
        if (orig > 0 && promo > 0 && promo < orig) {
            return ((orig - promo) / orig * 100).toFixed(1);
        }
        return "";
    };

    const getParentDiscountFixed = () => {
        const orig = parentProduct?.unitPrice || 0;
        const promo = parentProduct?.promoPrice || 0;
        if (orig > 0 && promo > 0 && promo < orig) {
            return (orig - promo).toFixed(2);
        }
        return "";
    };

    useEffect(() => {
        if (localVariation && !diferenciarTitulo) {
            if (localVariation.title !== localVariation.name) {
                setLocalVariation(prev => prev ? ({ ...prev, title: prev.name, marketplaceTitle: prev.name }) : null);
            }
        }
    }, [localVariation?.name, diferenciarTitulo]);

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
            const initialAttrs = variation.attributes && variation.attributes.length > 0
                ? variation.attributes
                : [{ name: "", value: "", showName: true }];

            setLocalVariation({ 
                ...variation,
                attributes: initialAttrs,
                images: parseVariationImages((variation as any).image_url, variation.images),
                // Sincronizações ativas por padrão
                syncUnitPrice: variation.syncUnitPrice !== undefined ? variation.syncUnitPrice : true,
                syncPromoPrice: variation.syncPromoPrice !== undefined ? variation.syncPromoPrice : true,
                syncCostPrice: variation.syncCostPrice !== undefined ? variation.syncCostPrice : true,
                syncDescription: variation.syncDescription !== undefined ? variation.syncDescription : true,
                syncWidth: variation.syncWidth !== undefined ? variation.syncWidth : true,
                syncHeight: variation.syncHeight !== undefined ? variation.syncHeight : true,
                syncDepth: variation.syncDepth !== undefined ? variation.syncDepth : true,
                syncWeight: variation.syncWeight !== undefined ? variation.syncWeight : true,
                syncIpi: variation.syncIpi !== undefined ? variation.syncIpi : true,
                syncFreight: variation.syncFreight !== undefined ? variation.syncFreight : true,
                syncFiscal: variation.syncFiscal !== undefined ? variation.syncFiscal : true
            });
            setDiferenciarTitulo(
                Boolean(variation.title && variation.title !== variation.name) || 
                Boolean(variation.marketplaceTitle && variation.marketplaceTitle !== variation.name)
            );

            const isUnitPriceSynced = variation.syncUnitPrice !== undefined ? variation.syncUnitPrice : true;
            const isPromoPriceSynced = variation.syncPromoPrice !== undefined ? variation.syncPromoPrice : true;

            const orig = Number(isUnitPriceSynced ? parentProduct?.unitPrice : variation.unitPrice || 0);
            const promo = Number(isPromoPriceSynced ? parentProduct?.promoPrice : variation.promoPrice || 0);
            if (orig > 0 && promo > 0 && promo < orig) {
                const fixed = orig - promo;
                const pct = (fixed / orig) * 100;
                setVarDiscountFixed(fixed.toFixed(2));
                setVarDiscountPercent(pct.toFixed(1));
            } else {
                setVarDiscountPercent("");
                setVarDiscountFixed("");
            }
        } else {
            setLocalVariation(null);
        }
        setActiveTab('geral');
    }, [variation, isOpen, parentProduct?.unitPrice, parentProduct?.promoPrice]);

    if (!localVariation || !isOpen) return null;

    const handleChange = (field: keyof Variation, value: any) => {
        setLocalVariation(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handlePriceChange = (valStr: string) => {
        if (!localVariation) return;
        const newPrice = parseFloat(valStr) || 0;
        setLocalVariation(prev => prev ? { ...prev, unitPrice: newPrice, syncUnitPrice: false } : null);
        
        const orig = newPrice;
        if (orig <= 0) {
            setVarDiscountPercent("");
            setVarDiscountFixed("");
            setLocalVariation(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const isPromoSynced = localVariation.syncPromoPrice !== false;
        const promoVal = isPromoSynced ? parentProduct?.promoPrice || 0 : localVariation.promoPrice || 0;

        if (isPromoSynced) {
            if (orig > 0 && promoVal > 0 && promoVal < orig) {
                const fixed = orig - promoVal;
                const pct = (fixed / orig) * 100;
                setVarDiscountFixed(fixed.toFixed(2));
                setVarDiscountPercent(pct.toFixed(1));
            } else {
                setVarDiscountPercent("");
                setVarDiscountFixed("");
            }
        } else if (varDiscountPercent) {
            const pct = parseFloat(varDiscountPercent);
            if (!isNaN(pct)) {
                const fixed = orig * (pct / 100);
                setVarDiscountFixed(fixed.toFixed(2));
                const promo = orig - fixed;
                setLocalVariation(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 } : null);
            }
        }
    };

    const handleDiscountPercentChange = (valStr: string) => {
        if (!localVariation) return;
        setVarDiscountPercent(valStr);
        const orig = Number(localVariation.syncUnitPrice ? parentProduct?.unitPrice : localVariation.unitPrice || 0);
        if (orig <= 0 || valStr === "") {
            setVarDiscountFixed("");
            setLocalVariation(prev => prev ? { ...prev, promoPrice: undefined, syncPromoPrice: false } : null);
            return;
        }

        const pct = parseFloat(valStr);
        if (isNaN(pct) || pct < 0) {
            setVarDiscountFixed("");
            setLocalVariation(prev => prev ? { ...prev, promoPrice: undefined, syncPromoPrice: false } : null);
            return;
        }

        const fixed = orig * (pct / 100);
        setVarDiscountFixed(fixed.toFixed(2));
        const promo = orig - fixed;
        setLocalVariation(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncPromoPrice: false } : null);
    };

    const handleDiscountFixedChange = (valStr: string) => {
        if (!localVariation) return;
        const fixed = parseFloat(valStr) || 0;
        setVarDiscountFixed(valStr);
        const orig = Number(localVariation.syncUnitPrice ? parentProduct?.unitPrice : localVariation.unitPrice || 0);
        if (orig <= 0 || !valStr || fixed <= 0) {
            setVarDiscountPercent("");
            setLocalVariation(prev => prev ? { ...prev, promoPrice: undefined, syncPromoPrice: false } : null);
            return;
        }

        const pct = (fixed / orig) * 100;
        setVarDiscountPercent(pct.toFixed(1));
        const promo = orig - fixed;
        setLocalVariation(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncPromoPrice: false } : null);
    };

    const handlePromoPriceFieldChange = (valStr: string) => {
        if (!localVariation) return;
        const promo = parseFloat(valStr) || 0;
        setLocalVariation(prev => {
            if (!prev) return null;
            const orig = Number(prev.syncUnitPrice ? parentProduct?.unitPrice : prev.unitPrice || 0);
            if (orig > 0 && promo > 0 && promo < orig) {
                const fixed = orig - promo;
                const pct = (fixed / orig) * 100;
                setVarDiscountFixed(fixed.toFixed(2));
                setVarDiscountPercent(pct.toFixed(1));
                return { ...prev, promoPrice: promo, syncPromoPrice: false };
            } else {
                setVarDiscountPercent("");
                setVarDiscountFixed("");
                return { ...prev, promoPrice: undefined, syncPromoPrice: false };
            }
        });
    };

    const handleSave = () => {
        if (!localVariation) return;

        if (localVariation.attributes && localVariation.attributes.length > 0) {
            const hasEmptyAttr = localVariation.attributes.some(a => !a.name || !a.name.trim() || !a.value || !a.value.trim());
            if (hasEmptyAttr) {
                toast.error("Selecione o atributo e o valor em todas as composições ou remova as linhas não utilizadas.");
                setActiveTab('geral');
                return;
            }
        }

        let finalVariation = { ...localVariation, syncFiscal: true };

        // Copiar valores do pai se as flags de sincronização estiverem ativas
        if (finalVariation.syncDescription) {
            finalVariation.description = parentProduct?.description || '';
        }
        if (finalVariation.syncWidth) {
            finalVariation.width = parentProduct?.width || 0;
        }
        if (finalVariation.syncHeight) {
            finalVariation.height = parentProduct?.height || 0;
        }
        if (finalVariation.syncDepth) {
            finalVariation.depth = parentProduct?.depth || 0;
        }
        if (finalVariation.syncWeight) {
            finalVariation.weight = parentProduct?.weight || 0;
        }
        if (finalVariation.syncUnitPrice) {
            finalVariation.unitPrice = parentProduct?.unitPrice || 0;
            finalVariation.promoPrice = parentProduct?.promoPrice || 0;
        }
        if (finalVariation.syncCostPrice) {
            finalVariation.costPrice = parentProduct?.costPrice || 0;
        }

        if (!finalVariation.sku || finalVariation.sku.trim() === '') {
            const parentCode = (parentProduct as any)?.code || '000000';
            finalVariation.sku = generateVariationSku(parentCode, 0);
        }
        onSave(finalVariation);
        onClose();
    };

    const generateVariationName = (attrs: { name: string, value: string, showName?: boolean }[]) => {
        const attributeValues = attrs.map(attribute => attribute.value).filter(Boolean);
        const parentName = (parentProduct?.name || parentProduct?.description || '').trim();
        const raw = [parentName, ...attributeValues].filter(Boolean).join(' ') || parentName || 'Variação';
        return toTitleCase(raw);
    };

    const handleAttributesChange = (nextAttrs: any[]) => {
        setLocalVariation(prev => {
            if (!prev) return null;
            const parentCode = (parentProduct as any)?.code || '000000';
            const currentSku = prev.sku || '';
            const matchSuffix = currentSku.match(/-(\d{2})$/);
            const varIndex = matchSuffix ? parseInt(matchSuffix[1], 10) - 1 : 0;
            const newName = generateVariationName(nextAttrs);
            const next = {
                ...prev,
                attributes: nextAttrs,
                name: newName,
                title: (!diferenciarTitulo || !prev.title || prev.title === prev.name) ? newName : prev.title,
                marketplaceTitle: (!diferenciarTitulo || !prev.marketplaceTitle || prev.marketplaceTitle === prev.name) ? newName : prev.marketplaceTitle,
                sku: generateVariationSku(parentCode, varIndex)
            };
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
        <>
            <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div 
                className="relative bg-white dark:bg-slate-900 w-full max-w-full h-full md:max-w-[96vw] md:h-[96vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800" 
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
                        { id: 'geral', label: 'Cadastro Geral', icon: '' },
                        { id: 'fotos', label: 'Fotos', icon: 'bi-images' },
                        { id: 'technical', label: 'Informações Técnicas', icon: 'bi-info-circle' },
                        { id: 'financeiro', label: 'Estoque e Precificação', icon: 'bi-box-seam' },
                        { id: 'fiscal', label: 'Tributário / NF', icon: 'bi-file-earmark-text' },
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
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Composição da Variação</h4>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextAttrs = [...(localVariation.attributes || []), { name: "", value: "", showName: true }];
                                                handleAttributesChange(nextAttrs);
                                            }}
                                            className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            + Adicionar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsManagementModalOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[9px] font-black uppercase tracking-widest"
                                        >
                                            <i className="bi bi-sliders2 text-[10px]"></i>
                                            Gerenciar Atributos
                                        </button>
                                    </div>
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

                                <div className="space-y-4 pt-2 border-t border-slate-150 dark:border-slate-800">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Nome */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between h-6">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newValue = !diferenciarTitulo;
                                                        setDiferenciarTitulo(newValue);
                                                        if (!newValue) {
                                                            setLocalVariation(prev => prev ? ({
                                                                ...prev,
                                                                title: prev.name,
                                                                marketplaceTitle: prev.name
                                                            }) : null);
                                                        }
                                                    }}
                                                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                                                        diferenciarTitulo 
                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-955/40 dark:text-purple-300' 
                                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título no Catálogo'}
                                                </button>
                                            </div>
                                            <input
                                                value={localVariation.name || ''}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                                    onBlur={() => {
                                                        if (localVariation.name) {
                                                            const formatted = toTitleCase(localVariation.name);
                                                            if (formatted !== localVariation.name) {
                                                                setLocalVariation(prev => prev ? ({
                                                                    ...prev,
                                                                    name: formatted,
                                                                    ...(!diferenciarTitulo ? { title: formatted, marketplaceTitle: formatted } : {})
                                                                }) : null);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full bg-white dark:bg-slate-955 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold text-xs text-slate-800 dark:text-slate-100"
                                                placeholder="Nome interno da variação (ERP)"
                                            />
                                        </div>

                                        {/* Título no Catálogo */}
                                        {diferenciarTitulo ? (
                                            <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-200">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-6 flex items-center gap-1">
                                                    <span>Título no Catálogo</span>
                                                    <span className="inline-flex items-center text-[8px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                                </label>
                                                <input
                                                    value={localVariation.title || localVariation.marketplaceTitle || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setLocalVariation(prev => prev ? ({ ...prev, title: val, marketplaceTitle: val }) : null);
                                                    }}
                                                        onBlur={() => {
                                                            const current = localVariation.title || localVariation.marketplaceTitle || '';
                                                            if (current) {
                                                                const formatted = toTitleCase(current);
                                                                if (formatted !== current) {
                                                                    setLocalVariation(prev => prev ? ({ ...prev, title: formatted, marketplaceTitle: formatted }) : null);
                                                                }
                                                            }
                                                        }}
                                                        className="w-full bg-white dark:bg-slate-955 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold text-xs text-slate-800 dark:text-slate-100"
                                                    placeholder="Título da variação no catálogo"
                                                />
                                            </div>
                                        ) : (
                                            <div className="hidden sm:block p-2"></div>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-400">Nome gerado com o nome do produto principal e os valores dos atributos; você pode editar livremente.</p>
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
                            {/* Precificação e Venda */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Precificação de Venda</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextSync = !localVariation.syncUnitPrice;
                                            setLocalVariation(prev => prev ? {
                                                ...prev,
                                                syncUnitPrice: nextSync,
                                                unitPrice: nextSync ? parentProduct?.unitPrice : prev.unitPrice,
                                                syncPromoPrice: nextSync,
                                                promoPrice: nextSync ? parentProduct?.promoPrice : prev.promoPrice
                                            } : null);
                                        }}
                                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl transition-all ${localVariation.syncUnitPrice ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                                    >
                                        {localVariation.syncUnitPrice ? "Preço Herdado do Pai" : "Preço Personalizado"}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    {/* Preço de Venda */}
                                    <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Preço de Venda</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-blue-100/60 dark:bg-blue-955/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/30 uppercase select-none">ERP</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        {localVariation.syncUnitPrice ? (
                                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                                <span>R$ {(parentProduct?.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-955/60 px-1.5 py-0.5 rounded">Herdado</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={localVariation.unitPrice || 0}
                                                    onChange={(e) => handlePriceChange(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Desconto % */}
                                    <div className="flex flex-col gap-2 min-w-[120px] flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Desconto (%)</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                disabled={localVariation.syncUnitPrice}
                                                placeholder="0"
                                                value={localVariation.syncUnitPrice ? getParentDiscountPercent() : varDiscountPercent}
                                                onChange={e => handleDiscountPercentChange(e.target.value)}
                                                className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:dark:bg-slate-900/50 disabled:text-slate-450"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                        </div>
                                    </div>

                                    {/* Desconto R$ */}
                                    <div className="flex flex-col gap-2 min-w-[140px] flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Desconto (R$)</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <CurrencyInput
                                            disabled={localVariation.syncUnitPrice}
                                            value={localVariation.syncUnitPrice ? getParentDiscountFixed() : varDiscountFixed}
                                            onChange={val => handleDiscountFixedChange(String(val))}
                                            className="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:dark:bg-slate-900/50 disabled:text-slate-450"
                                        />
                                    </div>

                                    {/* Preço Promocional */}
                                    <div className="flex flex-col gap-2 min-w-[180px] flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Preço Promocional</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <CurrencyInput
                                            placeholder="Sem desconto"
                                            disabled={localVariation.syncUnitPrice}
                                            value={localVariation.syncUnitPrice ? (parentProduct?.promoPrice || "") : (localVariation.promoPrice || "")}
                                            onChange={val => handlePromoPriceFieldChange(String(val))}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl outline-none text-xs font-black transition-all ${localVariation.syncUnitPrice
                                                ? 'bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                                                : 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-500 focus:ring-2 focus:ring-amber-500/20'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Toggle Estoque Inicial */}
                            {parentProduct?.isDraft && (
                                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => handleChange('launchInitialStock', !localVariation.launchInitialStock)}
                                        className={`w-full flex items-center justify-between p-4 transition-all ${
                                            localVariation.launchInitialStock
                                                ? 'bg-blue-50 dark:bg-blue-900/10'
                                                : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                localVariation.launchInitialStock
                                                    ? 'bg-blue-600 shadow-lg shadow-blue-500/30'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                            }`}>
                                                <i className={`bi bi-box-seam-fill text-sm ${
                                                    localVariation.launchInitialStock ? 'text-white' : 'text-slate-400'
                                                }`}></i>
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-black uppercase tracking-widest ${
                                                    localVariation.launchInitialStock
                                                        ? 'text-blue-700 dark:text-blue-400'
                                                        : 'text-slate-600 dark:text-slate-300'
                                                }`}>Lançamento de Estoque Inicial</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                                                    {localVariation.launchInitialStock
                                                        ? 'Informe a quantidade e custo de compra desta variação'
                                                        : 'Clique para cadastrar saldo inicial agora'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                            localVariation.launchInitialStock
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {localVariation.launchInitialStock ? 'Sim, Lançar' : 'Não Lançar'}
                                        </span>
                                    </button>

                                    {localVariation.launchInitialStock && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in slide-in-from-top-2 duration-200">
                                            <InitialStockList
                                                entries={localVariation.initialStockEntries || []}
                                                onChange={(entries) => {
                                                    const totalStock = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                                                    const avgCost = entries.length > 0
                                                        ? entries.reduce((acc, curr) => acc + (curr.finalUnitCost || 0), 0) / entries.length
                                                        : 0;
                                                    setLocalVariation(prev => prev ? ({
                                                        ...prev,
                                                        initialStockEntries: entries,
                                                        stock: totalStock,
                                                        costPrice: avgCost,
                                                    }) : prev);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Estoque Mínimo */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <i className="bi bi-exclamation-triangle-fill text-amber-500 text-[11px]"></i>
                                    Estoque Mínimo (Alerta)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={(localVariation.minStock === null || localVariation.minStock === undefined) ? '' : localVariation.minStock}
                                    onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500/20 text-amber-600 dark:text-amber-400"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}

                    {/* ABA TRIBUTÁRIO */}
                    {activeTab === 'fiscal' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="p-5 bg-blue-50/70 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
                                    <i className="bi bi-info-circle-fill text-blue-500 text-sm mt-0.5"></i>
                                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                        Esta variação herda os dados tributários do produto pai. Para alterar essas informações, acesse o cadastro do produto pai.
                                    </p>
                                </div>
                                {false && (<>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                        <i className="bi bi-file-earmark-text-fill text-blue-600 text-lg"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Sincronizar Dados Fiscais com o Pai?</h4>
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Herdar NCM, CEST, Origem e CST do produto principal</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleChange('syncFiscal', !localVariation.syncFiscal)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localVariation.syncFiscal ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {localVariation.syncFiscal ? 'Herdado do Pai' : 'Personalizado'}
                                </button>
                            </div>

                            {localVariation.syncFiscal ? (
                                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-3">
                                    <i className="bi bi-info-circle-fill text-blue-500 text-sm"></i>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Esta variação está utilizando os dados tributários e fiscais herdados do produto pai ({parentProduct?.fiscal?.ncm || "Sem NCM"}). Quaisquer alterações nestes dados devem ser realizadas diretamente no cadastro do produto pai.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>Código NCM (8 Dígitos) *</span>
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    value={localVariation.fiscal?.ncm || '94036000'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const labels: Record<string, string> = {
                                                            '94036000': 'Outros móveis de madeira (Aparadores, Racks)',
                                                            '94016100': 'Assentos com armação de madeira, estofados (Cadeiras, Sofás)',
                                                            '94035000': 'Móveis de madeira para dormitórios',
                                                            '94033000': 'Móveis de madeira para escritórios',
                                                            '94034000': 'Móveis de madeira para cozinhas',
                                                            '94042100': 'Colchões de espuma'
                                                        };
                                                        handleChange('fiscal', {
                                                            ...localVariation.fiscal!,
                                                            ncm: val,
                                                            ncmDescription: labels[val] || 'Móvel de madeira'
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                                >
                                                    <option value="94036000">9403.60.00 - Outros móveis de madeira (Aparadores, Mesas)</option>
                                                    <option value="94016100">9401.61.00 - Assentos com armação de madeira, estofados</option>
                                                    <option value="94035000">9403.50.00 - Móveis de madeira para quartos</option>
                                                    <option value="94033000">9403.30.00 - Móveis de madeira para escritórios</option>
                                                    <option value="94034000">9403.40.00 - Móveis de madeira para cozinhas</option>
                                                    <option value="94042100">9404.21.00 - Colchões de espuma</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    maxLength={8}
                                                    value={localVariation.fiscal?.ncm || ''}
                                                    onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-[10px] font-mono font-bold"
                                                    placeholder="Ou digite outro NCM (8 dígitos)..."
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>Código CEST (ST)</span>
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    value={localVariation.fiscal?.cest || ''}
                                                    onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, cest: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                                >
                                                    <option value="">Sem Substituição Tributária (Nenhum)</option>
                                                    <option value="2806100">28.061.00 - Colchões e box-springs</option>
                                                    <option value="2806200">28.062.00 - Suportes para camas (Estrados)</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    maxLength={7}
                                                    value={localVariation.fiscal?.cest || ''}
                                                    onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, cest: e.target.value.replace(/\D/g, '') })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-[10px] font-mono font-bold"
                                                    placeholder="Ou digite outro CEST (7 dígitos)..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Descrição do NCM</span>
                                        </label>
                                        <input
                                            value={localVariation.fiscal?.ncmDescription || ''}
                                            onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, ncmDescription: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            placeholder="Ex: Móveis de cozinha, de madeira..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>Origem da Mercadoria</span>
                                            </label>
                                            <select
                                                value={localVariation.fiscal?.origem || '0'}
                                                onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, origem: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            >
                                                <option value="0">0 - Nacional</option>
                                                <option value="1">1 - Estrangeira - Importação Direta</option>
                                                <option value="2">2 - Estrangeira - Adquirida no Mercado Interno</option>
                                                <option value="3">3 - Nacional, superior a 40% importação</option>
                                                <option value="4">4 - Nacional, processo produtivo básico</option>
                                                <option value="5">5 - Nacional, inferior ou igual a 40% importação</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>CST / CSOSN ICMS</span>
                                            </label>
                                            <select
                                                value={localVariation.fiscal?.cst || '102'}
                                                onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, cst: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            >
                                                <option value="102">102 - Simples Nacional - Sem permissão de crédito (Venda padrão)</option>
                                                <option value="500">500 - Simples Nacional - ICMS Cobrado Anteriormente por ST</option>
                                                <option value="101">101 - Simples Nacional - Com permissão de crédito</option>
                                                <option value="201">201 - Simples Nacional - Com permissão de crédito e ST</option>
                                                <option value="202">202 - Simples Nacional - Sem permissão de crédito e ST</option>
                                                <option value="300">300 - Simples Nacional - Imune</option>
                                                <option value="400">400 - Simples Nacional - Não tributada</option>
                                                <option value="900">900 - Simples Nacional - Outros</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>CFOP Padrão (Estadual)</span>
                                            </label>
                                            <select
                                                value={localVariation.fiscal?.cfop || '5102'}
                                                onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, cfop: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            >
                                                <option value="5102">5102 - Venda de mercadoria adquirida/recebida de terceiros</option>
                                                <option value="5405">5405 - Venda de mercadoria sujeita a ST (Substituído)</option>
                                                <option value="5101">5101 - Venda de produção do estabelecimento</option>
                                                <option value="5403">5403 - Venda de produção do estabelecimento sujeita a ST</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>Alíquota ICMS (%)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={localVariation.fiscal?.icmsPercent || 0}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    handleChange('fiscal', {
                                                        ...localVariation.fiscal!,
                                                        icmsPercent: isNaN(val) ? 0 : val
                                                    });
                                                }}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>PIS CST</span>
                                            </label>
                                            <select
                                                value={localVariation.fiscal?.pisCst || '49'}
                                                onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, pisCst: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            >
                                                <option value="49">49 - Outras Operações de Saída</option>
                                                <option value="07">07 - Operação Isenta da Contribuição</option>
                                                <option value="08">08 - Operação Sem Incidência</option>
                                                <option value="04">04 - Operação Tributável Monofásica (Alíquota Zero)</option>
                                                <option value="06">06 - Operação Tributável com Alíquota Zero</option>
                                                <option value="01">01 - Operação Tributável com Alíquota Básica</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                                <span>COFINS CST</span>
                                            </label>
                                            <select
                                                value={localVariation.fiscal?.cofinsCst || '49'}
                                                onChange={(e) => handleChange('fiscal', { ...localVariation.fiscal!, cofinsCst: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                            >
                                                <option value="49">49 - Outras Operações de Saída</option>
                                                <option value="07">07 - Operação Isenta da Contribuição</option>
                                                <option value="08">08 - Operação Sem Incidência</option>
                                                <option value="04">04 - Operação Tributável Monofásica (Alíquota Zero)</option>
                                                <option value="06">06 - Operação Tributável com Alíquota Zero</option>
                                                <option value="01">01 - Operação Tributável com Alíquota Básica</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                                </>)}
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
                            Concluir
                    </button>
                </div>
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
        </>
    , document.body);
};

export default VariationEditModal;
