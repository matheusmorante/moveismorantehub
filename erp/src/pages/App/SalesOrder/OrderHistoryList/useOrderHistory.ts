import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircuitBreakerError } from '@/services/monitoring';
import Order, { IsButtonsClicked } from '../../../types/order.type';
import {
  subscribeToOrderChanges,
  fetchOrdersPage,
  fetchOrdersForClientFiltering,
  updateOrder,
} from '../../../utils/orderHistoryService';
import { actionsMap, buttons } from '../OrderActions/orderActionsConfig';
import { toast } from 'react-toastify';
import { useWindowSize } from '../../../../hooks/useWindowSize';
import {
  filterOrder,
  requiresGlobalOrderFiltering,
  selectFilteredOrderHistoryPage,
  sortOrders,
} from './useOrderHistoryFilters';
import { createOrderHistoryOperations } from './useOrderHistoryOperations';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { canCancelOrderDirectly } from '@/pages/utils/orderStatusTransitionRules';
import { isTestOrder } from '@/pages/utils/hmlTestData';
import { shouldClearQueryListSnapshot } from '@/pages/utils/queryListSnapshot';
import { isIdentifiedTestArtifact } from '../../../../../../shared-utils/testArtifactPolicy';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { returnFulfillmentFormSchema, getReturnFulfillmentFormValues, ReturnFulfillmentUnconfirmedError, type ReturnFulfillmentValues,
  returnCancellationFormSchema, getReturnCancellationFormValues, ReturnCancellationUnconfirmedError, type ReturnCancellationValues } from '../../../../../../shared-utils/returnFormSchemas';
import { confirmReturnOrderFulfillment, confirmReturnOrderCancellation } from '../../../utils/orderMutation/orderUpdateService';
import {
  automaticallyTransmitReturnFiscalDocuments,
  getAutomaticReturnFiscalEmissionNotice,
} from '../../FiscalDocuments/services/automaticReturnFiscalEmissionService';

const PAGE_SIZE = 15;
const CARD_VIEW_BREAKPOINT = 1024;
const EMPTY_ORDERS: Order[] = [];

const isCircuitBreakerFailure = (error: unknown) => {
  if (error instanceof CircuitBreakerError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; message?: unknown };
  return (
    candidate.name === 'CircuitBreakerError' ||
    (typeof candidate.message === 'string' &&
      candidate.message.includes('Requisição bloqueada pelo Query Guard (Loop Detectado)'))
  );
};

const shouldRetryOrderRead = (failureCount: number, error: unknown) =>
  !isCircuitBreakerFailure(error) && failureCount < 1;

