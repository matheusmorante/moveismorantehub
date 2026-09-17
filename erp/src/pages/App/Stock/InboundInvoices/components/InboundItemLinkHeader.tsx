import React from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { QuickRegisterItem } from '../modals/QuickRegisterVariationModal';

interface InboundItemLinkHeaderProps {
    item: InboundInvoiceItem;
    isComposition: boolean;
    compositionLinks: any[];
    supplierId?: string;
    itemDescription: string;
    totalUnit: number;
    displayName?: string;
    displayCode?: string;
    displaySellingPrice: number;
    onUpdateItem?: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
    onRequestQuickRegister: (target: { itemNumber: number; item: QuickRegisterItem }) => void;
}

export const InboundItemLinkHeader: React.FC<InboundItemLinkHeaderProps> = ({
    item,
    isComposition,
    compositionLinks,
    supplierId,
    itemDescription,
    totalUnit,
    displayName,
    displayCode,
    displaySellingPrice,
    onUpdateItem,
    onRequestQuickRegister,
}) => {
    return (
        <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                {isComposition ? 'Vincular produtos' : 'Vincular produto'}
            </span>

            {/* Toggle Único / Composição */}
            <div className="flex items-center rounded-lg bg-white p-0.5 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 shrink-0">
                <button
                    type="button"
                    disabled={isComposition && compositionLinks.length > 1}
                    title={isComposition && compositionLinks.length > 1
                        ? `Remova produtos até restar apenas 1 para voltar ao modo Único (${compositionLinks.length} na lista)`
                        : undefined}
                    onClick={() => {
                        if (!isComposition) return;
                        const first = compositionLinks[0];
                        onUpdateItem?.(item.itemNumber, {
                            linkMode: 'single',
                            compositionLinks: [],
                            matchedProductId: first?.productId || item.matchedProductId,
                            matchedVariationId: first?.variationId || item.matchedVariationId,
                            productErpName: first?.productErpName || item.productErpName,
                            linkedProductCode: first?.linkedProductCode || item.linkedProductCode,
                        });
                    }}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${
                        !isComposition
                            ? 'bg-slate-700 text-white shadow-sm'
                            : isComposition && compositionLinks.length > 1
                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    Único
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (isComposition) return;
                        const existingLinks = item.compositionLinks || [];
                        const alreadyMigrated = item.matchedProductId &&
                            existingLinks.some(c => c.productId === item.matchedProductId);
                        const migratedLinks =
                            item.matchedProductId && !alreadyMigrated
                                ? [
                                    {
                                        id: crypto.randomUUID(),
                                        productId: item.matchedProductId,
                                        variationId: item.matchedVariationId,
                                        productErpName: displayName || item.productErpName || 'Produto',
                                        linkedProductCode: displayCode || item.linkedProductCode || '',
                                        sellingPrice: displaySellingPrice,
                                        apportionedCost: 0,
                                        quantityMultiplier: 1,
                                    },
                                    ...existingLinks,
                                ]
                                : existingLinks;
                        onUpdateItem?.(item.itemNumber, {
                            linkMode: 'composition',
                            compositionLinks: migratedLinks,
                        });
                    }}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${
                        isComposition
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    Composição
                </button>
            </div>

            {/* Botão Cadastrar — mesma linha, empurrado para direita */}
            {supplierId?.trim() && (
                <button
                    type="button"
                    onClick={() => onRequestQuickRegister({
                        itemNumber: item.itemNumber,
                        item: {
                            productDescription: itemDescription,
                            productCode: item.productCode,
                            unit: item.unit,
                            ncm: item.ncm,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            finalCost: totalUnit,
                        },
                    })}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 transition-colors shrink-0 cursor-pointer"
                >
                    <i className="bi bi-plus-circle-fill" />
                    Cadastrar
                </button>
            )}
        </div>
    );
};
