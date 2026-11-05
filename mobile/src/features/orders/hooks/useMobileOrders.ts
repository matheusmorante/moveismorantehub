import { useCallback, useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { orderListFormSchema } from '../../../../../shared-utils/listingFormSchemas';
import { Alert } from 'react-native';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { connectivityService } from '../../../services/offline/connectivityService';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import {
  fetchMobileOrderFiscalBadgeStatuses,
  fetchMobileOrdersPage,
} from '../services/mobileOrderListService';
import type { MobileOrderListItem } from '../services/mobileOrderListService';
import type { MobileOrderType } from '../domain/types';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import { filterOfflineOrdersPage } from '../domain/offlineOrderSearch';

const ITEMS_PER_PAGE = 15;
const HANDLING_OPTIONS_CACHE_KEY = 'order_handling_options_v1';

export function useMobileOrders(orderType: MobileOrderType = 'sale') {
  const [orders, setOrders] = useState<MobileOrderListItem[]>([]);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showingOffline, setShowingOffline] = useState(!connectivityService.connected);
  const requestSequence = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const previousConnection = useRef(connectivityService.connected);
  const updateSearchTerm = useCallback((value: string) => {
    if (value === searchTerm) return;
    requestSequence.current += 1;
    requestController.current?.abort();
    setCurrentPage(1);
    setSearchTerm(value);
  }, [searchTerm]);
  const updateStatusFilter = useCallback((value: string) => {
    setCurrentPage(1);
    setStatusFilter(value);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => () => {
    requestSequence.current += 1;
    requestController.current?.abort();
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const loadOptions = async () => {
      try {
        if (connectivityService.connected) {
          const { data, error } = await withAbortTimeout(
            supabase.from('settings').select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions').eq('id', 'app').limit(1),
            'pedidos:opcoes-manuseio', 15_000, controller.signal
          );
          if (error) throw error;
          const settings = data?.[0] || {};
          const options = [
            ...(Array.isArray(settings.delivery) ? settings.delivery : []),
            ...(Array.isArray(settings.pickup) ? settings.pickup : []),
          ];
          if (active) setHandlingOptions(options);
          await offlineStorageService.cacheWorkingSet(HANDLING_OPTIONS_CACHE_KEY, options).catch(() => {});
          return;
        }
      } catch {
        // As opções já salvas continuam disponíveis quando a rede falha.
      }
      const cached = await offlineStorageService.getWorkingSet<any[]>(HANDLING_OPTIONS_CACHE_KEY).catch(() => null);
      if (active && Array.isArray(cached?.data)) setHandlingOptions(cached.data);
    };
    void loadOptions();
    return () => { active = false; controller.abort(); };
  }, [showingOffline]);
  const { validateValues: validateList } = useZodForm(orderListFormSchema, {
    page: currentPage,
    search: debouncedSearchTerm,
    status: statusFilter,
  });

  const loadLocalFallback = useCallback(
    async (values: { page: number; search: string; status: string }) => {
      try {
        const [repoOrders, logisticsCached, summaryCached] = await Promise.all([
          OrderRepository.list().catch(() => []),
          offlineStorageService.getWorkingSet<any[]>('logistics_orders').catch(() => null),
          offlineStorageService.getWorkingSet<MobileOrderListItem[]>('order_list_summaries').catch(() => null),
        ]);

        const byId = new Map<string, MobileOrderListItem>((summaryCached?.data || [])
          .filter((row) => row.order_type === orderType && !row.order_data?.deleted && !isIdentifiedTestArtifact(row.order_data))
          .map((row) => [row.id, row]));

        for (const order of repoOrders) {
          const oData: Record<string, any> = order.orderData || {};
          if (oData.deleted || isIdentifiedTestArtifact(oData)) continue;
          const resolvedType = String(
            order.orderType || oData.orderType || oData.order_type || 'sale'
          );
          if (resolvedType !== orderType) continue;

          const orderNum = String(
            oData.orderIndex ?? oData.order_index ?? oData.orderNumber ?? order.id ?? ''
          );
          const totalVal = Number(
            order.totalAmount ??
              oData.paymentsSummary?.totalOrderValue ??
              oData.totalValue ??
              0
          );

          byId.set(order.id, {
            id: order.id,
            order_number: orderNum,
            created_at: String(oData.createdAt || oData.date || order.updatedAt || ''),
            status: String(order.status || oData.status || 'scheduled'),
            order_type: resolvedType,
            customer_name: String(
              order.customerName || oData.customerData?.fullName || 'Cliente'
            ),
            total_value: totalVal,
            order_data: oData,
            version: order.version,
          });
        }

        if (Array.isArray(logisticsCached?.data)) {
          for (const raw of logisticsCached.data) {
            if (!raw?.id || byId.has(raw.id)) continue;
            const oData: Record<string, any> = raw.order_data || {};
            if (raw.deleted || oData.deleted || isIdentifiedTestArtifact(oData)) continue;
            const resolvedType = String(
              raw.order_type || oData.orderType || oData.order_type || 'sale'
            );
            if (resolvedType !== orderType) continue;

            const orderNum = String(
              raw.order_number ??
                raw.order_index ??
                oData.orderIndex ??
                oData.order_index ??
                raw.id
            );
            const totalVal = Number(
              raw.total_value ??
                oData.paymentsSummary?.totalOrderValue ??
                oData.totalValue ??
                0
            );

            byId.set(raw.id, {
              id: raw.id,
              order_number: orderNum,
              created_at: String(raw.created_at || oData.createdAt || ''),
              status: String(raw.status || oData.status || 'scheduled'),
              order_type: resolvedType,
              customer_name: String(
                raw.customer_name || oData.customerData?.fullName || 'Cliente'
              ),
              total_value: totalVal,
              delivery_method: raw.delivery_method,
              scheduled_date: raw.scheduled_date,
              order_data: oData,
            });
          }
        }

        return filterOfflineOrdersPage(Array.from(byId.values()), { ...values, pageSize: ITEMS_PER_PAGE });
      } catch (cacheErr) {
        console.warn('[useMobileOrders] Cache local indisponível:', cacheErr);
        return null;
      }
    },
    [orderType]
  );

  const refresh = useCallback(
    async (pull = false, page = currentPage) => {
      const sequence = ++requestSequence.current;
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      const values = await validateList(
        { page, search: debouncedSearchTerm, status: statusFilter },
        (errors) => Alert.alert('Revise os filtros', Object.values(flattenFormErrors(errors))[0])
      );
      if (sequence !== requestSequence.current) return;
      if (!values) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      pull ? setRefreshing(true) : setLoading(true);
      try {
        // Sem conexão, somente o conjunto já disponível no aparelho pode ser consultado.
        if (!connectivityService.connected) {
          setShowingOffline(true);
          const localPage = await loadLocalFallback(values);
          const cachedOptions = await offlineStorageService.getWorkingSet<any[]>(HANDLING_OPTIONS_CACHE_KEY).catch(() => null);
          if (sequence !== requestSequence.current) return;
          setOrders(localPage?.items || []);
          setTotalItems(localPage?.total || 0);
          if (Array.isArray(cachedOptions?.data)) {
            setHandlingOptions(cachedOptions.data);
          }
          return;
        }

        setShowingOffline(false);
        const [ordersResult] = await Promise.allSettled([
          fetchMobileOrdersPage({
            page: values.page,
            pageSize: ITEMS_PER_PAGE,
            search: values.search,
            status: values.status,
            orderType,
            signal: controller.signal,
          }),
        ]);
        if (sequence !== requestSequence.current || controller.signal.aborted) return;

        if (ordersResult.status === 'fulfilled') {
          setOrders(ordersResult.value.items);
          setTotalItems(ordersResult.value.total);
          const orderCancelledMap = Object.fromEntries(
            ordersResult.value.items.map((order) => [
              order.id,
              String(order.status || '').toLowerCase().includes('cancel'),
            ])
          );
          void fetchMobileOrderFiscalBadgeStatuses(
            ordersResult.value.items.map((order) => order.id),
            orderCancelledMap
          )
            .then((statuses) => {
              if (sequence !== requestSequence.current) return;
              setOrders((current) =>
                current.map((order) => {
                  const itemStatus = statuses[order.id];
                  if (!itemStatus) return order;
                  return {
                    ...order,
                    fiscalBadgeStatus: itemStatus.production,
                    fiscalHmlBadgeStatus: itemStatus.homologation,
                    fiscalEstornoBadgeStatus: itemStatus.estornoStatus,
                    fiscalDevolucaoBadgeStatus: itemStatus.devolucaoStatus,
                    fiscalDevolucaoCount: itemStatus.devolucaoCount,
                    fiscalCancellationState: itemStatus.fiscalCancellationState,
                  };
                })
              );
            })
            .catch(() => {
              console.error(
                '[useMobileOrders] Não foi possível carregar o status fiscal dos pedidos.'
              );
            });
        } else {
          console.warn('[useMobileOrders] Falha ao buscar pedidos remotos:', ordersResult.reason);
          setOrders([]);
          setTotalItems(0);
          Alert.alert('Não foi possível carregar os pedidos', 'Verifique a conexão e tente novamente.');
        }

      } catch (error) {
        if (sequence === requestSequence.current && !controller.signal.aborted) {
          console.warn('[NativeOrders] Erro geral ao atualizar pedidos:', error);
        }
      } finally {
        if (sequence === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPage, debouncedSearchTerm, loadLocalFallback, orderType, statusFilter, validateList]
  );

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) return;
    void refresh(false, currentPage);
  }, [currentPage, debouncedSearchTerm, refresh, searchTerm]);

  useEffect(() => connectivityService.subscribe((connected) => {
    if (connected === previousConnection.current) return;
    previousConnection.current = connected;
    if (searchTerm === debouncedSearchTerm) void refresh(false, currentPage);
  }), [currentPage, debouncedSearchTerm, refresh, searchTerm]);

  useEffect(() => {
    return offlineSyncManager.subscribe(() => {
      void OrderRepository.listPendingLocal().then((pendingLocals) => {
        if (pendingLocals.length === 0) return;
        setOrders((current) => {
          if (current.length === 0) return current;
          const pendingById = new Map(pendingLocals.map((l) => [String(l.id), l]));
          let changed = false;
          const next = current.map((remote) => {
            const local = pendingById.get(String(remote.id));
            if (!local) return remote;
            changed = true;
            const localData = (local.orderData || {}) as Record<string, any>;
            return {
              ...remote,
              status: local.status || remote.status,
              order_data: {
                ...(remote.order_data || {}),
                ...localData,
              },
            };
          });
          return changed ? next : current;
        });
      });
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  return {
    orders,
    filteredOrders: orders,
    paginatedOrders: orders,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
    handlingOptions,
    loading,
    refreshing,
    showingOffline,
    searchTerm,
    statusFilter,
    setCurrentPage,
    setSearchTerm: updateSearchTerm,
    setStatusFilter: updateStatusFilter,
    refresh,
  };
}
