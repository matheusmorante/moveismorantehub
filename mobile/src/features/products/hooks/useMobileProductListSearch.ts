import { useCallback, useEffect, useRef, useState } from 'react';
import { useZodForm } from '../../../hooks/useZodForm';
import { productListSearchFormSchema } from '../../../../../shared-utils/listingFormSchemas';
import { PRODUCT_LIST_SEARCH_DEBOUNCE_MS } from '../../../../../shared-utils/productListSearch';
import {
  DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
  resolveAppliedMobileProductSearch,
} from '../domain/mobileProductListFilters';

export function useMobileProductListSearch() {
  const [searchTerm, setSearchTermState] = useState(
    DEFAULT_MOBILE_PRODUCT_LIST_FILTERS.searchTerm
  );
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const searchDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchValidationSequenceRef = useRef(0);
  const { validateValues: validateProductSearch } = useZodForm(
    productListSearchFormSchema,
    { input: '', intent: 'debounced' },
  );

  const applyValidatedProductSearch = useCallback(async (
    input: string,
    intent: 'debounced' | 'submitted',
    sequence: number,
  ) => {
    const parsed = await validateProductSearch({ input, intent });
    if (
      parsed === false ||
      sequence !== searchValidationSequenceRef.current ||
      parsed.search === null
    ) return;
    setAppliedSearchTerm(parsed.search);
  }, [validateProductSearch]);

  useEffect(() => {
    const trimmedSearch = searchTerm.trim();
    const nextSearch = resolveAppliedMobileProductSearch(searchTerm);
    const sequence = ++searchValidationSequenceRef.current;
    if (nextSearch === appliedSearchTerm) return;

    if (trimmedSearch.length > 0) {
      const timeout = setTimeout(
        () => void applyValidatedProductSearch(searchTerm, 'debounced', sequence),
        PRODUCT_LIST_SEARCH_DEBOUNCE_MS
      );
      searchDebounceTimeoutRef.current = timeout;
      return () => {
        clearTimeout(timeout);
        if (searchDebounceTimeoutRef.current === timeout) {
          searchDebounceTimeoutRef.current = null;
        }
      };
    }

    void applyValidatedProductSearch(searchTerm, 'debounced', sequence);
  }, [searchTerm, appliedSearchTerm, applyValidatedProductSearch]);

  const setSearchTerm = useCallback((value: string) => {
    searchValidationSequenceRef.current += 1;
    setSearchTermState(value);
  }, []);

  const submitSearchTerm = useCallback(() => {
    if (searchDebounceTimeoutRef.current) {
      clearTimeout(searchDebounceTimeoutRef.current);
      searchDebounceTimeoutRef.current = null;
    }
    const sequence = ++searchValidationSequenceRef.current;
    void applyValidatedProductSearch(searchTerm, 'submitted', sequence);
  }, [applyValidatedProductSearch, searchTerm]);

  const resetSearchTerm = useCallback((value: string) => {
    searchValidationSequenceRef.current += 1;
    setSearchTermState(value);
    setAppliedSearchTerm(value);
  }, []);

  return {
    searchTerm,
    appliedSearchTerm,
    setSearchTerm,
    submitSearchTerm,
    resetSearchTerm,
  };
}
