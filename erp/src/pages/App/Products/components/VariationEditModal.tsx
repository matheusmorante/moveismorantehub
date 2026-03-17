import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from "react-dom";
import { Variation, ComboItem } from "../../../types/product.type";
import { toast } from "react-toastify";
import { uploadFile } from "../../../utils/storageService";
import ComboItemSelector from "./ComboItemSelector";
import SmartInput from "../../../../components/SmartInput";
import { generateProductCode } from '@/pages/utils/formatters';
import { getProductSalesStats } from "../../../utils/productService";
import VariationType from "../../../types/variation.type";
import { subscribeToVariations } from "../../../utils/variationService";
import AttributeSelectionModal from "./AttributeSelectionModal";
import AttributeManagementModal from "./AttributeManagementModal";
import InitialStockList from "./InitialStockList";


interface VariationEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    variation: Variation | null;
    parentProduct?: {
        id?: string;
        description: string;
        unitPrice: number;
        costPrice: number;
        isCombo?: boolean;
        mainSupplierId?: string;
        images?: string[];
        width?: number;
        height?: number;
        depth?: number;
        weight?: number;
        pkgWidth?: number;
        pkgHeight?: number;
        pkgDepth?: number;
    };


    onSave: (updatedVariation: Variation) => void;
    suppliers?: any[];
}

const InfoTooltip: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    return (
        <div className="relative group inline-block ml-2">
            <i className="bi bi-info-circle text-blue-500 hover:text-blue-600 transition-colors cursor-help"></i>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] pointer-events-none">
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{title}</p>
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed normal-case tracking-normal">
                        {children}
                    </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white dark:border-t-slate-800"></div>
            </div>
        </div>
    );
};

