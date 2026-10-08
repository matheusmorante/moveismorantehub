import { useState, useEffect, useMemo, useRef } from 'react';
import Order, { IsButtonsClicked } from '../../../types/order.type';
import {
  subscribeToOrderChanges,
  fetchOrdersPage,
  updateOrder,
  undoReturn,
} from '../../../utils/orderHistoryService';
import { actionsMap, buttons } from '../OrderActions/orderActionsConfig';
import { autoFulfillExpiredOrders } from '@/pages/utils/orderFulfillmentCountdown';
import { toast } from 'react-toastify';
import { useWindowSize } from '../../../../hooks/useWindowSize';
import { filterOrder, sortOrders } from './useOrderHistoryFilters';
import { createOrderHistoryOperations } from './useOrderHistoryOperations';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { canCancelOrderDirectly } from '@/pages/utils/orderStatusTransitionRules';
import { isTestOrder } from '@/pages/utils/hmlTestData';

const PAGE_SIZE = 15;
const CARD_VIEW_BREAKPOINT = 1024;

const resolveFiscalBadgeRefreshWaiters = (
  waitersBySignal: Map<number, Array<() => void>>,
  throughSignal: number
) => {
  for (const [signal, waiters] of waitersBySignal) {
    if (signal > throughSignal) continue;
    waitersBySignal.delete(signal);
    waiters.forEach((resolve) => resolve());
  }
};

