import { useState, useEffect, useRef } from 'react';
import Product, { ProductKind } from '../../pages/types/product.type';
import { getProductKind } from '../../pages/utils/productKindRules';
import { useZodForm, flattenFormErrors } from '@/hooks/useZodForm';
import { productAutocompleteFormSchema } from '../../../../shared-utils/productAutocompleteFormSchema';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import {
  fetchAllProductSearchResults,
  getVariationDisplayName,
  normalizeProductSearch,
  SuggestionItem,
} from '../productAutocompleteUtils';

interface UseProductAutocompleteProps {
  value?: string;
  supplierId?: string;
  parentsOnly?: boolean;
  variationsOnly?: boolean;
  includeDeactivated?: boolean;
  allowedProductKinds?: readonly ProductKind[];
  localProducts?: Product[];
  onChange?: (value: string) => void;
  excludeCombos?: boolean;
  disabled?: boolean;
}

export function useProductAutocomplete({
  value = '',
  supplierId,
  parentsOnly = false,
  variationsOnly = false,
  includeDeactivated = false,
  allowedProductKinds,
  localProducts,
  onChange,
  excludeCombos = false,
  disabled = false,
}: UseProductAutocompleteProps) {
  const [query, changeQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState('');
  const generation = useRef(0), renderedGeneration = generation.current;
  const context = JSON.stringify([query, supplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, allowedProductKinds, disabled]);
  const latest = useRef({ context, localProducts }); latest.current = { context, localProducts };
  const { enqueueAndRun } = useZodForm(productAutocompleteFormSchema, { query, supplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, allowedProductKinds: allowedProductKinds ? [...allowedProductKinds] : undefined });
  const setQuery = (next: string) => {
    generation.current += 1; changeQuery(next); setSuggestions([]); setSearchError(''); setIsLoading(next.trim().length >= 3 && !disabled);
  };
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generation.current += 1; changeQuery(value); setSuggestions([]); setSearchError('');
  }, [value]);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleProductUpdated = () => { generation.current += 1; setSuggestions([]); setRefreshKey((k) => k + 1); };
    if (typeof window !== 'undefined') {
      window.addEventListener('product-updated', handleProductUpdated);
      return () => window.removeEventListener('product-updated', handleProductUpdated);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    setSuggestions([]); setSearchError('');
    setIsLoading(!disabled && query.trim().length >= 3);

    const fetchSuggestions = async () => {
      if (disabled || query.trim().length < 3) {
        if (active) {
          setSuggestions([]);
          setIsLoading(false);
        }
        return;
      }

      if (active) setIsLoading(true);
      try {
        await enqueueAndRun({ query, supplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, allowedProductKinds: allowedProductKinds ? [...allowedProductKinds] : undefined }, async (values) => {
        if (!active) return;
        const { query: trimmed, supplierId: parsedSupplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, allowedProductKinds } = values;
        const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
        const productsData = localProducts !== undefined
          ? localProducts
          : await withTimeout(fetchAllProductSearchResults(
              trimmed,
              parsedSupplierId,
              includeDeactivated
            ), 10000, null, 'autocomplete:produtos');
        if (!active) return;
        if (!Array.isArray(productsData)) throw new Error('A busca de produtos não foi confirmada. Consulte novamente.');
        const items: SuggestionItem[] = [];
        const searchNormWords = words.map(normalizeProductSearch);

        (productsData || []).forEach((p: Product) => {
          const productKind = getProductKind(p);
          const isSalvado = productKind === 'salvado';
          if (allowedProductKinds && !allowedProductKinds.includes(productKind)) return;

          if (
            excludeCombos &&
            (p.isCombo || (p as any).itemType === 'combo' || (p as any).item_type === 'combo')
          ) {
            return;
          }

          const supplierIds = p.supplierIds || (p as any).supplier_ids || [];
          const prodSupplierId =
            p.mainSupplierId ||
            p.supplierId ||
            (p as any).main_supplier_id ||
            (p as any).supplier_id;
          if (parsedSupplierId && !supplierIds.includes(parsedSupplierId) && prodSupplierId !== parsedSupplierId) {
            return;
          }

          const variations = p.variations || [];
          const parentIsSelectable = allowedProductKinds
            ? isSalvado || p.active !== false
            : includeDeactivated || p.active !== false;

          if (parentsOnly) {
            if (!parentIsSelectable) return;
            const baseName = (p.name || p.title || '').trim();
            const matchesAll = searchNormWords.every(
              (word) =>
                normalizeProductSearch(baseName).includes(word) ||
                normalizeProductSearch(p.code || '').includes(word)
            );
            if (matchesAll) items.push({ product: p });
          } else if (variations.length > 0) {
            variations.forEach((v) => {
              const variationIsSelectable = allowedProductKinds
                ? isSalvado || v.active !== false
                : includeDeactivated || v.active !== false;
              if (variationIsSelectable && !v.mergedToVariationId) {
                const fullName = getVariationDisplayName(p, v);
                const normFullName = normalizeProductSearch(fullName);
                const normSku = normalizeProductSearch(v.sku || '');

                const matchesAll = searchNormWords.every(
                  (nw) => normFullName.includes(nw) || normSku.includes(nw)
                );

                if (matchesAll) {
                  items.push({ product: p, variation: v });
                }
              }
            });
          } else if (!variationsOnly) {
            const baseName = (p.name || p.title || '').trim();
            if (parentIsSelectable) {
              const matchesAll = searchNormWords.every(
                (word) =>
                  normalizeProductSearch(baseName).includes(word) ||
                  normalizeProductSearch(p.code || '').includes(word)
              );
              if (matchesAll) items.push({ product: p });
            }
          }
        });

        if (active) {
          setSuggestions(items.slice(0, 15));
        }
        }, (errors) => { if (active) setSearchError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da busca.'); });
      } catch {
        if (active) setSearchError('Não foi possível buscar produtos. Consulte novamente.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [
    query,
    supplierId,
    variationsOnly,
    parentsOnly,
    includeDeactivated,
    excludeCombos,
    allowedProductKinds,
    localProducts,
    refreshKey,
    disabled,
    enqueueAndRun,
  ]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setShowSuggestions(val.trim().length >= 2);
    if (onChange) onChange(val);
  };

  return {
    query,
    setQuery,
    handleQueryChange,
    suggestions,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    wrapperRef,
    searchError,
    retrySearch: () => { generation.current += 1; setSuggestions([]); setIsLoading(true); setRefreshKey((value) => value + 1); },
    isCurrentSuggestion: (item: SuggestionItem) => !disabled && renderedGeneration === generation.current && latest.current.context === context && latest.current.localProducts === localProducts && !isLoading && !searchError && suggestions.includes(item),
  };
}
