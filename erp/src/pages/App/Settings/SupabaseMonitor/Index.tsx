import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';

interface TelemetryRow {
  id: string;
  module: string;
  screen: string;
  action: string;
  table_name: string;
  operation_type: string;
  execution_count: number;
  total_duration_ms: number;
  rows_returned: number;
  user_id: string;
  recorded_at: string;
}

export default function SupabaseMonitorDashboard() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'15m' | '1h' | '24h' | '7d'>('1h');

  // Drill-Down States
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null); // Nível 4 e 5

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchTelemetry = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let fromDate = new Date();
        if (period === '15m') fromDate.setMinutes(now.getMinutes() - 15);
        else if (period === '1h') fromDate.setHours(now.getHours() - 1);
        else if (period === '24h') fromDate.setHours(now.getHours() - 24);
        else if (period === '7d') fromDate.setDate(now.getDate() - 7);

        const { data: results, error } = await supabase
          .rpc('get_aggregated_telemetry', { p_start_date: fromDate.toISOString() });

        if (!error && results) {
          setData(results);
        }
      } catch (err) {
        console.error('Error fetching telemetry', err);
      }
      setLoading(false);
    };

    fetchTelemetry();
  }, [period, isAdmin]);

  const globalStats = useMemo(() => {
    let totalReqs = 0; let selects = 0; let writes = 0; let realtime = 0;
    data.forEach(row => {
      const count = row.execution_count || 1;
      totalReqs += count;
      if (row.operation_type === 'SELECT') selects += count;
      else if (['INSERT', 'UPDATE', 'DELETE'].includes(row.operation_type)) writes += count;
      else if (row.operation_type === 'REALTIME') realtime += count;
    });
    return { totalReqs, selects, writes, realtime };
  }, [data]);

  // Hierarchical Aggregation
  const drillDownView = useMemo(() => {
    let filtered = data;

    // Filter down the chain
    if (activeModule) filtered = filtered.filter(r => r.module === activeModule);
    if (activeOperation) filtered = filtered.filter(r => r.operation_type === activeOperation);
    if (activeTable) filtered = filtered.filter(r => r.table_name === activeTable);
    if (activeAction) filtered = filtered.filter(r => r.action === activeAction);

    // Calculate total reqs in this context for percentage
    const contextTotalReqs = filtered.reduce((acc, row) => acc + (row.execution_count || 1), 0);
    
    // Grouping Target
    const groups: Record<string, { count: number, rows: number, duration: number, items: TelemetryRow[] }> = {};

    filtered.forEach(row => {
      let key = '';
      if (!activeModule) key = row.module || 'Desconhecido';
      else if (!activeOperation) key = row.operation_type || 'UNKNOWN';
      else if (!activeTable) key = row.table_name || 'Desconhecido';
      else if (!activeAction) key = row.action || 'Desconhecido';
      else key = row.screen || 'N/A'; // Nível 5 (Technical)

      if (!groups[key]) groups[key] = { count: 0, rows: 0, duration: 0, items: [] };
      
      const count = row.execution_count || 1;
      groups[key].count += count;
      groups[key].rows += row.rows_returned || 0;
      groups[key].duration += row.total_duration_ms || 0;
      groups[key].items.push(row);
    });

    return Object.entries(groups)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        percent: contextTotalReqs > 0 ? (stats.count / contextTotalReqs) * 100 : 0,
        avgRows: stats.count > 0 ? Math.round(stats.rows / stats.count) : 0,
        avgDuration: stats.count > 0 ? Math.round(stats.duration / stats.count) : 0,
        items: stats.items
      }))
      .sort((a, b) => b.count - a.count);

  }, [data, activeModule, activeOperation, activeTable, activeAction]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        <i className="bi bi-shield-lock text-4xl mb-3 block"></i>
        <h2 className="text-xl font-bold">Acesso Negado</h2>
      </div>
    );
  }

  const handleRowClick = (name: string) => {
    if (!activeModule) setActiveModule(name);
    else if (!activeOperation) setActiveOperation(name);
    else if (!activeTable) setActiveTable(name);
    else if (!activeAction) setActiveAction(name);
  };

  const getWarningFlags = (item: any, isActionLevel: boolean) => {
    const flags = [];
    if (item.avgRows > 500) {
      flags.push({ title: `Média de ${item.avgRows} registros/req`, desc: 'Possível consulta sem paginação.', color: 'amber' });
    }
    // Calcular reqs/minuto se for 15m ou 1h
    const minutes = period === '15m' ? 15 : (period === '1h' ? 60 : 0);
    if (minutes > 0 && isActionLevel) {
      const rpm = item.count / minutes;
      if (rpm > 20) {
        flags.push({ title: `${Math.round(rpm)} reqs/minuto`, desc: 'Possível loop/polling agressivo.', color: 'red' });
      }
    }
    return flags;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Monitor do Supabase</h1>
          <p className="text-slate-500 text-sm mt-1">Diagnóstico Progressivo (Drill-Down) de Telemetria.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {(['15m', '1h', '24h', '7d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setActiveModule(null); setActiveOperation(null); setActiveTable(null); setActiveAction(null); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Último(s) {p}
            </button>
          ))}
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm font-bold bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <button 
          onClick={() => { setActiveModule(null); setActiveOperation(null); setActiveTable(null); setActiveAction(null); }}
          className={`flex items-center gap-2 transition-colors ${!activeModule ? 'text-slate-800 dark:text-white' : 'text-slate-400 hover:text-blue-500'}`}
        >
          <i className="bi bi-hdd-network"></i> Consumo Supabase
        </button>

        {activeModule && (
          <>
            <i className="bi bi-chevron-right text-slate-300 text-xs"></i>
            <button 
              onClick={() => { setActiveOperation(null); setActiveTable(null); setActiveAction(null); }}
              className={`transition-colors ${!activeOperation ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}
            >
              {activeModule}
            </button>
          </>
        )}

        {activeOperation && (
          <>
            <i className="bi bi-chevron-right text-slate-300 text-xs"></i>
            <button 
              onClick={() => { setActiveTable(null); setActiveAction(null); }}
              className={`transition-colors ${!activeTable ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}
            >
              {activeOperation}
            </button>
          </>
        )}

        {activeTable && (
          <>
            <i className="bi bi-chevron-right text-slate-300 text-xs"></i>
            <button 
              onClick={() => { setActiveAction(null); }}
              className={`transition-colors ${!activeAction ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}
            >
              {activeTable}
            </button>
          </>
        )}

        {activeAction && (
          <>
            <i className="bi bi-chevron-right text-slate-300 text-xs"></i>
            <span className="text-blue-600 dark:text-blue-400">{activeAction}</span>
          </>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Level Stats only show on Root level */}
          {!activeModule && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in">
              <StatCard title="Requisições Totais" value={globalStats.totalReqs} icon="bi-activity" color="blue" />
              <StatCard title="Total SELECTs" value={globalStats.selects} icon="bi-search" color="emerald" />
              <StatCard title="Total Writes" value={globalStats.writes} icon="bi-pencil-square" color="amber" />
              <StatCard title="Total Realtime" value={globalStats.realtime} icon="bi-lightning-charge" color="purple" />
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm animate-slide-up">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs">
                {!activeModule ? 'Distribuição por Módulo' : 
                 !activeOperation ? `Operações em: ${activeModule}` : 
                 !activeTable ? `Recursos/Tabelas (Tipo: ${activeOperation})` : 
                 !activeAction ? `Ações de Origem (${activeTable})` : 
                 `Origem Técnica (${activeAction})`}
              </h3>
              <span className="text-xs font-bold text-slate-400">Total no nível: {drillDownView.reduce((a, b) => a + b.count, 0)} reqs</span>
            </div>
            
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {drillDownView.map((item, idx) => {
                const isActionLevel = activeTable !== null;
                const warnings = getWarningFlags(item, isActionLevel);

                return (
                  <div 
                    key={idx} 
                    onClick={() => !activeAction && handleRowClick(item.name)}
                    className={`p-4 md:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${!activeAction ? 'cursor-pointer group' : ''}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-4 flex-1">
                        {!activeAction && (
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <i className="bi bi-list-nested"></i>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                            {warnings.map((w, wIdx) => (
                              <span key={wIdx} className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-${w.color}-100 text-${w.color}-700 dark:bg-${w.color}-900/30 dark:text-${w.color}-400`} title={w.desc}>
                                ⚠ {w.title}
                              </span>
                            ))}
                          </div>
                          
                          <div className="mt-2 flex items-center gap-6 text-xs text-slate-500">
                            <span title="Volume de execução">
                              <i className="bi bi-arrow-repeat mr-1"></i> {item.count} reqs ({Math.round(item.percent)}%)
                            </span>
                            {item.avgRows > 0 && (
                              <span title="Média de Registros por Requisição">
                                <i className="bi bi-database mr-1"></i> {item.avgRows} linhas/req
                              </span>
                            )}
                            {item.avgDuration > 0 && (
                              <span title="Duração Média de Resposta">
                                <i className="bi bi-stopwatch mr-1"></i> {item.avgDuration} ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-48 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${item.percent}%` }}></div>
                      </div>
                      
                      {!activeAction && (
                        <i className="hidden md:block bi bi-chevron-right text-slate-300 group-hover:text-blue-500 transition-colors"></i>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {drillDownView.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <i className="bi bi-inbox text-3xl mb-2 block"></i>
                  Nenhum dado encontrado para este nível de telemetria no período selecionado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
          <i className={`bi ${icon}`}></i>
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{value.toLocaleString()}</span>
    </div>
  );
}
