import React from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { AiClassification } from '../hooks/useInboundInvoiceClassification';
import { formatCurrency } from '@/pages/utils/formatters';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';

interface InboundClassificationModalsProps {
    isPreparingProduct: boolean;
    isClassifying: boolean;
    classifyingItem: InboundInvoiceItem | null;
    aiClassification: AiClassification | null;
    effectiveMarkup: string;
    onEffectiveMarkupChange: (markup: string) => void;
    onConfirmExistingVariation: () => void;
    onConfirmNewVariation: () => void;
    onDiscardAndCreateNew: () => void;
}

export const InboundClassificationModals: React.FC<InboundClassificationModalsProps> = ({
    isPreparingProduct,
    isClassifying,
    classifyingItem,
    aiClassification,
    effectiveMarkup,
    onEffectiveMarkupChange,
    onConfirmExistingVariation,
    onConfirmNewVariation,
    onDiscardAndCreateNew,
}) => {
    const finalCost = classifyingItem ? itemCostWithAdditionalCosts(classifyingItem) : 0;
    const parsedMarkup = Number(effectiveMarkup.replace(',', '.'));
    const estimatedPrice = effectiveMarkup.trim() && Number.isFinite(parsedMarkup)
        ? formatCurrency(finalCost * (1 + parsedMarkup / 100))
        : 'Informe o acréscimo';

    return (
        <>
            {/* Modal: Preparando formulário */}
            {isPreparingProduct && (
                <div className="fixed inset-0 z-[1000006] flex items-center justify-center bg-slate-950/60 p-4">
                    <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
                        <i className="bi bi-arrow-repeat text-3xl text-emerald-600 animate-spin inline-block" />
                        <h3 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">Preparando formulário...</h3>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Classificando categoria e estruturando dados do produto com IA.</p>
                    </section>
                </div>
            )}

            {/* Modal: Classificando item com IA */}
            {isClassifying && classifyingItem && (
                <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                    <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 text-center">
                        <i className="bi bi-stars text-3xl text-indigo-500 animate-pulse" />
                        <h3 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">Analisando com IA...</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Comparando com os produtos do fornecedor para sugerir o melhor vínculo.</p>
                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{classifyingItem.productDescription}</p>
                    </section>
                </div>
            )}

            {/* Modal: EXISTING_VARIATION — confirmar vínculo com variação já existente */}
            {!isClassifying && aiClassification?.decision === 'EXISTING_VARIATION' && classifyingItem && (
                <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                    <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-stars text-indigo-500" />
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Variação já existe no ERP</h3>
                        </div>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">A IA identificou que este item já está cadastrado como uma variação existente.</p>
                        <div className="mt-4 space-y-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                            <p className="font-bold text-slate-700 dark:text-slate-200">Item da NF: {classifyingItem.productDescription}</p>
                            <p className="text-slate-500">Produto sugerido: <b className="text-emerald-700 dark:text-emerald-300">{aiClassification.normalizedParentName || '—'}</b></p>
                            {aiClassification.extractedAttributes.color && <p className="text-slate-500">Cor detectada: <b>{aiClassification.extractedAttributes.color}</b></p>}
                            {aiClassification.extractedAttributes.measure && <p className="text-slate-500">Medida detectada: <b>{aiClassification.extractedAttributes.measure}</b></p>}
                            <p className="text-slate-400">Confiança: {Math.round(aiClassification.confidence * 100)}%</p>
                            {aiClassification.reasons.length > 0 && (
                                <ul className="mt-1 list-disc pl-4 text-slate-400">
                                    {aiClassification.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                                </ul>
                            )}
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onDiscardAndCreateNew}
                                className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                Criar como produto novo
                            </button>
                            <button
                                type="button"
                                onClick={onConfirmExistingVariation}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer"
                            >
                                Vincular à variação existente
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {/* Modal: NEW_VARIATION_OF_EXISTING_PRODUCT — criar variação dentro do produto pai */}
            {!isClassifying && aiClassification?.decision === 'NEW_VARIATION_OF_EXISTING_PRODUCT' && classifyingItem && (
                <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                    <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-diagram-2 text-indigo-500" />
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Nova variação em produto pai existente</h3>
                        </div>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">A IA identificou que este item deve ser cadastrado como variação de um produto pai existente.</p>
                        <div className="mt-4 space-y-1 rounded-xl bg-indigo-50 p-3 text-xs dark:bg-indigo-950/30">
                            <p className="font-bold text-slate-700 dark:text-slate-200">Item da NF: {classifyingItem.productDescription}</p>
                            <p className="text-slate-600 dark:text-slate-300">Produto pai sugerido: <b className="text-indigo-700 dark:text-indigo-300">{aiClassification.normalizedParentName || '—'}</b></p>
                            {aiClassification.extractedAttributes.color && <p className="text-slate-500">Cor da nova variação: <b>{aiClassification.extractedAttributes.color}</b></p>}
                            {aiClassification.extractedAttributes.measure && <p className="text-slate-500">Medida: <b>{aiClassification.extractedAttributes.measure}</b></p>}
                            {aiClassification.extractedAttributes.material && <p className="text-slate-500">Material: <b>{aiClassification.extractedAttributes.material}</b></p>}
                            <p className="text-slate-400">Confiança: {Math.round(aiClassification.confidence * 100)}%</p>
                        </div>
                        <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">
                            Acréscimo sobre o custo final (%)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={effectiveMarkup}
                                onChange={(event) => onEffectiveMarkupChange(event.target.value)}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                            />
                        </label>
                        <p className="mt-2 text-xs text-slate-500">
                            Custo final unitário: <b>{formatCurrency(finalCost)}</b> · Preço estimado: <b>{estimatedPrice}</b>
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onDiscardAndCreateNew}
                                className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                Criar como produto independente
                            </button>
                            <button
                                type="button"
                                onClick={onConfirmNewVariation}
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 cursor-pointer"
                            >
                                Cadastrar variação no produto pai
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
};
