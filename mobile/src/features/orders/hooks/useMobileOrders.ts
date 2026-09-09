import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { fetchMobileOrdersPage, MobileOrderListItem } from '../services/mobileOrderListService';

const ITEMS_PER_PAGE = 30;

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
        const cached = await OrderRepository.list();
        if (cached.length > 0) {
          const localItems = cached.map((order) => ({ id: order.id, order_number: String(order.orderData.orderIndex ?? ''), created_at: order.updatedAt,
            status: order.status, order_type: order.orderType ?? 'sale', customer_name: order.customerName ?? '', total_value: order.totalAmount ?? 0,
            order_data: order.orderData, version: order.version }));
          setOrders(localItems);
          setTotalItems(localItems.length);
          setLoading(false);
        }
      }

      const [ordersResult, settingsResult] = await Promise.all([
        fetchMobileOrdersPage({
          page,
          pageSize: ITEMS_PER_PAGE,
          search: searchTerm,
          status: statusFilter,
        }),
        supabase.from('settings').select('*').limit(1),
      ]);
      setOrders(ordersResult.items);
      setTotalItems(ordersResult.total);
      const settings = settingsResult.data?.[0]?.data || settingsResult.data?.[0] || {};
      setHandlingOptions([...(settings.deliveryHandlingOptions || []), ...(settings.pickupHandlingOptions || [])]);
    } catch (error) {
      console.warn('[NativeOrders] Erro ao buscar pedidos (usando cache local se disponível):', error);
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
