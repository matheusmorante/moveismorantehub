import { useState, useEffect } from 'react';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { 
    ApiConfiguration, 
    ApiDashboardMetrics, 
    ApiEnvironment 
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

    const loadData = async () => {
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

            const data = await ApiUsageTracker.getDashboardMetrics(startStr, endStr, environment);
            setMetrics(data);
        } catch (e) {
            console.error("Erro ao carregar dados de monitoramento de APIs:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period, environment]);

    const filteredSummaries = (metrics?.summaries || []).filter(s => {
        if (selectedProvider === 'all') return true;
        return s.provider === selectedProvider;
    });

    const activeSummary = filteredSummaries.find(s => s.service_id === selectedServiceId) || filteredSummaries[0];

    // Gerar dias do mês com dados simulados/reais para o gráfico de linha
    const now = new Date();
    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const chartDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
        const day = i + 1;
        const isProjected = day > currentDay;
        const baseCalls = activeSummary ? Math.round(activeSummary.currentMonthUsage / Math.max(currentDay, 1)) : 10;
        const variation = ((day * 17) % 7) - 3;
        const calls = Math.max(0, baseCalls + variation);

        return {
            day,
            date: `${day < 10 ? '0' + day : day}/${(now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : (now.getMonth() + 1)}`,
            calls,
            isProjected
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
        metrics,
        loading,
        editingConfig,
        setEditingConfig,
        loadData,
        filteredSummaries,
        activeSummary,
        chartDays
    };
}
