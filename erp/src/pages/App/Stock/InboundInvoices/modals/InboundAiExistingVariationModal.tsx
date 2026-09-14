import { useEffect } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

export interface AiClassification {
    readonly decision: 'EXISTING_VARIATION' | 'NEW_VARIATION_OF_EXISTING_PRODUCT' | 'NEW_PRODUCT' | 'UNSURE';
    readonly matchedProductId: string | null;
    readonly matchedVariationId: string | null;
    readonly normalizedParentName: string;
    readonly extractedAttributes: {
        readonly color: string | null;
        readonly measure: string | null;
        readonly material: string | null;
    };
    readonly confidence: number;
    readonly reasons: readonly string[];
}

interface InboundAiExistingVariationModalProps {
    readonly classifyingItem: InboundInvoiceItem | null;
    readonly classification: AiClassification | null;
    readonly onConfirm: () => void;
    readonly onDiscardAndCreateNew: () => void;
}

export function InboundAiExistingVariationModal({
    classifyingItem,
    classification,
    onConfirm,
    onDiscardAndCreateNew,
}: InboundAiExistingVariationModalProps) {
    const isVisible = Boolean(
        classifyingItem && classification && classification.decision === 'EXISTING_VARIATION'
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

    return (
        <div
            className="fixed inset-0 z-[1000005] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-existing-variation-title"
        >
            <button
                type="button"
                aria-label="Fechar confirmação de variação existente"
                onClick={onDiscardAndCreateNew}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
            />
            <section className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="flex items-center gap-2">
                    <i className="bi bi-stars text-indigo-500" aria-hidden="true" />
                    <h3 id="ai-existing-variation-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                        Variação já existe no ERP
                    </h3>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    A IA identificou que este item já está cadastrado como uma variação existente.
                </p>
                <div className="mt-4 space-y-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                        Item da NF: {classifyingItem.productDescription}
                    </p>
                    <p className="text-slate-500">
                        Produto sugerido: <b className="text-emerald-700 dark:text-emerald-300">{classification.normalizedParentName || '—'}</b>
                    </p>
                    {classification.extractedAttributes.color && (
                        <p className="text-slate-500">Cor detectada: <b>{classification.extractedAttributes.color}</b></p>
                    )}
                    {classification.extractedAttributes.measure && (
                        <p className="text-slate-500">Medida detectada: <b>{classification.extractedAttributes.measure}</b></p>
                    )}
                    <p className="text-slate-400">Confiança: {Math.round(classification.confidence * 100)}%</p>
                    {classification.reasons.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-slate-400">
                            {classification.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onDiscardAndCreateNew}
                        className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Criar como produto novo
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition-colors"
                    >
                        Vincular à variação existente
                    </button>
                </div>
            </section>
        </div>
    );
}

export default InboundAiExistingVariationModal;
