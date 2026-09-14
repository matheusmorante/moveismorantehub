import React from 'react';
import type { Variation } from '../../../types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';

export interface VariationRowProps {
    readonly v: Variation;
    readonly variationIndex?: number;
    readonly updateVariation?: (id: string, field: keyof Variation, value: unknown) => void;
    readonly removeVariation: (id: string) => void;
    readonly isCombo?: boolean;
    readonly onEditCombo?: (id: string) => void;
    readonly onEdit?: (id: string) => void;
    readonly parentPrice?: number;
    readonly parentPromoPrice?: number;
    readonly parentSku?: string;
}

/**
 * Linha de tabela representando uma variação de produto com SKU, preços formatados e ações de edição/exclusão.
 */
export const VariationRow: React.FC<VariationRowProps> = React.memo(({
    v,
    variationIndex,
    removeVariation,
    isCombo,
    onEditCombo,
    onEdit,
    parentPrice,
    parentPromoPrice,
    parentSku,
}) => {
    const [imageError, setImageError] = React.useState(false);
    const varImage = v.images && v.images.length > 0 && !imageError ? v.images[0] : null;

    const regularPrice = Number(v.syncUnitPrice ? parentPrice : v.unitPrice) || 0;
    const promoPrice = Number(v.syncPromoPrice !== false ? parentPromoPrice : v.promoPrice) || 0;
    const finalPrice = promoPrice > 0 && promoPrice < regularPrice ? promoPrice : regularPrice;
    const hasDiscount = finalPrice < regularPrice;

    const fallbackSuffix = String((variationIndex ?? 0) + 1).padStart(2, '0');
    const displaySku = normalizeVariationSku(v.sku) || (parentSku ? `${parentSku}-${fallbackSuffix}` : '-');

    return (
        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
            <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                <div
                    className="relative h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 bg-slate-50 dark:bg-slate-800/50 text-slate-400"
                    title="Clique para editar detalhes da variação"
                >
                    {varImage ? (
                        <img
                            src={varImage}
                            alt={`Variação ${v.name || displaySku}`}
                            className="object-cover h-full w-full"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <i className="bi bi-camera text-sm" aria-hidden="true" />
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {displaySku}
                </span>
            </td>
            <td className="px-6 py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Título
                        </span>
                    </div>
                    <input
                        value={v.name || ''}
                        readOnly
                        className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 cursor-default font-sans"
                        placeholder="VARIAÇÃO GERADA"
                    />
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-0.5">
                    {hasDiscount && (
                        <span className="text-xs font-bold text-red-500 line-through decoration-red-500">
                            {formatCurrency(regularPrice)}
                        </span>
                    )}
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(finalPrice)}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                {isCombo && (
                    <button
                        type="button"
                        onClick={() => onEditCombo?.(v.id)}
                        className={`p-1.5 rounded-xl transition-all ${
                            v.comboItems?.length
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600'
                        }`}
                        title="Configurar itens deste kit/combo"
                        aria-label="Configurar itens do combo"
                    >
                        <i className="bi bi-layers-fill text-lg" aria-hidden="true" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onEdit?.(v.id)}
                    className="p-1.5 rounded-xl transition-all bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600"
                    title="Editar detalhes da variação"
                    aria-label="Editar detalhes da variação"
                >
                    <i className="bi bi-pencil-square text-lg" aria-hidden="true" />
                </button>
                {variationIndex !== 0 && (
                    <button
                        type="button"
                        onClick={() => removeVariation(v.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Excluir variação"
                        aria-label="Excluir variação"
                    >
                        <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                )}
            </td>
        </tr>
    );
});

VariationRow.displayName = 'VariationRow';
