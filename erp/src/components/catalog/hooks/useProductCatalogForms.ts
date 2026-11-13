import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  productCatalogFiltersSchema,
  productCatalogPrepareSchema,
  type ProductCatalogFiltersInput,
  type ProductCatalogPrepareInput,
} from '../../../../../shared-utils/productCatalogFormSchemas';

const SEARCH_DEBOUNCE = 350;

export function useProductCatalogForms() {
  const [filters, setFilters] = useState<ProductCatalogFiltersInput>({
    categoryId: null,
    search: '',
    brand: '',
  });

  const filterForm = useForm<ProductCatalogFiltersInput>({
    resolver: zodResolver(productCatalogFiltersSchema),
    defaultValues: { categoryId: null, search: '', brand: '' },
  });

  const rawFilters = useWatch({ control: filterForm.control });
  const search = rawFilters.search || '';
  const categoryId = rawFilters.categoryId || '';

  const applyFilters = useCallback(() => {
    void filterForm.handleSubmit((values) => setFilters(values))();
  }, [filterForm]);

  const updateCategoryFilter = useCallback((value: string) => {
    filterForm.setValue('categoryId', value || null, { shouldDirty: true, shouldValidate: true });
    applyFilters();
  }, [filterForm, applyFilters]);

  const prepareForm = useForm<
    z.input<typeof productCatalogPrepareSchema>,
    unknown,
    ProductCatalogPrepareInput
  >({
    resolver: zodResolver(productCatalogPrepareSchema),
    defaultValues: { items: [], bulkScope: null, hidePrices: false, deliveryMode: 'link' },
  });

  const deliveryMode = useWatch({ control: prepareForm.control, name: 'deliveryMode' }) || 'link';

  useEffect(() => {
    const timer = window.setTimeout(applyFilters, SEARCH_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [applyFilters, search]);

  const isSearchDebouncing = search.trim() !== filters.search;

  return {
    filters,
    filterForm,
    search,
    categoryId,
    applyFilters,
    updateCategoryFilter,
    prepareForm,
    deliveryMode,
    isSearchDebouncing,
  };
}
