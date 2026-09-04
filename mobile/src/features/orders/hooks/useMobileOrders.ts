import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';

const ITEMS_PER_PAGE = 30;

export function useMobileOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const refresh = async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    try {
      // 1. Tenta carregar dados do cache de trabalho local primeiro
      const cached = await offlineStorageService.getWorkingSet<any[]>('mobile_orders_list');
      if (cached?.data && orders.length === 0) {
        setOrders(cached.data);
        setLoading(false);
      }

      const [ordersResult, settingsResult] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(2000),
        supabase.from('settings').select('*').limit(1),
      ]);
      if (ordersResult.data) {
        setOrders(ordersResult.data);
        await offlineStorageService.cacheWorkingSet('mobile_orders_list', ordersResult.data);
      }
      const settings = settingsResult.data?.[0]?.data || settingsResult.data?.[0] || {};
      setHandlingOptions([...(settings.deliveryHandlingOptions || []), ...(settings.pickupHandlingOptions || [])]);
    } catch (error) {
      console.warn('[NativeOrders] Erro ao buscar pedidos (usando cache local se disponível):', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Reset pagination when search or status filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredOrders = useMemo(() => orders.filter(order => {
    const data = order.order_data || {};
    if (data.deleted || order.deleted) return false;

    // Regra do ERP: Listagem de Vendas exibe apenas vendas/mostruário (exclui orçamentos, assistências e devoluções)
    const orderType = String(order.orderType || order.order_type || data.orderType || 'sale').toLowerCase();
    if (orderType === 'budget' || orderType === 'assistance' || orderType === 'return') {
      return false;
    }

    const normalizeText = (str: any) => String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const term = normalizeText(searchTerm);
    const customer = normalizeText(data.customerData?.fullName || order.customer_name);
    const city = normalizeText(data.shipping?.deliveryAddress?.city || order.city);
    const orderCode = normalizeText(data.orderIndex || data.order_index || order.order_index || order.order_number || order.id);
    
    if (term && !customer.includes(term) && !city.includes(term) && !orderCode.includes(term)) {
      return false;
    }

    const status = String(order.status || data.status || '').toLowerCase();
    if (statusFilter === 'agendados') return status.includes('agendad') || status.includes('scheduled');
    if (statusFilter === 'concluidos') return /fulfill|atendid|concluid|entreg|finaliz/.test(status);
    if (statusFilter === 'rascunhos') return /draft|rascunh/.test(status);
    return true;
  }), [orders, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  return {
    orders: paginatedOrders,
    filteredOrders,
    paginatedOrders,
    totalItems: filteredOrders.length,
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
