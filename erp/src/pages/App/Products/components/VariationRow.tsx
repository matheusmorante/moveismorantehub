import React from 'react';
import type { Product, Variation } from '../../../types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';

interface VariationRowProps {
    v: Variation;
    variationIndex?: number;
    updateVariation: (id: string, field: keyof Variation, value: unknown) => void;
    removeVariation: (id: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    isCombo?: boolean;
    onEditCombo?: (id: string) => void;
    onEdit?: (id: string) => void;
    parentPrice?: number;
    parentPromoPrice?: number;
    isEdit?: boolean;
    hasPhotoError?: boolean;
    parentSku?: string;
}

export const VariationRow = React.memo(({
    v, variationIndex, updateVariation, removeVariation, setFormData, isCombo, onEditCombo,
    onEdit, parentPrice, parentPromoPrice, isEdit, hasPhotoError, parentSku,
}: VariationRowProps) => {
    const varImage = v.images && v.images.length > 0 ? v.images[0] : null;
    const regularPrice = Number(v.syncUnitPrice ? parentPrice : v.unitPrice) || 0;
    const promoPrice = Number(v.syncPromoPrice !== false ? parentPromoPrice : v.promoPrice) || 0;
    const finalPrice = promoPrice > 0 && promoPrice < regularPrice ? promoPrice : regularPrice;
    const hasDiscount = finalPrice < regularPrice;
    const fallbackSuffix = String((variationIndex ?? 0) + 1).padStart(2, '0');
    const displaySku = normalizeVariationSku(v.sku) || (parentSku ? `${parentSku}-${fallbackSuffix}` : '-');

    return (
        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
            <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                <div className={`relative h-10 w-10 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 ${hasPhotoError || !varImage ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 dark:border-slate-800'}`} title={!varImage ? 'Foto pendente - obrigatória ao concluir o produto' : 'Clique para editar'}>
                    {varImage ? <img src={varImage} alt="Variação" className="object-cover h-full w-full" /> : <div className="flex flex-col items-center justify-center text-red-500 bg-red-50 dark:bg-red-950/40 w-full h-full border border-red-300 dark:border-red-800 rounded-xl"><i className="bi bi-camera-fill text-sm animate-pulse" /></div>}
                </div>
            </td>
            <td className="px-6 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{displaySku}</span></td>
            <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                <div className="flex flex-col"><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</span>{!varImage && <span className="text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded-md border border-red-200 dark:border-red-800 flex items-center gap-1"><i className="bi bi-exclamation-circle-fill text-[8px]" /> Foto pendente</span>}</div><input value={v.name || ''} readOnly className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 cursor-default font-sans" placeholder="VARIAÇÃO GERADA" /></div>
            </td>
            <td className="px-6 py-4"><div className="flex flex-col gap-0.5">{hasDiscount && <span className="text-xs font-bold text-red-500 line-through decoration-red-500">{formatCurrency(regularPrice)}</span>}<span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(finalPrice)}</span></div></td>
            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                {isCombo && <button type="button" onClick={() => onEditCombo?.(v.id)} className={`p-1.5 rounded-xl transition-all ${v.comboItems?.length ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600'}`} title="Configurar itens deste kit/combo"><i className="bi bi-layers-fill text-lg" /></button>}
                <button type="button" onClick={() => onEdit?.(v.id)} className="p-1.5 rounded-xl transition-all bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600" title="Editar detalhes da variação"><i className="bi bi-pencil-square text-lg" /></button>
                {variationIndex !== 0 && <button onClick={() => removeVariation(v.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Excluir variação"><i className="bi bi-trash" /></button>}
            </td>
        </tr>
    );
});
