import React, { useState, useEffect } from 'react';
import { Variation } from '../../../../types/product.type';
import VariationType from '../../../../types/variation.type';
import { subscribeToVariations } from '../../../../utils/variationService';

interface ProductVariationsTabProps {
    variations: Variation[];
    isGeneratingBulk: boolean;
    bulkVariationOptions: { name: string, values: string[] }[];
    setBulkVariationOptions: React.Dispatch<React.SetStateAction<{ name: string, values: string[] }[]>>;
    generateBulkVariations: () => void;
    addVariation: () => void;
    VariationRow: React.FC<any>;
    updateVariation: (id: string, field: keyof Variation, value: any) => void;
    removeVariation: (id: string) => void;
    setFormData: any;
    onEditCombo: (id: string) => void;
    onEdit: (id: string) => void;
    regenerateAllSkus?: () => void;
    isCombo: boolean;
}

const ProductVariationsTab: React.FC<ProductVariationsTabProps> = ({
    variations,
    isGeneratingBulk,
    bulkVariationOptions,
    setBulkVariationOptions,
    generateBulkVariations,
    addVariation,
    VariationRow,
    updateVariation,
    removeVariation,
    setFormData,
    isCombo,
    onEditCombo,
    onEdit,
    regenerateAllSkus
}) => {
    const [availableVariations, setAvailableVariations] = useState<VariationType[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToVariations((data) => {
            setAvailableVariations(data.filter(v => v.active && !v.deleted));
        });
        return () => unsubscribe();
    }, []);

    const handleAddAttribute = () => {
        setBulkVariationOptions([...bulkVariationOptions, { name: '', values: [] }]);
    };

    const handleAttributeChange = (idx: number, attrName: string) => {
        const next = [...bulkVariationOptions];
        next[idx].name = attrName;
        next[idx].values = []; // Reset selected values when attribute changes
        setBulkVariationOptions(next);
    };

    const handleValueToggle = (idx: number, value: string) => {
        const next = [...bulkVariationOptions];
        const currentValues = next[idx].values;
        if (currentValues.includes(value)) {
            next[idx].values = currentValues.filter(v => v !== value);
        } else {
            next[idx].values = [...currentValues, value];
        }
        setBulkVariationOptions(next);
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Bulk Generator */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-grid-3x3-gap-fill text-blue-600"></i> Gerador de Atributos e Valores (Modelo Cartesiano)
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Selecione múltiplos atributos para gerar combinações</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => window.open('/app/variations', '_blank')}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                            title="Gerenciar lista de atributos e opções"
                        >
                            <i className="bi bi-gear-fill"></i> Gerenciar Atributos e Valores
                        </button>
                        <button
                            type="button"
                            onClick={handleAddAttribute}
                            className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            + Escolher Atributo
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {bulkVariationOptions.map((opt, idx) => {
                        const selectedAttr = availableVariations.find(v => v.name === opt.name);
                        return (
                            <div key={idx} className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-left-2 duration-200">
                                <div className="flex gap-6 items-start">
                                    <div className="w-64">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Atributo</label>
                                        <select
                                            value={opt.name}
                                            onChange={(e) => handleAttributeChange(idx, e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold"
                                        >
                                            <option value="">Selecione...</option>
                                            {availableVariations.map(v => (
                                                <option key={v.id} value={v.name}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                            Valores ({opt.values.length} selecionados)
                                        </label>
                                        <div className="flex flex-wrap gap-2 min-h-[44px]">
                                            {!selectedAttr && (
                                                <p className="text-[10px] text-slate-300 italic py-2">Escolha um atributo primeiro</p>
                                            )}
                                            {selectedAttr?.options.map(o => {
                                                const isSelected = opt.values.includes(o.value);
                                                return (
                                                    <button
                                                        key={o.id}
                                                        type="button"
                                                        onClick={() => handleValueToggle(idx, o.value)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${isSelected 
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 active:scale-90' 
                                                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                                                    >
                                                        {o.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBulkVariationOptions(bulkVariationOptions.filter((_, i) => i !== idx))}
                                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-5"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    
                    <button
                        type="button"
                        onClick={generateBulkVariations}
                        disabled={isGeneratingBulk || bulkVariationOptions.length === 0 || bulkVariationOptions.some(o => !o.name || o.values.length === 0)}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200 dark:shadow-none"
                    >
                        {isGeneratingBulk ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Gerando Combinações...
                            </div>
                        ) : (
                            <>Gerar {variations.length > 0 ? 'Novas ' : ''}Variações (Modelo Cartesiano)</>
                        )}
                    </button>
                </div>
            </div>

            {/* Variations Table */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Catálogo de Variações ({variations.length})</h4>
                        {variations.length > 0 && regenerateAllSkus && (
                            <button
                                type="button"
                                onClick={regenerateAllSkus}
                                className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 transition-all flex items-center gap-2"
                                title="Regera SKUs baseados no código do pai e nome da variação"
                            >
                                <i className="bi bi-magic"></i> Auto-gerar SKUs
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={addVariation}
                        className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        + Nova Variação Manual
                    </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-slate-950/20 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Variação</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Código (SKU)</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Preço Venda (R$)</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Estoque</th>
                                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {variations.map(v => (
                                <VariationRow
                                    key={v.id}
                                    v={v}
                                    updateVariation={updateVariation}
                                    removeVariation={removeVariation}
                                    setFormData={setFormData}
                                    isCombo={isCombo}
                                    onEditCombo={onEditCombo}
                                    onEdit={onEdit}
                                />
                            ))}
                            {variations.length === 0 && (
                                <tr className="px-6 py-20 text-center text-slate-400">
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                        <i className="bi bi-stack text-4xl mb-3 block opacity-20"></i>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma variação definida ainda.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductVariationsTab;
