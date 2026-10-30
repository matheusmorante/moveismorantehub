import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { ProductVisibilitySettings } from '../../../types/product.type';
import { ProductFiltersData } from '../ProductFilters';
import { loadProductCatalogStats } from '../ProductList/services/productCatalogStatsService';
import { productListSearchFormSchema } from '../../../../../../shared-utils/listingFormSchemas';
import {
  PRODUCT_LIST_SEARCH_DEBOUNCE_MS,
  PRODUCT_LIST_SEARCH_MIN_LENGTH,
} from '../../../../../../shared-utils/productListSearch';

export const defaultVisibility: ProductVisibilitySettings = {
  id: false,
  sku: false,
  code: true,
  description: true,
  category: true,
  costPrice: false,
  createdAt: true,
  unitPrice: true,
  weight: false,
  stock: true,
  status: true,
  actions: true,
};

export interface UseProductsPageStateProps {
  mode?: 'standard' | 'composition';
  isAdministrator?: boolean;
}

export function useProductsPageState({
  mode = 'standard',
  isAdministrator = false,
}: UseProductsPageStateProps) {
  const [hasTestProducts, setHasTestProducts] = useState(false);
  const [filters, setFilters] = useState<Partial<ProductFiltersData>>({});
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchValidationSequence = useRef(0);
  const { validateValues: validateProductSearch } = useZodForm(
    productListSearchFormSchema,
    { input: '', intent: 'debounced' },
  );

  const [showTestProducts, setShowTestProducts] = useState(false);
  const [showMergedProducts, setShowMergedProducts] = useState(false);
  const [visibilitySettings, setVisibilitySettings] =
    useState<ProductVisibilitySettings>(defaultVisibility);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdministrator) setShowTestProducts(false);
  }, [isAdministrator]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [accordionOpen, setAccordionOpen] = useState<{
    summary: boolean;
    filters: boolean;
    columns: boolean;
    shortcuts: boolean;
  }>({
    summary: true,
    filters: true,
    columns: true,
    shortcuts: true,
  });

  const toggleAccordion = useCallback((key: keyof typeof accordionOpen) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [catalogStats, setCatalogStats] = useState({
    total: 0,
    published: 0,
    hidden: 0,
    active: 0,
    disabled: 0,
    drafts: 0,
  });
  const [summaryChannel, setSummaryChannel] = useState<'erp' | 'catalog'>('erp');

  const showTestProductsForCurrentRole = isAdministrator && showTestProducts;

  const fetchStats = useCallback(async () => {
    try {
      const stats = await loadProductCatalogStats({
        showTestProducts: showTestProductsForCurrentRole,
        mode,
      });
      if (stats) setCatalogStats(stats);
    } catch (err: unknown) {
      console.error('Erro ao carregar estatísticas dos produtos:', err);
    }
  }, [showTestProductsForCurrentRole, mode]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const clearSearchDebounceTimer = useCallback(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
      searchDebounceTimer.current = null;
    }
  }, []);

  const applyValidatedProductSearch = useCallback(async (
    input: string,
    intent: 'debounced' | 'submitted',
    sequence: number,
  ) => {
    const parsed = await validateProductSearch(
      { input, intent },
      (errors) => {
        const message = Object.values(flattenFormErrors(errors))[0];
        toast.error(message || 'Não foi possível validar a busca de produtos.');
      },
    );
    if (parsed === false) return;
    const search = parsed.search;
    if (sequence !== searchValidationSequence.current || search === null) return;
    setFilters((previous) => {
      if (search === '') {
        return previous.search ? { ...previous, search: '' } : previous;
      }
      return (previous.search || '').trim() === search
        ? previous
        : { ...previous, search };
    });
  }, [validateProductSearch]);

  useEffect(
    () => () => {
      clearSearchDebounceTimer();
    },
    [clearSearchDebounceTimer]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearSearchDebounceTimer();
      const sequence = ++searchValidationSequence.current;

      const trimmed = value.trim();

      if (trimmed.length === 0) {
        void applyValidatedProductSearch(value, 'debounced', sequence);
        return;
      }

      // A decisão de aplicar/limpar o filtro passa pelo resolver real do formulário.
      searchDebounceTimer.current = setTimeout(() => {
        searchDebounceTimer.current = null;
        void applyValidatedProductSearch(value, 'debounced', sequence);
      }, PRODUCT_LIST_SEARCH_DEBOUNCE_MS);
    },
    [applyValidatedProductSearch, clearSearchDebounceTimer]
  );

  const clearSearchInput = useCallback(() => {
    clearSearchDebounceTimer();
    const sequence = ++searchValidationSequence.current;
    setSearchInput('');
    void applyValidatedProductSearch('', 'debounced', sequence);
  }, [applyValidatedProductSearch, clearSearchDebounceTimer]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearSearchDebounceTimer();
        const sequence = ++searchValidationSequence.current;
        void applyValidatedProductSearch(searchInput, 'submitted', sequence);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearSearchInput();
      }
    },
    [applyValidatedProductSearch, clearSearchDebounceTimer, searchInput, clearSearchInput]
  );

  useEffect(() => {
    const filterSearch = (filters.search || '').trim();
    const currentTrimmed = searchInput.trim();
    if (filterSearch !== '' && filterSearch !== currentTrimmed) {
      setSearchInput(filterSearch);
    } else if (filterSearch === '' && currentTrimmed !== '' && currentTrimmed.length >= 3) {
      setSearchInput('');
    }
  }, [filters.search]);

  const toggleVisibility = useCallback((column: keyof ProductVisibilitySettings) => {
    setVisibilitySettings((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  }, []);

  const currentFilters = useMemo(
    () => ({
      ...filters,
      showTrash: false,
      activeOnly: filters.activeOnly,
      isDraft: filters.isDraft,
      showTestProducts: showTestProductsForCurrentRole,
      includeMergedVariations: showMergedProducts,
    }),
    [filters, showTestProductsForCurrentRole, showMergedProducts]
  );

  const currentTitle = useMemo(
    () =>
      filters.isDraft
        ? mode === 'composition'
          ? 'Rascunhos de Produtos Compostos'
          : 'Rascunhos de Produtos'
        : undefined,
    [filters.isDraft, mode]
  );

  const handleCloseSpecialView = useMemo(
    () =>
      filters.isDraft
        ? () => setFilters((prev) => ({ ...prev, isDraft: undefined }))
        : undefined,
    [filters.isDraft]
  );

  const handleToggleActiveOnly = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      activeOnly: prev.activeOnly === false ? true : false,
    }));
    setIsActionsMenuOpen(false);
  }, []);

  const handleFilterTotal = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      activeOnly: undefined,
      status: undefined,
      isDraft: undefined,
    }));
  }, []);

  const handleFilterActive = useCallback(() => {
    setFilters((prev) =>
      summaryChannel === 'erp'
        ? { ...prev, activeOnly: true, status: undefined, isDraft: undefined }
        : {
            ...prev,
            activeOnly: undefined,
            status: 'published',
            isDraft: undefined,
          }
    );
  }, [summaryChannel]);

  const handleFilterDisabled = useCallback(() => {
    if (summaryChannel === 'erp') {
      setFilters((prev) => ({
        ...prev,
        activeOnly: false,
        status: undefined,
        isDraft: undefined,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        activeOnly: undefined,
        status: 'hidden',
        isDraft: undefined,
      }));
    }
  }, [summaryChannel]);

  const handleFilterDrafts = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      isDraft: prev.isDraft === true ? undefined : true,
      activeOnly: undefined,
      status: undefined,
    }));
  }, []);

  return {
    filters,
    setFilters,
    currentFilters,
    currentTitle,
    handleCloseSpecialView,
    searchInput,
    handleSearchChange,
    handleSearchKeyDown,
    clearSearchInput,
    showTestProducts,
    setShowTestProducts,
    showMergedProducts,
    setShowMergedProducts,
    hasTestProducts,
    setHasTestProducts,
    visibilitySettings,
    setVisibilitySettings,
    toggleVisibility,
    isSidebarOpen,
    setIsSidebarOpen,
    isActionsMenuOpen,
    setIsActionsMenuOpen,
    menuRef,
    handleToggleActiveOnly,
    accordionOpen,
    toggleAccordion,
    catalogStats,
    summaryChannel,
    setSummaryChannel,
    fetchStats,
    handleFilterTotal,
    handleFilterActive,
    handleFilterDisabled,
    handleFilterDrafts,
  };
}
