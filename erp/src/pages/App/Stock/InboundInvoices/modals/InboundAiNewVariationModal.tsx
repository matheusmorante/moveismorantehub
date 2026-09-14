import { useEffect } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';
import type { AiClassification } from './InboundAiExistingVariationModal';

interface InboundAiNewVariationModalProps {
    readonly classifyingItem: InboundInvoiceItem | null;
    readonly classification: AiClassification | null;
    readonly finalCost: number;
    readonly effectiveMarkup: string;
    readonly onChangeMarkup: (value: string) => void;
    readonly onConfirm: () => void;
    readonly onDiscardAndCreateNew: () => void;
}

export function InboundAiNewVariationModal({
    classifyingItem,
    classification,
    finalCost,
    effectiveMarkup,
    onChangeMarkup,
    onConfirm,
    onDiscardAndCreateNew,
}: InboundAiNewVariationModalProps) {
    const isVisible = Boolean(
        classifyingItem && classification && classification.decision === 'NEW_VARIATION_OF_EXISTING_PRODUCT'
    );

    useEffect(() => {
        if (!isVisible) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDiscardAndCreateNew();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onDiscardAndCreateNew]);

    if (!isVisible || !classifyingItem || !classification) {
        return null;
    }

    const numericMarkup = Number(effectiveMarkup.replace(',', '.'));
    const estimatedPrice = Number.isFinite(numericMarkup) && numericMarkup >= 0
        ? formatCurrency(finalCost * (1 + numericMarkup / 100))
        : 'Informe o acréscimo';

    return (
        <div
            className="fixed inset-0 z-[1000005] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-new-variation-title"
        >
            <button
                type="button"
                aria-label="Fechar confirmação de nova variação"
                onClick={onDiscardAndCreateNew}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
            />
            <section className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="flex items-center gap-2">
                    <i className="bi bi-diagram-2 text-indigo-500" aria-hidden="true" />
                    <h3 id="ai-new-variation-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                        Nova variação em produto pai existente
                    </h3>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    A IA identificou que este item deve ser cadastrado como variação de um produto pai existente.
                </p>
                <div className="mt-4 space-y-1 rounded-xl bg-indigo-50 p-3 text-xs dark:bg-indigo-950/30">
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                        Item da NF: {classifyingItem.productDescription}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                        Produto pai sugerido: <b className="text-indigo-700 dark:text-indigo-300">{classification.normalizedParentName || '—'}</b>
                    </p>
                    {classification.extractedAttributes.color && (
                        <p className="text-slate-500">Cor da nova variação: <b>{classification.extractedAttributes.color}</b></p>
                    )}
                    {classification.extractedAttributes.measure && (
                        <p className="text-slate-500">Medida: <b>{classification.extractedAttributes.measure}</b></p>
                    )}
                    {classification.extractedAttributes.material && (
                        <p className="text-slate-500">Material: <b>{classification.extractedAttributes.material}</b></p>
                    )}
                    <p className="text-slate-400">Confiança: {Math.round(classification.confidence * 100)}%</p>
                </div>
                <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">
                    Acréscimo sobre o custo final (%)
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={effectiveMarkup}
                        onChange={(event) => onChangeMarkup(event.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 transition-colors"
                    />
                </label>
                <p className="mt-2 text-xs text-slate-500">
                    Custo final unitário: <b>{formatCurrency(finalCost)}</b> · Preço estimado: <b>{estimatedPrice}</b>
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onDiscardAndCreateNew}
                        className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Criar como produto independente
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors"
                    >
                        Cadastrar variação no produto pai
                    </button>
                </div>
            </section>
        </div>
    );
}

export default InboundAiNewVariationModal;
