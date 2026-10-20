import { useCallback, useEffect, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { orderListFormSchema } from '../../../../../shared-utils/listingFormSchemas';
import { Alert } from 'react-native';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import {
  fetchMobileOrderFiscalBadgeStatuses,
  fetchMobileOrdersPage,
} from '../services/mobileOrderListService';
import type { MobileOrderListItem } from '../services/mobileOrderListService';
import type { MobileOrderType } from '../domain/types';

const ITEMS_PER_PAGE = 15;
const HANDLING_OPTIONS_CACHE_KEY = 'order_handling_options_v1';

const matchesLocalStatusFilter = (item: MobileOrderListItem, statusFilter: string): boolean => {
  if (!statusFilter || statusFilter === 'all') return true;
  const st = String(item.status || '').toLowerCase();
  const deliveryMethod = String(
    item.delivery_method ||
      item.order_data?.shipping?.deliveryMethod ||
      item.order_data?.shipping?.deliveryType ||
      ''
  ).toLowerCase();
  const oType = String(item.order_type || item.order_data?.orderType || 'sale').toLowerCase();

  if (statusFilter === 'agendados') return ['scheduled', 'agendado'].includes(st);
  if (statusFilter === 'atendidos') return ['fulfilled', 'atendido', 'completed'].includes(st);
  if (statusFilter === 'rascunhos') return ['draft', 'rascunho'].includes(st);
  if (statusFilter === 'cancelados') return st.includes('cancel');
  if (statusFilter === 'retiradas')
    return deliveryMethod.includes('pickup') || deliveryMethod.includes('retirada');
  if (statusFilter === 'assistencias') return oType === 'assistance';
  return true;
};

const matchesLocalSearch = (item: MobileOrderListItem, search: string): boolean => {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const hay = [
    item.customer_name,
    item.order_number,
    item.id,
    item.order_data?.customerData?.fullName,
    item.order_data?.orderIndex,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(term);
};

export function useMobileOrders(orderType: MobileOrderType = 'sale') {
  const [orders, setOrders] = useState<MobileOrderListItem[]>([]);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { validateValues: validateList } = useZodForm(orderListFormSchema, {
    page: currentPage,
    search: searchTerm,
    status: statusFilter,
  });

  const loadLocalFallback = useCallback(
    async (values: { page: number; search: string; status: string }) => {
      try {
        const [repoOrders, logisticsCached] = await Promise.all([
          OrderRepository.list().catch(() => []),
          offlineStorageService.getWorkingSet<any[]>('logistics_orders').catch(() => null),
        ]);

        const byId = new Map<string, MobileOrderListItem>();

        for (const order of repoOrders) {
          const oData: Record<string, any> = order.orderData || {};
          if (oData.deleted || isIdentifiedTestArtifact(oData)) continue;
          const resolvedType = String(
            order.orderType || oData.orderType || oData.order_type || 'sale'
          );
          if (resolvedType === 'budget' || resolvedType !== orderType) continue;

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
            if (resolvedType === 'budget' || resolvedType !== orderType) continue;

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

        const filtered = Array.from(byId.values())
          .filter((item) => matchesLocalStatusFilter(item, values.status))
          .filter((item) => matchesLocalSearch(item, values.search));

        const from = (values.page - 1) * ITEMS_PER_PAGE;
        const paged = filtered.slice(from, from + ITEMS_PER_PAGE);
        return { items: paged, total: filtered.length };
      } catch (cacheErr) {
        console.warn('[useMobileOrders] Cache local indisponível:', cacheErr);
        return null;
      }
    },
    [orderType]
  );

  const refresh = useCallback(
    async (pull = false, page = currentPage) => {
      const values = await validateList(
        { page, search: searchTerm, status: statusFilter },
        (errors) => Alert.alert('Revise os filtros', Object.values(flattenFormErrors(errors))[0])
      );
      if (!values) return;
      pull ? setRefreshing(true) : setLoading(true);
      try {
        // 1. Tenta carregar dados do cache de trabalho local primeiro para exibição imediata
        if (!pull) {
          const localPage = await loadLocalFallback(values);
          if (localPage && localPage.items.length > 0) {
            setOrders(localPage.items);
            setTotalItems(localPage.total);
            setLoading(false);
          }
        }

        // 2. Busca remota dos pedidos e configurações de forma resiliente
        const [ordersResult, settingsResult] = await Promise.allSettled([
          fetchMobileOrdersPage({
            page: values.page,
            pageSize: ITEMS_PER_PAGE,
            search: values.search,
            status: values.status,
            orderType,
          }),
          supabase.from('settings').select('*').limit(1),
        ]);

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
          console.warn(
            '[useMobileOrders] Falha ao buscar pedidos remotos; aplicando fallback offline:',
            ordersResult.reason
          );
          const localPage = await loadLocalFallback(values);
          if (localPage) {
            setOrders(localPage.items);
            setTotalItems(localPage.total);
          }
        }

        if (settingsResult.status === 'fulfilled' && !settingsResult.value.error) {
          const settings =
            settingsResult.value.data?.[0]?.data || settingsResult.value.data?.[0] || {};
          const opts = [
            ...(settings.deliveryHandlingOptions || []),
            ...(settings.pickupHandlingOptions || []),
          ];
          setHandlingOptions(opts);
          await offlineStorageService
            .cacheWorkingSet(HANDLING_OPTIONS_CACHE_KEY, opts)
            .catch(() => {});
        } else {
          const cachedOpts =
            await offlineStorageService.getWorkingSet<any[]>(HANDLING_OPTIONS_CACHE_KEY);
          if (Array.isArray(cachedOpts?.data)) {
            setHandlingOptions(cachedOpts.data);
          }
        }
      } catch (error) {
        console.warn('[NativeOrders] Erro geral ao atualizar pedidos:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, loadLocalFallback, orderType, searchTerm, statusFilter, validateList]
  );

  useEffect(() => {
    void refresh(false, currentPage);
  }, [currentPage, refresh]);

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

  // Reset pagination when search or status filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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
    searchTerm,
    statusFilter,
    setCurrentPage,
    setSearchTerm,
    setStatusFilter,
    refresh,
  };
}
