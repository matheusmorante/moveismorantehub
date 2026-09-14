import { useEffect, useRef, useState } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchSupplierProductsForContext } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { suggestInboundProducts, type InboundProductCandidate } from '@/pages/utils/aiService/aiInboundProductSuggestions';
import { toast } from 'react-toastify';
import { rankInboundSuggestionCandidates } from '@/pages/utils/inboundNfe/rankInboundSuggestionCandidates';

export type InboundSuggestion = InboundProductCandidate;
const SUGGESTION_TIMEOUT_MS = 20000;
function bounded<T>(promise: Promise<T>, fallback: T): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(fallback), SUGGESTION_TIMEOUT_MS);
        promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
}
export function useInboundInvoiceSuggestions({ items, supplierId, enabled = true }: { items: InboundInvoiceItem[]; supplierId?: string; enabled?: boolean }) {
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
        if (!enabled || !pending.length) { setProcessing(false); return; }
        setProcessing(true);
        let cancelled = false;
        const deadline = Date.now() + SUGGESTION_TIMEOUT_MS;
        const timeout = setTimeout(() => {
            cancelled = true;
            for (const item of pending) requests.current.set(keyFor(item), Promise.resolve(null));
            setCompleted(previous => ({ ...previous, ...Object.fromEntries(pending.map(item => [keyFor(item), true])) }));
            setProcessing(false);
        }, SUGGESTION_TIMEOUT_MS);
        const run = async () => {
            setProcessing(true);
            try {
                let context = catalog.current.get(supplierId!);
                if (!context) {
                    context = bounded(fetchSupplierProductsForContext(supplierId!), []);
                    catalog.current.set(supplierId!, context);
                }
                const products = await context;
                for (const item of pending) {
                    if (cancelled) return;
                    const key = keyFor(item);
                    let request = requests.current.get(key);
                    if (!request) {
                        request = (async () => {
                            const rankedProducts = rankInboundSuggestionCandidates(products, item.productDescription);
                            for (let offset = 0; offset < rankedProducts.length; offset += 40) {
                                if (cancelled || Date.now() >= deadline) break;
                                const candidates = rankedProducts.slice(offset, offset + 40);
                                const results = await suggestInboundProducts(item, candidates);
                                if (results[0]) return results[0];
                            }
                            return null;
                        })();
                        request = bounded(request, null);
                        requests.current.set(key, request);
                    }
                    const suggestion = await request;
                    if (!cancelled) {
                        setCompleted(previous => ({ ...previous, [key]: true }));
                        if (suggestion) setSuggestions(previous => ({ ...previous, [key]: suggestion }));
                    }
                }
            } catch (error) {
                console.error('Erro ao sugerir vínculos com IA:', error);
                if (!cancelled) toast.error('Não foi possível consultar sugestões. A busca manual continua disponível.');
            } finally {
                clearTimeout(timeout);
                if (!cancelled) setProcessing(false);
            }
        };
        const timer = setTimeout(() => { void run(); }, 600);
        return () => { cancelled = true; clearTimeout(timer); clearTimeout(timeout); };
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
