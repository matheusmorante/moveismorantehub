import React from 'react';
import type { Variation } from '../../../types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import ProductImage from '@/components/ProductImage';

export interface VariationRowProps {
    readonly v: Variation;
    readonly variationIndex?: number;
    readonly updateVariation?: (id: string, field: keyof Variation, value: unknown) => void;
    readonly removeVariation?: (id: string) => void;
    readonly isCombo?: boolean;
    readonly onEditCombo?: (id: string) => void;
    readonly onEdit?: (id: string) => void;
    readonly parentPrice?: number;
    readonly parentPromoPrice?: number;
    readonly parentSku?: string;
    readonly parentImage?: string | null;
    readonly inUse?: boolean;
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
    inUse,
}) => {
    const varImage = v.images && v.images.length > 0 ? v.images[0] : null;

    const regularPrice = Number(v.syncUnitPrice ? parentPrice : v.unitPrice) || 0;
    const promoPrice = Number(v.syncPromoPrice !== false ? parentPromoPrice : v.promoPrice) || 0;
    const finalPrice = promoPrice > 0 && promoPrice < regularPrice ? promoPrice : regularPrice;
    const hasDiscount = finalPrice < regularPrice;

    const fallbackSuffix = String((variationIndex ?? 0) + 1).padStart(2, '0');
    const displaySku = normalizeVariationSku(v.sku) || (parentSku ? `${parentSku}-${fallbackSuffix}` : '-');

    return (
        <div 
            key={v.id} 
            className="flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 xl:table-row xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group relative"
        >
            <div className="flex xl:table-cell xl:px-6 xl:py-4 items-center gap-3">
                <div
                    className="relative h-14 w-14 xl:h-10 xl:w-10 rounded-2xl xl:rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-105 bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-pointer"
                    title="Clique para editar detalhes da variação"
                    onClick={() => onEdit?.(v.id)}
                >
                    {varImage ? (
                        <ProductImage
                            src={varImage}
                            alt={`Variação ${v.name || displaySku}`}
                            className="object-cover h-full w-full"
                            size="thumbnail"
                        />
                    ) : (
                        <i className="bi bi-camera text-sm" aria-hidden="true" />
                    )}
                </div>

                {/* SKU exibido apenas no Mobile ao lado da imagem */}
                <div className="xl:hidden flex flex-col items-start justify-center">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {displaySku}
                    </span>
                </div>
            </div>

            {/* SKU na tabela (Oculto no Mobile) */}
            <div className="hidden xl:table-cell px-6 py-4">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {displaySku}
                </span>
            </div>

            <div className="flex flex-row flex-wrap items-center justify-between gap-4 xl:contents">
                <div className="flex-1 min-w-[120px] xl:table-cell xl:px-6 xl:py-4 cursor-pointer" onClick={() => onEdit?.(v.id)}>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Nome da Variação
                            </span>
                        </div>
                        <input
                            value={v.name || v.title || 'Variação'}
                            readOnly
                            className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 cursor-default font-sans truncate"
                            placeholder="Sem nome"
                        />
                    </div>
                </div>

                <div className="flex flex-col xl:table-cell xl:px-6 xl:py-4 items-end xl:items-start justify-center">
                    {/* Rótulo de preço apenas no mobile */}
                    <span className="xl:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Preço Venda</span>
                    <div className="flex flex-col xl:gap-0.5 items-end xl:items-start">
                        {hasDiscount && (
                            <span className="text-xs font-bold text-red-500 line-through decoration-red-500">
                                {formatCurrency(regularPrice)}
                            </span>
                        )}
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(finalPrice)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="absolute right-4 top-4 flex items-center gap-1.5 xl:static xl:table-cell xl:px-6 xl:py-4 xl:text-right">
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
                        <i className="bi bi-layers-fill text-base" aria-hidden="true" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onEdit?.(v.id)}
                    className="p-1.5 rounded-xl transition-all bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600"
                    title="Editar características da variação"
                    aria-label="Editar características da variação"
                >
                    <i className="bi bi-pencil-square text-base" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
});

VariationRow.displayName = 'VariationRow';
