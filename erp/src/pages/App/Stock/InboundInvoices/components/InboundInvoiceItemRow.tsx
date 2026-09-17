import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { InboundSuggestion } from '../hooks/useInboundInvoiceSuggestions';
import type { QuickRegisterItem } from '../modals/QuickRegisterVariationModal';
import { formatCurrency } from '@/pages/utils/formatters';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { resolveLinkedProductDetails, isGenericOrEmptyProductName } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { InboundInvoiceItemFiscalReview } from './InboundInvoiceItemFiscalReview';
import { InboundInvoiceItemFinancials } from './InboundInvoiceItemFinancials';

import { InboundItemLinkHeader } from './InboundItemLinkHeader';
import { InboundItemSingleMode } from './InboundItemSingleMode';
import { InboundItemCompositionMode } from './InboundItemCompositionMode';

interface InboundInvoiceItemRowProps {
    item: InboundInvoiceItem;
    supplierId?: string;
    suggestion?: InboundSuggestion;
    acceptingSuggestion: number | null;
    removingLink: number | null;
    onSelectProduct: (itemNumber: number, product: Product, variation?: Variation) => void;
    onAcceptSuggestion: (item: InboundInvoiceItem, suggestion: InboundSuggestion) => void;
    onRejectSuggestion: (item: InboundInvoiceItem) => void;
    onRemoveLink: (item: InboundInvoiceItem) => void;
    onRequestQuickRegister: (target: { itemNumber: number; item: QuickRegisterItem }) => void;
    onRequestEditProduct: (product: Product, variation?: Variation) => void;
    onUpdateItem?: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
}

export const InboundInvoiceItemRow: React.FC<InboundInvoiceItemRowProps> = ({
    item,
    supplierId,
    suggestion,
    acceptingSuggestion,
    removingLink,
    onSelectProduct,
    onAcceptSuggestion,
    onRejectSuggestion,
    onRemoveLink,
    onRequestQuickRegister,
    onRequestEditProduct,
    onUpdateItem,
}) => {
    const isComposition = item.linkMode === 'composition';
    const compositionLinks = item.compositionLinks || [];
    const [isExpanded, setIsExpanded] = useState(false);

    const handleAddComposition = (prod: Product, variation?: Variation) => {
        const exists = compositionLinks.some(
            c => c.productId === prod.id && c.variationId === (variation?.id || undefined)
        );
        if (exists) {
            toast.error('Este produto já está na composição.');
            return;
        }
        const newLink = {
            id: crypto.randomUUID(),
            productId: prod.id!,
            variationId: variation?.id,
            productErpName: variation?.name || prod.name || prod.title || 'Produto',
            linkedProductCode: variation?.sku || prod.code || '',
            sellingPrice: Number(variation?.unitPrice || prod.unitPrice || prod.variations?.[0]?.unitPrice || 0),
            apportionedCost: 0,
            quantityMultiplier: 1,
        };
        onUpdateItem?.(item.itemNumber, { compositionLinks: [...compositionLinks, newLink] });
    };

    const handleRemoveCompositionLink = (id: string) => {
        onUpdateItem?.(item.itemNumber, {
            compositionLinks: compositionLinks.filter(c => c.id !== id),
        });
    };
    const linked = Boolean(item.matchedProductId);
    const totalUnit = itemCostWithAdditionalCosts(item);
    const itemDescription = item.productDescription || (item as any).descricao || (item as any).xProd || (item as any).xprod || 'Descrição não encontrada';

    const [resolvedFallback, setResolvedFallback] = React.useState<{ name?: string; code?: string; sellingPrice?: number } | null>(null);

    React.useEffect(() => {
        if (!linked || !item.matchedProductId) {
            setResolvedFallback(null);
            return;
        }
        const needsCode = !item.linkedProductCode || item.linkedProductCode.trim() === '—' || item.linkedProductCode.trim() === '-';
        const needsName = isGenericOrEmptyProductName(item.productErpName);
        const needsPrice = !item.sellingPrice;

        if (needsCode || needsName || needsPrice) {
            let active = true;
            void resolveLinkedProductDetails(item.matchedProductId, item.matchedVariationId).then((res) => {
                if (active && res) {
                    setResolvedFallback({ name: res.productErpName, code: res.linkedProductCode, sellingPrice: res.sellingPrice });
                }
            });
            return () => { active = false; };
        } else {
            setResolvedFallback(null);
        }
    }, [linked, item.matchedProductId, item.matchedVariationId, item.linkedProductCode, item.productErpName, item.sellingPrice]);

    const displayName = !isGenericOrEmptyProductName(item.productErpName)
        ? item.productErpName
        : resolvedFallback?.name || item.productErpName || 'Produto vinculado';

    const displayCode = item.linkedProductCode && item.linkedProductCode.trim() !== '—' && item.linkedProductCode.trim() !== '-'
        ? item.linkedProductCode
        : resolvedFallback?.code || item.linkedProductCode || '—';

    const displaySellingPrice = item.sellingPrice || resolvedFallback?.sellingPrice || 0;

    return (
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Lado Esquerdo: Dados da NF */}
            <div className="min-w-0 flex flex-col gap-1">
                <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{item.itemNumber}. {itemDescription}</h4>
                    {item.additionalDescription && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">{item.additionalDescription}</p>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-2 text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.quantity} {item.unit}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>Cód. forn.: {item.productCode || '—'}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Unitário</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatCurrency(item.unitCost)}
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalUnit)}</span>
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Total</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatCurrency(item.totalCost)}
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalUnit * (item.quantity || 1))}</span>
                        </span>
                    </div>
                </div>

                <button 
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    className="flex items-center gap-1 mt-4 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 w-fit"
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Ocultar detalhes da NF' : 'Ver detalhes da NF'}
                </button>
                
                {isExpanded && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <InboundInvoiceItemFinancials item={item} />
                        <InboundInvoiceItemFiscalReview item={item} />
                    </div>
                )}
            </div>

            {/* Lado Direito: Vínculo com Produto do ERP */}
            <div className="flex min-w-0 flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <InboundItemLinkHeader
                    item={item}
                    isComposition={isComposition}
                    compositionLinks={compositionLinks}
                    supplierId={supplierId}
                    itemDescription={itemDescription}
                    totalUnit={totalUnit}
                    displayName={displayName}
                    displayCode={displayCode}
                    displaySellingPrice={displaySellingPrice}
                    onUpdateItem={onUpdateItem}
                    onRequestQuickRegister={onRequestQuickRegister}
                />

                {!supplierId?.trim() ? (
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        Vincule o fornecedor para identificar ou cadastrar os produtos.
                    </p>
                ) : isComposition ? (
                    <InboundItemCompositionMode
                        item={item}
                        supplierId={supplierId}
                        compositionLinks={compositionLinks}
                        handleAddComposition={handleAddComposition}
                        handleRemoveCompositionLink={handleRemoveCompositionLink}
                        onRequestEditProduct={onRequestEditProduct}
                    />
                ) : (
                    <InboundItemSingleMode
                        item={item}
                        supplierId={supplierId}
                        suggestion={suggestion}
                        acceptingSuggestion={acceptingSuggestion}
                        removingLink={removingLink}
                        linked={linked}
                        displayName={displayName}
                        displayCode={displayCode}
                        displaySellingPrice={displaySellingPrice}
                        onSelectProduct={onSelectProduct}
                        onAcceptSuggestion={onAcceptSuggestion}
                        onRejectSuggestion={onRejectSuggestion}
                        onRemoveLink={onRemoveLink}
                        onRequestEditProduct={onRequestEditProduct}
                    />
                )}
            </div>
        </div>
    );
};
