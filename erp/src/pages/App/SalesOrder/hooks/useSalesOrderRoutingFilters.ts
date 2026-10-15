import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Filters } from '../components/OrderFilters';
import { VisibilitySettings } from '../../types/order.type';

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

  const [customerSearchInput, setCustomerSearchInput] = useState(filters.customerName);
  const customerSearchBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCustomerSearchBlurTimer = useCallback(() => {
    if (customerSearchBlurTimer.current) {
      clearTimeout(customerSearchBlurTimer.current);
      customerSearchBlurTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearCustomerSearchBlurTimer();
    },
    [clearCustomerSearchBlurTimer]
  );

  useEffect(() => {
    clearCustomerSearchBlurTimer();
    setCustomerSearchInput(filters.customerName || '');
  }, [clearCustomerSearchBlurTimer, filters.customerName]);

  const handleCustomerSearchBlur = (value: string) => {
    const customerName = value.trim();
    if (customerName.length > 0 && customerName.length < 3) {
      setCustomerSearchInput(filters.customerName || '');
      return;
    }

    clearCustomerSearchBlurTimer();
    customerSearchBlurTimer.current = setTimeout(() => {
      setFilters((previous) =>
        (previous.customerName || '').trim() === customerName
          ? previous
          : { ...previous, customerName }
      );
      customerSearchBlurTimer.current = null;
    }, 300);
  };

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
    setFilters((prev) => ({ ...prev, searchId: saleOrderId }));
    setHighlightOrderId(saleOrderId);
    navigate('/sales-order', { replace: true, state: null });
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

  const [showTestOrders, setShowTestOrders] = useState(false);
  useEffect(() => {
    if (!isAdministrator) setShowTestOrders(false);
  }, [isAdministrator]);

  const showTestOrdersForCurrentRole = isAdministrator && showTestOrders;

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
    clearCustomerSearchBlurTimer,
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
