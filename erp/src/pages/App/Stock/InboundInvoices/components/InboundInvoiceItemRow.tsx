import React from 'react';
import { toast } from 'react-toastify';
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
            <div className="min-w-0 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dados da NF</span>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{item.itemNumber}. {itemDescription}</h4>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    Cód. fornecedor: {item.productCode || '—'} · {item.quantity} {item.unit}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>Unit.: <b>{formatCurrency(item.unitCost)}</b></span>
                    <span>Total: <b>{formatCurrency(item.totalCost)}</b></span>
                    <span>NCM: {item.ncm || '—'}</span>
                    <span>CFOP: {item.cfop || '—'}</span>
                </div>
                <InboundInvoiceItemFiscalReview item={item} />
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
