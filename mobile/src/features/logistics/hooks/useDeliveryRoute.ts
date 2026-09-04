import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { isCancelledOrder } from '../../../utils/orderUtils';

export interface DeliveryRouteItem {
  id: string;
  order: any;
  orderIndex?: string;
  customerName: string;
  fullAddress: string;
  itemsCount: number;
  sequence: number; // 1, 2, 3...
  status: 'pending' | 'in_progress' | 'in_service' | 'completed' | 'unattended' | 'cancelled';
  coords: { latitude: number; longitude: number } | null;
  hasValidCoords: boolean;
  distanceKm?: number;
  durationMin?: number;
  phone?: string;
  observations?: string;
  isCurrent: boolean;
  isNext: boolean;
}

export function useDeliveryRoute() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const fetchOrders = useCallback(async () => {
    try {
      // 1. Tenta carregar do cache local primeiro para exibição offline instantânea
      const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
      if (cached?.data && orders.length === 0) {
        setOrders(cached.data);
        setLoading(false);
      }

      // 2. Busca do Supabase
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
        await offlineStorageService.cacheWorkingSet('logistics_orders', data);
      }
    } catch (err) {
      console.warn('[useDeliveryRoute] Erro ao buscar pedidos (usando cache):', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orders.length]);

  useEffect(() => {
    fetchOrders();
    const unsub = subscribeToLogisticsChanges(() => fetchOrders());
    return () => unsub();
  }, [fetchOrders]);

  // Filtra e normaliza os pedidos do roteiro de hoje
  const routeItems = useMemo<DeliveryRouteItem[]>(() => {
    const todayOrders = orders.filter((o) => {
      const oData = o.order_data || {};
      if (oData.deleted || o.deleted || isCancelledOrder(o)) return false;
      const orderStatus = (o.status || oData.status || '').toLowerCase();
      if (orderStatus === 'draft' || orderStatus === 'rascunho') return false;

      const rawSchedDate = getOperationalScheduleDate(o);
      return rawSchedDate === todayStr;
    });

    // Ordenação: se tiver routeSequence usa; senão, usa índice de criação/agendamento
    const sorted = [...todayOrders].sort((a, b) => {
      const seqA = a.order_data?.routeSequence ?? 9999;
      const seqB = b.order_data?.routeSequence ?? 9999;
      if (seqA !== seqB) return seqA - seqB;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    // Encontra primeira em andamento ou primeira pendente
    let firstInProgressId: string | null = null;
    let firstPendingId: string | null = null;

    for (const o of sorted) {
      const dStatus = o.order_data?.deliveryStatus || (o.status === 'fulfilled' ? 'completed' : 'pending');
      if (dStatus === 'in_progress' || dStatus === 'in_service') {
        if (!firstInProgressId) firstInProgressId = o.id;
      } else if (dStatus !== 'completed' && dStatus !== 'unattended') {
        if (!firstPendingId) firstPendingId = o.id;
      }
    }

    const activeTargetId = firstInProgressId || firstPendingId;

    return sorted.map((o, idx) => {
      const oData = o.order_data || {};
      const customer = oData.customerData || o.customer || {};
      const shipping = oData.shipping || {};
      const dCoords = shipping.destinationCoords;

      let coords: { latitude: number; longitude: number } | null = null;
      let hasValidCoords = false;

      if (Array.isArray(dCoords) && dCoords.length === 2 && dCoords[0] !== 0 && dCoords[1] !== 0) {
        // Formato [lng, lat] do GeoJSON
        coords = { latitude: Number(dCoords[1]), longitude: Number(dCoords[0]) };
        hasValidCoords = true;
      }

      const rawDeliveryStatus = oData.deliveryStatus;
      let status: DeliveryRouteItem['status'] = 'pending';
      if (o.status === 'fulfilled' || rawDeliveryStatus === 'completed' || rawDeliveryStatus === 'fulfilled') {
        status = 'completed';
      } else if (rawDeliveryStatus === 'unattended') {
        status = 'unattended';
      } else if (rawDeliveryStatus === 'in_service') {
        status = 'in_service';
      } else if (rawDeliveryStatus === 'in_progress') {
        status = 'in_progress';
      }

      const items = oData.items || o.items || oData.assistanceItems || [];
      const isCurrent = (status === 'in_progress' || status === 'in_service');
      const isNext = !firstInProgressId && o.id === activeTargetId;

      return {
        id: o.id,
        order: o,
        orderIndex: o.order_number || oData.orderIndex,
        customerName: (customer.fullName || o.customer_name || 'Consumidor').toUpperCase(),
        fullAddress: [
          shipping.deliveryAddress?.street || customer.fullAddress?.street,
          shipping.deliveryAddress?.number || customer.fullAddress?.number,
          shipping.deliveryAddress?.neighborhood || customer.fullAddress?.neighborhood,
          shipping.deliveryAddress?.city || customer.fullAddress?.city || 'Colombo',
        ].filter(Boolean).join(', '),
        itemsCount: items.reduce((acc: number, item: any) => acc + Number(item.quantity || item.qty || 1), 0),
        sequence: idx + 1,
        status,
        coords,
        hasValidCoords,
        distanceKm: shipping.distance ? Number(Number(shipping.distance).toFixed(1)) : undefined,
        durationMin: shipping.durationMinutes ? Number(shipping.durationMinutes) : undefined,
        phone: customer.phone,
        observations: oData.observations || o.observations,
        isCurrent,
        isNext,
      };
    });
  }, [orders, todayStr]);

  // Entrega em andamento (se houver alguma em rota ou em atendimento)
  const currentDelivery = useMemo(() => {
    return routeItems.find((item) => item.isCurrent) || null;
  }, [routeItems]);

  // Próxima entrega do roteiro
  const nextDelivery = useMemo(() => {
    if (currentDelivery) return currentDelivery;
    return routeItems.find((item) => item.isNext) || null;
  }, [currentDelivery, routeItems]);

  // Estatísticas do roteiro de hoje
  const stats = useMemo(() => {
    const total = routeItems.length;
    const completed = routeItems.filter((i) => i.status === 'completed').length;
    const unattended = routeItems.filter((i) => i.status === 'unattended').length;
    const pending = total - completed - unattended;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      unattended,
      pending,
      percent,
    };
  }, [routeItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return {
    routeItems,
    currentDelivery,
    nextDelivery,
    stats,
    loading,
    refreshing,
    onRefresh,
  };
}
