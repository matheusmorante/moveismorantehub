import React from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { computeVariationName } from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';
import { toast } from 'react-toastify';

interface VariationIdentificationTabProps {
    formData: Variation;
    setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    parentProduct: Product;
    diferenciarTitulo: boolean;
    setDiferenciarTitulo: React.Dispatch<React.SetStateAction<boolean>>;
    dbAttributes: { id: string; name: string }[];
    dbAttributeValues: { id: string; attribute_id: string; value: string }[];
    setIsManageAttributesOpen: (open: boolean) => void;
    getDefaultVariationName: (attributes?: Variation['attributes']) => string;
    getDefaultVariationTitle: (attributes?: Variation['attributes']) => string;
}

export const VariationIdentificationTab: React.FC<VariationIdentificationTabProps> = ({
    formData,
    setFormData,
    parentProduct,
    diferenciarTitulo,
    setDiferenciarTitulo,
    dbAttributes,
    dbAttributeValues,
    setIsManageAttributesOpen,
    getDefaultVariationName,
    getDefaultVariationTitle
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-350">
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
                            {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título no Catálogo'}
                        </button>
                    </div>
                    <input
                        type="text"
                        readOnly
                        disabled
                        placeholder="Nome interno da variação (ERP)..."
                        value={computeVariationName(parentProduct.name || parentProduct.description || '', formData.attributes)}
                        className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                        title="O nome da variação é fixo e gerado automaticamente (Nome do Pai + Valoração dos Atributos)"
                    />
                </div>

                {/* Título da Variação (Catálogo) */}
                {diferenciarTitulo ? (
                    <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-200">
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                            <span>Título no Catálogo</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Título exibido no catálogo digital..."
                            value={formData.title || formData.marketplaceTitle || ""}
                            onChange={e => setFormData({ ...formData, title: e.target.value, marketplaceTitle: e.target.value })}
                            onBlur={() => {
                                const current = formData.title || formData.marketplaceTitle || '';
                                if (current) {
                                    const formatted = toTitleCase(current);
                                    if (formatted !== current) {
                                        setFormData(prev => prev ? ({ ...prev, title: formatted, marketplaceTitle: formatted }) : null);
                                    }
                                }
                            }}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all font-mono"
                        />
                    </div>
                ) : null}
            </div>

            {/* Atributos da Variação */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                        <span>Atributos da Variação</span>
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsManageAttributesOpen(true)}
                            className="px-2 py-1 text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            Gerenciar Atributos
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
                            Adicionar
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
                                            className="w-full bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none px-1 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                                        >
                                            <option value="">Selecione um atributo...</option>
                                            {dbAttributes.map(a => (
                                                <option key={a.id} value={a.name}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-slate-400 font-bold uppercase">Valor</label>
                                        {attrVals.length > 0 ? (
                                            <select
                                                value={attr.value}
                                                onChange={e => {
                                                    const newVal = e.target.value;
                                                    setFormData(prev => {
                                                        if (!prev) return null;
                                                        const updated = [...prev.attributes];
                                                        updated[idx] = { ...updated[idx], value: newVal };
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
                                                className="w-full bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none px-1 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                                            >
                                                <option value="">Selecione o valor...</option>
                                                {attrVals.map(v => (
                                                    <option key={v.id} value={v.value}>{v.value}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Ex: Vermelho, G..."
                                                value={attr.value}
                                                onChange={e => {
                                                    const newVal = e.target.value;
                                                    setFormData(prev => {
                                                        if (!prev) return null;
                                                        const updated = [...prev.attributes];
                                                        updated[idx] = { ...updated[idx], value: newVal };
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
                                                className="w-full bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none px-1 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                                            />
                                        )}
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
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Remover atributo"
                                    >
                                        <i className="bi bi-trash text-sm"></i>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
