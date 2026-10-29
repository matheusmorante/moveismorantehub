import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  TelemetryRow,
  GlobalStats,
  PeriodType,
  DrillDownItem,
} from '../types/supabaseMonitor.types';

export function useSupabaseTelemetry() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('1h');

  // Drill-Down States
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    const controller = new AbortController();

    const fetchTelemetry = async () => {
      setLoading(true);
      setError(false);
      try {
        const now = new Date();
        const fromDate = new Date();
        if (period === '15m') fromDate.setMinutes(now.getMinutes() - 15);
        else if (period === '1h') fromDate.setHours(now.getHours() - 1);
        else if (period === '24h') fromDate.setHours(now.getHours() - 24);
        else if (period === '7d') fromDate.setDate(now.getDate() - 7);

        const query = supabase.rpc('get_aggregated_telemetry_v2', {
          p_start_date: fromDate.toISOString(),
        }).abortSignal(controller.signal);
        const result = await withTimeout<{ data: TelemetryRow[] | null; error: unknown } | null>(
          query, 12000, null, 'consulta da telemetria'
        );
        if (!result || result.error) throw result?.error || new Error('Tempo de consulta esgotado.');
        if (mounted) setData(result.data || []);
      } catch (err) {
        console.error('Error fetching telemetry', err);
        if (mounted) setError(true);
      } finally {
        controller.abort();
        if (mounted) setLoading(false);
      }
    };

    void fetchTelemetry();
    return () => { mounted = false; controller.abort(); };
  }, [period, isAdmin]);

  const globalStats = useMemo<GlobalStats>(() => {
    let totalReqs = 0;
    let selects = 0;
    let writes = 0;
    let realtime = 0;
    let responseBytes = 0;
    let measuredResponses = 0;
    data.forEach((row) => {
      const count = Number(row.execution_count ?? 0);
      totalReqs += count;
      if (row.operation_type === 'SELECT') selects += count;
      else if (['INSERT', 'UPDATE', 'DELETE'].includes(row.operation_type)) writes += count;
      else if (row.operation_type === 'REALTIME') realtime += count;
      responseBytes += Number(row.response_bytes || 0);
      measuredResponses += Number(row.measured_response_count || 0);
    });
    return { totalReqs, selects, writes, realtime, responseBytes, measuredResponses };
  }, [data]);

  const drillDownView = useMemo<DrillDownItem[]>(() => {
    let filtered = data;

    if (activeModule) filtered = filtered.filter((r) => r.module === activeModule);
    if (activeOperation) filtered = filtered.filter((r) => r.operation_type === activeOperation);
    if (activeTable) filtered = filtered.filter((r) => r.table_name === activeTable);
    if (activeAction) filtered = filtered.filter((r) => r.action === activeAction);

    const contextTotalReqs = filtered.reduce((acc, row) => acc + Number(row.execution_count ?? 0), 0);

    const groups: Record<
      string,
      { count: number; rows: number; unknownRows: number; duration: number; items: TelemetryRow[] }
    > = {};

    filtered.forEach((row) => {
      const key = !activeModule
        ? row.module || 'Desconhecido'
        : !activeOperation
          ? row.operation_type || 'UNKNOWN'
          : !activeTable
            ? row.table_name || 'Desconhecido'
            : !activeAction
              ? row.action || 'Desconhecido'
              : row.screen || 'N/A';

      if (!groups[key]) groups[key] = { count: 0, rows: 0, unknownRows: 0, duration: 0, items: [] };

      const count = Number(row.execution_count ?? 0);
      groups[key].count += count;
      groups[key].rows += Number(row.rows_returned || 0);
      groups[key].unknownRows += Number(row.unknown_rows_count || 0);
      groups[key].duration += Number(row.total_duration_ms || 0);
      groups[key].items.push(row);
    });

    return Object.entries(groups)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        percent: contextTotalReqs > 0 ? (stats.count / contextTotalReqs) * 100 : 0,
        avgRows: stats.count > 0 && stats.unknownRows === 0 ? Math.round(stats.rows / stats.count) : null,
        unknownRowsCount: stats.unknownRows,
        avgDuration: stats.count > 0 ? Math.round(stats.duration / stats.count) : 0,
        items: stats.items,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, activeModule, activeOperation, activeTable, activeAction]);

  const handleRowClick = useCallback(
    (name: string) => {
      if (!activeModule) setActiveModule(name);
      else if (!activeOperation) setActiveOperation(name);
      else if (!activeTable) setActiveTable(name);
      else if (!activeAction) setActiveAction(name);
    },
    [activeModule, activeOperation, activeTable, activeAction]
  );

  const resetDrillDown = useCallback(() => {
    setActiveModule(null);
    setActiveOperation(null);
    setActiveTable(null);
    setActiveAction(null);
  }, []);

  return {
    isAdmin,
    data,
    loading,
    error,
    period,
    setPeriod,
    activeModule,
    setActiveModule,
    activeOperation,
    setActiveOperation,
    activeTable,
    setActiveTable,
    activeAction,
    setActiveAction,
    globalStats,
    drillDownView,
    handleRowClick,
    resetDrillDown,
  };
}
