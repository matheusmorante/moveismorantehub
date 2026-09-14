import React from 'react';
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
}) => {
    const linked = Boolean(item.matchedProductId);
    const totalUnit = itemCostWithAdditionalCosts(item);
    const itemDescription = item.productDescription || (item as any).descricao || (item as any).xProd || (item as any).xprod || 'Descrição não encontrada';

    const [resolvedFallback, setResolvedFallback] = React.useState<{ name?: string; code?: string } | null>(null);

    React.useEffect(() => {
        if (!linked || !item.matchedProductId) {
            setResolvedFallback(null);
            return;
        }
        const needsCode = !item.linkedProductCode || item.linkedProductCode.trim() === '—' || item.linkedProductCode.trim() === '-';
        const needsName = isGenericOrEmptyProductName(item.productErpName);

        if (needsCode || needsName) {
            let active = true;
            void resolveLinkedProductDetails(item.matchedProductId, item.matchedVariationId).then((res) => {
                if (active && res) {
                    setResolvedFallback({ name: res.productErpName, code: res.linkedProductCode });
                }
            });
            return () => { active = false; };
        } else {
            setResolvedFallback(null);
        }
    }, [linked, item.matchedProductId, item.matchedVariationId, item.linkedProductCode, item.productErpName]);

    const displayName = !isGenericOrEmptyProductName(item.productErpName)
        ? item.productErpName
        : resolvedFallback?.name || item.productErpName || 'Produto vinculado';

    const displayCode = item.linkedProductCode && item.linkedProductCode.trim() !== '—' && item.linkedProductCode.trim() !== '-'
        ? item.linkedProductCode
        : resolvedFallback?.code || item.linkedProductCode || '—';

    return (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">VINCULAR PRODUTO CADASTRADO</span>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        linked
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                        {linked ? 'Vinculado' : 'Não vinculado'}
                    </span>
                </div>

                {!supplierId?.trim() ? (
                    <p className="mt-5 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        Vincule o fornecedor para identificar ou cadastrar os produtos.
                    </p>
                ) : linked ? (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/80 bg-emerald-50/60 p-3.5 dark:border-emerald-500/60 dark:bg-emerald-950/30">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <i className="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 text-lg shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs font-black text-emerald-800 dark:text-emerald-200 truncate">{displayName}</p>
                                <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Código / SKU: {displayCode}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemoveLink(item)}
                            disabled={removingLink !== null}
                            className="shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                        >
                            {removingLink === item.itemNumber ? 'Removendo...' : 'Remover'}
                        </button>
                    </div>
                ) : (
                    <div className="mt-auto space-y-3 pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Buscar produto:</span>
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
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 transition-colors shadow-xs cursor-pointer"
                            >
                                <i className="bi bi-plus-circle-fill text-xs" />
                                Cadastrar rapidamente
                            </button>
                        </div>

                        {/* Campo de busca manual livre */}
                        <ProductAutocomplete
                            supplierId={supplierId}
                            isSelected={false}
                            placeholder="Digite 2 ou mais letras para buscar..."
                            onSelect={(product, variation) => onSelectProduct(item.itemNumber, product, variation)}
                        />

                        {/* Sugestão da IA (surge suavemente quando encontrada) */}
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
                )}
            </div>
        </div>
    );
};
