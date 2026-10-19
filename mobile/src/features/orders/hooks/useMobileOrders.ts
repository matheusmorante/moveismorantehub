import { useCallback, useEffect, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { orderListFormSchema } from '../../../../../shared-utils/listingFormSchemas';
import { Alert } from 'react-native';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import {
  fetchMobileOrderFiscalBadgeStatuses,
  fetchMobileOrdersPage,
} from '../services/mobileOrderListService';
import type { MobileOrderListItem } from '../services/mobileOrderListService';
import type { MobileOrderType } from '../domain/types';

const ITEMS_PER_PAGE = 15;

export function useMobileOrders(orderType: MobileOrderType = 'sale') {
  const [orders, setOrders] = useState<MobileOrderListItem[]>([]);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { validateValues: validateList } = useZodForm(orderListFormSchema, { page: currentPage, search: searchTerm, status: statusFilter });

  const refresh = useCallback(
    async (pull = false, page = currentPage) => {
      const values = await validateList({ page, search: searchTerm, status: statusFilter },
        (errors) => Alert.alert('Revise os filtros', Object.values(flattenFormErrors(errors))[0]));
      if (!values) return;
      pull ? setRefreshing(true) : setLoading(true);
      try {
        // 1. Tenta carregar dados do cache de trabalho local primeiro para exibição imediata
        if (!pull) {
          try {
            const cached = (await OrderRepository.list()).filter(
              (order) =>
                (order.orderType ||
                  order.orderData?.orderType ||
                  order.orderData?.order_type ||
                  'sale') === orderType &&
                !isIdentifiedTestArtifact(order.orderData)
            );
            if (cached.length > 0) {
              const localItems = cached.map((order) => {
                const oData = order.orderData || {};
                const orderNum = String(
                  oData.orderIndex ?? oData.order_index ?? oData.orderNumber ?? order.id ?? ''
                );
                const totalVal = Number(
                  order.totalAmount ??
                    oData.paymentsSummary?.totalOrderValue ??
                    oData.totalValue ??
                    0
                );
                return {
                  id: order.id,
                  order_number: orderNum,
                  created_at: String(oData.createdAt || oData.date || order.updatedAt || ''),
                  status: order.status || oData.status || 'scheduled',
                  order_type: order.orderType || oData.orderType || 'sale',
                  customer_name: order.customerName || oData.customerData?.fullName || 'Cliente',
                  total_value: totalVal,
                  order_data: oData,
                  version: order.version,
                };
              });
              setOrders(localItems);
              setTotalItems(localItems.length);
              setLoading(false);
            }
          } catch (cacheErr) {
            console.warn(
              '[useMobileOrders] Cache local indisponível; prosseguindo com busca remota:',
              cacheErr
            );
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
          console.error('[useMobileOrders] Falha ao buscar pedidos remotos:', ordersResult.reason);
        }

        if (settingsResult.status === 'fulfilled') {
          const settings =
            settingsResult.value.data?.[0]?.data || settingsResult.value.data?.[0] || {};
          setHandlingOptions([
            ...(settings.deliveryHandlingOptions || []),
            ...(settings.pickupHandlingOptions || []),
          ]);
        }
      } catch (error) {
        console.warn('[NativeOrders] Erro geral ao atualizar pedidos:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, orderType, searchTerm, statusFilter, validateList]
  );

  useEffect(() => {
    void refresh(false, currentPage);
  }, [currentPage, refresh]);
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
