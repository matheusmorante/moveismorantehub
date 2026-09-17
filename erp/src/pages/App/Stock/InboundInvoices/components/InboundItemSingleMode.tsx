import React from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { InboundSuggestion } from '../hooks/useInboundInvoiceSuggestions';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundItemSingleModeProps {
    item: InboundInvoiceItem;
    supplierId?: string;
    suggestion?: InboundSuggestion;
    acceptingSuggestion: number | null;
    removingLink: number | null;
    linked: boolean;
    displayName?: string;
    displayCode?: string;
    displaySellingPrice: number;
    onSelectProduct: (itemNumber: number, product: Product, variation?: Variation) => void;
    onAcceptSuggestion: (item: InboundInvoiceItem, suggestion: InboundSuggestion) => void;
    onRejectSuggestion: (item: InboundInvoiceItem) => void;
    onRemoveLink: (item: InboundInvoiceItem) => void;
    onRequestEditProduct: (product: Product, variation?: Variation) => void;
}

export const InboundItemSingleMode: React.FC<InboundItemSingleModeProps> = ({
    item,
    supplierId,
    suggestion,
    acceptingSuggestion,
    removingLink,
    linked,
    displayName,
    displayCode,
    displaySellingPrice,
    onSelectProduct,
    onAcceptSuggestion,
    onRejectSuggestion,
    onRemoveLink,
    onRequestEditProduct,
}) => {
    if (linked) {
        return (
            /* ── Modo Único — produto vinculado ── */
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/80 bg-emerald-50/60 p-3 dark:border-emerald-500/60 dark:bg-emerald-950/30">
                <div className="flex items-start gap-2.5 min-w-0">
                    <i className="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs font-black text-emerald-800 dark:text-emerald-200 truncate">{displayName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">SKU: {displayCode}</span>
                            <span className="text-emerald-400/50 hidden sm:inline">•</span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                Venda: <b>{formatCurrency(displaySellingPrice)}</b>
                            </span>
                            <span className="text-emerald-400/50 hidden sm:inline">•</span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                Custo: <b>{formatCurrency((item.unitCost || 0) * Math.max(1, item.quantity))}</b>
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    title="Remover vínculo"
                    onClick={() => onRemoveLink(item)}
                    disabled={removingLink !== null}
                    className="shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg disabled:opacity-50 cursor-pointer transition-colors"
                >
                    {removingLink === item.itemNumber ? (
                        <i className="bi bi-arrow-repeat text-sm animate-spin" />
                    ) : (
                        <i className="bi bi-trash3-fill text-sm" />
                    )}
                </button>
            </div>
        );
    }

    return (
        /* ── Modo Único — buscar produto ── */
        <div className="space-y-2">
            <ProductAutocomplete
                supplierId={supplierId}
                isSelected={false}
                placeholder="Digite 2 ou mais letras para buscar..."
                onSelect={(product, variation) => onSelectProduct(item.itemNumber, product, variation)}
                onEditClick={onRequestEditProduct}
            />
            {suggestion && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 px-3 py-1.5 dark:border-amber-700/80 dark:bg-amber-950/30 flex items-center justify-between gap-2 shadow-xs transition-all animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate min-w-0" title={suggestion.displayName}>
                        {suggestion.displayName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            disabled={acceptingSuggestion === item.itemNumber}
                            onClick={() => onAcceptSuggestion(item, suggestion)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                            title="Vincular produto sugerido"
                        >
                            <i className="bi bi-check-lg text-sm" aria-hidden="true" />
                            <span>{acceptingSuggestion === item.itemNumber ? 'Vinculando...' : 'Vincular'}</span>
                        </button>
                        <button
                            type="button"
                            disabled={acceptingSuggestion === item.itemNumber}
                            onClick={() => onRejectSuggestion(item)}
                            className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Ignorar sugestão"
                        >
                            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
