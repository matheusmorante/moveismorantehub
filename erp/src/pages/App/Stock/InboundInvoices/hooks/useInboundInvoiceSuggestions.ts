import { useEffect, useRef, useState } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchSupplierProductsForContext } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { type InboundProductCandidate } from '@/pages/utils/aiService/aiInboundProductSuggestions';
import { suggestInboundProductsBatch, INBOUND_BATCH_SIZE } from '@/pages/utils/aiService/aiInboundBatchSuggestions';
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
    const requests = useRef(new Map<string, Promise<InboundSuggestion | null>>());
    const catalog = useRef(new Map<string, ReturnType<typeof fetchSupplierProductsForContext>>());

    const hasSupplier = Boolean(supplierId?.trim());
    const isActuallyEnabled = Boolean(enabled && hasSupplier);

    const keyFor = (item: InboundInvoiceItem) => JSON.stringify([supplierId, item.itemNumber, item.productCode, item.productDescription]);
    const pending = items.filter(item => !item.matchedProductId && !rejected[keyFor(item)]);
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

        setProcessing(true);
        let cancelled = false;
        let serviceErrorEncountered = false;

        const run = async () => {
            setProcessing(true);
            try {
                let context = catalog.current.get(supplierId!);
                if (!context) {
                    context = bounded(fetchSupplierProductsForContext(supplierId!));
                    catalog.current.set(supplierId!, context);
                }
                const products = await context;

                for (const item of pending) {
                    if (cancelled || serviceErrorEncountered) return;
                    const key = keyFor(item);
                    let request = requests.current.get(key);
                    if (!request) {
                        const batchItems = pending.filter(entry => !requests.current.has(keyFor(entry))).slice(0, INBOUND_BATCH_SIZE);
                        const batch = suggestInboundProductsBatch(batchItems, products);
                        for (const entry of batchItems) {
                            const entryRequest = batch.then(results => results[entry.itemNumber]?.[0] || null);
                            // Todas as rejeições ficam observadas enquanto a interface aguarda o lote.
                            void entryRequest.catch(() => undefined);
                            requests.current.set(keyFor(entry), entryRequest);
                        }
                        request = requests.current.get(key)!;
                    }

                    let suggestion: InboundSuggestion | null = null;
                    try {
                        suggestion = await request;
                    } catch (error) {
                        requests.current.delete(key);
                        if (!serviceErrorEncountered) {
                            serviceErrorEncountered = true;
                            console.warn('[useInboundInvoiceSuggestions] Sugestões de IA indisponíveis:', error);
                            if (!cancelled) {
                                toast.error('Sugestões da IA temporariamente indisponíveis (cota/créditos excedidos). A busca manual continua disponível.');
                            }
                        }
                        break;
                    }

                    if (!cancelled) {
                        setCompleted(previous => ({ ...previous, [key]: true }));
                        if (suggestion) setSuggestions(previous => ({ ...previous, [key]: suggestion }));
                    }
                }
            } catch (error) {
                catalog.current.delete(supplierId!);
                console.warn('[useInboundInvoiceSuggestions] Erro ao carregar contexto de produtos do fornecedor:', error);
                if (!cancelled) toast.error('Não foi possível consultar sugestões. A busca manual continua disponível.');
            } finally {
                if (!cancelled) setProcessing(false);
            }
        };

        const timer = setTimeout(() => { void run(); }, 600);
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
            keys.forEach(key => requests.current.delete(key));
            catalog.current.delete(supplierId);
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
