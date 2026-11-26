import { useState, useEffect, useRef } from 'react';
import Product, { ProductKind } from '../../pages/types/product.type';
import { getProductKind } from '../../pages/utils/productService/productKindRules';
import { useZodForm, flattenFormErrors } from '@/hooks/useZodForm';
import {
  PRODUCT_AUTOCOMPLETE_DEBOUNCE_MS,
  PRODUCT_AUTOCOMPLETE_MAX_SUGGESTIONS,
  productAutocompleteFormSchema,
} from '../../../../shared-utils/productAutocompleteFormSchema';
import { withTimeout } from '../../../../shared-utils/core/withTimeout';
import {
  fetchAllProductSearchResults,
  fetchCompositionAutocompleteResults,
  getVariationDisplayName,
  normalizeProductSearch,
  normalizeProductSearchSeparators,
  type ProductAutocompleteExcludedLink,
  type SuggestionItem,
} from '../selectors/productAutocompleteUtils';

interface UseProductAutocompleteProps {
  value?: string;
  supplierId?: string;
  parentsOnly?: boolean;
  productsOnly?: boolean;
  includeCompositions?: boolean;
  variationsOnly?: boolean;
  compositionsOnly?: boolean;
  includeDeactivated?: boolean;
  includeTrashEligibility?: boolean;
  filterCombosOnServer?: boolean;
  compactComponentProjection?: boolean;
  compactSalesOrderProjection?: boolean;
  allowedProductKinds?: readonly ProductKind[];
  excludedProductLinks?: readonly ProductAutocompleteExcludedLink[];
  localProducts?: Product[];
  onChange?: (value: string) => void;
  excludeCombos?: boolean;
  disabled?: boolean;
  isSelected?: boolean;
}