const VariationEditModal = ({ isOpen, onClose, variation, parentProduct, onSave, suppliers = [] }: VariationEditModalProps) => {
    const [localVariation, setLocalVariation] = useState<Variation | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSyncingSales, setIsSyncingSales] = useState(false);
    const [stats, setStats] = useState<{ giro: number, lt: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'logistica' | 'marketplace' | 'fotos' | 'combo'>('geral');
    const [availableVariations, setAvailableVariations] = useState<VariationType[]>([]);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);


    useEffect(() => {
        const unsubscribe = subscribeToVariations((data) => {
            setAvailableVariations(data.filter(v => v.active && !v.deleted));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (variation) {
            setLocalVariation({ ...variation });
        } else {
            setLocalVariation(null);
        }
        setActiveTab('geral');
    }, [variation, isOpen]);

    useEffect(() => {
        const loadStats = async () => {
            if (parentProduct?.id && variation?.id && isOpen) {
                try {
                    const { avgMonthlySales } = await getProductSalesStats(parentProduct.id, variation.id);
                    const supplierId = (variation as any).supplierId || parentProduct.mainSupplierId;
                    const supplier = (suppliers as any[]).find((s: any) => s.id === supplierId);
                    setStats({ giro: avgMonthlySales, lt: supplier?.leadTime || 0 });
                } catch (e) {

                    console.error("Erro ao carregar stats da variação:", e);
                }
            }
        };
        loadStats();
    }, [parentProduct?.id, variation?.id, isOpen, suppliers]);

    if (!localVariation || !isOpen) return null;

    const handleChange = (field: keyof Variation, value: any) => {
        setLocalVariation(prev => prev ? ({ ...prev, [field]: value }) : null);
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
            const next = { ...prev, attributes: nextAttrs, name: newName };
            // Auto-gerar SKU se estiver vazio ou se for novo rascunho
            if (!next.sku || next.sku.trim() === '' || next.sku.startsWith('NEW-VAR')) {
                next.sku = generateProductCode(newName);
            }
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

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(localVariation.images || []);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        handleChange('images', items);
    };

    const handleSave = () => {
        if (!localVariation.name.trim()) {
            toast.error("O título da variação é obrigatório.");
            return;
        }

        onSave(localVariation);
        onClose();
    };

    const calculateMinStock = async () => {
        if (!parentProduct?.id || !localVariation?.id) {
            toast.warning("Salve o produto primeiro para calcular com dados reais.");
            return;
        }

        setIsSyncingSales(true);
        try {
            const { avgMonthlySales } = await getProductSalesStats(parentProduct.id, localVariation.id);
            const supplierId = (localVariation as any).supplierId || parentProduct.mainSupplierId;
            const supplier = (suppliers as any[]).find((s: any) => s.id === supplierId);
            const lt = supplier?.leadTime || 0;


            if (lt === 0) {
                toast.warning("Vincule um fornecedor com Lead Time definido para usar a fórmula.");
            }

            const dailySales = avgMonthlySales / 30;
            const suggested = Math.ceil((dailySales * lt) * 1.20) || 5; 
            
            handleChange('minStock', suggested);
            setStats({ giro: avgMonthlySales, lt });
            toast.success(`Sugerido: ${suggested} un. (Giro: ${avgMonthlySales}/mês, LT: ${lt}d)`);
        } catch (error) {
            toast.error("Erro ao calcular.");
        } finally {
            setIsSyncingSales(false);
        }
    };

    const updateFinalPurchasePrice = (v: Variation) => {
        const base = Number(v.initialCost) || 0;
        let ipi = Number(v.ipiPercent) || 0;
        let freight = Number(v.freightCost) || 0;

        if (v.ipiType === 'percentage') ipi = base * (ipi / 100);
        if (v.freightType === 'percentage') freight = base * (freight / 100);

        const final = base + ipi + freight;
        return Number(final.toFixed(2));
    };

    const handleCostChange = (field: keyof Variation, value: any) => {
        setLocalVariation(prev => {
            if (!prev) return null;
            const next = { ...prev, [field]: value };
            next.finalPurchasePrice = updateFinalPurchasePrice(next);
            return next;
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div 
                className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden" 
                style={{ height: 'min(85vh, 700px)' }}
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
                <div className="px-8 border-b border-slate-50 dark:border-slate-800 flex gap-6 shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                    {[
                        { id: 'geral', label: 'Geral', icon: 'bi-info-circle' },
                        { id: 'financeiro', label: 'Preços & Estoque', icon: 'bi-cash-stack' },
                        { id: 'logistica', label: 'Logística', icon: 'bi-truck' },
                        { id: 'marketplace', label: 'Marketplace', icon: 'bi-shop' },
                        { id: 'fotos', label: 'Fotos', icon: 'bi-image' },
                        ...(parentProduct?.isCombo ? [{ id: 'combo', label: 'Composição', icon: 'bi-layers' }] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <i className={`bi ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0 p-8 custom-scrollbar">
                    {activeTab === 'geral' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4 col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Composição da Variação</h4>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsSelectionModalOpen(true)}
                                                className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors"
                                            >
                                                + Selecionar Atributo
                                            </button>

                                        </div>
                                    </div>

                                    
                                    <div className="space-y-3">
                                        {(localVariation.attributes || []).map((attr, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-left-1 group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                                        <i className="bi bi-tag-fill text-xs"></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{attr.name}</p>
                                                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{attr.value}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextAttrs = [...(localVariation.attributes || [])];
                                                            nextAttrs[idx] = { ...nextAttrs[idx], showName: !nextAttrs[idx].showName };
                                                            handleAttributesChange(nextAttrs);
                                                        }}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${attr.showName !== false ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
                                                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                        title="Remover Atributo"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título</label>
                                            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Baseado no Pai + Atributos</span>
                                        </div>


                                        <input
                                            value={localVariation.name}
                                            readOnly
                                            className="w-full bg-slate-100 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-transparent outline-none font-black text-sm text-slate-500"
                                            placeholder="GERADO AUTOMATICAMENTE"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                        SKU / Código
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!localVariation.name) {
                                                    return toast.warning("Defina o nome da variação primeiro para gerar o SKU");
                                                }
                                                const newCode = generateProductCode(localVariation.name);
                                                handleChange('sku', newCode);
                                                toast.info(`SKU Sugerido: ${newCode}`);
                                            }}
                                            className="p-1 px-2 border border-slate-100 dark:border-slate-800 rounded-lg text-[9px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            title="Sugerir SKU"
                                        >
                                            <i className="bi bi-magic mr-1"></i> Sugerir
                                        </button>
                                    </label>
                                    <input
                                        value={localVariation.sku}
                                        readOnly
                                        className="w-full bg-slate-100 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-transparent outline-none font-black text-sm text-slate-500 cursor-default"
                                        placeholder="SKU-VAR-001"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4">Sincronização com o Pai</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleChange('syncDescription', !localVariation.syncDescription)}
                                        className={`p-4 rounded-2xl border flex flex-col gap-1 transition-all text-left ${localVariation.syncDescription ? 'bg-blue-600 text-white border-blue-500' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                    >
                                        <i className={`bi ${localVariation.syncDescription ? 'bi-link' : 'bi-link-45deg'} text-lg`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar Título</span>
                                    </button>
                                    <button
                                        onClick={() => handleChange('active', !localVariation.active)}
                                        className={`p-4 rounded-2xl border flex flex-col gap-1 transition-all text-left ${localVariation.active ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                    >
                                        <i className={`bi ${localVariation.active ? 'bi-toggle-on' : 'bi-toggle-off'} text-lg`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{localVariation.active ? 'Ativo' : 'Inativo'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financeiro' && (
                        <div className="space-y-6">
                            {/* Initial Stock Toggle - ONLY FOR NEW VARIATIONS OR DRAFTS */}
                            {(!localVariation.id || parentProduct?.id === undefined) && (
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <i className="bi bi-box-seam-fill text-blue-600"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Lançar Estoque Inicial?</h4>
                                            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Definir saldo e custos agora?</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleChange('launchInitialStock', !localVariation.launchInitialStock)}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${localVariation.launchInitialStock ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                    >
                                        {localVariation.launchInitialStock ? 'Sim' : 'Não'}
                                    </button>
                                </div>
                            )}

                            {localVariation.launchInitialStock && (
                                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
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
                                                initialStock: totalStock,
                                                initialCost: avgCost,
                                                stock: totalStock, // Legado compat
                                                costPrice: avgCost // Legado compat
                                            }) : null);
                                        }}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Venda</label>
                                        <button 
                                            type="button"
                                            onClick={() => handleChange('syncUnitPrice', !localVariation.syncUnitPrice)}
                                            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${localVariation.syncUnitPrice ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {localVariation.syncUnitPrice ? 'Sincronizado' : 'Manual'}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        disabled={localVariation.syncUnitPrice}
                                        value={localVariation.syncUnitPrice ? parentProduct?.unitPrice : localVariation.unitPrice}
                                        onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preço de Custo (Atual)</label>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                            <i className="bi bi-info-circle text-[8px]"></i>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Via Estoque</span>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        readOnly
                                        value={localVariation.syncCostPrice ? parentProduct?.costPrice : (localVariation.launchInitialStock ? localVariation.finalPurchasePrice : localVariation.costPrice)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none font-bold text-sm text-slate-400 cursor-not-allowed"
                                        title="O preço de custo é definido automaticamente pelas entradas de estoque"
                                    />
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight italic mt-1">
                                        * Este valor reflete a última entrada ou o custo inicial de lançamento
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{localVariation.launchInitialStock ? 'Quantidade de Entrada' : 'Estoque Atual'}</label>
                                    <input
                                        type="number"
                                        disabled={!!localVariation.id || localVariation.launchInitialStock}
                                        value={localVariation.launchInitialStock ? localVariation.initialStock : (localVariation.stock || 0)}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            if (localVariation.launchInitialStock) {
                                                handleChange('initialStock', val);
                                            } else {
                                                handleChange('stock', val);
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2 relative">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque Mínimo</label>
                                        <button
                                            type="button"
                                            onClick={calculateMinStock}
                                            disabled={isSyncingSales}
                                            className="text-[8px] font-black text-blue-600 hover:underline px-2 flex items-center gap-1"
                                        >
                                            <i className={`bi ${isSyncingSales ? 'bi-hourglass-split animate-spin' : 'bi-magic'}`}></i> Sugerir p/ Fórmula
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        value={localVariation.minStock || 0}
                                        onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                    />
                                    
                                    {stats && stats.lt > 0 && (
                                        <div className="absolute -bottom-6 left-0 right-0 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 pt-2">
                                            <span>Giro: {stats.giro}/mês</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            <span>LT: {stats.lt}d</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logistica' && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <i className="bi bi-rulers"></i> Dimensões do Produto Vendido
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (parentProduct) {
                                                setLocalVariation(prev => prev ? ({
                                                    ...prev,
                                                    width: parentProduct.width,
                                                    height: parentProduct.height,
                                                    depth: parentProduct.depth,
                                                    weight: parentProduct.weight
                                                }) : null);
                                                toast.info("Dimensões do pai aplicadas!");
                                            }
                                        }}
                                        className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                                    >
                                        Copiar do Pai
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Largura (cm)</label>
                                        <input
                                            type="number"
                                            value={localVariation.width || ''}
                                            onChange={(e) => handleChange('width', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Altura (cm)</label>
                                        <input
                                            type="number"
                                            value={localVariation.height || ''}
                                            onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profundidade (cm)</label>
                                        <input
                                            type="number"
                                            value={localVariation.depth || ''}
                                            onChange={(e) => handleChange('depth', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Peso Bruto (kg)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={localVariation.weight || ''}
                                            onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                        <i className="bi bi-box-seam"></i> Dimensões de Embalagem (Frete)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (parentProduct) {
                                                setLocalVariation(prev => prev ? ({
                                                    ...prev,
                                                    pkgWidth: parentProduct.pkgWidth,
                                                    pkgHeight: parentProduct.pkgHeight,
                                                    pkgDepth: parentProduct.pkgDepth
                                                }) : null);
                                                toast.info("Embalagem do pai aplicada!");
                                            }
                                        }}
                                        className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                                    >
                                        Copiar do Pai
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Largura (cm)</label>
                                        <input
                                            type="number"
                                            value={localVariation.pkgWidth || ''}
                                            onChange={(e) => handleChange('pkgWidth', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Altura (cm)</label>
                                        <input
                                            type="number"
                                            value={localVariation.pkgHeight || ''}
                                            onChange={(e) => handleChange('pkgHeight', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profund. (cm)</label>
                                        <input
                                            type="number"
                                            value={localVariation.pkgDepth || ''}
                                            onChange={(e) => handleChange('pkgDepth', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketplace' && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                    Título Marketplace (Específico)
                                    <InfoTooltip title="Título Específico da Variação">
                                        Use este campo se quiser que esta variação tenha um nome diferente do padrão em canais de venda.
                                        <br/><br/>
                                        <b>Dica:</b> Útil se uma cor específica for muito buscada por um nome diferenciado. Se deixar vazio, usaremos o nome automático.
                                    </InfoTooltip>
                                </label>
                                <input
                                    type="text"
                                    value={localVariation.marketplaceTitle || ''}
                                    onChange={(e) => handleChange('marketplaceTitle', e.target.value.toUpperCase())}
                                    className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none text-sm font-bold"
                                    placeholder="DEIXE VAZIO PARA USAR O TÍTULO PADRÃO"
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Se deixado em branco, o sistema utilizará o título gerado automaticamente.</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                    Descrição Específica E-commerce
                                    <InfoTooltip title="Descrição da Variação">
                                        Explique detalhes que são exclusivos desta variação.
                                        <br/><br/>
                                        <b>Dica:</b> Se o material ou acabamento mudar entre as variações, descreva aqui para sanar dúvidas do cliente antes da compra.
                                    </InfoTooltip>
                                </label>
                                <textarea
                                    value={localVariation.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value.toUpperCase())}
                                    className="w-full h-48 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none text-xs font-bold leading-relaxed resize-none"
                                    placeholder="ESPECIFICAÇÕES TÉCNICAS ADICIONAIS PARA ESTA VARIAÇÃO..."
                                />
                            </div>

                            {/* WhatsApp Sync Controls for Variation */}
                            <div className="p-6 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/10 flex flex-col gap-4 mt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                            <i className="bi bi-whatsapp"></i> Publicar no WhatsApp?
                                        </h5>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Sincronizar esta variação individualmente</p>
                                    </div>
                                    <div 
                                        onClick={() => handleChange('whatsappSync', !localVariation.whatsappSync)}
                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${localVariation.whatsappSync ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${localVariation.whatsappSync ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-emerald-500/5 pt-4">
                                    <div className="flex flex-col gap-1">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                            <i className="bi bi-arrow-repeat"></i> Auto-Sync p/ Estoque
                                        </h5>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter italic">Se estoque for 0, marca como "Esgotado"</p>
                                    </div>
                                    <div 
                                        onClick={() => handleChange('whatsappAutoSync', !localVariation.whatsappAutoSync)}
                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${localVariation.whatsappAutoSync ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${localVariation.whatsappAutoSync ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fotos' && (
                        <div className="space-y-8">
                            <div className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Sua Seleção (Arraste para Reordenar)</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Estas são as fotos que aparecerão para esta variação. A primeira é a principal.</p>
                            </div>

                            {localVariation.images && localVariation.images.length > 0 ? (
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="variation-photos" direction="horizontal">
                                        {(provided) => (
                                            <div 
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="flex flex-wrap gap-4"
                                            >
                                                {localVariation.images?.map((url, idx) => (
                                                    <Draggable key={url} draggableId={url} index={idx}>
                                                        {(provided, snapshot) => (
                                                            <div 
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all shadow-md ${snapshot.isDragging ? 'ring-4 ring-blue-500 scale-110 z-50' : 'border-blue-100 dark:border-blue-900/30'}`}
                                                            >
                                                                <img src={url} alt={`Var ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); toggleGalleryImage(url); }}
                                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-md flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
                                                                >
                                                                    <i className="bi bi-x"></i>
                                                                </button>
                                                                {idx === 0 && (
                                                                    <div className="absolute inset-x-0 bottom-0 bg-emerald-500 text-white text-[7px] font-black uppercase text-center py-0.5">
                                                                        Principal
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            ) : (
                                <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400">
                                    <i className="bi bi-image text-2xl opacity-20"></i>
                                    <p className="text-[9px] font-black uppercase tracking-widest">Nenhuma foto selecionada</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col gap-2 mb-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Galeria Disponível (Produto Pai)</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Clique nas fotos para incluir ou remover desta variação.</p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {parentProduct?.images && parentProduct.images.length > 0 ? (
                                        parentProduct.images.map((url, idx) => {
                                            const isSelected = localVariation.images?.includes(url);
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => toggleGalleryImage(url)}
                                                    className={`relative group aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-4 ${isSelected ? 'border-blue-600 opacity-40 grayscale-sm' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                                                >
                                                    <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                                    
                                                    {isSelected && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg">
                                                                <i className="bi bi-check-lg text-lg" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300">
                                                <i className="bi bi-images text-2xl"></i>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Galeria Vazia</p>
                                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter mt-1">Adicione fotos na aba principal do produto pai primeiro.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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
