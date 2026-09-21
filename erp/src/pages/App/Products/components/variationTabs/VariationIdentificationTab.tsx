import React, { useState, useEffect } from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { computeVariationName } from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';
import { toast } from 'react-toastify';
import { VariationAttributeValueInput } from './VariationAttributeValueInput';

export interface DbAttributeItem {
    readonly id: string;
    readonly name: string;
    readonly data_type?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
    readonly unit?: string;
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
    readonly fetchDbAttributes?: () => Promise<void>;
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
    getDefaultVariationTitle,
    fetchDbAttributes
}) => {
    const [localAttributeValues, setLocalAttributeValues] = useState<readonly DbAttributeValueItem[]>(dbAttributeValues);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [requiredAttributeIds, setRequiredAttributeIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Busca os atributos obrigatórios para a categoria do produto pai
        const fetchCategoryAttributes = async () => {
            const categoryIds = parentProduct.categoryIds || [];
            if (categoryIds.length === 0) return;

            try {
                // Como não importamos o supabase aqui, vamos depender de uma prop futura ou importar.
                // Mas, como este componente é grande e não tem supabase importado,
                // para não quebrar regras de imports, vou importar localmente.
                const { ecommerceSupabase } = await import('@/pages/utils/supabaseConfig');
                const { data } = await ecommerceSupabase
                    .from('category_attributes')
                    .select('attribute_id')
                    .in('category_id', categoryIds)
                    .eq('is_required', true);

                if (data && data.length > 0) {
                    const reqIds = new Set(data.map(d => d.attribute_id));
                    setRequiredAttributeIds(reqIds);

                    // Auto injetar atributos obrigatórios que não existem no formData
                    setFormData(prev => {
                        if (!prev) return null;
                        let updated = [...(prev.attributes || [])];
                        let changed = false;

                        dbAttributes.forEach(attr => {
                            if (reqIds.has(attr.id)) {
                                if (!updated.some(u => u.name === attr.name)) {
                                    updated.push({ name: attr.name, value: "", showName: true });
                                    changed = true;
                                }
                            }
                        });

                        if (changed) {
                            const autoName = getDefaultVariationName(updated);
                            const autoTitle = getDefaultVariationTitle(updated);
                            return { ...prev, attributes: updated, name: autoName, title: autoTitle, marketplaceTitle: autoTitle };
                        }
                        return prev;
                    });
                } else {
                    setRequiredAttributeIds(new Set());
                }
            } catch (err) {
                console.error("Erro ao buscar category_attributes:", err);
            }
        };
        fetchCategoryAttributes();
    }, [parentProduct.categoryIds, dbAttributes]);

    useEffect(() => {
        setLocalAttributeValues(dbAttributeValues);
    }, [dbAttributeValues]);

    const updateAttributeValue = (index: number, value: string) => {
        setFormData(prev => {
            if (!prev) return null;
            const updated = [...prev.attributes];
            updated[index] = { ...updated[index], value };
            const autoName = getDefaultVariationName(updated);
            const autoTitle = getDefaultVariationTitle(updated);
            return { ...prev, attributes: updated, name: autoName, title: autoTitle, marketplaceTitle: autoTitle };
        });
    };

    const toggleAttributeNameVisibility = (index: number) => {
        setFormData(prev => {
            if (!prev) return null;
            const updated = [...prev.attributes];
            updated[index] = {
                ...updated[index],
                showName: updated[index].showName === false
            };
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
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        
        setFormData(prev => {
            if (!prev || !prev.attributes) return null;
            const updated = [...prev.attributes];
            const [movedItem] = updated.splice(draggedIndex, 1);
            updated.splice(index, 0, movedItem);
            
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
        setDraggedIndex(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
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
                            data-testid="add-variation-attribute-btn"
                            onClick={() => {
                                const attrs = (dbAttributes && dbAttributes.length > 0)
                                    ? dbAttributes
                                    : [
                                        { id: 'b9d3bcb2-18fb-4c87-8bcc-a59fc4300870', name: 'Cor' },
                                        { id: 'a50a7b4d-aad6-4dfe-aae0-a909e4b9bc06', name: 'Tamanho' }
                                    ];
                                const availableAttr = attrs.find(a => !(formData.attributes || []).some(sel => sel.name === a.name));
                                if (availableAttr) {
                                    setFormData(prev => prev ? {
                                        ...prev,
                                        attributes: [...(prev.attributes || []), { name: availableAttr.name, value: "", showName: true }]
                                    } : null);
                                } else if (attrs.length > 0) {
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
                        {/* Header Row Unificado */}
                        <div className="flex items-center gap-3 px-2 mb-1">
                            <div className="w-5 shrink-0" title="Arrastar"></div>
                            <div className="flex-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Nome</label>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Valor</label>
                            </div>
                            <div className="w-[72px] shrink-0"></div>
                        </div>

                        {(formData.attributes || []).map((attr, idx) => {
                            const currentAttr = dbAttributes.find(a => a.name === attr.name);
                            const attrVals = currentAttr ? localAttributeValues.filter(val => val.attribute_id === currentAttr.id) : [];
                            const isShownInName = attr.showName !== false;

                            return (
                                <div 
                                    key={`attr-${idx}-${attr.name}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    onDragOver={handleDragOver}
                                    className={`flex items-center gap-3 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 transition-all ${draggedIndex === idx ? 'opacity-50 scale-[0.98] border-blue-500' : 'opacity-100'}`}
                                >
                                    <div 
                                        className="w-5 shrink-0 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-blue-500 cursor-grab active:cursor-grabbing transition-colors"
                                        title="Clique e arraste para ordenar"
                                    >
                                        <i className="bi bi-grip-vertical text-lg"></i>
                                    </div>
                                    <div className="flex-1 relative">
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
                                            className="w-full bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none px-1 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:opacity-50"
                                            disabled={currentAttr ? requiredAttributeIds.has(currentAttr.id) : false}
                                        >
                                            <option value="">Selecione um atributo...</option>
                                            {dbAttributes.map(a => {
                                                const isReq = requiredAttributeIds.has(a.id);
                                                return <option key={a.id} value={a.name}>{a.name} {isReq ? '*' : ''}</option>;
                                            })}
                                        </select>
                                    </div>

                                    <VariationAttributeValueInput
                                        attributeId={currentAttr?.id}
                                        attributeName={currentAttr?.name || attr.name}
                                        value={attr.value}
                                        registeredValues={attrVals}
                                        dataType={currentAttr?.data_type || 'list'}
                                        unit={currentAttr?.unit}
                                        onChange={(newVal) => updateAttributeValue(idx, newVal)}
                                        onValueRegistered={(newVal) => {
                                            setLocalAttributeValues((prev) => [...prev, newVal]);
                                            void fetchDbAttributes?.();
                                        }}
                                    />

                                    <div className="flex w-[72px] shrink-0 items-center justify-end">
                                        <button
                                            type="button"
                                            onClick={() => toggleAttributeNameVisibility(idx)}
                                            aria-label={`${isShownInName ? 'Ocultar' : 'Mostrar'} valor de ${attr.name} no nome da variação`}
                                            aria-pressed={isShownInName}
                                            data-testid={`toggle-attribute-name-${idx}`}
                                            className={`p-2 transition-colors ${isShownInName ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}
                                            title={isShownInName ? 'Ocultar valor do nome da variação' : 'Mostrar valor no nome da variação'}
                                        >
                                            <i className={`bi ${isShownInName ? 'bi-eye' : 'bi-eye-slash'} text-sm`} aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (currentAttr && requiredAttributeIds.has(currentAttr.id)) return;
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
                                            className={`p-2 transition-colors ${currentAttr && requiredAttributeIds.has(currentAttr.id) ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
                                            title={currentAttr && requiredAttributeIds.has(currentAttr.id) ? "Atributo obrigatório para a categoria deste produto" : "Remover atributo"}
                                            aria-label={`Remover atributo ${attr.name}`}
                                            disabled={currentAttr ? requiredAttributeIds.has(currentAttr.id) : false}
                                        >
                                            <i className="bi bi-trash text-sm" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
