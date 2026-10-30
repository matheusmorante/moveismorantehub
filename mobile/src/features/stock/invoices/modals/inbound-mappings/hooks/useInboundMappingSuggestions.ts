import { useEffect, useRef, useState } from 'react';
import * as stockService from '../../../../../../services/stockService';
import {
  createInboundScorerContext,
  rankInboundSuggestions,
  type InboundScorerProduct,
} from '../../../utils/inboundDeterministicScorer';
import type { MappingItem, Product, ProductSuggestion } from '../types';

interface UseInboundMappingSuggestionsParams {
  visible: boolean;
  supplierId: string;
  items: MappingItem[];
}

export const useInboundMappingSuggestions = ({
  visible,
  supplierId,
  items,
}: UseInboundMappingSuggestionsParams) => {
  const [suggestions, setSuggestions] = useState<Record<number, ProductSuggestion[]>>({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<number, boolean>>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [suggestionRetryVersion, setSuggestionRetryVersion] = useState(0);
  const suggestionCache = useRef(new Map<string, Promise<Product[]>>());
  const suggestionRunKey = useRef('');

  useEffect(() => {
    const unresolved = items.filter(
      (item) => item.linkMode !== 'not_applicable' && !item.matchedProductId && !item.compositionLinks?.length
    );
    if (!visible || !supplierId || unresolved.length === 0) {
      setSuggestionsLoading(false);
      setSuggestions({});
      return;
    }

    const runKey = `${supplierId}:${JSON.stringify(
      unresolved.map((item) => [item.itemNumber, item.productCode, item.productDescription])
    )}`;
    if (suggestionRunKey.current === runKey) return;
    suggestionRunKey.current = runKey;
    setSuggestionsLoading(true);
    setSuggestionsError('');
    setDismissedSuggestions({});
    const cached = suggestionCache.current.get(supplierId);
    const catalogPromise = cached || stockService.fetchInboundInvoiceSupplierCatalog(supplierId);
    if (!cached) suggestionCache.current.set(supplierId, catalogPromise);
    let active = true;
    void catalogPromise
      .then((catalog) => {
        if (!active) return;
        const context = createInboundScorerContext(catalog as InboundScorerProduct[]);
        const ranked: Record<number, ProductSuggestion[]> = {};
        unresolved.forEach((item) => {
          ranked[item.itemNumber] = rankInboundSuggestions(
            item.productDescription || '',
            item.productCode,
            context
          );
        });
        setSuggestions(ranked);
      })
      .catch((error) => {
        suggestionCache.current.delete(supplierId);
        if (active) setSuggestionsError(error?.message || 'Falha na consulta do catálogo.');
        console.warn('[InboundInvoiceMappings] deterministic suggestions failed', error);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, supplierId, items, suggestionRetryVersion]);

  const handleRetrySuggestions = () => {
    suggestionRunKey.current = '';
    setSuggestionRetryVersion((current) => current + 1);
  };

  return {
    suggestions,
    dismissedSuggestions,
    setDismissedSuggestions,
    suggestionsLoading,
    suggestionsError,
    handleRetrySuggestions,
  };
};
