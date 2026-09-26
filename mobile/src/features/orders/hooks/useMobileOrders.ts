import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { fetchMobileOrdersPage, MobileOrderListItem } from '../services/mobileOrderListService';

const ITEMS_PER_PAGE = 15;

export function useMobileOrders() {
  const [orders, setOrders] = useState<MobileOrderListItem[]>([]);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const refresh = useCallback(async (pull = false, page = currentPage) => {
    pull ? setRefreshing(true) : setLoading(true);
    try {
      // 1. Tenta carregar dados do cache de trabalho local primeiro para exibição imediata
      if (!pull) {
        try {
          const cached = (await OrderRepository.list()).filter((order) =>
            order.orderType !== 'budget' && order.orderData?.orderType !== 'budget' && order.orderData?.order_type !== 'budget'
          );
          if (cached.length > 0) {
            const localItems = cached.map((order) => {
              const oData = order.orderData || {};
              const orderNum = String(oData.orderIndex ?? oData.order_index ?? oData.orderNumber ?? order.id ?? '');
              const totalVal = Number(order.totalAmount ?? oData.paymentsSummary?.totalOrderValue ?? oData.totalValue ?? 0);
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
          console.warn('[useMobileOrders] Cache local indisponível; prosseguindo com busca remota:', cacheErr);
        }
      }

      // 2. Busca remota dos pedidos e configurações de forma resiliente
      const [ordersResult, settingsResult] = await Promise.allSettled([
        fetchMobileOrdersPage({
          page,
          pageSize: ITEMS_PER_PAGE,
          search: searchTerm,
          status: statusFilter,
        }),
        supabase.from('settings').select('*').limit(1),
      ]);

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value.items);
        setTotalItems(ordersResult.value.total);
      } else {
        console.error('[useMobileOrders] Falha ao buscar pedidos remotos:', ordersResult.reason);
      }

      if (settingsResult.status === 'fulfilled') {
        const settings = settingsResult.value.data?.[0]?.data || settingsResult.value.data?.[0] || {};
        setHandlingOptions([...(settings.deliveryHandlingOptions || []), ...(settings.pickupHandlingOptions || [])]);
      }
    } catch (error) {
      console.warn('[NativeOrders] Erro geral ao atualizar pedidos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

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
