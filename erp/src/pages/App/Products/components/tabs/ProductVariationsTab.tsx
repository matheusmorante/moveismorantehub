import React from 'react';
import { Variation } from '../../../../types/product.type';
import { hasVariationAttribute } from '../../../../utils/productVariationDefaults';

interface Props {
    variations: Variation[];
    isGeneratingBulk: boolean;
    addVariation: () => void;
    VariationRow: React.FC<any>;
    updateVariation: (id: string, field: keyof Variation, value: any) => void;
    removeVariation: (id: string) => void;
    setFormData: any;
    onEditCombo: (id: string) => void;
    onEdit: (id: string) => void;
    isCombo: boolean;
    onEditCombo?: (id: string) => void;
    regenerateAllSkus?: () => void;
    onOpenCartesianModal?: () => void;
    hasVariations?: boolean;
    setHasVariations?: (value: boolean) => void;
}

const ProductVariationsTab: React.FC<Props> = ({ variations, addVariation, VariationRow, updateVariation, removeVariation, setFormData, isCombo, onEdit }) => {
    const canAddVariation = variations.length > 0 && hasVariationAttribute(variations[0]);
    const disabledMessage = 'Informe pelo menos um atributo na Variação 1 para liberar novas variações.';

    return <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><i className="bi bi-diagram-3-fill text-lg" /></div>
        <div><h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Variações do produto</h4><p className="mt-1 text-[10px] font-bold text-slate-500">A Variação 1 é obrigatória e pode ficar sem atributos. Para criar outra variação, informe pelo menos um atributo na Variação 1.</p></div>
    </div>
    <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Variações ({variations.length})</h4><span className="group relative" title={!canAddVariation ? disabledMessage : undefined}><button type="button" disabled={!canAddVariation} onClick={addVariation} className="rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"><i className="bi bi-plus-lg mr-2" />Adicionar variação</button>{!canAddVariation && <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-xl bg-slate-800 px-3 py-2 text-center text-[10px] font-bold normal-case tracking-normal text-white shadow-xl group-hover:block">{disabledMessage}</span>}</span></div>
        <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/20"><table className="w-full min-w-[1000px] border-collapse text-left"><thead><tr className="bg-slate-50 dark:bg-slate-900/50"><th className="w-[80px] px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Foto</th><th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">SKU / Código</th><th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Variação</th><th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Preço venda (R$)</th><th className="px-6 py-5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Ações</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{variations.map((variation, index) => <VariationRow key={variation.id} v={variation} variationIndex={index} updateVariation={updateVariation} removeVariation={removeVariation} setFormData={setFormData} isCombo={isCombo} onEdit={onEdit} />)}</tbody></table></div>
    </div>
</div>;
};

export default ProductVariationsTab;
