import React from 'react';
import { Variation } from '../../../../types/product.type';

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
    onOpenCartesianModal?: () => void;
    hasVariations: boolean;
    setHasVariations: (val: boolean) => void;
}

const ProductVariationsTab: React.FC<ProductVariationsTabProps> = ({
    variations,
    addVariation,
    VariationRow,
    updateVariation,
    removeVariation,
    setFormData,
    isCombo,
    onEdit,
    hasVariations,
    setHasVariations
}) => {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <i className="bi bi-grid-3x3-gap-fill text-lg"></i>
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Ativar variações para este produto?</h4>
                        <p className="text-[8px] text-slate-450 uppercase font-bold tracking-widest mt-0.5">Se ativo, este produto terá múltiplos tamanhos, cores ou opções.</p>
                    </div>
                </div>
                <div 
                    onClick={() => setHasVariations(!hasVariations)}
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${hasVariations ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full transition-all ${hasVariations ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
            </div>

            {/* PRODUTO SIMPLES (DESATIVADO) */}
            {!hasVariations && (
                <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-350">
                        <i className="bi bi-box-seam text-3xl"></i>
                    </div>
                    <div>
                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Produto Simples (Sem Variações)</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight max-w-md mx-auto mt-2 leading-relaxed normal-case">
                            Este produto é tratado de forma única. Suas informações de preço, estoque e dimensões físicas são geridas diretamente nas abas "Cadastro Geral" e "Estoque e Precificação".
                        </p>
                    </div>
                </div>
            )}

            {/* PRODUTO COM VARIAÇÕES (ATIVADO) */}
            {hasVariations && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Catálogo de Variações ({variations.length})</h4>
                        </div>
                        <div className="flex items-center gap-2.5 w-full md:w-auto">
                            <button
                                type="button"
                                onClick={addVariation}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-750 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 flex-1 md:flex-initial"
                            >
                                <i className="bi bi-plus-lg"></i> Adicionar variação
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-slate-950/20 shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[80px]">Foto</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Variação</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Código (SKU)</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Preço Venda (R$)</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Custo (R$)</th>
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
                                        onEdit={onEdit}
                                    />
                                ))}
                                {variations.length === 0 && (
                                    <tr className="px-6 py-20 text-center text-slate-400">
                                        <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                                            <i className="bi bi-stack text-4xl mb-3 block opacity-20"></i>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma variação definida ainda.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductVariationsTab;
