import React from 'react';
import { DrillDownItem, PeriodType } from '../types/supabaseMonitor.types';

interface Props {
  drillDownView: DrillDownItem[];
  period: PeriodType;
  activeModule: string | null;
  activeOperation: string | null;
  activeTable: string | null;
  activeAction: string | null;
  onRowClick: (name: string) => void;
  onReset: () => void;
  onSelectModule: () => void;
  onSelectOperation: () => void;
  onSelectTable: () => void;
}

export const SupabaseMonitorDrillDown: React.FC<Props> = ({
  drillDownView,
  period,
  activeModule,
  activeOperation,
  activeTable,
  activeAction,
  onRowClick,
  onReset,
  onSelectModule,
  onSelectOperation,
  onSelectTable,
}) => {
  const getWarningFlags = (item: DrillDownItem, isActionLevel: boolean) => {
    const flags: Array<{ title: string; desc: string; color: string }> = [];
    if (item.avgRows > 500) {
      flags.push({ title: `Média de ${item.avgRows} registros/req`, desc: 'Possível consulta sem paginação.', color: 'amber' });
    }
    const minutes = period === '15m' ? 15 : period === '1h' ? 60 : 0;
    if (minutes > 0 && isActionLevel) {
      const rpm = item.count / minutes;
      if (rpm > 20) {
        flags.push({ title: `${Math.round(rpm)} reqs/minuto`, desc: 'Possível loop/polling agressivo.', color: 'red' });
      }
    }
    return flags;
  };

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm font-bold bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <button
          onClick={onReset}
          className={`flex items-center gap-2 transition-colors ${!activeModule ? 'text-slate-800 dark:text-white' : 'text-slate-400 hover:text-blue-500'}`}
        >
          <i className="bi bi-hdd-network"></i> Consumo Supabase
        </button>

        {activeModule && (
          <>
            <i className="bi bi-chevron-right text-slate-300 text-xs"></i>
            <button
              onClick={onSelectModule}
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
              onClick={onSelectOperation}
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
              onClick={onSelectTable}
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

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm animate-slide-up">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs">
            {!activeModule
              ? 'Distribuição por Módulo'
              : !activeOperation
              ? `Operações em: ${activeModule}`
              : !activeTable
              ? `Recursos/Tabelas (Tipo: ${activeOperation})`
              : !activeAction
              ? `Ações de Origem (${activeTable})`
              : `Origem Técnica (${activeAction})`}
          </h3>
          <span className="text-xs font-bold text-slate-400">
            Total no nível: {drillDownView.reduce((a, b) => a + b.count, 0)} reqs
          </span>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {drillDownView.map((item, idx) => {
            const isActionLevel = activeTable !== null;
            const warnings = getWarningFlags(item, isActionLevel);

            return (
              <div
                key={idx}
                onClick={() => !activeAction && onRowClick(item.name)}
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
                          <span
                            key={wIdx}
                            className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-${w.color}-100 text-${w.color}-700 dark:bg-${w.color}-900/30 dark:text-${w.color}-400`}
                            title={w.desc}
                          >
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
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    ></div>
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
    </>
  );
};