export const useOrderHistory = (filters?: any) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [ordersSnapshotQueryKey, setOrdersSnapshotQueryKey] = useState<string | null>(null);
  const [totalDatabaseItems, setTotalDatabaseItems] = useState(0);
  const [pendingReturnFulfillment, setPendingReturnFulfillment] = useState<Order | null>(null);
  const returnFulfillmentForm = useZodForm(returnFulfillmentFormSchema, getReturnFulfillmentFormValues(pendingReturnFulfillment ?? {}));
  const pendingReturnOwner = useRef(pendingReturnFulfillment);
  pendingReturnOwner.current = pendingReturnFulfillment;
  const returnTransitionInFlight = useRef(false);
  const [returnTransitionBusy, setReturnTransitionBusy] = useState(false);
  const blockedReturnTransitions = useRef(new Map<string, Error>());
  const returnHistoryActive = useRef(true);
  useEffect(() => { returnHistoryActive.current = true; return () => { returnHistoryActive.current = false; }; }, []);
  const [pendingReturnCancellation, setPendingReturnCancellation] = useState<Order | null>(null);
  const returnCancellationForm = useZodForm(returnCancellationFormSchema, getReturnCancellationFormValues(pendingReturnCancellation ?? {}));
  const pendingReturnCancellationOwner = useRef(pendingReturnCancellation);
  pendingReturnCancellationOwner.current = pendingReturnCancellation;
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

  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

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

  const {
    data: pageOrdersData,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['orders', filters, currentPage],
    queryFn: async () => {
      let result: { orders: Order[]; total: number };
      if (requiresGlobalOrderFiltering(filters)) {
        const candidateOrders = await queryClient.fetchQuery({
          queryKey: ['orders', 'client-filter-candidates', filters],
          queryFn: () => fetchOrdersForClientFiltering(filters, { throwOnError: true }),
          retry: shouldRetryOrderRead,
          staleTime: 30 * 1000,
        });
        result = selectFilteredOrderHistoryPage(
          candidateOrders.filter(
            (order) => Boolean(filters?.showTestOrders) || !isTestOrder(order)
          ),
          filters,
          currentPage,
          PAGE_SIZE
        );
      } else {
        result = await fetchOrdersPage(currentPage, PAGE_SIZE, filters, { throwOnError: true });
      }
      const { orders: pageOrders, total } = result;
      const orderIds = pageOrders
        .map((order) => order.id)
        .filter((id): id is string => Boolean(id));
      let fiscalStatuses: Record<string, OrderFiscalBadgeStatuses> = {};
      try {
        fiscalStatuses = await fetchOrderFiscalBadgeStatuses(orderIds);
      } catch {
        console.error(
          '[useOrderHistory] Não foi possível carregar o status fiscal dos pedidos.'
        );
      }
      return { orders: pageOrders, total, fiscalStatuses };
    },
    retry: shouldRetryOrderRead,
    staleTime: 30 * 1000, // 30 segundos em memória
    gcTime: 5 * 60 * 1000,
  });
  const currentOrdersQueryKey = JSON.stringify([filters ?? null, currentPage]);
  const failedWithoutCurrentData = shouldClearQueryListSnapshot(pageOrdersData, queryError);
  const snapshotMatchesCurrentQuery = ordersSnapshotQueryKey === currentOrdersQueryKey;
  const loadingCurrentQuery =
    !snapshotMatchesCurrentQuery && (queryLoading || pageOrdersData !== undefined);
  const ordersForCurrentQuery =
    failedWithoutCurrentData || !snapshotMatchesCurrentQuery ? EMPTY_ORDERS : orders;

  useEffect(() => {
    if (pageOrdersData) {
      setOrders(pageOrdersData.orders);
      setOrdersSnapshotQueryKey(currentOrdersQueryKey);
      setTotalDatabaseItems(pageOrdersData.total);
      setFiscalBadgeStatusByOrderId(pageOrdersData.fiscalStatuses);
      setLoading(false);
    } else if (queryLoading) {
      setLoading(true);
    } else if (failedWithoutCurrentData) {
      // Não exiba a página anterior como se atendesse aos filtros atuais.
      // Em falhas de refetch com cache, pageOrdersData continua preenchido
      // e o ramo acima preserva a lista conhecida.
      setOrders([]);
      setTotalDatabaseItems(0);
      setFiscalBadgeStatusByOrderId({});
      setLoading(false);
    }
  }, [
    pageOrdersData,
    queryLoading,
    queryError,
    failedWithoutCurrentData,
    currentOrdersQueryKey,
  ]);

  useEffect(() => {
    const unsub = subscribeToOrderChanges(() => {
      refresh();
    });
    return () => unsub();
  }, [refresh]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrders([]);
  }, [filters]);

  const filteredOrders = useMemo(() => {
    return sortOrders(
      ordersForCurrentQuery.filter(
        (order) =>
          (Boolean(filters?.showTestOrders) || !isTestOrder(order)) &&
          filterOrder(order, filters)
      ),
      filters
    );
  }, [ordersForCurrentQuery, filters]);

  const totalItems = failedWithoutCurrentData ? 0 : totalDatabaseItems || filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const handleAutomaticallyFulfilledOrder = useCallback(
    async (order: Order) => {
      const orderType = String(
        order.orderType ||
          (order as any).order_type ||
          (order as any).order_data?.orderType ||
          (order as any).order_data?.order_type ||
          ''
      ).toLowerCase();
      if (orderType !== 'return' || !order.id || isIdentifiedTestArtifact(order)) return;

      void refresh();
      try {
        const result = await automaticallyTransmitReturnFiscalDocuments(order.id);
        const notice = getAutomaticReturnFiscalEmissionNotice(result);
        if (notice) toast[notice.tone](notice.message);
      } catch (error: unknown) {
        console.error('Devolução concluída; emissão fiscal automática pendente:', error);
        toast.warning(
          'O recebimento da devolução comercial foi confirmado. A emissão fiscal precisa ser conferida na área fiscal.'
        );
      } finally {
        void refresh();
      }
    },
    [refresh]
  );


  useEffect(() => {
    if (queryError) return;
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [queryError, totalPages]);

  const operations = useMemo(() => {
    return createOrderHistoryOperations({
      orders: ordersForCurrentQuery,
      setOrders,
      selectedOrders,
      setSelectedOrders,
      setLoading,
      refresh,
    });
  }, [ordersForCurrentQuery, selectedOrders, refresh]);

  const handleStatusUpdate = async (
    id: string,
    newStatus: Order['status'],
    options?: { productionConfirmed?: boolean }
  ) => {
    const currentOrder = ordersForCurrentQuery.find((order) => order.id === id);
    if (!currentOrder) return;
    if (currentOrder.orderType === 'return' && currentOrder.status === 'fulfilled' && newStatus === 'fulfilled') return;
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
    if (currentOrder.orderType === 'return' && currentOrder.status === 'scheduled' && newStatus === 'cancelled') {
      pendingReturnOwner.current = null; setPendingReturnFulfillment(null);
      pendingReturnCancellationOwner.current = currentOrder; setPendingReturnCancellation(currentOrder);
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
      toast.warning('Uma devolução concluída não pode ser cancelada ou desfeita.');
      return;
    }
    if (
      currentOrder.orderType === 'return' &&
      currentOrder.status === 'scheduled' &&
      newStatus === 'fulfilled'
    ) {
      pendingReturnCancellationOwner.current = null; setPendingReturnCancellation(null);
      pendingReturnOwner.current = currentOrder; setPendingReturnFulfillment(currentOrder);
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

  const confirmReturnFulfillment = async (input: ReturnFulfillmentValues, stillCurrent: () => boolean = () => true): Promise<boolean> => {
    const order = pendingReturnOwner.current;
    if (!order || returnTransitionInFlight.current) return false;
    const blocked = blockedReturnTransitions.current.get(order.id || '');
    if (blocked) throw blocked;
    returnTransitionInFlight.current = true;
    setReturnTransitionBusy(true);
    let accepting = true;
    const isCurrent = () => accepting && returnHistoryActive.current && pendingReturnOwner.current === order && stillCurrent();
    try {
      return await returnFulfillmentForm.validateAndRun(input, async (values) => {
        if (!isCurrent()) return false;
        const latest = ordersForCurrentQuery.find((item) => item.id === values.orderId);
        if (latest && (latest.status !== 'scheduled' || (order.updatedAt && latest.updatedAt !== order.updatedAt))) throw new Error('A devolução comercial mudou. Atualize o histórico antes de confirmar o recebimento.');
        const receipt = await withTimeout(confirmReturnOrderFulfillment(values, order, isCurrent), 35000, null, 'devolucao:aguardar-confirmacao-comercial');
        if (!receipt) throw new ReturnFulfillmentUnconfirmedError();
        if (!isCurrent()) throw Object.assign(new Error('O recebimento foi confirmado em outro contexto. Atualize o histórico da devolução comercial.'), { requiresRefresh: true });
        const confirmedOrder = { ...order, ...receipt.order_data, id: receipt.id, updatedAt: receipt.updated_at };
        setOrders((previous) => previous.map((item) => item.id === receipt.id ? { ...item, ...receipt.order_data, id: receipt.id, updatedAt: receipt.updated_at } : item));
        toast.success(values.returnMethod === 'store_collection' ? 'Coleta da devolução comercial confirmada.' : 'Recebimento da devolução comercial confirmado.');
        if (!isIdentifiedTestArtifact(confirmedOrder)) void handleAutomaticallyFulfilledOrder(confirmedOrder);
        pendingReturnOwner.current = null;
        setPendingReturnFulfillment(null);
        return true;
      }, (errors) => { throw new Error(Object.values(flattenFormErrors(errors))[0] || 'Confira a confirmação da devolução comercial.'); });
    } catch (error) {
      const cause = error as { uncertain?: boolean; requiresRefresh?: boolean; code?: string };
      const failure = error instanceof Error ? error : Object.assign(new Error(cause?.code === '42501'
        ? 'Você não tem permissão para confirmar o recebimento desta devolução comercial.'
        : 'Não foi possível confirmar o recebimento da devolução comercial. Confira os dados e tente novamente.'), { cause: error });
      if (cause?.uncertain || cause?.requiresRefresh) {
        blockedReturnTransitions.current.set(order.id || '', failure);
        if (returnHistoryActive.current && pendingReturnOwner.current !== order) toast.warning(cause.requiresRefresh
          ? 'O recebimento de outra devolução comercial foi confirmado. Atualize o histórico e confira a emissão fiscal antes de repetir qualquer operação.'
          : 'Não foi possível confirmar outra devolução comercial. Consulte o histórico antes de repetir.');
      }
      throw failure;
    } finally { accepting = false; returnTransitionInFlight.current = false; if (returnHistoryActive.current) setReturnTransitionBusy(false); }
  };

  const confirmReturnCancellation = async (input: ReturnCancellationValues, stillCurrent: () => boolean = () => true): Promise<boolean> => {
    const order = pendingReturnCancellationOwner.current;
    if (!order || returnTransitionInFlight.current) return false;
    const blocked = blockedReturnTransitions.current.get(order.id || '');
    if (blocked) throw blocked;
    returnTransitionInFlight.current = true;
    setReturnTransitionBusy(true);
    let accepting = true;
    const isCurrent = () => accepting && returnHistoryActive.current && pendingReturnCancellationOwner.current === order && stillCurrent();
    try {
      return await returnCancellationForm.validateAndRun(input, async (values) => {
        if (!isCurrent()) return false;
        const latest = ordersForCurrentQuery.find((item) => item.id === values.orderId);
        if (latest && (latest.status !== 'scheduled' || latest.updatedAt !== values.expectedUpdatedAt)) throw new Error('A devolução comercial mudou. Atualize o histórico antes de confirmar o cancelamento.');
        const receipt = await withTimeout(confirmReturnOrderCancellation(values, order, isCurrent), 35000, null, 'devolucao:aguardar-cancelamento-comercial');
        if (!receipt) throw new ReturnCancellationUnconfirmedError();
        if (!isCurrent()) throw Object.assign(new Error('O cancelamento foi confirmado em outro contexto. Atualize o histórico da devolução comercial.'), { requiresRefresh: true });
        setOrders((previous) => previous.map((item) => item.id === receipt.id ? { ...item, ...receipt.order_data, id: receipt.id, updatedAt: receipt.updated_at } : item));
        toast.success('Cancelamento da devolução comercial confirmado.');
        pendingReturnCancellationOwner.current = null;
        setPendingReturnCancellation(null);
        return true;
      }, (errors) => { throw new Error(Object.values(flattenFormErrors(errors))[0] || 'Confira o cancelamento da devolução comercial.'); });
    } catch (error) {
      const cause = error as { uncertain?: boolean; requiresRefresh?: boolean; code?: string };
      const failure = error instanceof Error ? error : Object.assign(new Error(cause?.code === '42501'
        ? 'Você não tem permissão para cancelar esta devolução comercial.'
        : 'Não foi possível cancelar a devolução comercial. Confira os dados e tente novamente.'), { cause: error });
      if (cause?.uncertain || cause?.requiresRefresh) {
        blockedReturnTransitions.current.set(order.id || '', failure);
        if (returnHistoryActive.current && pendingReturnCancellationOwner.current !== order) toast.warning('O resultado do cancelamento de outra devolução comercial precisa ser conferido. Consulte o histórico antes de repetir.');
      }
      throw failure;
    } finally { accepting = false; returnTransitionInFlight.current = false; if (returnHistoryActive.current) setReturnTransitionBusy(false); }
  };

  const handleAction = async (actionKey: string, order: Order) => {
    if (actionKey === 'retryOrderFiscalCancellation') {
      await operations.retryFiscalCancellation(order);
      return;
    }
    if (actionKey.startsWith('retryOrderFiscalCancellation:')) {
      await operations.retryFiscalCancellation(order, actionKey.split(':')[1]);
      return;
    }

    if (actionKey === 'undoReturn') {
      pendingReturnOwner.current = null; setPendingReturnFulfillment(null);
      pendingReturnCancellationOwner.current = order; setPendingReturnCancellation(order);
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
        await updateOrder(order.id!, { isButtonsClicked: newClicks }, order, undefined, {
          metadataOnly: true,
        });
        if (actionKey === 'sendCustomerReviews' && !order.reviewRequested) {
          await updateOrder(order.id, { reviewRequested: true }, order, undefined, {
            metadataOnly: true,
          });
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
    fiscalBadgeStatusByOrderId,
    fiscalBadgeLoadingByOrderId,
    totalItems,
    currentPage,
    itemsPerPage: PAGE_SIZE,
    totalPages,
    setCurrentPage,
    isMobile,
    isCardView,
    loading: loading || loadingCurrentQuery,
    error: queryError,
    handleDelete: operations.handleDelete,
    handleRestore: operations.handleRestore,
    handlePermanentDelete: operations.handlePermanentDelete,
    handleAction,
    handleStatusUpdate,
    pendingReturnFulfillment,
    returnFulfillmentBusy: returnTransitionBusy,
    confirmReturnFulfillment,
    cancelReturnFulfillment: () => { if (!returnTransitionInFlight.current) { pendingReturnOwner.current = null; setPendingReturnFulfillment(null); } },
    pendingReturnCancellation,
    returnCancellationBusy: returnTransitionBusy,
    confirmReturnCancellation,
    cancelReturnCancellation: () => { if (!returnTransitionInFlight.current) { pendingReturnCancellationOwner.current = null; setPendingReturnCancellation(null); } },
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
