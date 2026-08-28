import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';

export function useMobileOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const refresh = async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    try {
      const [ordersResult, settingsResult] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('settings').select('*').limit(1),
      ]);
      if (ordersResult.data) setOrders(ordersResult.data);
      const settings = settingsResult.data?.[0]?.data || settingsResult.data?.[0] || {};
      setHandlingOptions([...(settings.deliveryHandlingOptions || []), ...(settings.pickupHandlingOptions || [])]);
    } catch (error) {
      console.warn('[NativeOrders] Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filteredOrders = useMemo(() => orders.filter(order => {
    const data = order.order_data || {};
    if (data.deleted || order.deleted) return false;
    const term = searchTerm.toLowerCase();
    const customer = String(data.customerData?.fullName || order.customer_name || '').toLowerCase();
    const city = String(data.shipping?.deliveryAddress?.city || order.city || '').toLowerCase();
    if (term && !customer.includes(term) && !city.includes(term)) return false;
    const status = String(order.status || data.status || '').toLowerCase();
    if (statusFilter === 'agendados') return status.includes('agendad') || status.includes('scheduled');
    if (statusFilter === 'concluidos') return /fulfill|atendid|concluid|entreg|finaliz/.test(status);
    if (statusFilter === 'rascunhos') return /draft|rascunh/.test(status);
    return true;
  }), [orders, searchTerm, statusFilter]);

  return { filteredOrders, handlingOptions, loading, refreshing, searchTerm, statusFilter, setSearchTerm, setStatusFilter, refresh };
}

