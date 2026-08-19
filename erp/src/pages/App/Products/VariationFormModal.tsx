import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Product, { Variation, InitialStockEntry } from '../../types/product.type';
import { saveVariation, generateVariationSku, parseVariationImages } from '@/pages/utils/productService';
import { toast } from "react-toastify";
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import DropdownPortal from '@/components/shared/DropdownPortal';
import CurrencyInput from '@/components/CurrencyInput';
import InitialStockList from './components/InitialStockList';
import { getSettings } from '@/pages/utils/settingsService';

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
    const [activeTab, setActiveTab] = useState<'identificacao' | 'fotos' | 'estoque' | 'fiscal' | 'tecnico'>('identificacao');
    
    // States for global attributes from database
    const [dbAttributes, setDbAttributes] = useState<{ id: string; name: string }[]>([]);
    const [dbAttributeValues, setDbAttributeValues] = useState<{ id: string; attribute_id: string; value: string }[]>([]);
    
    // Dialog fast CRUD attributes
    const [isFastCreateOpen, setIsFastCreateOpen] = useState(false);
    const [fastAttrName, setFastAttrName] = useState("");
    const [fastAttrValues, setFastAttrValues] = useState<string[]>([]);
    const [fastAttrValInput, setFastAttrValInput] = useState("");
    const [editingAttrId, setEditingAttrId] = useState<string | null>(null);

    // Form data
    const [formData, setFormData] = useState<Variation | null>(null);
    const [allParentImages, setAllParentImages] = useState<string[]>([]);
    const [diferenciarTitulo, setDiferenciarTitulo] = useState<boolean>(false);

    useEffect(() => {
        if (formData && !diferenciarTitulo) {
            // Sincroniza se desativado
            if (formData.title !== formData.name) {
                setFormData(prev => prev ? { ...prev, title: prev.name, marketplaceTitle: prev.name } : null);
            }
        }
    }, [formData?.name, diferenciarTitulo]);

    // Discount helper states
    const [varDiscountPercent, setVarDiscountPercent] = useState("");
    const [varDiscountFixed, setVarDiscountFixed] = useState("");

    const getDefaultVariationName = (attributes: Variation['attributes'] = []) => {
        const parentName = (parentProduct.name || parentProduct.description || '').trim();
        const attributeValues = attributes.map(attribute => attribute.value).filter(Boolean);
        if (attributeValues.length > 0) {
            return [parentName, ...attributeValues].filter(Boolean).join(' ');
        }
        return parentName || 'Variação';
    };

    const getDefaultVariationTitle = (attributes: Variation['attributes'] = []) => {
        const parentTitle = (parentProduct.title || parentProduct.marketplaceTitle || parentProduct.name || parentProduct.description || '').trim();
        const attributeValues = attributes.map(attribute => attribute.value).filter(Boolean);
        if (attributeValues.length > 0) {
            return [parentTitle, ...attributeValues].filter(Boolean).join(' ');
        }
        return parentTitle || 'Variação';
    };

    const fetchDbAttributes = async () => {
        try {
            const [attrRes, valRes] = await Promise.all([
                supabase.from("attributes").select("*").order("name"),
                supabase.from("attribute_values").select("*").order("value")
            ]);
            setDbAttributes((attrRes.data || []) as { id: string; name: string }[]);
            setDbAttributeValues((valRes.data || []) as { id: string; attribute_id: string; value: string }[]);
        } catch (err) {
            console.error("Erro ao buscar atributos globais:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const realParentId = parentProduct?.parentId || parentId || parentProduct?.id;
            if (realParentId) {
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
        }
    }, [isOpen, parentProduct, parentId]);

    useEffect(() => {
        if (isOpen) {
            fetchDbAttributes();
            setActiveTab('identificacao');
            if (variation) {
                setFormData({
                    ...variation,
                    title: variation.title || variation.marketplaceTitle || '',
                    images: parseVariationImages((variation as any).image_url, variation.images),
                    syncUnitPrice: variation.syncUnitPrice ?? true,
                    syncDescription: variation.syncDescription ?? true,
                    syncCostPrice: variation.syncCostPrice ?? true,
                    syncFiscal: variation.syncFiscal ?? true
                });
                setDiferenciarTitulo(Boolean(variation.title && variation.title !== variation.name) || Boolean(variation.marketplaceTitle && variation.marketplaceTitle !== variation.name));
                
                const orig = Number(variation.syncUnitPrice ? parentProduct.unitPrice : variation.unitPrice || 0);
                const promo = Number(variation.syncUnitPrice ? parentProduct.promoPrice : variation.promoPrice || 0);
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
                const varIndex = (parentProduct.variations || []).length;
                const parentCode = parentProduct.code || '000000';
                setFormData({
                    id: crypto.randomUUID(),
                    sku: generateVariationSku(parentCode, varIndex),
                    name: getDefaultVariationName([]),
                    title: getDefaultVariationTitle([]),
                    marketplaceTitle: getDefaultVariationTitle([]),
                    stock: 0,
                    unitPrice: parentProduct.unitPrice || 0,
                    costPrice: parentProduct.costPrice || 0,
                    active: true,
                    attributes: [{ name: "", value: "", showName: true }],
                    images: [],
                    syncUnitPrice: true,
                    syncDescription: true,
                    syncCostPrice: true,
                    syncFiscal: true,
                    fiscal: {
                        ncm: parentProduct.fiscal?.ncm || '',
                        cest: parentProduct.fiscal?.cest || '',
                        origem: parentProduct.fiscal?.origem || '0',
                        cst: parentProduct.fiscal?.cst || '',
                        cfop: parentProduct.fiscal?.cfop || '',
                        pisCst: parentProduct.fiscal?.pisCst || '',
                        cofinsCst: parentProduct.fiscal?.cofinsCst || '',
                        icmsPercent: parentProduct.fiscal?.icmsPercent || 0,
                        ncmDescription: parentProduct.fiscal?.ncmDescription || ''
                    }
                });
                setVarDiscountPercent("");
                setVarDiscountFixed("");
            }
        }
    }, [variation, isOpen, parentProduct]);

    const handleFastSaveAttribute = async () => {
        if (!fastAttrName.trim()) {
            toast.error("Preencha o nome do atributo!");
            return;
        }
        if (fastAttrValues.length === 0) {
            toast.error("Adicione pelo menos um valor!");
            return;
        }

        try {
            if (editingAttrId) {
                const { error: attrErr } = await supabase
                    .from("attributes")
                    .update({ name: fastAttrName.trim() })
                    .eq("id", editingAttrId);

                if (attrErr) throw attrErr;

                const { error: delErr } = await supabase
                    .from("attribute_values")
                    .delete()
                    .eq("attribute_id", editingAttrId);

                if (delErr) throw delErr;

                const valuesToInsert = fastAttrValues.map(val => ({
                    attribute_id: editingAttrId,
                    value: val
                }));
                const { error: valErr } = await supabase.from("attribute_values").insert(valuesToInsert);
                if (valErr) throw valErr;

                toast.success("Atributo atualizado com sucesso!");
                await fetchDbAttributes();
            } else {
                const { data: attr, error: attrErr } = await supabase
                    .from("attributes")
                    .insert([{ name: fastAttrName.trim() }])
                    .select()
                    .single();

                if (attrErr) throw attrErr;

                const valuesToInsert = fastAttrValues.map(val => ({
                    attribute_id: attr.id,
                    value: val
                }));
                const { error: valErr } = await supabase.from("attribute_values").insert(valuesToInsert);
                if (valErr) throw valErr;

                toast.success("Atributo criado com sucesso!");
                await fetchDbAttributes();
            }

            setIsFastCreateOpen(false);
            setFastAttrName("");
            setFastAttrValues([]);
            setFastAttrValInput("");
            setEditingAttrId(null);
        } catch (err: any) {
            toast.error("Erro ao salvar atributo: " + err.message);
        }
    };

    const handleKeyDownFastAttrVal = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = fastAttrValInput.trim().replace(/,/g, "");
            if (val) {
                if (fastAttrValues.includes(val)) {
                    toast.error("Este valor já foi adicionado!");
                    return;
                }
                setFastAttrValues(prev => [...prev, val]);
            }
            setFastAttrValInput("");
        } else if (e.key === "Backspace" && !fastAttrValInput) {
            setFastAttrValues(prev => prev.slice(0, -1));
        }
    };

    const handlePriceChange = (valStr: string) => {
        if (!formData) return;
        const newPrice = parseFloat(valStr) || 0;
        setFormData(prev => prev ? { ...prev, unitPrice: newPrice, syncUnitPrice: false } : null);
        
        const orig = newPrice;
        if (orig <= 0) {
            setVarDiscountPercent("");
            setVarDiscountFixed("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        if (varDiscountPercent) {
            const pct = parseFloat(varDiscountPercent);
            if (!isNaN(pct)) {
                const fixed = orig * (pct / 100);
                setVarDiscountFixed(fixed.toFixed(2));
                const promo = orig - fixed;
                setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 } : null);
            }
        }
    };

    const handleDiscountPercentChange = (valStr: string) => {
        if (!formData) return;
        setVarDiscountPercent(valStr);
        const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
        if (orig <= 0 || valStr === "") {
            setVarDiscountFixed("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const pct = parseFloat(valStr);
        if (isNaN(pct) || pct < 0) {
            setVarDiscountFixed("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const fixed = orig * (pct / 100);
        setVarDiscountFixed(fixed.toFixed(2));
        const promo = orig - fixed;
        setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncUnitPrice: false } : null);
    };

    const handleDiscountFixedChange = (valStr: string) => {
        if (!formData) return;
        setVarDiscountFixed(valStr);
        const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
        if (orig <= 0 || valStr === "") {
            setVarDiscountPercent("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const fixed = parseFloat(valStr);
        if (isNaN(fixed) || fixed < 0) {
            setVarDiscountPercent("");
            setFormData(prev => prev ? { ...prev, promoPrice: undefined } : null);
            return;
        }

        const pct = (fixed / orig) * 100;
        setVarDiscountPercent(pct.toFixed(1));
        const promo = orig - fixed;
        setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0, syncUnitPrice: false } : null);
    };

    const handlePromoPriceFieldChange = (valStr: string) => {
        if (!formData) return;
        const promo = parseFloat(valStr) || 0;
        setFormData(prev => prev ? { ...prev, promoPrice: promo > 0 ? promo : undefined, syncUnitPrice: false } : null);
        
        const orig = Number(formData.syncUnitPrice ? parentProduct.unitPrice : formData.unitPrice || 0);
        if (orig <= 0 || valStr === "" || promo >= orig) {
            setVarDiscountPercent("");
            setVarDiscountFixed("");
            return;
        }

        const fixed = orig - promo;
        const pct = (fixed / orig) * 100;
        setVarDiscountFixed(fixed.toFixed(2));
        setVarDiscountPercent(pct.toFixed(1));
    };

    const updateCost = (fields: Partial<Variation>) => {
        setFormData(prev => {
            if (!prev) return null;
            const next = { ...prev, ...fields, syncCostPrice: false };
            const cost = next.costPrice || 0;
            const ipi = next.ipiPercent || 0;
            const freight = next.freightCost || 0;
            const freightType = next.freightType || 'fixed';

            let finalCost = cost + (cost * (ipi / 100));
            if (freightType === 'fixed') {
                finalCost += freight;
            } else {
                finalCost += cost * (freight / 100);
            }

            next.finalPurchasePrice = Number(finalCost.toFixed(2));
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        if (!formData.images || formData.images.length === 0) {
            toast.error("Vincule pelo menos uma foto para esta variação!");
            setActiveTab('fotos');
            return;
        }

        if (!formData.name.trim()) {
            toast.error("O título da variação é obrigatório!");
            setActiveTab('identificacao');
            return;
        }

        setLoading(true);
        try {
            await saveVariation(parentId, {
                ...formData,
                sku: formData.sku || 'VAR-' + Math.random().toString(36).substring(2, 10).toUpperCase()
            });
            toast.success("Variação salva com sucesso!");
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

    const parentImages = allParentImages.length > 0 ? allParentImages : (parentProduct.images || []);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
                <div 
                    className="relative bg-white dark:bg-slate-900 w-full max-w-full h-full md:max-w-[96vw] md:h-[96vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800"
                >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            {variation ? "Editar Variação" : "Criar Variação"}
                            <span className="text-slate-400 text-xs font-normal">| {parentProduct.name || parentProduct.description || "Produto Pai"}</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                            Configure os dados específicos desta variação.
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all self-end sm:self-auto">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="px-6 border-b border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10 overflow-x-auto scrollbar-none">
                    <div className="flex gap-6 min-w-max">
                        {([
                            { id: 'identificacao', label: 'Identificação', icon: 'bi-info-circle' },
                            { id: 'fotos', label: 'Fotos', icon: 'bi-images' },
                            { id: 'tecnico', label: 'Inform. Técnicas', icon: 'bi-rulers' },
                            { id: 'estoque', label: 'Estoque e Precificação', icon: 'bi-box-seam' },
                            { id: 'fiscal', label: 'Tributário / NF', icon: 'bi-file-earmark-text' },
                        ]).map((tab: any) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                <i className={`bi ${tab.icon}`}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar min-h-0">
                    
                    {/* Aba Identificação */}
                    {activeTab === 'identificacao' && (
                        <div className="space-y-6 animate-in fade-in duration-350">
                            {/* Nome do Produto Principal (Pai) */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Produto Principal (Pai)</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={parentProduct.name || parentProduct.description || ""}
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            {/* Linha com Nome (ERP) e Título (Catálogo) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Nome da Variação (ERP) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
                                            <span>Nome</span>
                                            <span className="text-red-500 ml-0.5">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newValue = !diferenciarTitulo;
                                                setDiferenciarTitulo(newValue);
                                                if (!newValue) {
                                                    setFormData(prev => prev ? ({
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
                                            {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título Catálogo'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nome interno da variação (ERP)..."
                                        value={formData.name || ""}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                    />
                                </div>

                                {/* Título da Variação (Catálogo) */}
                                {diferenciarTitulo ? (
                                    <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-200">
                                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                                            <span>Título no Catálogo</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Título exibido no catálogo digital..."
                                            value={formData.title || formData.marketplaceTitle || ""}
                                            onChange={e => setFormData({ ...formData, title: e.target.value, marketplaceTitle: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                                        />
                                    </div>
                                ) : (
                                    <div className="hidden sm:block p-2"></div>
                                )}
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                                        <span>Atributos da Variação</span>
                                        <span className="inline-flex items-center text-[9px] font-black bg-blue-100/60 dark:bg-blue-955/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/30 uppercase select-none">ERP</span>
                                        <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo Digital</span>
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsFastCreateOpen(true)}
                                            className="px-2 py-1 text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"
                                        >
                                            + Criar Atributo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const availableAttr = dbAttributes.find(a => !(formData.attributes || []).some(sel => sel.name === a.name));
                                                if (availableAttr) {
                                                    setFormData(prev => prev ? {
                                                        ...prev,
                                                        attributes: [...(prev.attributes || []), { name: availableAttr.name, value: "", showName: true }]
                                                    } : null);
                                                } else if (dbAttributes.length > 0) {
                                                    toast.error("Todos os atributos já foram adicionados.");
                                                }
                                            }}
                                            className="px-2 py-1 text-[9px] font-bold text-slate-600 bg-white dark:bg-slate-800 border rounded-lg"
                                        >
                                            + Vínculo
                                        </button>
                                    </div>
                                </div>

                                {(formData.attributes || []).length === 0 ? (
                                    <p className="text-xs text-slate-400 italic text-center py-2">Nenhum atributo vinculado.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {(formData.attributes || []).map((attr, idx) => {
                                            const currentAttr = dbAttributes.find(a => a.name === attr.name);
                                            const attrVals = currentAttr ? dbAttributeValues.filter(val => val.attribute_id === currentAttr.id) : [];

                                            return (
                                                <div key={idx} className="flex items-end gap-3 animate-in fade-in duration-200">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase">Atributo</label>
                                                        <select
                                                            value={attr.name}
                                                            onChange={e => {
                                                                const newName = e.target.value;
                                                                setFormData(prev => {
                                                                    if (!prev) return null;
                                                                    const updated = [...prev.attributes];
                                                                    updated[idx] = { ...updated[idx], name: newName, value: "" };
                                                                    const autoName = getDefaultVariationName(updated);
                                                                    const autoTitle = getDefaultVariationTitle(updated);
                                                                    return { 
                                                                        ...prev, 
                                                                        attributes: updated, 
                                                                        name: autoName,
                                                                        title: autoTitle,
                                                                        marketplaceTitle: autoTitle
                                                                    };
                                                                });
                                                            }}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                                                        >
                                                            <option value="">Selecione o atributo...</option>
                                                            {attr.name && !dbAttributes.some(a => a.name === attr.name) && (
                                                                <option value={attr.name}>{attr.name}</option>
                                                            )}
                                                            {dbAttributes.map(a => (
                                                                <option key={a.id} value={a.name} disabled={(formData.attributes || []).some(sel => sel.name === a.name && a.name !== attr.name)}>
                                                                    {a.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase">Valor</label>
                                                        <select
                                                            value={attr.value}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setFormData(prev => {
                                                                    if (!prev) return null;
                                                                    const updated = [...prev.attributes];
                                                                    updated[idx] = { ...updated[idx], value: val };
                                                                    const autoName = getDefaultVariationName(updated);
                                                                    const autoTitle = getDefaultVariationTitle(updated);
                                                                    return { 
                                                                        ...prev, 
                                                                        attributes: updated, 
                                                                        name: autoName,
                                                                        title: autoTitle,
                                                                        marketplaceTitle: autoTitle
                                                                    };
                                                                });
                                                            }}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                                                        >
                                                            <option value="">Selecione o valor...</option>
                                                            {attr.value && !attrVals.some(v => v.value === attr.value) && (
                                                                <option value={attr.value}>{attr.value}</option>
                                                            )}
                                                            {attrVals.map(val => (
                                                                <option key={val.id} value={val.value}>{val.value}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => {
                                                                if (!prev) return null;
                                                                const updated = prev.attributes.filter((_, i) => i !== idx);
                                                                const autoName = getDefaultVariationName(updated);
                                                                const autoTitle = getDefaultVariationTitle(updated);
                                                                return {
                                                                    ...prev,
                                                                    attributes: updated,
                                                                    name: autoName,
                                                                    title: autoTitle,
                                                                    marketplaceTitle: autoTitle
                                                                };
                                                            });
                                                        }}
                                                        className="h-9 w-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Aba Informações Técnicas */}
                    {activeTab === 'tecnico' && (
                        <div className="space-y-6 animate-in fade-in duration-350">

                            {/* Descrição */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <span>Descrição Específica da Variação</span>
                                    <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo Digital</span>
                                    <span className="text-slate-300 dark:text-slate-600 text-[9px]">(Opcional)</span>
                                </label>
                                <textarea
                                    placeholder="Descrição opcional para esta variação no catálogo..."
                                    value={formData.description || ""}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs resize-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>

                            {/* Dimensões e Peso */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Dimensões e Peso</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Largura (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min={0}
                                            value={formData.width || ''}
                                            onChange={e => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Altura (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min={0}
                                            value={formData.height || ''}
                                            onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Profund. (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min={0}
                                            value={formData.depth || ''}
                                            onChange={e => setFormData({ ...formData, depth: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Peso (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            value={formData.weight || ''}
                                            onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Aba Fotos */}
                    {activeTab === 'fotos' && (
                        <div className="space-y-4 animate-in fade-in duration-350">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5 h-6">
                                <span>Fotos do Produto Pai</span>
                                <span className="text-red-500">*</span>
                                <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo Digital</span>
                            </h3>
                            <p className="text-xs text-slate-500 bg-blue-50/50 dark:bg-blue-900/15 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/25">
                                Selecione as fotos que representam esta variação. As fotos selecionadas ficarão circuladas de azul.
                            </p>
                            {parentImages.length === 0 ? (
                                <div className="text-center p-8 border border-dashed rounded-2xl text-xs text-red-500 bg-red-50 dark:bg-red-955/20 font-bold">
                                    Nenhuma imagem cadastrada no produto principal. Adicione fotos na aba principal primeiro!
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {parentImages.map((url, imgIndex) => {
                                        const isSelected = formData.images?.includes(url);
                                        const selectIndex = formData.images?.indexOf(url) ?? -1;
                                        return (
                                            <button
                                                key={imgIndex}
                                                type="button"
                                                onClick={() => {
                                                    const currentImages = formData.images || [];
                                                    if (isSelected) {
                                                        setFormData({ ...formData, images: currentImages.filter(u => u !== url) });
                                                    } else {
                                                        setFormData({ ...formData, images: [...currentImages, url] });
                                                    }
                                                }}
                                                className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-4 ${
                                                    isSelected 
                                                        ? "border-blue-600 ring-4 ring-blue-500/50 scale-[1.03] shadow-md opacity-100" 
                                                        : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-blue-300"
                                                }`}
                                            >
                                                <img src={url} alt={`Foto ${imgIndex + 1}`} className="object-cover h-full w-full pointer-events-none" />
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                        <i className="bi bi-check-lg text-sm font-black" />
                                                    </div>
                                                )}
                                                {isSelected && selectIndex === 0 && (
                                                    <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow border border-white/40">
                                                        Capa
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Aba Estoque e Precificação */}
                    {activeTab === 'estoque' && (
                        <div className="space-y-6 animate-in fade-in duration-350">
                            
                            {/* Precificação e Venda */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Precificação de Venda</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextSync = !formData.syncUnitPrice;
                                            setFormData(prev => prev ? {
                                                ...prev,
                                                syncUnitPrice: nextSync,
                                                unitPrice: nextSync ? parentProduct.unitPrice : prev.unitPrice,
                                                promoPrice: nextSync ? parentProduct.promoPrice : prev.promoPrice
                                            } : null);
                                        }}
                                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl transition-all ${formData.syncUnitPrice ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                                    >
                                        {formData.syncUnitPrice ? "Preço Herdado do Pai" : "Preço Personalizado"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Preço de Venda */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Preço de Venda</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-blue-100/60 dark:bg-blue-955/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/30 uppercase select-none">ERP</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <CurrencyInput
                                            disabled={formData.syncUnitPrice}
                                            value={formData.syncUnitPrice ? (parentProduct.unitPrice || 0) : (formData.unitPrice || 0)}
                                            onChange={val => handlePriceChange(String(val))}
                                            className="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>

                                    {/* Desconto % */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Desconto (%)</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                disabled={formData.syncUnitPrice}
                                                placeholder="0"
                                                value={varDiscountPercent}
                                                onChange={e => handleDiscountPercentChange(e.target.value)}
                                                className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                        </div>
                                    </div>

                                    {/* Desconto R$ */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Desconto (R$)</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <CurrencyInput
                                            disabled={formData.syncUnitPrice}
                                            value={varDiscountFixed}
                                            onChange={val => handleDiscountFixedChange(String(val))}
                                            className="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>

                                    {/* Preço Promocional Final */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                            <span>Promo Final</span>
                                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                                        </label>
                                        <CurrencyInput
                                            placeholder="Sem desconto"
                                            disabled={formData.syncUnitPrice}
                                            value={formData.syncUnitPrice ? (parentProduct.promoPrice || "") : (formData.promoPrice || "")}
                                            onChange={val => handlePromoPriceFieldChange(String(val))}
                                            className="w-full text-left px-3 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/30 rounded-xl outline-none text-xs font-black text-amber-600 dark:text-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lançamento de Estoque Inicial com custo, IPI e Frete */}
                            {parentProduct?.isDraft && (
                                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                    <button
                                            type="button"
                                            onClick={() => setFormData(prev => prev ? { ...prev, launchInitialStock: !prev.launchInitialStock, stock: 0 } : null)}
                                            className={`w-full flex items-center justify-between p-4 transition-all ${
                                                formData.launchInitialStock
                                                    ? 'bg-blue-50 dark:bg-blue-900/10'
                                                    : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                formData.launchInitialStock
                                                    ? 'bg-blue-600 shadow-lg shadow-blue-500/30'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                            }`}>
                                                <i className={`bi bi-box-seam-fill text-sm ${
                                                    formData.launchInitialStock ? 'text-white' : 'text-slate-400'
                                                }`}></i>
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-black uppercase tracking-widest ${
                                                    formData.launchInitialStock
                                                        ? 'text-blue-700 dark:text-blue-400'
                                                        : 'text-slate-600 dark:text-slate-300'
                                                }`}>Lançamento de Estoque Inicial</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                                                    {formData.launchInitialStock
                                                        ? 'Informe a quantidade e custo de compra desta variação'
                                                        : 'Clique para cadastrar saldo inicial agora'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                            formData.launchInitialStock
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {formData.launchInitialStock ? 'Sim, Lançar' : 'Não Lançar'}
                                        </span>
                                    </button>

                                    {formData.launchInitialStock && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in slide-in-from-top-2 duration-200">
                                            <InitialStockList
                                                entries={formData.initialStockEntries || []}
                                                onChange={(entries) => {
                                                    const totalStock = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                                                    const avgCost = entries.length > 0
                                                        ? entries.reduce((acc, curr) => acc + (curr.finalUnitCost || 0), 0) / entries.length
                                                        : 0;

                                                    setFormData(prev => prev ? {
                                                        ...prev,
                                                        initialStockEntries: entries,
                                                        stock: totalStock,
                                                        initialStock: totalStock,
                                                        initialCost: avgCost,
                                                        ...(avgCost > 0 ? { costPrice: avgCost, syncCostPrice: false } : {})
                                                    } : null);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Estoque Mínimo */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                                        <i className="bi bi-exclamation-triangle-fill text-amber-500 text-[11px]"></i>
                                        <span>Estoque Mínimo (Alerta)</span>
                                        <span className="inline-flex items-center text-[9px] font-black bg-blue-100/60 dark:bg-blue-955/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/30 uppercase select-none">ERP</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minStock || ''}
                                        onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-black focus:ring-2 focus:ring-amber-500/20 text-amber-600 dark:text-amber-400"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Aba Tributário */}
                    {activeTab === 'fiscal' && (
                        <div className="space-y-6 animate-in fade-in duration-350">
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
                                    onClick={() => setFormData(prev => prev ? { ...prev, syncFiscal: !prev.syncFiscal } : null)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.syncFiscal ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {formData.syncFiscal ? 'Herdado do Pai' : 'Personalizado'}
                                </button>
                            </div>

                            {formData.syncFiscal ? (
                                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-3">
                                    <i className="bi bi-info-circle-fill text-blue-500 text-sm"></i>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Esta variação está herdando automaticamente as informações fiscais do produto pai ({parentProduct.fiscal?.ncm || "Sem NCM"}). Para customizar, altere para "Personalizado" acima.
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
                                                    value={formData.fiscal?.ncm || '94036000'}
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
                                                        setFormData({
                                                            ...formData,
                                                            fiscal: {
                                                                ...formData.fiscal!,
                                                                ncm: val,
                                                                ncmDescription: labels[val] || 'Móvel de madeira'
                                                            }
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
                                                    value={formData.fiscal?.ncm || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) } })}
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
                                                    value={formData.fiscal?.cest || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value } })}
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                                                >
                                                    <option value="">Sem Substituição Tributária (Nenhum)</option>
                                                    <option value="2806100">28.061.00 - Colchões e box-springs</option>
                                                    <option value="2806200">28.062.00 - Suportes para camas (Estrados)</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    maxLength={7}
                                                    value={formData.fiscal?.cest || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value.replace(/\D/g, '') } })}
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
                                            value={formData.fiscal?.ncmDescription || ''}
                                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, ncmDescription: e.target.value } })}
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
                                                value={formData.fiscal?.origem || '0'}
                                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, origem: e.target.value } })}
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
                                                value={formData.fiscal?.cst || '102'}
                                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cst: e.target.value } })}
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
                                                value={formData.fiscal?.cfop || '5102'}
                                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cfop: e.target.value } })}
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
                                                value={formData.fiscal?.icmsPercent || 0}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setFormData({
                                                        ...formData,
                                                        fiscal: {
                                                            ...formData.fiscal!,
                                                            icmsPercent: isNaN(val) ? 0 : val
                                                        }
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
                                                value={formData.fiscal?.pisCst || '49'}
                                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, pisCst: e.target.value } })}
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
                                                value={formData.fiscal?.cofinsCst || '49'}
                                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cofinsCst: e.target.value } })}
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
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-50 dark:border-slate-800 flex gap-4 shrink-0 bg-white dark:bg-slate-900 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? "Salvando..." : "Concluir Cadastro"}
                    </button>
                </div>
            </div>

            {/* Fast Create Attribute Modal */}
            {isFastCreateOpen && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsFastCreateOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Gerenciar Atributo Global</h3>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Nome do Atributo</label>
                            <input
                                type="text"
                                placeholder="Ex: Voltagem, Cor, Tamanho"
                                value={fastAttrName}
                                onChange={e => setFastAttrName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 font-sans">Valores (Enter ou vírgula para adicionar)</label>
                            <div className="min-h-12 flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border rounded-xl items-center">
                                {fastAttrValues.map((val, idx) => (
                                    <span key={idx} className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                        {val}
                                        <button type="button" onClick={() => setFastAttrValues(prev => prev.filter((_, i) => i !== idx))}>
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder={fastAttrValues.length === 0 ? "Ex: 110v, 220v..." : ""}
                                    value={fastAttrValInput}
                                    onChange={e => setFastAttrValInput(e.target.value)}
                                    onKeyDown={handleKeyDownFastAttrVal}
                                    className="flex-1 bg-transparent border-none outline-none text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsFastCreateOpen(false)}
                                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleFastSaveAttribute}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </>
        , document.body);
};

export default VariationFormModal;
