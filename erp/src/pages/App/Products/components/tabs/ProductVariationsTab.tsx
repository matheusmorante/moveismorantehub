import React, { useState, useEffect } from 'react';
import { Variation } from '../../../../types/product.type';
import VariationType from '../../../../types/variation.type';
import { subscribeToVariations } from '../../../../utils/variationService';

interface ProductVariationsTabProps {
    variations: Variation[];
    isGeneratingBulk: boolean;
    addVariation: () => void;
    VariationRow: React.FC<any>;
    updateVariation: (id: string, field: keyof Variation, value: any) => void;
    removeVariation: (id: string) => void;
    setFormData: any;
    onEditCombo: (id: string) => void;
    onEdit: (id: string) => void;
    regenerateAllSkus?: () => void;
    isCombo: boolean;
    onOpenCartesianModal: () => void;
}

const ProductVariationsTab: React.FC<ProductVariationsTabProps> = ({
    variations,
    isGeneratingBulk,
    addVariation,
    VariationRow,
    updateVariation,
    removeVariation,
    setFormData,
    isCombo,
    onEditCombo,
    onEdit,
    regenerateAllSkus,
    onOpenCartesianModal
}) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onOpenCartesianModal}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-lg transition-all active:scale-95 flex items-center gap-2"
                        >
                            <i className="bi bi-grid-3x3-gap"></i> Gerar Grade (Cartesiano)
                        </button>
                        <button
                            type="button"
                            onClick={addVariation}
                            className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <i className="bi bi-plus-lg"></i> Nova Variação Manual
                        </button>
                    </div>
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
