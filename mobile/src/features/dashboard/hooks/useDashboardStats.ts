import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { calculateDashboardStats } from '../utils/dashboardStatsCalculator';
import { useDashboardRealtime } from './useDashboardRealtime';

export const useDashboardStats = (initialPeriod = 'today') => {
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [assembliesInternalCount, setAssembliesInternalCount] = useState(0);
  const [assembliesOutsideCount, setAssembliesOutsideCount] = useState(0);
  const [assistancesCount, setAssistancesCount] = useState(0);
  const [returnsCount, setReturnsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchDashboardStats = useCallback(async (periodId: string = selectedPeriod) => {
    try {
      setLoadingStats(true);
      
      let rawOrders: any[] = [];
      let settingsData: any = null;

      try {
        const localOrders = await OrderRepository.list();
        rawOrders = localOrders.map((order) => ({ id: order.id, status: order.status, created_at: order.updatedAt, order_data: order.orderData }));
      } catch (e) {
        console.warn('[DashboardStats] Erro ao buscar pedidos locais:', e);
      }

      try {
        const { data } = await supabase.from('settings').select('*').limit(1);
        if (data && data.length > 0) settingsData = data[0]?.data || data[0];
      } catch (e) {
        console.warn('[DashboardStats] Erro ao buscar configurações:', e);
      }

      const stats = calculateDashboardStats(rawOrders, settingsData, periodId);
      
      setDeliveriesCount(stats.deliveriesCount);
      setAssembliesInternalCount(stats.assembliesInternalCount);
      setAssembliesOutsideCount(stats.assembliesOutsideCount);
      setAssistancesCount(stats.assistancesCount);
      setReturnsCount(stats.returnsCount);
      
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
    loadingStats,
    fetchDashboardStats
  };
};
