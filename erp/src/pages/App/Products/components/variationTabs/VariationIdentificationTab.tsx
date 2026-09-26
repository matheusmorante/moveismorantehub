import React from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { toTitleCase } from '@/pages/utils/textUtils';

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
    readonly dbAttributes?: readonly DbAttributeItem[];
    readonly dbAttributeValues?: readonly DbAttributeValueItem[];
    readonly setIsManageAttributesOpen?: (open: boolean) => void;
    readonly getDefaultVariationName?: (attributes?: Variation['attributes']) => string;
    readonly getDefaultVariationTitle?: (attributes?: Variation['attributes']) => string;
    readonly fetchDbAttributes?: () => Promise<void>;
}

export const VariationIdentificationTab: React.FC<VariationIdentificationTabProps> = ({
    formData,
    setFormData,
    parentProduct,
    diferenciarTitulo,
    setDiferenciarTitulo
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
                    {(() => {
                        const parentPrefix = (parentProduct.name || parentProduct.description || 'Produto').trim();
                        const currentFullName = formData.name || '';
                        const currentSuffix = currentFullName.toLowerCase().startsWith(parentPrefix.toLowerCase())
                            ? currentFullName.slice(parentPrefix.length).replace(/^[\s\-_:]+/, '')
                            : currentFullName;

                        const handleSuffixChange = (newSuffix: string) => {
                            const trimmedSuffix = newSuffix.trimStart();
                            const newFullName = trimmedSuffix ? `${parentPrefix} ${trimmedSuffix}` : parentPrefix;
                            setFormData(prev => {
                                if (!prev) return null;
                                const next: Variation = { ...prev, name: newFullName };
                                if (!diferenciarTitulo) {
                                    next.title = newFullName;
                                    next.marketplaceTitle = newFullName;
                                }
                                return next;
                            });
                        };

                        return (
                            <div 
                                className="w-full flex items-center border-b-2 border-slate-200 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-400 transition-colors py-1.5"
                                title="O nome do produto pai é imutável no início. Você pode editar livremente o que vem após o nome do pai."
                            >
                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold font-mono shrink-0 select-none mr-2 border border-slate-200 dark:border-slate-700">
                                    {parentPrefix}
                                </span>
                                <input
                                    type="text"
                                    placeholder="Complemento da variação (ex: Branco 6 Portas)..."
                                    value={currentSuffix}
                                    onChange={e => handleSuffixChange(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-slate-100 font-mono focus:ring-0 p-0"
                                    aria-label="Sufixo do nome da variação"
                                />
                            </div>
                        );
                    })()}
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
        </div>
    );
};
