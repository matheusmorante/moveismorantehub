import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { calculateDashboardStats } from '../utils/dashboardStatsCalculator';
import { useDashboardRealtime } from './useDashboardRealtime';

const PERIOD_PAGE_SIZE = 500;

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPeriodBounds = (periodId: string, now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  switch (periodId) {
    case 'this_week': {
      const daysSinceMonday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      break;
    }
    case 'this_month':
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 29);
      break;
    case 'this_quarter': {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      end.setMonth(quarterStartMonth + 3, 0);
      break;
    }
  }

  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
};

const fetchPeriodOrders = async (periodId: string) => {
  const { startDate, endDate } = getPeriodBounds(periodId);
  const [year, month, day] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const createdAtStart = new Date(year, month - 1, day).toISOString();
  const createdAtEnd = new Date(endYear, endMonth - 1, endDay + 1).toISOString();
  const fields = 'id, status, order_type, order_data, deleted, created_at, scheduled_date, delivery_method, delivery_status, delivery_finished_at';
  const dateFilter = `and(created_at.gte.${createdAtStart},created_at.lt.${createdAtEnd}),and(scheduled_date.gte.${startDate},scheduled_date.lte.${endDate})`;
  const ordersById = new Map<string, any>();

  for (let offset = 0; ; offset += PERIOD_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('orders')
      .select(fields)
      .or(dateFilter)
      .order('created_at', { ascending: false })
      .range(offset, offset + PERIOD_PAGE_SIZE - 1);

    if (error) throw error;
    for (const order of data || []) ordersById.set(order.id, order);
    if (!data || data.length < PERIOD_PAGE_SIZE) break;
  }

  return [...ordersById.values()].map((order: any) => ({
    ...order,
    order_data: {
      ...(order.order_data && typeof order.order_data === 'object' ? order.order_data : {}),
      createdAt: order.order_data?.createdAt || order.created_at,
      scheduledDate: order.order_data?.scheduledDate || order.scheduled_date,
      deliveryMethod: order.order_data?.deliveryMethod || order.delivery_method,
      deliveryStatus: order.order_data?.deliveryStatus || order.delivery_status,
    },
  }));
};

export const useDashboardStats = (initialPeriod = 'today') => {
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [assembliesInternalCount, setAssembliesInternalCount] = useState(0);
  const [assembliesOutsideCount, setAssembliesOutsideCount] = useState(0);
  const [assistancesCount, setAssistancesCount] = useState(0);
  const [returnsCount, setReturnsCount] = useState(0);
  const [salesOrdersCount, setSalesOrdersCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchDashboardStats = useCallback(async (periodId: string = selectedPeriod) => {
    try {
      setLoadingStats(true);
      
      let rawOrders: any[] = [];
      let settingsData: any = null;

      try {
        rawOrders = await fetchPeriodOrders(periodId);

      } catch (e) {
        console.warn('[DashboardStats] Erro ao buscar pedidos remotos; usando cache local:', e);
        try {
          const localOrders = await OrderRepository.list();
          rawOrders = localOrders.map((order) => ({
            id: order.id,
            status: order.status,
            order_type: order.orderType,
            order_data: { ...order.orderData, createdAt: order.orderData.createdAt || order.updatedAt },
          }));
        } catch (localError) {
          console.warn('[DashboardStats] Erro ao buscar pedidos locais:', localError);
        }
      }

      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
        if (error) throw error;
        settingsData = data?.data || data;
      } catch (e) {
        console.warn('[DashboardStats] Erro ao buscar configurações:', e);
      }

      const stats = calculateDashboardStats(rawOrders, settingsData, periodId);
      
      setDeliveriesCount(stats.deliveriesCount);
      setAssembliesInternalCount(stats.assembliesInternalCount);
      setAssembliesOutsideCount(stats.assembliesOutsideCount);
      setAssistancesCount(stats.assistancesCount);
      setReturnsCount(stats.returnsCount);
      setSalesOrdersCount(stats.salesOrdersCount);
      
      return rawOrders; // return for ai summary
    } catch (err) {
      console.warn('[DashboardStats] Erro:', err);
      return [];
    } finally {
      setLoadingStats(false);
    }
  }, [selectedPeriod]);

  const handlePeriodChange = useCallback((periodId: string) => {
    setSelectedPeriod(periodId);
    fetchDashboardStats(periodId);
  }, [fetchDashboardStats]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Hook for realtime subscriptions
  useDashboardRealtime(fetchDashboardStats);

  return {
    selectedPeriod,
    handlePeriodChange,
    showPeriodModal,
    setShowPeriodModal,
    deliveriesCount,
    assembliesInternalCount,
    assembliesOutsideCount,
    assistancesCount,
    returnsCount,
    salesOrdersCount,
    loadingStats,
    fetchDashboardStats
  };
};
