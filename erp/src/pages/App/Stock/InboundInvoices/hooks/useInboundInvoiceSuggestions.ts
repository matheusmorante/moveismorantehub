import { useEffect, useRef, useState } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchSupplierProductsForContext } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { type InboundProductCandidate } from '@/pages/utils/aiService/aiInboundProductSuggestions';
import { InboundDeterministicScorerContext, rankAndScoreDeterministic } from '@/pages/utils/inboundNfe/services/inboundDeterministicScorer';
import { toast } from 'react-toastify';

export type InboundSuggestion = InboundProductCandidate;
const SUGGESTION_TIMEOUT_MS = 20000;

function bounded<T>(promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Tempo esgotado na consulta de sugestões')), SUGGESTION_TIMEOUT_MS);
        promise.then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

export function useInboundInvoiceSuggestions({
    items,
    supplierId,
    enabled = true,
}: {
    items: InboundInvoiceItem[];
    supplierId?: string;
    enabled?: boolean;
}) {
    const [suggestions, setSuggestions] = useState<Record<string, InboundSuggestion>>({});
    const [rejected, setRejected] = useState<Record<string, boolean>>({});
    const [processing, setProcessing] = useState(false);
    const [generation, setGeneration] = useState(0);
    const [completed, setCompleted] = useState<Record<string, boolean>>({});
    const catalog = useRef(new Map<string, ReturnType<typeof fetchSupplierProductsForContext>>());
    const scorerContexts = useRef(new Map<string, InboundDeterministicScorerContext>());

    const hasSupplier = Boolean(supplierId?.trim());
    const isActuallyEnabled = Boolean(enabled && hasSupplier);

    const keyFor = (item: InboundInvoiceItem) => JSON.stringify([supplierId, item.itemNumber, item.productCode, item.productDescription]);
    const pending = items.filter(item => !item.matchedProductId && !rejected[keyFor(item)] && !completed[keyFor(item)]);
    const pendingKey = JSON.stringify(pending.map(item => [item.itemNumber, item.productCode, item.productDescription]));

    useEffect(() => {
        if (!hasSupplier) {
            setProcessing(false);
            setSuggestions({});
            setRejected({});
            setCompleted({});
            return;
        }
        if (!enabled || !pending.length) {
            setProcessing(false);
            return;
        }

        let cancelled = false;

        const run = async () => {
            setProcessing(true);
            try {
                let contextPromise = catalog.current.get(supplierId!);
                if (!contextPromise) {
                    contextPromise = bounded(fetchSupplierProductsForContext(supplierId!));
                    catalog.current.set(supplierId!, contextPromise);
                }
                const products = await contextPromise;
                
                if (cancelled) return;

                let scorerContext = scorerContexts.current.get(supplierId!);
                if (!scorerContext) {
                    scorerContext = new InboundDeterministicScorerContext(products);
                    scorerContexts.current.set(supplierId!, scorerContext);
                }

                const newSuggestions: Record<string, InboundSuggestion> = {};
                const newCompleted: Record<string, boolean> = {};

                for (const item of pending) {
                    const key = keyFor(item);
                    const result = rankAndScoreDeterministic(item.productDescription || '', item.productCode, scorerContext);
                    newCompleted[key] = true;
                    if (result.topCandidate) {
                        newSuggestions[key] = result.topCandidate;
                    }
                }

                if (!cancelled) {
                    setCompleted(prev => ({ ...prev, ...newCompleted }));
                    setSuggestions(prev => ({ ...prev, ...newSuggestions }));
                }

            } catch (error) {
                catalog.current.delete(supplierId!);
                scorerContexts.current.delete(supplierId!);
                console.warn('[useInboundInvoiceSuggestions] Erro ao processar sugestões determinísticas:', error);
                if (!cancelled) toast.error('Não foi possível consultar sugestões. A busca manual continua disponível.');
            } finally {
                if (!cancelled) setProcessing(false);
            }
        };

        const timer = setTimeout(() => { void run(); }, 50); 
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [supplierId, hasSupplier, pendingKey, enabled, generation]);

    return {
        retrySuggestions: () => {
            if (!isActuallyEnabled || !supplierId?.trim() || processing) return;
            const keys = items.filter(item => !item.matchedProductId).map(keyFor);
            if (!keys.length) return;
            
            catalog.current.delete(supplierId);
            scorerContexts.current.delete(supplierId);
            
            const removeKeys = <T,>(previous: Record<string, T>) => Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.includes(key)));
            setRejected(removeKeys);
            setCompleted(removeKeys);
            setSuggestions(removeKeys);
            setProcessing(true);
            setGeneration(previous => previous + 1);
        },
        isProcessingSuggestions: isActuallyEnabled && processing,
        isItemProcessing: (item: InboundInvoiceItem) => isActuallyEnabled && processing && !item.matchedProductId && !rejected[keyFor(item)] && !completed[keyFor(item)],
        suggestionFor: (item: InboundInvoiceItem) => isActuallyEnabled && !item.matchedProductId && !rejected[keyFor(item)] ? suggestions[keyFor(item)] : undefined,
        rejectSuggestion: (item: InboundInvoiceItem) => setRejected(previous => ({ ...previous, [keyFor(item)]: true })),
    };
}
