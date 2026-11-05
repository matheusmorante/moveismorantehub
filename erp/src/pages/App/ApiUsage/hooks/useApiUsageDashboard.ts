import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  ApiConfiguration,
  ApiDashboardMetrics,
  ApiEnvironment,
} from '@/services/apiMonitoring/apiMonitoringTypes';

export type PeriodFilter = 'today' | '7_days' | 'month' | 'last_month';
export type ViewMode = 'services' | 'models' | 'modules' | 'supabase';

export function useApiUsageDashboard() {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [environment, setEnvironment] = useState<ApiEnvironment | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('google_routes');
  const [viewMode, setViewMode] = useState<ViewMode>('services');

  const [metrics, setMetrics] = useState<ApiDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingConfig, setEditingConfig] = useState<ApiConfiguration | null>(null);
  const servicesVisible = viewMode !== 'supabase';
  const scopeKey = JSON.stringify([period, environment, servicesVisible]);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  const requestSequence = useRef(0);
  const mounted = useRef(false);
  const [metricsScope, setMetricsScope] = useState('');

  const loadData = useCallback(async () => {
    if (!mounted.current || !servicesVisible || currentScope.current !== scopeKey) return;
    const sequence = ++requestSequence.current;
    const isCurrent = () => mounted.current && sequence === requestSequence.current && currentScope.current === scopeKey;
    setLoading(true);
    try {
      const now = new Date();
      let startStr = '';
      let endStr = now.toISOString().split('T')[0];

      if (period === 'today') {
        startStr = endStr;
      } else if (period === '7_days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startStr = d.toISOString().split('T')[0];
      } else if (period === 'month') {
        startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (period === 'last_month') {
        startStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        endStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      }

      const data = await withTimeout<ApiDashboardMetrics | null>(
        ApiUsageTracker.getDashboardMetrics(startStr, endStr, environment),
        15_000, null, 'painel:metricas-servicos',
      );
      if (!data) throw new Error('Tempo esgotado ao carregar métricas de serviços.');
      if (!isCurrent()) return;
      setMetrics(data);
      setMetricsScope(scopeKey);
    } catch (e) {
      if (isCurrent()) console.error('Erro ao carregar dados de monitoramento de APIs:', e);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [period, environment, servicesVisible, scopeKey]);

  useEffect(() => {
    mounted.current = true;
    if (servicesVisible) void loadData();
    else setLoading(false);
    return () => { mounted.current = false; requestSequence.current += 1; };
  }, [loadData, servicesVisible]);

  const currentMetrics = servicesVisible && metricsScope === scopeKey ? metrics : null;

  const filteredSummaries = (currentMetrics?.summaries || []).filter((s) => {
    if (selectedProvider === 'all') return true;
    return s.provider === selectedProvider;
  });

  const activeSummary =
    filteredSummaries.find((s) => s.service_id === selectedServiceId) || filteredSummaries[0];

  // Gerar dias do mês com dados simulados/reais para o gráfico de linha
  const now = new Date();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const chartDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const day = i + 1;
    const isProjected = day > currentDay;
    const baseCalls = activeSummary
      ? Math.round(activeSummary.currentMonthUsage / Math.max(currentDay, 1))
      : 10;
    const variation = ((day * 17) % 7) - 3;
    const calls = Math.max(0, baseCalls + variation);

    return {
      day,
      date: `${day < 10 ? '0' + day : day}/${(now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1}`,
      calls,
      isProjected,
    };
  });

  return {
    period,
    setPeriod,
    environment,
    setEnvironment,
    selectedProvider,
    setSelectedProvider,
    selectedServiceId,
    setSelectedServiceId,
    viewMode,
    setViewMode,
    metrics: currentMetrics,
    loading: servicesVisible && loading,
    editingConfig,
    setEditingConfig,
    loadData,
    filteredSummaries,
    activeSummary,
    chartDays,
  };
}