export function useProductAutocomplete({
  value = '',
  supplierId,
  parentsOnly = false,
  productsOnly = false,
  includeCompositions = false,
  variationsOnly = false,
  compositionsOnly = false,
  includeDeactivated = false,
  includeTrashEligibility = true,
  filterCombosOnServer = false,
  compactComponentProjection = false,
  compactSalesOrderProjection = false,
  allowedProductKinds,
  excludedProductLinks,
  localProducts,
  onChange,
  excludeCombos = false,
  disabled = false,
  isSelected = false,
}: UseProductAutocompleteProps) {
  const [query, changeQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState('');
  const generation = useRef(0), renderedGeneration = generation.current;
  const context = JSON.stringify([
    query,
    supplierId,
    parentsOnly,
    productsOnly,
    includeCompositions,
    variationsOnly,
    compositionsOnly,
    includeDeactivated,
    includeTrashEligibility,
    filterCombosOnServer,
    compactComponentProjection,
    compactSalesOrderProjection,
    excludeCombos,
    allowedProductKinds,
    excludedProductLinks,
    disabled,
    isSelected,
  ]);
  const latest = useRef({ context, localProducts }); latest.current = { context, localProducts };
  const { enqueueAndRun } = useZodForm(productAutocompleteFormSchema, { query, supplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, compositionsOnly, allowedProductKinds: allowedProductKinds ? [...allowedProductKinds] : undefined });
  const setQuery = (next: string) => {
    generation.current += 1; changeQuery(next); setSuggestions([]); setSearchError(''); setIsLoading(next.trim().length >= 3 && !disabled && !isSelected);
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
    setIsLoading(!disabled && !isSelected && query.trim().length >= 3);

    const fetchSuggestions = async () => {
      if (disabled || isSelected || query.trim().length < 3) {
        if (active) {
          setSuggestions([]);
          setIsLoading(false);
        }
        return;
      }

      if (active) setIsLoading(true);
      try {
        await enqueueAndRun({ query, supplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, compositionsOnly, allowedProductKinds: allowedProductKinds ? [...allowedProductKinds] : undefined }, async (values) => {
        if (!active) return;
        const { query: trimmed, supplierId: parsedSupplierId, parentsOnly, variationsOnly, includeDeactivated, excludeCombos, compositionsOnly, allowedProductKinds } = values;
        const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
        const productSearch = localProducts !== undefined
          ? Promise.resolve(localProducts)
          : withTimeout(fetchAllProductSearchResults(
              trimmed,
              parsedSupplierId,
              includeDeactivated,
              25 + (excludedProductLinks?.length || 0),
              compositionsOnly ? 'composition' : undefined,
              includeTrashEligibility,
              filterCombosOnServer,
              compactComponentProjection,
              compactSalesOrderProjection,
              includeCompositions,
            ), 10000, null, 'autocomplete:produtos');
        const compositionSearch = includeCompositions
          ? withTimeout(
              fetchCompositionAutocompleteResults(trimmed),
              10000,
              null,
              'autocomplete:produtos-compostos'
            )
              .then((data) => data === null
                ? { data: [] as Product[], error: new Error('A busca de produtos compostos excedeu o tempo limite.') }
                : { data, error: null })
              .catch((error) => ({ data: [] as Product[], error }))
          : Promise.resolve({ data: [] as Product[], error: null });
        const [productsData, compositionResult] = await Promise.all([
          productSearch,
          compositionSearch,
        ]);
        if (!active) return;
        if (!Array.isArray(productsData)) throw new Error('A busca de produtos não foi confirmada. Consulte novamente.');
        const existingCompositionKeys = new Set<string>();
        productsData.forEach((product) => {
          if (product.itemType !== 'composition') return;
          if (product.variations?.length) {
            product.variations.forEach((variation) => {
              existingCompositionKeys.add(`${product.id}:${variation.id}`);
            });
          } else {
            existingCompositionKeys.add(`${product.id}:base`);
          }
        });
        const compositions = compositionResult.data.filter(
          (product) => !existingCompositionKeys.has(String((product as any).autocompleteSearchKey))
        );
        const combinedProducts: Product[] = [];
        const combinedLength = Math.max(productsData.length, compositions.length);
        for (let index = 0; index < combinedLength; index += 1) {
          if (compositions[index]) combinedProducts.push(compositions[index]);
          if (productsData[index]) combinedProducts.push(productsData[index]);
        }
        const items: SuggestionItem[] = [];
        const isAlreadyLinked = (productId: string, variationId?: string) =>
          excludedProductLinks?.some(
            (link) => link.productId === productId && link.variationId === variationId
          ) ?? false;
        const searchNormWords = words.map(normalizeProductSearch);
        const searchNormNameWords = words.map(normalizeProductSearchSeparators);

        combinedProducts.forEach((p: Product) => {
          const itemType = p.itemType || (p as any).item_type || 'product';
          if (compositionsOnly && itemType !== 'composition') return;
          const isComposition =
            itemType === 'composition' ||
            Boolean((p as any).isComposition || p.isCombo || (p as any).is_combo);
          if (productsOnly && (isComposition ? !includeCompositions : itemType !== 'product')) return;

          const productKind = getProductKind(p);
          const isSalvado = productKind === 'salvado';
          if (allowedProductKinds && !allowedProductKinds.includes(productKind)) return;

          if (
            excludeCombos &&
            (p.isCombo ||
              (p as any).itemType === 'combo' ||
              (p as any).item_type === 'combo' ||
              p.itemType === 'composition' ||
              (p as any).item_type === 'composition')
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
            const normalizedBaseName = normalizeProductSearchSeparators(baseName);
            const normalizedCode = normalizeProductSearch(p.code || '');
            const matchesAll = searchNormWords.every(
              (word, index) =>
                normalizedBaseName.includes(searchNormNameWords[index]) ||
                normalizedCode.includes(word)
            );
            if (matchesAll && !isAlreadyLinked(p.id!)) items.push({ product: p });
          } else if (variations.length > 0) {
            variations.forEach((v) => {
              const variationIsSelectable = allowedProductKinds
                ? isSalvado || v.active !== false
                : includeDeactivated || v.active !== false;
              if (
                variationIsSelectable &&
                !v.mergedToVariationId &&
                !isAlreadyLinked(p.id!, v.id)
              ) {
                const fullName = getVariationDisplayName(p, v);
                const normFullName = normalizeProductSearchSeparators(fullName);
                const normSku = normalizeProductSearch(v.sku || '');
                const normProductCode = normalizeProductSearch(p.code || '');

                const matchesAll = searchNormWords.every(
                  (nw, index) =>
                    normFullName.includes(searchNormNameWords[index]) ||
                    normSku.includes(nw) ||
                    normProductCode.includes(nw)
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
              if (matchesAll && !isAlreadyLinked(p.id!)) items.push({ product: p });
            }
          }
        });

        if (active) {
          setSearchError(
            compositionResult.error
              ? 'Não foi possível buscar produtos compostos agora. Os demais produtos continuam disponíveis.'
              : ''
          );
          setSuggestions(items.slice(0, PRODUCT_AUTOCOMPLETE_MAX_SUGGESTIONS));
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

    const timeoutId = setTimeout(fetchSuggestions, PRODUCT_AUTOCOMPLETE_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [
    query,
    supplierId,
    variationsOnly,
    compositionsOnly,
    parentsOnly,
    productsOnly,
    includeCompositions,
    includeDeactivated,
    includeTrashEligibility,
    filterCombosOnServer,
    compactComponentProjection,
    compactSalesOrderProjection,
    excludeCombos,
    allowedProductKinds,
    excludedProductLinks,
    localProducts,
    refreshKey,
    disabled,
    isSelected,
    enqueueAndRun,
  ]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setShowSuggestions(val.trim().length > 0);
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
    isCurrentSuggestion: (item: SuggestionItem) => !disabled && renderedGeneration === generation.current && latest.current.context === context && latest.current.localProducts === localProducts && !isLoading && suggestions.includes(item),
  };
}
