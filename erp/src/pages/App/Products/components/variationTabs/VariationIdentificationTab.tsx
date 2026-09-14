import React, { useState } from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { computeVariationName } from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';
import { toast } from 'react-toastify';

export interface DbAttributeItem {
    readonly id: string;
    readonly name: string;
}

export interface DbAttributeValueItem {
    readonly id: string;
    readonly attribute_id: string;
    readonly value: string;
}

interface VariationIdentificationTabProps {
    readonly formData: Variation;
    readonly setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    readonly parentProduct: Product;
    readonly diferenciarTitulo: boolean;
    readonly setDiferenciarTitulo: React.Dispatch<React.SetStateAction<boolean>>;
    readonly dbAttributes: readonly DbAttributeItem[];
    readonly dbAttributeValues: readonly DbAttributeValueItem[];
    readonly setIsManageAttributesOpen: (open: boolean) => void;
    readonly getDefaultVariationName: (attributes?: Variation['attributes']) => string;
    readonly getDefaultVariationTitle: (attributes?: Variation['attributes']) => string;
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
    const [openValueSuggestionsFor, setOpenValueSuggestionsFor] = useState<number | null>(null);

    const updateAttributeValue = (index: number, value: string) => {
        setFormData(prev => {
            if (!prev) return null;
            const updated = [...prev.attributes];
            updated[index] = { ...updated[index], value };
            const autoName = getDefaultVariationName(updated);
            const autoTitle = getDefaultVariationTitle(updated);
            return {
                ...prev,
                attributes: updated,
                name: autoName,
                title: autoTitle,
                marketplaceTitle: autoTitle,
            };
        });
    };

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
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            ⚠️ É obrigatório adicionar pelo menos um atributo e definir seu respectivo valor para salvar a variação.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(formData.attributes || []).map((attr, idx) => {
                            const currentAttr = dbAttributes.find(a => a.name === attr.name);
                            const attrVals = currentAttr ? dbAttributeValues.filter(val => val.attribute_id === currentAttr.id) : [];
                            const isNameMissing = !String(attr.name || '').trim();
                            const isValMissing = !String(attr.value || '').trim();

                            return (
                                <div key={idx} className="flex items-end gap-3 animate-in fade-in duration-200">
                                    <div className="relative flex-1 space-y-1">
                                        <label className="text-[9px] text-slate-400 font-bold uppercase flex items-center justify-between">
                                            <span>Atributo <span className="text-red-500">*</span></span>
                                            {isNameMissing && <span className="text-red-500 font-bold text-[8px]">Obrigatório</span>}
                                        </label>
                                        <select
                                            value={attr.name}
                                            onChange={e => {
                                                const newName = toTitleCase(e.target.value);
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
                                            className={`w-full bg-transparent border-b-2 border-t-0 border-x-0 outline-none px-1 py-2 text-xs font-bold transition-all ${
                                                isNameMissing
                                                    ? 'border-red-500 text-red-600 dark:text-red-400'
                                                    : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400'
                                            }`}
                                        >
                                            <option value="">Selecione um atributo...</option>
                                            {dbAttributes.map(a => (
                                                <option key={a.id} value={a.name}>{toTitleCase(a.name)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] text-slate-400 font-bold uppercase flex items-center justify-between">
                                            <span>Valor <span className="text-red-500">*</span></span>
                                            {isValMissing && <span className="text-red-500 font-bold text-[8px]">Defina o valor</span>}
                                        </label>
                                        <input
                                            type="text"
                                            aria-label={`Pesquisar valor para ${attr.name || 'atributo'}`}
                                            placeholder={attr.name ? 'Pesquise ou digite um novo valor...' : 'Selecione o atributo primeiro...'}
                                            disabled={!attr.name}
                                            value={attr.value}
                                            onFocus={() => setOpenValueSuggestionsFor(idx)}
                                            onBlur={() => {
                                                setOpenValueSuggestionsFor(current => current === idx ? null : current);
                                                const formatted = toTitleCase(attr.value);
                                                if (formatted !== attr.value) updateAttributeValue(idx, formatted);
                                            }}
                                            onChange={e => {
                                                updateAttributeValue(idx, e.target.value);
                                                setOpenValueSuggestionsFor(idx);
                                            }}
                                            className={`w-full bg-transparent border-b-2 border-t-0 border-x-0 outline-none px-1 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                                isValMissing
                                                    ? 'border-red-500 text-red-600 dark:text-red-400 placeholder:text-red-300'
                                                    : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400'
                                            }`}
                                        />
                                        {openValueSuggestionsFor === idx && attr.name && (
                                            <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                                {attrVals
                                                    .filter(option => option.value.toLocaleLowerCase('pt-BR').includes(attr.value.toLocaleLowerCase('pt-BR')))
                                                    .map(option => (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onMouseDown={event => event.preventDefault()}
                                                            onClick={() => {
                                                                updateAttributeValue(idx, toTitleCase(option.value));
                                                                setOpenValueSuggestionsFor(null);
                                                            }}
                                                            className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                                                        >
                                                            {toTitleCase(option.value)}
                                                        </button>
                                                    ))}
                                                {attrVals.length === 0 && (
                                                    <p className="px-3 py-2 text-xs text-slate-500">Digite para criar o primeiro valor deste atributo.</p>
                                                )}
                                                {attrVals.length > 0 && !attrVals.some(option => option.value.toLocaleLowerCase('pt-BR').includes(attr.value.toLocaleLowerCase('pt-BR'))) && (
                                                    <p className="px-3 py-2 text-xs text-slate-500">Nenhuma sugestão encontrada. Você pode usar o valor digitado.</p>
                                                )}
                                            </div>
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
