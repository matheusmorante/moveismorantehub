import React from 'react';
import { useSupabaseTelemetry } from './hooks/useSupabaseTelemetry';
import { SupabaseMonitorHeader } from './components/SupabaseMonitorHeader';
import { SupabaseMonitorStatsCards } from './components/SupabaseMonitorStatsCards';
import { SupabaseMonitorDrillDown } from './components/SupabaseMonitorDrillDown';

export default function SupabaseMonitorDashboard() {
  const {
    isAdmin,
    loading,
    period,
    setPeriod,
    activeModule,
    setActiveOperation,
    setActiveTable,
    setActiveAction,
    activeOperation,
    activeTable,
    activeAction,
    globalStats,
    drillDownView,
    handleRowClick,
    resetDrillDown,
  } = useSupabaseTelemetry();

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        <i className="bi bi-shield-lock text-4xl mb-3 block"></i>
        <h2 className="text-xl font-bold">Acesso Negado</h2>
      </div>
    );
  }

  const handlePeriodChange = (p: typeof period) => {
    setPeriod(p);
    resetDrillDown();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <SupabaseMonitorHeader period={period} onPeriodChange={handlePeriodChange} />

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {!activeModule && <SupabaseMonitorStatsCards stats={globalStats} />}

          <SupabaseMonitorDrillDown
            drillDownView={drillDownView}
            period={period}
            activeModule={activeModule}
            activeOperation={activeOperation}
            activeTable={activeTable}
            activeAction={activeAction}
            onRowClick={handleRowClick}
            onReset={resetDrillDown}
            onSelectModule={() => { setActiveOperation(null); setActiveTable(null); setActiveAction(null); }}
            onSelectOperation={() => { setActiveTable(null); setActiveAction(null); }}
            onSelectTable={() => { setActiveAction(null); }}
          />
        </div>
      )}
    </div>
  );
}
