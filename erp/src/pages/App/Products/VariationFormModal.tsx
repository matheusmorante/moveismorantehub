import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Product, { Variation, InitialStockEntry } from '../../types/product.type';
import { saveVariation } from '@/pages/utils/productService';
import { toast } from "react-toastify";
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
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
    const [varStep, setVarStep] = useState(1);
    
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

    // Discount helper states
    const [varDiscountPercent, setVarDiscountPercent] = useState("");
    const [varDiscountFixed, setVarDiscountFixed] = useState("");

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
            fetchDbAttributes();
            setVarStep(1);
            if (variation) {
                setFormData({
                    ...variation,
                    syncUnitPrice: variation.syncUnitPrice ?? true,
                    syncDescription: variation.syncDescription ?? true,
                    syncCostPrice: variation.syncCostPrice ?? true
                });
                
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
                setFormData({
                    id: crypto.randomUUID(),
                    sku: "",
                    name: "",
                    stock: 0,
                    unitPrice: parentProduct.unitPrice || 0,
                    costPrice: parentProduct.costPrice || 0,
                    active: true,
                    attributes: [],
                    images: [],
                    syncUnitPrice: true,
                    syncDescription: true,
                    syncCostPrice: true
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        if (!formData.images || formData.images.length === 0) {
            toast.error("Vincule pelo menos uma foto para esta variação!");
            setVarStep(1);
            return;
        }

        if (!formData.name.trim()) {
            toast.error("O título da variação é obrigatório!");
            setVarStep(2);
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

    const parentImages = parentProduct.images || [];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div 
                className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden"
                style={{ height: 'min(85vh, 750px)' }}
            >
                {/* Header */}
                <div className="p-4 md:p-5 bg-slate-950 text-white space-y-3 flex-shrink-0 relative">
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                                {variation ? "Editar Variação" : "Nova Variação"}
                                <span className="text-white/50 text-xs font-normal">| {parentProduct.description || "Produto Pai"}</span>
                            </h2>
                            <p className="text-white/70 text-[10px] font-medium mt-1">
                                Configure os dados específicos desta variação.
                            </p>
                        </div>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded-full font-bold">
                            {varStep}/3
                        </span>
                    </div>
                    <div className="flex gap-1 mt-2">
                        {[1, 2, 3].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setVarStep(s)}
                                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold border-b-4 transition-all hover:bg-white/5 rounded-t-lg ${varStep === s ? "border-white text-white bg-white/10" : "border-white/20 text-white/60 hover:text-white/90"}`}
                            >
                                {s === 1 ? "1. Foto Vinculada" : s === 2 ? "2. Identificação & Preço" : "3. Ficha Técnica"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar min-h-0">
                    {/* Etapa 1: Foto Vinculada */}
                    {varStep === 1 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                                Vincular Foto <span className="text-red-500">*</span>
                            </h3>
                            <p className="text-xs text-slate-500 bg-blue-50/50 dark:bg-blue-900/15 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/25">
                                Selecione as fotos que representam esta variação. As imagens devem ser cadastradas no produto pai primeiro.
                            </p>
                            {parentImages.length === 0 ? (
                                <div className="text-center p-8 border border-dashed rounded-2xl text-xs text-red-500 bg-red-50 font-bold">
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
                                                className={`relative aspect-square rounded-2xl overflow-hidden border-4 bg-slate-50 transition-all ${isSelected ? "border-blue-600 scale-[1.03] shadow-md" : "border-transparent opacity-75 hover:opacity-100"}`}
                                            >
                                                <img src={url} alt={`Foto ${imgIndex + 1}`} className="object-cover h-full w-full" />
                                                {isSelected && (
                                                    <span className="absolute top-1 right-1 bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">
                                                        #{selectIndex + 1} Vinculada
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Etapa 2: Identificação & Preço */}
                    {varStep === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Nome / Título da Variante */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Título da Variante</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextUse = !formData.syncDescription;
                                            const comboName = (formData.attributes || [])
                                                .map(a => a.value)
                                                .filter(Boolean)
                                                .join(" / ");
                                            const autoName = comboName || "Padrão";
                                            setFormData(prev => prev ? {
                                                ...prev,
                                                syncDescription: nextUse,
                                                name: nextUse ? autoName : prev.name
                                            } : null);
                                        }}
                                        className={`px-2 py-1 text-[10px] font-bold rounded-lg ${formData.syncDescription ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" : "bg-slate-100 text-slate-700 dark:bg-slate-800"}`}
                                    >
                                        {formData.syncDescription ? "Gerar Automático" : "Personalizado"}
                                    </button>
                                </div>
                                {!formData.syncDescription ? (
                                    <input
                                        type="text"
                                        placeholder="Título personalizado da variante"
                                        value={formData.name || ""}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-100"
                                    />
                                ) : (
                                    <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border italic font-bold">
                                        {(() => {
                                            const comboName = (formData.attributes || [])
                                                .map(a => a.value)
                                                .filter(Boolean)
                                                .join(" / ");
                                            return comboName || "Padrão";
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Atributos Selector */}
                            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Atributos da Variação</h4>
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
                                                                    return { ...prev, attributes: updated };
                                                                });
                                                            }}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                                                        >
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
                                                                    
                                                                    // Se herda o título, atualiza o nome
                                                                    let newName = prev.name;
                                                                    if (prev.syncDescription) {
                                                                        newName = updated.map(a => a.value).filter(Boolean).join(" / ") || "Padrão";
                                                                    }
                                                                    
                                                                    return { ...prev, attributes: updated, name: newName };
                                                                });
                                                            }}
                                                            required
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {attrVals.map(val => (
                                                                <option key={val.id} value={val.value}>{val.value}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => prev ? {
                                                                ...prev,
                                                                attributes: prev.attributes.filter((_, i) => i !== idx)
                                                            } : null);
                                                        }}
                                                        className="h-9 w-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl flex items-center justify-center border"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* SKU / Preço */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">SKU Variação</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: SKU-VAR"
                                        value={formData.sku || ""}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500">Preço</label>
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
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${formData.syncUnitPrice ? "bg-blue-50 text-blue-600" : "bg-slate-100"}`}
                                        >
                                            {formData.syncUnitPrice ? "Herdado" : "Personalizado"}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        disabled={formData.syncUnitPrice}
                                        value={formData.syncUnitPrice ? (parentProduct.unitPrice || 0) : (formData.unitPrice || 0)}
                                        onChange={e => handlePriceChange(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Descontos e Preço Promocional se personalizado */}
                            {!formData.syncUnitPrice && (
                                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-dashed animate-in slide-in-from-top-1 duration-300">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500">% Desconto</label>
                                        <input
                                            type="number"
                                            value={varDiscountPercent}
                                            onChange={e => handleDiscountPercentChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500">Desconto R$</label>
                                        <input
                                            type="number"
                                            value={varDiscountFixed}
                                            onChange={e => handleDiscountFixedChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500">Promo final</label>
                                        <input
                                            type="number"
                                            value={formData.promoPrice || ""}
                                            onChange={e => handlePromoPriceFieldChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Etapa 3: Ficha Técnica */}
                    {varStep === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Medidas */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Dimensões da Variante</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500">Largura (cm)</span>
                                        <input
                                            type="number"
                                            placeholder="L"
                                            value={formData.width || ""}
                                            onChange={e => setFormData({ ...formData, width: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs text-center"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500">Profundidade (cm)</span>
                                        <input
                                            type="number"
                                            placeholder="P"
                                            value={formData.depth || ""}
                                            onChange={e => setFormData({ ...formData, depth: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs text-center"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500">Altura (cm)</span>
                                        <input
                                            type="number"
                                            placeholder="A"
                                            value={formData.height || ""}
                                            onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs text-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Descrição Personalizada */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500">Descrição Personalizada</label>
                                <textarea
                                    placeholder="Descrição opcional e específica para esta variação"
                                    value={formData.description || ""}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-xs resize-none"
                                />
                            </div>

                            {/* Estoque e alertas */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500">Estoque Inicial</label>
                                    <input
                                        type="number"
                                        value={formData.stock || 0}
                                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500">Estoque Mínimo (Alerta)</label>
                                    <input
                                        type="number"
                                        value={formData.minStock || 0}
                                        onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-50 dark:border-slate-800 flex gap-4 shrink-0 bg-white dark:bg-slate-900">
                    {varStep > 1 ? (
                        <button
                            type="button"
                            onClick={() => setVarStep(varStep - 1)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            Voltar
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            Cancelar
                        </button>
                    )}

                    {varStep < 3 ? (
                        <button
                            type="button"
                            onClick={() => setVarStep(varStep + 1)}
                            className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            Avançar
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            {loading ? "Salvando..." : "Concluir Cadastro"}
                        </button>
                    )}
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
    , document.body);
};

export default VariationFormModal;
