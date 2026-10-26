import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Filters } from '../components/OrderFilters';
import { VisibilitySettings } from '@/pages/types/order.type';

export interface UseSalesOrderRoutingFiltersProps {
  setHighlightOrderId: (id: string | null) => void;
  setOrderModalType: (type: 'sale' | 'assistance' | 'budget' | 'return' | null) => void;
  isAdministrator?: boolean;
}

export function useSalesOrderRoutingFilters({
  setHighlightOrderId,
  setOrderModalType,
  isAdministrator = false,
}: UseSalesOrderRoutingFiltersProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isBudgetRoute = location.pathname === '/budgets';
  const isAssistanceRoute = location.pathname === '/assistance-orders';
  const isReturnRoute = location.pathname === '/returns';
  const isSalesOrderRoute =
    location.pathname === '/sales-order' ||
    (!isBudgetRoute && !isAssistanceRoute && !isReturnRoute);
  const showOrderFilters = !isReturnRoute && !isSalesOrderRoute;

  const [filters, setFilters] = useState<Filters>({
    dateRange: { start: '', end: '' },
    dateType: 'personalizado',
    customerName: '',
    productName: '',
    status: '',
    orderType: isBudgetRoute
      ? 'budget'
      : isAssistanceRoute
        ? 'assistance'
        : isReturnRoute
          ? 'return'
          : 'sale',
    isBudgetView: isBudgetRoute,
    isAssistanceView: isAssistanceRoute,
    isReturnView: isReturnRoute,
    seller: '',
    valueRange: { min: 0, max: 1000000 },
    sortBy: 'date' as any,
    sortOrder: 'desc' as any,
    multiSort: [{ key: 'date', order: 'desc' }] as { key: string; order: 'asc' | 'desc' }[],
    searchId: '',
  });

  const [customerSearchInput, setCustomerSearchInput] = useState(filters.customerName || '');
  const customerSearchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCustomerSearchDebounceTimer = useCallback(() => {
    if (customerSearchDebounceTimer.current) {
      clearTimeout(customerSearchDebounceTimer.current);
      customerSearchDebounceTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearCustomerSearchDebounceTimer();
    },
    [clearCustomerSearchDebounceTimer]
  );

  const handleCustomerSearchChange = useCallback((value: string) => {
    setCustomerSearchInput(value);
    clearCustomerSearchDebounceTimer();

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setFilters((previous) =>
        previous.customerName ? { ...previous, customerName: '' } : previous
      );
      return;
    }

    if (trimmed.length < 3) {
      // Menos de 3 dígitos: não pesquisa; se havia busca anterior ativa, limpa após debounce sem apagar o texto digitado
      customerSearchDebounceTimer.current = setTimeout(() => {
        setFilters((previous) =>
          previous.customerName ? { ...previous, customerName: '' } : previous
        );
        customerSearchDebounceTimer.current = null;
      }, 350);
      return;
    }

    // >= 3 dígitos: busca por digitação com debounce de 350ms
    customerSearchDebounceTimer.current = setTimeout(() => {
      setFilters((previous) =>
        (previous.customerName || '').trim() === trimmed
          ? previous
          : { ...previous, customerName: trimmed }
      );
      customerSearchDebounceTimer.current = null;
    }, 350);
  }, [clearCustomerSearchDebounceTimer]);

  const handleClearCustomerSearch = useCallback(() => {
    clearCustomerSearchDebounceTimer();
    setCustomerSearchInput('');
    setFilters((previous) =>
      previous.customerName ? { ...previous, customerName: '' } : previous
    );
  }, [clearCustomerSearchDebounceTimer]);

  const handleCustomerSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearCustomerSearchDebounceTimer();
      const trimmed = customerSearchInput.trim();
      if (trimmed.length >= 3) {
        setFilters((previous) =>
          (previous.customerName || '').trim() === trimmed
            ? previous
            : { ...previous, customerName: trimmed }
        );
      } else if (trimmed.length === 0) {
        setFilters((previous) =>
          previous.customerName ? { ...previous, customerName: '' } : previous
        );
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleClearCustomerSearch();
    }
  }, [clearCustomerSearchDebounceTimer, customerSearchInput, handleClearCustomerSearch]);

  const handleCustomerSearchBlur = useCallback((value?: string) => {
    clearCustomerSearchDebounceTimer();
    const target = (value !== undefined ? value : customerSearchInput).trim();
    if (target.length >= 3) {
      setFilters((previous) =>
        (previous.customerName || '').trim() === target
          ? previous
          : { ...previous, customerName: target }
      );
    } else if (target.length === 0) {
      setFilters((previous) =>
        previous.customerName ? { ...previous, customerName: '' } : previous
      );
    }
  }, [clearCustomerSearchDebounceTimer, customerSearchInput]);

  useEffect(() => {
    const filterName = (filters.customerName || '').trim();
    const inputTrimmed = customerSearchInput.trim();
    if (filterName !== '' && filterName !== inputTrimmed) {
      setCustomerSearchInput(filterName);
    } else if (filterName === '' && inputTrimmed !== '' && inputTrimmed.length >= 3) {
      setCustomerSearchInput('');
    }
  }, [filters.customerName]);

  // Sincronizar filtro quando a rota mudar
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      orderType: isBudgetRoute
        ? 'budget'
        : isAssistanceRoute
          ? 'assistance'
          : isReturnRoute
            ? 'return'
            : 'sale',
      isBudgetView: isBudgetRoute,
      isAssistanceView: isAssistanceRoute,
      isReturnView: isReturnRoute,
    }));

    const title = isBudgetRoute
      ? 'Orçamentos'
      : isAssistanceRoute
        ? 'Assistências'
        : isReturnRoute
          ? 'Devoluções'
          : 'Pedidos de Venda';
    document.title = `${title} | Móveis Morante`;
  }, [isBudgetRoute, isAssistanceRoute, isReturnRoute]);

  useEffect(() => {
    const saleOrderId = location.state?.saleOrderIdToOpen as string | undefined;
    if (!saleOrderId) return;
    const orderTypeToOpen = location.state?.orderTypeToOpen as string | undefined;
    setFilters((prev) => ({ ...prev, searchId: saleOrderId }));
    setHighlightOrderId(saleOrderId);
    const destination = orderTypeToOpen === 'budget'
      ? '/budgets'
      : orderTypeToOpen === 'assistance'
        ? '/assistance-orders'
        : orderTypeToOpen === 'return'
          ? '/returns'
          : '/sales-order';
    navigate(destination, { replace: true, state: null });
  }, [location.state, navigate, setHighlightOrderId]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const typeParam = queryParams.get('type');
    const newParam = queryParams.get('new');

    if (typeParam === 'budget') {
      setFilters((prev) => ({ ...prev, orderType: 'budget' }));
      if (newParam === 'true') {
        setOrderModalType('budget');
      }
    }
  }, [setOrderModalType]);

  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    id: true,
    orderDate: true,
    deliveryDate: true,
    customer: true,
    totalValue: true,
    status: true,
    orderType: true,
    labels: true,
    actions: true,
  });

  const toggleVisibility = (column: keyof VisibilitySettings) => {
    setVisibilitySettings((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const handleSort = (key: string, order: 'asc' | 'desc', isMulti: boolean = false) => {
    setFilters((prev) => {
      let newMultiSort = [...prev.multiSort];

      if (isMulti) {
        const existingIdx = newMultiSort.findIndex((s) => s.key === key);
        if (existingIdx !== -1) {
          newMultiSort[existingIdx] = { key, order };
        } else {
          newMultiSort.push({ key, order });
        }
      } else {
        newMultiSort = [{ key, order }];
      }

      return {
        ...prev,
        sortBy: key as any,
        sortOrder: order,
        multiSort: newMultiSort,
      };
    });
  };

  const isTestArtifactSession = Boolean(import.meta.env.VITE_TEST_ARTIFACT_RUN_ID);
  const [showTestOrders, setShowTestOrders] = useState(false);
  useEffect(() => {
    if (!isAdministrator && !isTestArtifactSession) setShowTestOrders(false);
  }, [isAdministrator, isTestArtifactSession]);

  const showTestOrdersForCurrentRole = (isAdministrator || isTestArtifactSession) && showTestOrders;

  const activeFilters = useMemo(
    () => ({
      ...filters,
      showTrash: false,
      isDraft: false,
      showTestOrders: showTestOrdersForCurrentRole,
    }),
    [filters, showTestOrdersForCurrentRole]
  );

  const trashFilters = useMemo(
    () => ({
      ...filters,
      showTrash: true,
      isDraft: false,
      showTestOrders: showTestOrdersForCurrentRole,
    }),
    [filters, showTestOrdersForCurrentRole]
  );

  const draftFilters = useMemo(
    () => ({
      ...filters,
      showTrash: false,
      isDraft: true,
      showTestOrders: showTestOrdersForCurrentRole,
    }),
    [filters, showTestOrdersForCurrentRole]
  );

  return {
    isBudgetRoute,
    isAssistanceRoute,
    isReturnRoute,
    isSalesOrderRoute,
    showOrderFilters,
    filters,
    setFilters,
    customerSearchInput,
    setCustomerSearchInput,
    handleCustomerSearchChange,
    handleClearCustomerSearch,
    handleCustomerSearchKeyDown,
    clearCustomerSearchBlurTimer: clearCustomerSearchDebounceTimer,
    clearCustomerSearchDebounceTimer,
    handleCustomerSearchBlur,
    visibilitySettings,
    toggleVisibility,
    handleSort,
    showTestOrders,
    setShowTestOrders,
    activeFilters,
    trashFilters,
    draftFilters,
  };
}