export const useOrderHistory = (filters?: any) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const refreshSignalRef = useRef(0);
  const fiscalBadgeRefreshWaiters = useRef(new Map<number, Array<() => void>>());
  const [totalDatabaseItems, setTotalDatabaseItems] = useState(0);
  const [pendingReturnFulfillment, setPendingReturnFulfillment] = useState<Order | null>(null);
  const [pendingReturnCancellation, setPendingReturnCancellation] = useState<Order | null>(null);
  const [fiscalBadgeStatusByOrderId, setFiscalBadgeStatusByOrderId] = useState<
    Partial<Record<string, OrderFiscalBadgeStatuses>>
  >({});
  const [fiscalBadgeLoadingByOrderId, setFiscalBadgeLoadingByOrderId] = useState<
    Partial<Record<string, boolean>>
  >({});
  const fiscalBadgeRefreshVersionByOrderId = useRef<Record<string, number>>({});

  const bumpFiscalBadgeRefreshVersion = (orderId: string) => {
    const nextVersion = (fiscalBadgeRefreshVersionByOrderId.current[orderId] || 0) + 1;
    fiscalBadgeRefreshVersionByOrderId.current[orderId] = nextVersion;
    return nextVersion;
  };

  const { width } = useWindowSize();
  const isMobile = width < CARD_VIEW_BREAKPOINT;
  const isCardView =
    isMobile ||
    (typeof window !== 'undefined' &&
      (window.location.search.includes('auth_email') ||
        window.location.pathname.includes('/mobile') ||
        Boolean((window as any).ReactNativeWebView)));

  const refresh = () => {
    const nextSignal = refreshSignalRef.current + 1;
    refreshSignalRef.current = nextSignal;
    const refreshComplete = new Promise<void>((resolve) => {
      const waiters = fiscalBadgeRefreshWaiters.current.get(nextSignal) || [];
      fiscalBadgeRefreshWaiters.current.set(nextSignal, [...waiters, resolve]);
    });
    setRefreshSignal(nextSignal);
    return refreshComplete;
  };

  const markFiscalDocumentAuthorized = (
    orderId: string,
    environment: 1 | 2,
    documentId: string
  ) => {
    setFiscalBadgeStatusByOrderId((previous) => {
      const current = previous[orderId] || {
        production: 'not_issued' as const,
        homologation: 'not_issued' as const,
      };
      return {
        ...previous,
        [orderId]:
          environment === 2
            ? { ...current, homologation: 'issued', homologationDocumentId: documentId }
            : { ...current, production: 'issued', productionDocumentId: documentId },
      };
    });
    setFiscalBadgeLoadingByOrderId((previous) => ({ ...previous, [orderId]: false }));
  };

  useEffect(
    () => () =>
      resolveFiscalBadgeRefreshWaiters(
        fiscalBadgeRefreshWaiters.current,
        Number.POSITIVE_INFINITY
      ),
    []
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFiscalBadgeStatusByOrderId({});

    fetchOrdersPage(currentPage, PAGE_SIZE, filters)
      .then(({ orders: pageOrders, total }) => {
        if (!active) return;
        setOrders(pageOrders);
        setTotalDatabaseItems(total);
        setLoading(false);
        autoFulfillExpiredOrders(pageOrders);
        const orderIds = pageOrders
          .map((order) => order.id)
          .filter((id): id is string => Boolean(id));
        const requestVersions = Object.fromEntries(
          orderIds.map((orderId) => [
            orderId,
            fiscalBadgeRefreshVersionByOrderId.current[orderId] || 0,
          ])
        );
        void fetchOrderFiscalBadgeStatuses(orderIds)
          .then((statuses) => {
            if (!active) return;
            setFiscalBadgeStatusByOrderId((previous) => {
              const next = { ...previous };
              for (const [orderId, status] of Object.entries(statuses)) {
                if (
                  (fiscalBadgeRefreshVersionByOrderId.current[orderId] ?? 0) ===
                  requestVersions[orderId]
                ) {
                  next[orderId] = status;
                }
              }
              return next;
            });
          })
          .catch(() => {
            console.error(
              '[useOrderHistory] Não foi possível carregar o status fiscal dos pedidos.'
            );
          })
          .finally(() => {
            if (active)
              resolveFiscalBadgeRefreshWaiters(fiscalBadgeRefreshWaiters.current, refreshSignal);
          });
      })
      .catch((err) => {
        if (!active) return;
        console.error('[useOrderHistory] Erro ao buscar pedidos paginados:', err);
        setLoading(false);
        resolveFiscalBadgeRefreshWaiters(fiscalBadgeRefreshWaiters.current, refreshSignal);
      });

    return () => {
      active = false;
    };
  }, [currentPage, filters, refreshSignal]);

  useEffect(() => {
    const unsub = subscribeToOrderChanges(() => {
      refresh();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrders([]);
  }, [filters]);

  const filteredOrders = useMemo(() => {
    return sortOrders(
      orders.filter(
        (order) =>
          (Boolean(filters?.showTestOrders) || !isTestOrder(order)) &&
          filterOrder(order, filters)
      ),
      filters
    );
  }, [orders, filters]);

  const totalItems = totalDatabaseItems || filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const operations = useMemo(() => {
    return createOrderHistoryOperations({
      orders,
      setOrders,
      selectedOrders,
      setSelectedOrders,
      setLoading,
      refresh,
    });
  }, [orders, selectedOrders]);

  const handleStatusUpdate = async (
    id: string,
    newStatus: Order['status'],
    options?: { productionConfirmed?: boolean }
  ) => {
    const currentOrder = orders.find((order) => order.id === id);
    if (!currentOrder) return;
    if (currentOrder.status === 'draft') {
      toast.warning(
        'Pedidos em rascunho devem ter seu cadastro finalizado através do formulário para serem agendados.'
      );
      return;
    }
    if (currentOrder.status === 'cancelled' && newStatus !== 'cancelled') {
      toast.warning(
        'Pedido cancelado não pode ser reaberto. Duplique-o para criar uma nova venda.'
      );
      return;
    }
    if (newStatus === 'cancelled' && !canCancelOrderDirectly(currentOrder)) {
      toast.warning(
        'A mercadoria já saiu para entrega ou foi retirada. Registre uma devolução para reverter a operação.'
      );
      return;
    }
    if (
      currentOrder.orderType === 'return' &&
      currentOrder.status === 'fulfilled' &&
      newStatus === 'cancelled'
    ) {
      toast.warning('Uma devolução atendida não pode ser cancelada ou desfeita.');
      return;
    }
    if (
      currentOrder.orderType === 'return' &&
      currentOrder.status === 'scheduled' &&
      newStatus === 'fulfilled'
    ) {
      setPendingReturnFulfillment(currentOrder);
      return;
    }
    if (newStatus !== 'cancelled') {
      await operations.commitStatusUpdate(currentOrder, newStatus, options);
      return;
    }

    bumpFiscalBadgeRefreshVersion(id);
    setFiscalBadgeLoadingByOrderId((previous) => ({ ...previous, [id]: true }));
    try {
      await operations.commitStatusUpdate(currentOrder, newStatus, options);
    } catch (error) {
      console.error('[useOrderHistory] Erro inesperado ao cancelar o pedido.', error);
    } finally {
      setFiscalBadgeLoadingByOrderId((previous) => ({ ...previous, [id]: false }));
    }
  };

  const confirmReturnFulfillment = async () => {
    if (!pendingReturnFulfillment) return;
    const order = pendingReturnFulfillment;
    setPendingReturnFulfillment(null);
    await operations.commitStatusUpdate(order, 'fulfilled');
  };

  const confirmReturnCancellation = async () => {
    if (!pendingReturnCancellation) return;
    const order = pendingReturnCancellation;
    setPendingReturnCancellation(null);
    try {
      await undoReturn(order);
      const returnId = order.orderType === 'return' ? order.id : order.returnOrderId;
      setOrders((prev) =>
        prev.map((item) => {
          // Marca a devolução como cancelada (se estiver na lista)
          if (item.id === returnId) {
            return {
              ...item,
              status: 'cancelled',
              returnStockProcessed: false,
              returnStockReversed: true,
            };
          }
          // Limpa todos os campos que compõem hasReturn no pedido de venda original
          if (item.id === order.id && order.orderType !== 'return') {
            return {
              ...item,
              returnOrderId: null as any,
              returnKind: null as any,
              // Se a venda estava como 'returned', volta para 'fulfilled'
              status: item.status === 'returned' ? 'fulfilled' : item.status,
              // Limpar flags legadas
              hasReturn: false,
              returned: false,
            } as any;
          }
          return item;
        })
      );
      const msg =
        order.status === 'fulfilled'
          ? 'Devolução desfeita e estornada com sucesso!'
          : 'Devolução cancelada com sucesso!';
      toast.success(msg);
      refresh();
    } catch (error: any) {
      toast.error(`Erro ao processar devolução: ${error?.message || 'tente novamente'}`);
    }
  };

  const handleAction = async (actionKey: string, order: Order) => {
    if (actionKey === 'retryOrderFiscalCancellation') {
      await operations.retryFiscalCancellation(order);
      return;
    }

    if (actionKey === 'undoReturn') {
      setPendingReturnCancellation(order);
      return;
    }

    const actionDef = buttons.find((b) => b.key === actionKey);
    if (actionDef && order.id) {
      sessionStorage.setItem('order', JSON.stringify(order));
      actionsMap[actionDef.action](order);

      const currentClicks = order.isButtonsClicked || {
        printReceipt: false,
        printShippingOrder: false,
        printWarrantyTerm: false,
        sendShippingOrder: false,
        sendCustomerOrder: false,
        sendCustomerReviews: false,
        printShippingLabel: false,
        printProductLabel: false,
        generatePaymentLink: false,
        printBudget: false,
        sendCustomerOrderDetails: false,
        sendAssistanceOS: false,
        sendBudget: false,
      };
      const newClicks: IsButtonsClicked = { ...currentClicks, [actionKey]: true };

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, isButtonsClicked: newClicks } : o))
      );

      try {
        await updateOrder(order.id!, { isButtonsClicked: newClicks }, order);
        if (actionKey === 'sendCustomerReviews' && !order.reviewRequested) {
          await updateOrder(order.id, { reviewRequested: true });
        }
      } catch (error) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, isButtonsClicked: currentClicks } : o))
        );
        console.error('Erro ao registrar clique na ação:', error);
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIdsOnPage = filteredOrders.map((o) => o.id!).filter(Boolean);
    const allSelected = allIdsOnPage.every((id) => selectedOrders.includes(id));
    if (allSelected) {
      setSelectedOrders((prev) => prev.filter((id) => !allIdsOnPage.includes(id)));
    } else {
      const newSelections = allIdsOnPage.filter((id) => !selectedOrders.includes(id));
      setSelectedOrders((prev) => [...prev, ...newSelections]);
    }
  };

  const clearSelection = () => setSelectedOrders([]);

  return {
    orders: filteredOrders,
    hasTestOrders: orders.some(isTestOrder),
    fiscalBadgeStatusByOrderId,
    fiscalBadgeLoadingByOrderId,
    totalItems,
    currentPage,
    itemsPerPage: PAGE_SIZE,
    totalPages,
    setCurrentPage,
    isMobile,
    isCardView,
    loading,
    handleDelete: operations.handleDelete,
    handleRestore: operations.handleRestore,
    handlePermanentDelete: operations.handlePermanentDelete,
    handleAction,
    handleStatusUpdate,
    pendingReturnFulfillment,
    confirmReturnFulfillment,
    cancelReturnFulfillment: () => setPendingReturnFulfillment(null),
    pendingReturnCancellation,
    confirmReturnCancellation,
    cancelReturnCancellation: () => setPendingReturnCancellation(null),
    selectedOrders,
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkTrash: operations.handleBulkTrash,
    handleBulkRestore: operations.handleBulkRestore,
    handleBulkPermanentDelete: operations.handleBulkPermanentDelete,
    handleDeleteDrafts: operations.handleBulkPermanentDelete,
    handleBlingUpdate: operations.handleBlingUpdate,
    handleStockCheckUpdate: operations.handleStockCheckUpdate,
    refresh,
    markFiscalDocumentAuthorized,
  };
};
