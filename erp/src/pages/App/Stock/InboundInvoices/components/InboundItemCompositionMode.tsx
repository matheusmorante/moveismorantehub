import React from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundItemCompositionModeProps {
    item: InboundInvoiceItem;
    supplierId?: string;
    compositionLinks: any[];
    handleAddComposition: (prod: Product, variation?: Variation) => void;
    handleRemoveCompositionLink: (id: string) => void;
    onRequestEditProduct: (product: Product, variation?: Variation) => void;
}

export const InboundItemCompositionMode: React.FC<InboundItemCompositionModeProps> = ({
    item,
    supplierId,
    compositionLinks,
    handleAddComposition,
    handleRemoveCompositionLink,
    onRequestEditProduct,
}) => {
    return (
        /* ── Modo Composição ── */
        <div className="space-y-2">
            {compositionLinks.length > 0 && (() => {
                const totalWeight = compositionLinks.reduce(
                    (s, c) => s + (c.sellingPrice * c.quantityMultiplier), 0
                );
                const totalItemCost = (item.unitCost || 0) * Math.max(1, item.quantity);

                return compositionLinks.map((c, idx) => {
                    const weightValue = c.sellingPrice * c.quantityMultiplier;
                    const weightPercent = totalWeight > 0 ? weightValue / totalWeight : 0;

                    // Último item absorve diferença de arredondamento
                    let apportionedCost: number;
                    if (idx === compositionLinks.length - 1) {
                        const prevSum = compositionLinks.slice(0, idx).reduce((s, prev) => {
                            const w = totalWeight > 0 ? (prev.sellingPrice * prev.quantityMultiplier) / totalWeight : 0;
                            return s + Number((totalItemCost * w).toFixed(2));
                        }, 0);
                        apportionedCost = Math.max(0, totalItemCost - prevSum);
                    } else {
                        apportionedCost = Number((totalItemCost * weightPercent).toFixed(2));
                    }

                    return (
                        <div key={c.id} className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/80 bg-emerald-50/60 p-3 dark:border-emerald-500/60 dark:bg-emerald-950/30">
                            <div className="flex items-start gap-2 min-w-0">
                                <i className="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-200 truncate">{c.productErpName}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                        {c.linkedProductCode && (
                                            <>
                                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">SKU: {c.linkedProductCode}</span>
                                                <span className="text-emerald-400/50 hidden sm:inline">•</span>
                                            </>
                                        )}
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                            Venda: <b>{formatCurrency(c.sellingPrice)}</b>
                                        </span>
                                        <span className="text-emerald-400/50 hidden sm:inline">•</span>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                            Custo rateado: <b>{formatCurrency(apportionedCost)}</b>
                                            {totalWeight > 0 && (
                                                <span className="ml-1 text-emerald-500/70">({(weightPercent * 100).toFixed(1)}%)</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                title="Remover da composição"
                                onClick={() => handleRemoveCompositionLink(c.id!)}
                                className="shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                            >
                                <i className="bi bi-trash3-fill text-sm" />
                            </button>
                        </div>
                    );
                });
            })()}

            <ProductAutocomplete
                supplierId={supplierId}
                isSelected={false}
                clearOnSelect={true}
                placeholder="Adicionar produto à composição..."
                onSelect={handleAddComposition}
                onEditClick={onRequestEditProduct}
            />
            {compositionLinks.length === 0 && (
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center gap-1.5">
                    <i className="bi bi-exclamation-triangle-fill" />
                    Adicione ao menos um produto para formar a composição.
                </p>
            )}
        </div>
    );
};
