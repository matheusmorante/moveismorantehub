import React from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type Person from '@/pages/types/person.type';
import ProductFormModal from '@/pages/App/Products/ProductFormModal';
import { useInboundInvoiceItemsReview } from '../hooks/useInboundInvoiceItemsReview';
import { InboundInvoiceItemRow } from './InboundInvoiceItemRow';
import { InboundClassificationModals } from '../modals/InboundClassificationModals';
import { InboundIndividualProductModal } from '../modals/InboundIndividualProductModal';
import { QuickRegisterVariationModal } from '../modals/QuickRegisterVariationModal';

interface InboundInvoiceItemsReviewProps {
    items: InboundInvoiceItem[];
    supplierId?: string;
    suppliers: Person[];
    onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
    onProcessingSuggestionsChange?: (processing: boolean) => void;
    suggestionsEnabled?: boolean;
}

/**
 * Componente orquestrador da revisão de itens da NF de Entrada.
 * Apresenta a lista de itens e integra os modais de cadastro e classificação.
 */
export function InboundInvoiceItemsReview(props: InboundInvoiceItemsReviewProps) {
    const { items, supplierId, suggestionsEnabled = false } = props;
    const review = useInboundInvoiceItemsReview(props);

    return (
        <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                            Itens da NF ({items.length})
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            {review.linkedCount} vinculados · {items.length - review.linkedCount} não vinculados
                        </p>
                    </div>
                    {suggestionsEnabled && (
                        <button
                            type="button"
                            onClick={review.retrySuggestions}
                            disabled={
                                !supplierId?.trim() ||
                                !suggestionsEnabled ||
                                review.isProcessingSuggestions ||
                                !review.unlinkedItems.length ||
                                review.acceptingSuggestion !== null ||
                                review.removingLink !== null
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="bi bi-stars" aria-hidden="true" />
                            Sugestão de vínculos
                        </button>
                    )}
                </header>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                        <InboundInvoiceItemRow
                            key={item.itemNumber}
                            item={item}
                            supplierId={supplierId}
                            suggestion={review.suggestionFor(item)}
                            acceptingSuggestion={review.acceptingSuggestion}
                            removingLink={review.removingLink}
                            onSelectProduct={review.selectProduct}
                            onAcceptSuggestion={review.acceptSuggestion}
                            onRejectSuggestion={review.rejectSuggestion}
                            onRemoveLink={review.removeLink}
                            onRequestQuickRegister={review.setQuickRegisterTarget}
                        />
                    ))}
                </div>

                {review.unlinkedItems.length > 0 && (
                    <footer className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                <p>{items.length} itens na NF</p>
                                <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                                    {review.linkedCount} vinculados · {review.unlinkedItems.length} sem vínculo
                                </p>
                            </div>
                        </div>
                    </footer>
                )}
            </section>

            <InboundIndividualProductModal
                item={review.individualItem}
                markup={review.individualMarkup}
                onMarkupChange={review.setIndividualMarkup}
                onClose={() => review.setIndividualItem(null)}
                onConfirm={review.confirmIndividualCreation}
            />

            <InboundClassificationModals
                isPreparingProduct={review.isPreparingProduct}
                isClassifying={review.isClassifying}
                classifyingItem={review.classifyingItem}
                aiClassification={review.aiClassification}
                effectiveMarkup={review.effectiveMarkup}
                onEffectiveMarkupChange={review.setEffectiveMarkup}
                onConfirmExistingVariation={review.confirmExistingVariationLink}
                onConfirmNewVariation={review.confirmNewVariationInFamily}
                onDiscardAndCreateNew={review.discardClassificationAndCreateNew}
            />

            <ProductFormModal
                isOpen={review.isProductModalOpen}
                onClose={review.closeProductModal}
                product={review.editingParentProduct}
                initialData={review.initialProductData}
                initialTab={review.editingParentProduct ? 'variacoes' : 'geral'}
                openAddVariationOnOpen={Boolean(review.editingParentProduct)}
                isQuickRegister={true}
                onSuccess={review.handleCreatedProductFromModal}
            />

            <QuickRegisterVariationModal
                isOpen={Boolean(review.quickRegisterTarget)}
                item={review.quickRegisterTarget?.item || null}
                supplierId={supplierId}
                onClose={() => review.setQuickRegisterTarget(null)}
                onConfirmSelection={review.handleQuickRegisterConfirm}
            />
        </>
    );
}

export default InboundInvoiceItemsReview;
